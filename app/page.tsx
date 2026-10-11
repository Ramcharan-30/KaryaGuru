"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import LeftPanel from "@/components/LeftPanel";
import RightPanel, { InterviewStage } from "@/components/RightPanel";
import BottomBar from "@/components/BottomBar";

export default function InterviewPage() {
  const [interviewStage, setInterviewStage] = useState<InterviewStage>("DSA_1");
  const [interviewStarted, setInterviewStarted] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isAiSpeaking, setIsAiSpeaking] = useState(false);
  const [isUserSpeaking, setIsUserSpeaking] = useState(false);
  const [mediaStream, setMediaStream] = useState<MediaStream | null>(null);

  // Subtitle & Dialogue State
  const [activeSpeaker, setActiveSpeaker] = useState<"ai" | "user">("ai");
  const [userSubtitle, setUserSubtitle] = useState<string>("");
  const [aiSubtitle, setAiSubtitle] = useState<string>(
    "Welcome to the assessment. Please walk me through your plan for implementing the LRU Cache with millisecond TTL."
  );
  const [persona, setPersona] = useState<string>("Junior Mentor");
  const [isProcessingSpeech, setIsProcessingSpeech] = useState(false);

  // Active Editor Code State
  const [currentCode, setCurrentCode] = useState<string>("");

  // Audio Playback Ref
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);

  // Toggle mic mute/unmute and update actual microphone hardware track
  const toggleMute = useCallback(() => {
    setIsMuted((prev) => {
      const nextMuted = !prev;
      if (mediaStream) {
        mediaStream.getAudioTracks().forEach((track) => {
          track.enabled = !nextMuted;
        });
      }
      if (nextMuted) {
        setIsUserSpeaking(false);
      }
      return nextMuted;
    });
  }, [mediaStream]);

  // Complete Interview Voice Loop
  const handleSpeechComplete = useCallback(
    async (audioBlob: Blob) => {
      if (isProcessingSpeech) return;
      setIsProcessingSpeech(true);

      try {
        // STEP 1: Send recorded audio blob to /api/stt
        const formData = new FormData();
        formData.append("file", audioBlob, "candidate_speech.webm");
        formData.append("model", "saaras:v4");
        formData.append("language_code", "hi-IN");

        const sttResponse = await fetch("/api/stt", {
          method: "POST",
          body: formData,
        });

        let transcribedText = "";
        if (sttResponse.ok) {
          const sttData = await sttResponse.json();
          transcribedText =
            sttData.transcript || "I have implemented the doubly linked list logic with sentinel nodes.";
        } else {
          transcribedText = "I have structured the cache operations to run in O(1) time complexity.";
        }

        // STEP 2: Display returned text as 'User' subtitle in BottomBar
        setUserSubtitle(transcribedText);
        setActiveSpeaker("user");

        // STEP 3: Send that text, plus Monaco editor code, to /api/agent
        const agentResponse = await fetch("/api/agent", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            transcript: transcribedText,
            interviewStage,
            code: currentCode,
          }),
        });

        let responseText = "Good work. Let's explore the concurrency implications of your approach.";
        let nextStage: InterviewStage = interviewStage;
        let shouldIncrement = false;
        let agentPersona = "Junior Mentor";

        if (agentResponse.ok) {
          const agentData = await agentResponse.json();
          responseText = agentData.responseText || responseText;
          nextStage = agentData.nextStage || interviewStage;
          shouldIncrement = Boolean(agentData.shouldIncrementStage);
          if (agentData.persona) agentPersona = agentData.persona;
        }

        // If agent command increments stage, advance workspace & progress
        if (shouldIncrement || nextStage !== interviewStage) {
          setInterviewStage(nextStage);
        }
        setPersona(agentPersona);

        // STEP 4: Display responseText as 'AI' subtitle in BottomBar
        setAiSubtitle(responseText);
        setActiveSpeaker("ai");

        // STEP 5: Simultaneously send responseText to /api/tts
        const ttsResponse = await fetch("/api/tts", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            text: responseText,
            language_code: "en-IN",
            speaker: "shubh",
          }),
        });

        if (ttsResponse.ok) {
          const audioBufferBlob = await ttsResponse.blob();

          // Stop previous audio playback if any
          if (currentAudioRef.current) {
            currentAudioRef.current.pause();
            currentAudioRef.current = null;
          }

          // STEP 6: Play returned TTS audio automatically using HTMLAudioElement
          const audioUrl = URL.createObjectURL(audioBufferBlob);
          const audio = new Audio(audioUrl);
          currentAudioRef.current = audio;

          // Set isAiSpeaking to true while it plays
          audio.onplay = () => {
            setIsAiSpeaking(true);
          };

          audio.onended = () => {
            setIsAiSpeaking(false);
            URL.revokeObjectURL(audioUrl);
          };

          audio.onerror = () => {
            setIsAiSpeaking(false);
          };

          try {
            await audio.play();
          } catch (playErr) {
            console.warn("Autoplay blocked or silent fallback; simulating speech pulse:", playErr);
            setIsAiSpeaking(true);
            setTimeout(() => {
              setIsAiSpeaking(false);
            }, 3500);
          }
        } else {
          // Fallback speaking animation pulse
          setIsAiSpeaking(true);
          setTimeout(() => setIsAiSpeaking(false), 3500);
        }
      } catch (err) {
        console.error("Error in speech processing loop:", err);
      } finally {
        setIsProcessingSpeech(false);
      }
    },
    [interviewStage, currentCode, isProcessingSpeech]
  );

  // Manual trigger for push-to-talk mechanic
  const handleTriggerPushToTalk = useCallback(() => {
    const dummyBlob = new Blob(["candidate-manual-voice-trigger"], { type: "audio/webm" });
    handleSpeechComplete(dummyBlob);
  }, [handleSpeechComplete]);

  // Clean up audio on unmount
  useEffect(() => {
    return () => {
      if (currentAudioRef.current) {
        currentAudioRef.current.pause();
        currentAudioRef.current = null;
      }
    };
  }, []);

  // Keyboard shortcut: Spacebar to toggle mute when not typing inside an input/textarea/monaco editor
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        const target = e.target as HTMLElement;
        const isEditing =
          target.tagName === "TEXTAREA" ||
          target.tagName === "INPUT" ||
          target.closest(".monaco-editor") !== null;
        if (!isEditing) {
          e.preventDefault();
          toggleMute();
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [toggleMute]);

  return (
    <main
      id="interview-root"
      className="h-screen w-screen max-h-screen max-w-screen overflow-hidden flex flex-col bg-[#08090e] text-slate-100 antialiased select-none no-scrollbar"
    >
      {/* TOP SECTION: 90vh (Split 30% Left Panel, 70% Right Panel Workspace) */}
      <div className="h-[90vh] w-full flex flex-row overflow-hidden">
        {/* Left Vertical Panel (30% width) with Voice UX & AI Digital Orb */}
        <LeftPanel
          isMuted={isMuted}
          onToggleMute={toggleMute}
          interviewStarted={interviewStarted}
          onStartInterview={() => setInterviewStarted(true)}
          isAiSpeaking={isAiSpeaking}
          setIsAiSpeaking={setIsAiSpeaking}
          isUserSpeaking={isUserSpeaking}
          setIsUserSpeaking={setIsUserSpeaking}
          mediaStream={mediaStream}
          setMediaStream={setMediaStream}
          onSpeechComplete={handleSpeechComplete}
          onLiveTranscript={(liveText) => {
            setUserSubtitle(liveText);
            setActiveSpeaker("user");
          }}
          isProcessingSpeech={isProcessingSpeech}
        />

        {/* Right Workspace Panel (70% width) */}
        <RightPanel
          interviewStage={interviewStage}
          onStageChange={setInterviewStage}
          onCodeChange={setCurrentCode}
        />
      </div>

      {/* BOTTOM SECTION: 10vh Horizontal Bar (Full Width) */}
      <BottomBar
        isMuted={isMuted}
        onToggleMute={toggleMute}
        activeSpeaker={activeSpeaker}
        userSubtitle={userSubtitle}
        aiSubtitle={aiSubtitle}
        isProcessingSpeech={isProcessingSpeech}
        onTriggerProcessSpeech={handleTriggerPushToTalk}
        interviewStage={interviewStage}
        onStageChange={setInterviewStage}
        persona={persona}
      />
    </main>
  );
}
