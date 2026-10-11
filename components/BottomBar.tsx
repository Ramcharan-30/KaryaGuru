"use client";

import React, { useState } from "react";
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  ScreenShare,
  PhoneOff,
  Settings,
  Sparkles,
  CheckCircle2,
  ChevronRight,
  CircleDot,
  User,
  Send,
  Loader2,
} from "lucide-react";
import { InterviewStage } from "./RightPanel";

interface BottomBarProps {
  isMuted?: boolean;
  onToggleMute?: () => void;
  activeSpeaker?: "ai" | "user";
  userSubtitle?: string;
  aiSubtitle?: string;
  isProcessingSpeech?: boolean;
  onTriggerProcessSpeech?: () => void;
  onCycleSubtitle?: () => void;
  interviewStage?: InterviewStage;
  onStageChange?: (stage: InterviewStage) => void;
  persona?: string;
}

export default function BottomBar({
  isMuted = false,
  onToggleMute,
  activeSpeaker = "ai",
  userSubtitle = "",
  aiSubtitle = "Can you elaborate on how your node eviction handles the edge case where TTL expires while an eviction is underway?",
  isProcessingSpeech = false,
  onTriggerProcessSpeech,
  onCycleSubtitle,
  interviewStage = "DSA_1",
  onStageChange,
  persona = "Junior Mentor",
}: BottomBarProps) {
  const [isVideoOn, setIsVideoOn] = useState(true);
  const [isSharingScreen, setIsSharingScreen] = useState(false);

  return (
    <footer className="w-full h-[10vh] bg-[#0a0c13] border-t border-[#1d2232] px-6 flex items-center justify-between select-none relative z-20 shrink-0">
      {/* LEFT SECTION: Real-time Live Subtitles (Candidate vs AI Agent) */}
      <div className="w-[42%] flex items-center gap-3 pr-4 border-r border-[#1a1f30]">
        <div className="h-9 w-9 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center shrink-0">
          {isProcessingSpeech ? (
            <Loader2 className="w-4 h-4 text-cyan-400 animate-spin" />
          ) : activeSpeaker === "user" ? (
            <User className="w-4 h-4 text-emerald-400" />
          ) : (
            <Sparkles className="w-4 h-4 text-cyan-400 animate-pulse" />
          )}
        </div>

        <div
          className="flex-1 min-w-0 cursor-pointer"
          onClick={onCycleSubtitle}
          title="Click to cycle interview prompt"
        >
          <div className="flex items-center gap-2">
            {isProcessingSpeech ? (
              <span className="text-[10px] font-mono font-semibold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
                [Sarvam AI • Evaluating Logic...]
              </span>
            ) : activeSpeaker === "user" ? (
              <span className="text-[10px] font-mono font-semibold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                [Candidate • Live Speech Active]
              </span>
            ) : (
              <span className="text-[10px] font-mono font-semibold uppercase tracking-wider text-cyan-400 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
                [Elena AI • {persona}]
              </span>
            )}
          </div>

          <p className="text-xs text-slate-200 line-clamp-2 font-sans tracking-wide leading-snug mt-0.5">
            {isProcessingSpeech ? (
              <span className="text-amber-300/90 italic">
                Transcribing audio via Sarvam Saaras V4 and consulting agent orchestrator...
              </span>
            ) : activeSpeaker === "user" ? (
              userSubtitle ? (
                <span>
                  “{userSubtitle}”<span className="inline-block w-1.5 h-3 ml-1 bg-emerald-400 animate-pulse align-middle" />
                </span>
              ) : (
                <span className="text-slate-400 italic">“Speak into your microphone to explain your approach...”</span>
              )
            ) : (
              `“${aiSubtitle}”`
            )}
          </p>
        </div>
      </div>

      {/* CENTER SECTION: Interview Progress Pipeline (DSA Level 1 -> System Design) */}
      <div className="flex-1 flex items-center justify-center px-4">
        <div className="flex items-center gap-2 bg-[#101320] border border-[#1d2338] px-4 py-1.5 rounded-xl shadow-inner">
          {/* Step 1: DSA Level 1 */}
          <button
            onClick={() => onStageChange?.("DSA_1")}
            className="flex items-center gap-2 hover:opacity-90 transition-opacity cursor-pointer"
          >
            <div
              className={`flex items-center gap-1.5 px-2 py-1 rounded-lg transition-all ${
                interviewStage === "DSA_1"
                  ? "bg-indigo-500/20 border border-indigo-500/40"
                  : ""
              }`}
            >
              {interviewStage === "DSA_1" ? (
                <CircleDot className="w-4 h-4 text-cyan-400 animate-spin shrink-0" />
              ) : (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              )}
              <div className="flex flex-col text-left">
                <span className="text-[11px] font-semibold text-slate-200 leading-none">DSA Level 1</span>
                <span
                  className={`text-[9px] font-mono ${
                    interviewStage === "DSA_1" ? "text-cyan-400" : "text-emerald-400"
                  }`}
                >
                  {interviewStage === "DSA_1" ? "Active" : "Passed"}
                </span>
              </div>
            </div>
            <ChevronRight className="w-3.5 h-3.5 text-slate-600" />
          </button>

          {/* Step 2: DSA Level 2 */}
          <button
            onClick={() => onStageChange?.("DSA_2")}
            className="flex items-center gap-2 hover:opacity-90 transition-opacity cursor-pointer"
          >
            <div
              className={`flex items-center gap-1.5 px-2 py-1 rounded-lg transition-all ${
                interviewStage === "DSA_2"
                  ? "bg-indigo-500/20 border border-indigo-500/40"
                  : interviewStage === "SYS_DESIGN"
                  ? ""
                  : "opacity-60"
              }`}
            >
              {interviewStage === "DSA_2" ? (
                <CircleDot className="w-4 h-4 text-cyan-400 animate-spin shrink-0" />
              ) : interviewStage === "SYS_DESIGN" ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              ) : (
                <div className="w-4 h-4 rounded-full border border-slate-500 flex items-center justify-center text-[9px] text-slate-400">
                  2
                </div>
              )}
              <div className="flex flex-col text-left">
                <span className="text-[11px] font-bold text-white leading-none">DSA Level 2</span>
                <span
                  className={`text-[9px] font-mono ${
                    interviewStage === "DSA_2"
                      ? "text-cyan-300"
                      : interviewStage === "SYS_DESIGN"
                      ? "text-emerald-400"
                      : "text-slate-500"
                  }`}
                >
                  {interviewStage === "DSA_2"
                    ? "Active"
                    : interviewStage === "SYS_DESIGN"
                    ? "Passed"
                    : "Upcoming"}
                </span>
              </div>
            </div>
            <ChevronRight className="w-3.5 h-3.5 text-slate-600" />
          </button>

          {/* Step 3: System Design */}
          <button
            onClick={() => onStageChange?.("SYS_DESIGN")}
            className="flex items-center gap-2 hover:opacity-90 transition-opacity cursor-pointer"
          >
            <div
              className={`flex items-center gap-1.5 px-2 py-1 rounded-lg transition-all ${
                interviewStage === "SYS_DESIGN"
                  ? "bg-purple-500/20 border border-purple-500/40"
                  : "opacity-60"
              }`}
            >
              {interviewStage === "SYS_DESIGN" ? (
                <CircleDot className="w-4 h-4 text-purple-400 animate-spin shrink-0" />
              ) : (
                <div className="w-4 h-4 rounded-full border border-slate-500 flex items-center justify-center text-[9px] text-slate-400">
                  3
                </div>
              )}
              <div className="flex flex-col text-left">
                <span className="text-[11px] font-medium text-slate-200 leading-none">System Design</span>
                <span
                  className={`text-[9px] font-mono ${
                    interviewStage === "SYS_DESIGN" ? "text-purple-300" : "text-slate-500"
                  }`}
                >
                  {interviewStage === "SYS_DESIGN" ? "Active" : "Upcoming"}
                </span>
              </div>
            </div>
            <ChevronRight className="w-3.5 h-3.5 text-slate-600" />
          </button>

          {/* Step 4: Q&A / Review */}
          <div className="flex items-center gap-1.5 opacity-40 px-2 py-1">
            <div className="w-4 h-4 rounded-full border border-slate-600 flex items-center justify-center text-[9px] text-slate-500">
              4
            </div>
            <span className="text-[11px] font-medium text-slate-500">Wrap Up</span>
          </div>
        </div>
      </div>

      {/* RIGHT SECTION: Controls, Push-to-Talk trigger, Mic Mute */}
      <div className="w-[32%] flex items-center justify-end gap-2.5 pl-4 border-l border-[#1a1f30]">
        {/* Push-to-Talk / Finish Speaking button */}
        {onTriggerProcessSpeech && (
          <button
            onClick={onTriggerProcessSpeech}
            disabled={isProcessingSpeech}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-indigo-600/30 hover:bg-indigo-600/45 text-cyan-300 border border-indigo-500/40 transition-all text-xs font-medium active:scale-95 cursor-pointer"
            title="Click when done speaking to immediately submit voice answer"
          >
            {isProcessingSpeech ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin text-cyan-300" />
            ) : (
              <Send className="w-3.5 h-3.5 text-cyan-400" />
            )}
            <span className="hidden sm:inline">Send Voice</span>
          </button>
        )}

        {/* Main Microphone Button */}
        <button
          onClick={onToggleMute}
          className={`flex items-center gap-2.5 px-3.5 py-2 rounded-xl font-semibold text-xs transition-all active:scale-95 shadow-md cursor-pointer ${
            isMuted
              ? "bg-rose-500/20 text-rose-300 border border-rose-500/40 hover:bg-rose-500/30 shadow-rose-950/40"
              : "bg-gradient-to-r from-emerald-600 to-teal-600 text-white hover:from-emerald-500 hover:to-teal-500 border border-emerald-400/40 shadow-emerald-950/40"
          }`}
          title={isMuted ? "Click to Unmute (Spacebar)" : "Click to Mute (Spacebar)"}
        >
          {isMuted ? (
            <>
              <MicOff className="w-4 h-4 text-rose-400" />
              <div className="flex flex-col text-left">
                <span className="leading-tight">Mic Muted</span>
                <span className="text-[9px] text-rose-300/80 font-mono">Track Disabled</span>
              </div>
            </>
          ) : (
            <>
              <div className="relative">
                <Mic className="w-4 h-4" />
                <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-emerald-300 animate-ping" />
              </div>
              <div className="flex flex-col text-left">
                <span className="leading-tight">Mic Live</span>
                <span className="text-[9px] text-emerald-200/90 font-mono">Broadcasting</span>
              </div>
            </>
          )}
        </button>

        {/* Video Toggle */}
        <button
          onClick={() => setIsVideoOn(!isVideoOn)}
          className={`p-2 rounded-xl border transition-all active:scale-95 cursor-pointer ${
            isVideoOn
              ? "bg-[#141724] border-[#22273c] text-slate-300 hover:text-white hover:bg-[#1b2033]"
              : "bg-rose-500/20 border-rose-500/40 text-rose-300 hover:bg-rose-500/30"
          }`}
          title={isVideoOn ? "Turn off camera" : "Turn on camera"}
        >
          {isVideoOn ? <Video className="w-3.5 h-3.5" /> : <VideoOff className="w-3.5 h-3.5" />}
        </button>

        {/* Screen Share */}
        <button
          onClick={() => setIsSharingScreen(!isSharingScreen)}
          className={`p-2 rounded-xl border transition-all active:scale-95 cursor-pointer ${
            isSharingScreen
              ? "bg-cyan-500/20 border-cyan-500/40 text-cyan-300 hover:bg-cyan-500/30"
              : "bg-[#141724] border-[#22273c] text-slate-300 hover:text-white hover:bg-[#1b2033]"
          }`}
          title={isSharingScreen ? "Stop Screen Share" : "Share Screen"}
        >
          <ScreenShare className="w-3.5 h-3.5" />
        </button>

        {/* Settings */}
        <button
          className="p-2 rounded-xl bg-[#141724] border border-[#22273c] text-slate-300 hover:text-white hover:bg-[#1b2033] transition-all active:scale-95 cursor-pointer"
          title="Audio & Video Settings"
        >
          <Settings className="w-3.5 h-3.5" />
        </button>

        {/* End Interview */}
        <button
          onClick={() => alert("Are you sure you want to conclude the interview session?")}
          className="flex items-center gap-1 px-2.5 py-2 rounded-xl bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/30 transition-all text-xs font-semibold active:scale-95 cursor-pointer"
          title="Conclude Interview"
        >
          <PhoneOff className="w-3.5 h-3.5 text-rose-400" />
          <span className="hidden xl:inline">Leave</span>
        </button>
      </div>
    </footer>
  );
}
