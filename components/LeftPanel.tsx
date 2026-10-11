"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Sparkles,
  Wifi,
  Video,
  VideoOff,
  Volume2,
  VolumeX,
  BrainCircuit,
  Shield,
  Activity,
  Layers,
  Mic,
  Play,
  Send,
  Loader2,
} from "lucide-react";
import AIAvatar from "./AIAvatar";

interface LeftPanelProps {
  isMuted?: boolean;
  onToggleMute?: () => void;
  interviewStarted?: boolean;
  onStartInterview?: () => void;
  isAiSpeaking?: boolean;
  setIsAiSpeaking?: (val: boolean) => void;
  isUserSpeaking?: boolean;
  setIsUserSpeaking?: (val: boolean) => void;
  mediaStream?: MediaStream | null;
  setMediaStream?: (stream: MediaStream | null) => void;
  onSpeechComplete?: (audioBlob: Blob) => void;
  onLiveTranscript?: (interimText: string) => void;
  isProcessingSpeech?: boolean;
}

export default function LeftPanel({
  isMuted = false,
  onToggleMute,
  interviewStarted = false,
  onStartInterview,
  isAiSpeaking = false,
  setIsAiSpeaking,
  isUserSpeaking = false,
  setIsUserSpeaking,
  mediaStream = null,
  setMediaStream,
  onSpeechComplete,
  onLiveTranscript,
  isProcessingSpeech = false,
}: LeftPanelProps) {
  const [candidateCamOn, setCandidateCamOn] = useState(true);
  const [userVolume, setUserVolume] = useState(0);
  const [waveHeights, setWaveHeights] = useState<number[]>([
    25, 45, 80, 60, 95, 30, 70, 85, 40, 100, 65, 45, 90, 75, 35, 55, 80, 60,
    30, 90, 50, 70, 40, 85,
  ]);
  const [micPermissionState, setMicPermissionState] = useState<"idle" | "granted" | "denied">("idle");

  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const animFrameRef = useRef<number | null>(null);
  const silenceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isRecordingSpeechRef = useRef<boolean>(false);
  // Ref for browser live speech recognition
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null);

  // Trigger AI speech response
  const triggerAiSpeech = useCallback((durationMs = 4500) => {
    if (setIsAiSpeaking) {
      setIsAiSpeaking(true);
      setTimeout(() => {
        setIsAiSpeaking(false);
      }, durationMs);
    }
  }, [setIsAiSpeaking]);

  // Stop recording and emit audio blob to STT
  const stopAndEmitRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      isRecordingSpeechRef.current = false;
      mediaRecorderRef.current.stop();
    } else {
      // Fallback: If no hardware recorder or mock environment, generate empty or dummy blob
      if (onSpeechComplete) {
        const dummyBlob = new Blob(["mock-speech-audio"], { type: "audio/webm;codecs=opus" });
        onSpeechComplete(dummyBlob);
      }
    }
  }, [onSpeechComplete]);

  // Initialize MediaRecorder on mediaStream
  useEffect(() => {
    if (!mediaStream) return;

    try {
      const preferredMime = "audio/webm;codecs=opus";
      let options: MediaRecorderOptions = { mimeType: preferredMime };

      if (
        typeof MediaRecorder.isTypeSupported === "function" &&
        !MediaRecorder.isTypeSupported(preferredMime)
      ) {
        if (MediaRecorder.isTypeSupported("audio/webm")) {
          options = { mimeType: "audio/webm" };
        } else {
          options = {};
        }
      }

      const recorder = new MediaRecorder(mediaStream, options);
      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      recorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, {
          type: recorder.mimeType || "audio/webm;codecs=opus",
        });
        audioChunksRef.current = [];
        if (onSpeechComplete) {
          onSpeechComplete(blob);
        }
      };

      mediaRecorderRef.current = recorder;
    } catch (e) {
      console.warn("MediaRecorder initialization error:", e);
    }

    return () => {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
        mediaRecorderRef.current.stop();
      }
    };
  }, [mediaStream, onSpeechComplete]);

  // Request microphone permissions using Web Audio API and navigator.mediaDevices.getUserMedia
  const handleStartInterview = async () => {
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
          video: false,
        });

        // Ensure tracks respect initial mute state
        stream.getAudioTracks().forEach((track) => {
          track.enabled = !isMuted;
        });

        if (setMediaStream) setMediaStream(stream);
        setMicPermissionState("granted");

        // Initialize AudioContext & AnalyserNode
        const AudioContextClass =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;

        if (AudioContextClass) {
          const audioCtx = new AudioContextClass();
          if (audioCtx.state === "suspended") {
            await audioCtx.resume();
          }
          audioContextRef.current = audioCtx;

          const source = audioCtx.createMediaStreamSource(stream);
          const analyser = audioCtx.createAnalyser();
          analyser.fftSize = 64;
          analyser.smoothingTimeConstant = 0.5;
          source.connect(analyser);
          analyserRef.current = analyser;

          // Start reading audio frequency
          startAudioAnalysis();
        }

        // Initialize browser live SpeechRecognition for zero-latency streaming subtitles
        if (typeof window !== "undefined") {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const SpeechRecognitionClass =
            (window as unknown as { SpeechRecognition?: any }).SpeechRecognition ||
            (window as unknown as { webkitSpeechRecognition?: any }).webkitSpeechRecognition;

          if (SpeechRecognitionClass) {
            try {
              const recognition = new SpeechRecognitionClass();
              recognition.continuous = true;
              recognition.interimResults = true;
              recognition.lang = "hi-IN"; // Supports Indic, Hinglish & English
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              recognition.onresult = (event: any) => {
                let fullTranscript = "";
                for (let i = 0; i < event.results.length; i++) {
                  fullTranscript += event.results[i][0].transcript;
                }
                if (fullTranscript.trim() && onLiveTranscript) {
                  onLiveTranscript(fullTranscript.trim());
                }
              };
              recognition.onerror = (e: any) => {
                console.debug("Live speech recognition event:", e);
              };
              recognition.onend = () => {
                if (recognitionRef.current && isRecordingSpeechRef.current) {
                  try {
                    recognition.start();
                  } catch {}
                }
              };
              recognition.start();
              recognitionRef.current = recognition;
            } catch (recErr) {
              console.debug("Live SpeechRecognition started with notice:", recErr);
            }
          }
        }
      }
    } catch (err) {
      console.warn("Microphone access could not be initialized or was dismissed:", err);
      setMicPermissionState("denied");
    }

    if (onStartInterview) {
      onStartInterview();
    }
    // Trigger initial welcoming speech from Elena
    triggerAiSpeech(4000);
  };

  // Continuous audio frequency analysis with 2-second silence detection
  const startAudioAnalysis = useCallback(() => {
    const analyser = analyserRef.current;
    if (!analyser) return;

    const dataArray = new Uint8Array(analyser.frequencyBinCount);

    const checkAudio = () => {
      if (!analyserRef.current) return;
      analyserRef.current.getByteFrequencyData(dataArray);

      let sum = 0;
      for (let i = 0; i < dataArray.length; i++) {
        sum += dataArray[i];
      }
      const avg = sum / dataArray.length;
      const normalizedVol = Math.min(100, Math.round((avg / 128) * 100));
      setUserVolume(normalizedVol);

      // Speaking threshold: if not muted and avg > 14
      if (!isMuted && avg > 14) {
        // Cancel silence timer
        if (silenceTimerRef.current) {
          clearTimeout(silenceTimerRef.current);
          silenceTimerRef.current = null;
        }

        if (setIsUserSpeaking) setIsUserSpeaking(true);

        // Start recording if not currently recording
        if (
          mediaRecorderRef.current &&
          mediaRecorderRef.current.state === "inactive" &&
          !isRecordingSpeechRef.current
        ) {
          try {
            audioChunksRef.current = [];
            mediaRecorderRef.current.start(250);
            isRecordingSpeechRef.current = true;
          } catch (e) {
            console.warn("Could not start MediaRecorder:", e);
          }
        }
      } else {
        // 2-second silence detection logic
        if (!silenceTimerRef.current && isUserSpeaking && isRecordingSpeechRef.current) {
          silenceTimerRef.current = setTimeout(() => {
            if (setIsUserSpeaking) setIsUserSpeaking(false);
            stopAndEmitRecording();
            silenceTimerRef.current = null;
          }, 2000); // Exactly 2 seconds of silence
        }
      }

      // Map to visualizer bars
      if (!isMuted && avg > 8) {
        const sampleBars: number[] = [];
        for (let i = 0; i < 24; i++) {
          const raw = dataArray[i % dataArray.length] || 0;
          sampleBars.push(Math.max(15, Math.min(100, Math.round((raw / 255) * 100))));
        }
        setWaveHeights(sampleBars);
      }

      animFrameRef.current = requestAnimationFrame(checkAudio);
    };

    animFrameRef.current = requestAnimationFrame(checkAudio);
  }, [isMuted, isUserSpeaking, setIsUserSpeaking, stopAndEmitRecording]);

  // Clean up Web Audio resources on unmount
  useEffect(() => {
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {}
      }
      if (audioContextRef.current && audioContextRef.current.state !== "closed") {
        audioContextRef.current.close().catch(() => {});
      }
    };
  }, []);

  // Update hardware audio tracks whenever mute state changes
  useEffect(() => {
    if (mediaStream) {
      mediaStream.getAudioTracks().forEach((track) => {
        track.enabled = !isMuted;
      });
    }
  }, [isMuted, mediaStream]);

  // Visualizer fallback when AI is speaking or idle
  useEffect(() => {
    const interval = setInterval(() => {
      if (isAiSpeaking) {
        setWaveHeights((prev) =>
          prev.map(() => Math.floor(Math.random() * 75) + 25)
        );
      } else if (!isUserSpeaking) {
        setWaveHeights((prev) => prev.map(() => 15));
      }
    }, 160);

    return () => clearInterval(interval);
  }, [isAiSpeaking, isUserSpeaking]);

  return (
    <aside className="w-[30%] h-full flex flex-col justify-between border-r border-[#1e2230] bg-[#0c0e15] select-none p-4 relative overflow-hidden">
      {/* Background ambient glow effect */}
      <div className="absolute -top-24 -left-24 w-80 h-80 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/2 -right-20 w-64 h-64 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* TOP HEADER: Branding & Session Meta */}
      <div className="relative z-10 flex items-center justify-between pb-3 border-b border-[#1b1f2c]">
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-lg bg-gradient-to-tr from-indigo-600 via-indigo-500 to-cyan-400 p-[1px] flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <div className="w-full h-full bg-[#0d0f17] rounded-[7px] flex items-center justify-center">
              <BrainCircuit className="w-4 h-4 text-cyan-400" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-bold tracking-tight text-white text-sm">Karya Guru</span>
              <span className="text-[10px] uppercase font-semibold tracking-wider px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                AI Interview
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-medium">Senior Fullstack &amp; Systems</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 bg-[#141724] border border-[#212638] px-2 py-1 rounded-full">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="text-[11px] font-mono text-emerald-400 font-medium">REC</span>
          </div>
          <div className="flex items-center gap-1 text-[11px] text-slate-400 bg-[#141724] border border-[#212638] px-2 py-1 rounded-full font-mono">
            <Wifi className="w-3 h-3 text-emerald-400" />
            <span>HD</span>
          </div>
        </div>
      </div>

      {/* MIDDLE: CENTRAL GLOWING DIGITAL ORB & VOICE UX STAGE */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center my-1">
        {/* START INTERVIEW BUTTON (If not yet started) */}
        {!interviewStarted ? (
          <div className="w-full max-w-[280px] mb-3 p-3 bg-gradient-to-b from-[#15192c] to-[#0f121e] border border-indigo-500/40 rounded-xl shadow-xl shadow-indigo-950/50 flex flex-col items-center text-center">
            <div className="flex items-center gap-1.5 text-cyan-300 text-xs font-semibold mb-1">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Ready to Begin?</span>
            </div>
            <p className="text-[11px] text-slate-400 mb-2.5">
              Connect your microphone to initiate real-time AI audio evaluation.
            </p>
            <button
              onClick={handleStartInterview}
              className="w-full py-2 px-3 rounded-lg bg-gradient-to-r from-indigo-600 via-indigo-500 to-cyan-500 hover:from-indigo-500 hover:to-cyan-400 text-white font-semibold text-xs flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/30 active:scale-95 transition-all cursor-pointer"
            >
              <Mic className="w-3.5 h-3.5" />
              <span>Start Interview &amp; Connect Mic</span>
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2 mb-2">
            <button
              onClick={() => triggerAiSpeech(4000)}
              className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-indigo-950/60 border border-indigo-500/30 text-[10px] text-indigo-300 hover:bg-indigo-900/60 transition-colors cursor-pointer"
              title="Trigger AI Question Response"
            >
              <Play className="w-2.5 h-2.5 fill-indigo-300" />
              <span>AI Speak</span>
            </button>

            {/* Push-to-Talk / Finish speaking manual trigger */}
            <button
              onClick={stopAndEmitRecording}
              disabled={isProcessingSpeech}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-full border text-[10px] transition-all cursor-pointer active:scale-95 ${
                isProcessingSpeech
                  ? "bg-amber-950/60 border-amber-500/40 text-amber-300"
                  : isUserSpeaking
                  ? "bg-emerald-950/80 border-emerald-500/50 text-emerald-300 animate-pulse"
                  : "bg-indigo-600/30 border-indigo-500/40 text-cyan-300 hover:bg-indigo-600/50"
              }`}
              title="Finish speaking and submit answer immediately (or pause 2s for auto-detect)"
            >
              {isProcessingSpeech ? (
                <>
                  <Loader2 className="w-2.5 h-2.5 animate-spin" />
                  <span>Processing...</span>
                </>
              ) : (
                <>
                  <Send className="w-2.5 h-2.5" />
                  <span>{isUserSpeaking ? "Send Answer Now" : "Push to Talk"}</span>
                </>
              )}
            </button>
          </div>
        )}

        {/* Central AI Avatar Digital Orb */}
        <AIAvatar
          isAiSpeaking={isAiSpeaking}
          isUserSpeaking={isMuted ? false : isUserSpeaking}
          userVolume={isMuted ? 0 : userVolume}
          isMuted={isMuted}
          interviewStarted={interviewStarted}
        />

        {/* Identity & Persona info */}
        <div className="text-center mt-1">
          <h2 className="text-sm font-semibold text-white tracking-tight flex items-center justify-center gap-1.5">
            Elena Rostova, Ph.D.
            <Shield className="w-3.5 h-3.5 text-indigo-400" />
          </h2>
          <p className="text-[11px] text-slate-400">Principal Systems Evaluator • AI Assessment</p>
        </div>

        {/* REAL-TIME AUDIO FREQUENCY MATRIX */}
        <div className="w-full max-w-[280px] bg-[#121522]/90 border border-[#20263a] rounded-xl p-2.5 mt-2 shadow-inner">
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-medium">
              <Volume2 className="w-3 h-3 text-cyan-400" />
              <span>Voice Frequency Matrix</span>
            </div>
            <span className="text-[10px] font-mono text-cyan-400 bg-cyan-950/60 border border-cyan-800/40 px-1.5 py-0.5 rounded">
              {isUserSpeaking ? `${userVolume} dB (Mic)` : isAiSpeaking ? "78 dB (AI)" : "0 dB"}
            </span>
          </div>

          {/* Equalizer Frequency Bars */}
          <div className="h-8 flex items-end justify-between gap-[3px] px-1">
            {waveHeights.map((h, i) => (
              <div
                key={i}
                className="flex-1 rounded-full transition-all duration-150 ease-out"
                style={{
                  height: `${h}%`,
                  background: isUserSpeaking
                    ? "linear-gradient(to top, #059669, #34d399)"
                    : h > 70
                    ? "linear-gradient(to top, #6366f1, #06b6d4)"
                    : h > 40
                    ? "linear-gradient(to top, #4f46e5, #3b82f6)"
                    : "linear-gradient(to top, #312e81, #4338ca)",
                }}
              />
            ))}
          </div>

          <div className="mt-1.5 pt-1.5 border-t border-[#1e2335] flex items-center justify-between text-[10px] text-slate-400">
            <span>2s Silence Detection</span>
            <span className="text-emerald-400 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
              {micPermissionState === "granted" ? "Live Stream Active" : "Ready"}
            </span>
          </div>
        </div>

        {/* Real-time Assessment Focus Metrics */}
        <div className="w-full max-w-[280px] mt-2 space-y-1">
          <div className="flex items-center justify-between text-[10px] text-slate-400 bg-[#101320] px-2 py-1 rounded-lg border border-[#1b2133]">
            <span className="flex items-center gap-1 text-slate-300">
              <Activity className="w-3 h-3 text-indigo-400" />
              Voice Mode
            </span>
            <span className="font-semibold text-white">
              {isProcessingSpeech ? "Analyzing Input..." : "Auto-Detecting Voice"}
            </span>
          </div>
          <div className="flex items-center justify-between text-[10px] text-slate-400 bg-[#101320] px-2 py-1 rounded-lg border border-[#1b2133]">
            <span className="flex items-center gap-1 text-slate-300">
              <Layers className="w-3 h-3 text-cyan-400" />
              Mic Track State
            </span>
            <span className={isMuted ? "text-rose-400 font-semibold" : "text-emerald-400 font-semibold"}>
              {isMuted ? "Disabled (Muted)" : "Enabled (Broadcasting)"}
            </span>
          </div>
        </div>
      </div>

      {/* BOTTOM SECTION: Candidate Video Feed (Picture-in-Picture) */}
      <div className="relative z-10 bg-[#111420] border border-[#202638] rounded-xl p-2">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            <span className="text-[11px] font-semibold text-slate-200">Candidate Feed (You)</span>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setCandidateCamOn(!candidateCamOn)}
              className="p-1 rounded hover:bg-[#1e2335] text-slate-400 hover:text-white transition-colors cursor-pointer"
              title={candidateCamOn ? "Turn off camera" : "Turn on camera"}
            >
              {candidateCamOn ? (
                <Video className="w-3.5 h-3.5 text-slate-300" />
              ) : (
                <VideoOff className="w-3.5 h-3.5 text-rose-400" />
              )}
            </button>
            <button
              onClick={onToggleMute}
              className="p-1 rounded hover:bg-[#1e2335] text-slate-400 hover:text-white transition-colors cursor-pointer"
              title={isMuted ? "Unmute microphone" : "Mute microphone"}
            >
              {isMuted ? (
                <VolumeX className="w-3.5 h-3.5 text-rose-400" />
              ) : (
                <Volume2 className="w-3.5 h-3.5 text-slate-300" />
              )}
            </button>
          </div>
        </div>

        {/* Video Simulation Box */}
        <div className="h-20 rounded-lg bg-gradient-to-b from-[#181d2d] to-[#0d101b] border border-[#23293f] relative overflow-hidden flex items-center justify-center">
          {candidateCamOn ? (
            <>
              {/* Silhouette candidate mockup */}
              <div className="flex flex-col items-center">
                <div className="w-9 h-9 rounded-full bg-slate-700/60 border border-slate-600/50 flex items-center justify-center text-slate-300 text-xs font-bold shadow-md">
                  YOU
                </div>
                <div className="w-14 h-5 mt-1 rounded-t-full bg-slate-700/40" />
              </div>
              <div className="absolute top-1 right-1 bg-black/60 backdrop-blur-sm px-1.5 py-0.5 rounded text-[9px] font-mono text-slate-300 border border-white/10">
                1080p
              </div>
              <div className="absolute bottom-1 left-1 flex items-center gap-1 bg-black/60 backdrop-blur-sm px-1.5 py-0.5 rounded text-[9px] text-slate-300 border border-white/10">
                <span className={`w-1.5 h-1.5 rounded-full ${isMuted ? "bg-rose-500" : "bg-emerald-400"}`} />
                <span>{isMuted ? "Muted" : isUserSpeaking ? "Speaking" : "Active"}</span>
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center gap-1 text-slate-500">
              <VideoOff className="w-5 h-5" />
              <span className="text-[10px]">Camera Paused</span>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
