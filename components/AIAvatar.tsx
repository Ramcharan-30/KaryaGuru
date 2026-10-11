"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Mic, Volume2 } from "lucide-react";

interface AIAvatarProps {
  isAiSpeaking: boolean;
  isUserSpeaking: boolean;
  userVolume?: number; // 0 to 100
  isMuted?: boolean;
  interviewStarted?: boolean;
}

export default function AIAvatar({
  isAiSpeaking,
  isUserSpeaking,
  userVolume = 0,
  isMuted = false,
  interviewStarted = false,
}: AIAvatarProps) {
  return (
    <div className="relative flex flex-col items-center justify-center my-0 select-none">
      {/* OUTER CONCENTRIC AURA RINGS */}
      <div className="relative flex items-center justify-center w-52 h-52">
        {/* Blue/Purple Pulsing Aura when AI Speaking */}
        {isAiSpeaking && (
          <>
            <motion.div
              animate={{
                scale: [1, 1.35, 1.1, 1.45, 1],
                opacity: [0.35, 0.7, 0.4, 0.8, 0.35],
              }}
              transition={{
                duration: 2.2,
                repeat: Infinity,
                ease: "easeInOut",
              }}
              className="absolute w-52 h-52 rounded-full bg-gradient-to-tr from-indigo-600/30 via-purple-600/30 to-cyan-500/20 blur-xl pointer-events-none"
            />
            <motion.div
              animate={{
                scale: [0.95, 1.25, 0.95],
                opacity: [0.5, 0.9, 0.5],
              }}
              transition={{
                duration: 1.6,
                repeat: Infinity,
                ease: "easeInOut",
              }}
              className="absolute w-44 h-44 rounded-full border border-indigo-400/40 pointer-events-none"
            />
            <motion.div
              animate={{
                rotate: 360,
              }}
              transition={{
                duration: 12,
                repeat: Infinity,
                ease: "linear",
              }}
              className="absolute w-48 h-48 rounded-full border border-dashed border-cyan-400/30 pointer-events-none"
            />
          </>
        )}

        {/* Idle Breathing Aura when AI is not speaking */}
        {!isAiSpeaking && (
          <motion.div
            animate={{
              scale: [1, 1.08, 1],
              opacity: [0.25, 0.45, 0.25],
            }}
            transition={{
              duration: 3.8,
              repeat: Infinity,
              ease: "easeInOut",
            }}
            className="absolute w-48 h-48 rounded-full bg-indigo-600/15 blur-lg pointer-events-none"
          />
        )}

        {/* CENTRAL DIGITAL ORB */}
        <motion.div
          animate={
            isAiSpeaking
              ? {
                  scale: [1, 1.14, 0.97, 1.12, 1],
                  boxShadow: [
                    "0 0 30px rgba(99, 102, 241, 0.6), 0 0 60px rgba(168, 85, 247, 0.4)",
                    "0 0 50px rgba(99, 102, 241, 0.9), 0 0 90px rgba(168, 85, 247, 0.7)",
                    "0 0 35px rgba(99, 102, 241, 0.6), 0 0 65px rgba(168, 85, 247, 0.5)",
                    "0 0 55px rgba(99, 102, 241, 0.85), 0 0 95px rgba(168, 85, 247, 0.65)",
                    "0 0 30px rgba(99, 102, 241, 0.6), 0 0 60px rgba(168, 85, 247, 0.4)",
                  ],
                }
              : {
                  scale: [1, 1.04, 1],
                  boxShadow: [
                    "0 0 20px rgba(99, 102, 241, 0.3), 0 0 40px rgba(168, 85, 247, 0.15)",
                    "0 0 28px rgba(99, 102, 241, 0.45), 0 0 55px rgba(168, 85, 247, 0.25)",
                    "0 0 20px rgba(99, 102, 241, 0.3), 0 0 40px rgba(168, 85, 247, 0.15)",
                  ],
                }
          }
          transition={{
            duration: isAiSpeaking ? 2.0 : 4.0,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          className="relative z-10 w-28 h-28 rounded-full p-[3px] bg-gradient-to-tr from-indigo-500 via-purple-500 to-cyan-400 flex items-center justify-center cursor-default"
        >
          {/* Inner Core */}
          <div className="w-full h-full rounded-full bg-gradient-to-b from-[#141829] via-[#0d101d] to-[#080911] flex flex-col items-center justify-center relative overflow-hidden">
            {/* Shimmer Radial Background */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_35%,rgba(99,102,241,0.5),transparent_70%)]" />

            {/* Glowing Glyphs & Waves inside orb */}
            <motion.div
              animate={
                isAiSpeaking
                  ? {
                      scale: [0.95, 1.15, 0.95],
                      rotate: [0, 8, -8, 0],
                    }
                  : {
                      scale: [1, 1.03, 1],
                    }
              }
              transition={{
                duration: isAiSpeaking ? 1.8 : 3.5,
                repeat: Infinity,
                ease: "easeInOut",
              }}
              className="relative z-10 flex flex-col items-center"
            >
              <div className="relative">
                <Volume2 className="w-9 h-9 text-cyan-300 drop-shadow-[0_0_14px_rgba(34,211,238,0.8)]" />
                <Sparkles className="w-3.5 h-3.5 text-indigo-300 absolute -top-1.5 -right-2 animate-bounce" />
              </div>
            </motion.div>

            {/* Sub-label inside orb */}
            <div className="absolute bottom-1.5 inset-x-0 flex items-center justify-center">
              <span className="text-[8px] font-mono tracking-widest text-cyan-300 uppercase opacity-80">
                Elena • AI
              </span>
            </div>
          </div>
        </motion.div>

        {/* State Pill Badge overlapping orb base */}
        <div className="absolute -bottom-2 z-20">
          <motion.div
            animate={
              isAiSpeaking
                ? { scale: [1, 1.05, 1] }
                : isUserSpeaking
                ? { scale: [1, 1.05, 1] }
                : {}
            }
            transition={{ duration: 1.2, repeat: Infinity }}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-full border shadow-xl backdrop-blur-md transition-colors ${
              isAiSpeaking
                ? "bg-indigo-950/80 border-indigo-500/60 shadow-indigo-500/25 text-indigo-200"
                : isUserSpeaking
                ? "bg-emerald-950/80 border-emerald-500/60 shadow-emerald-500/25 text-emerald-200"
                : "bg-[#121624]/90 border-[#2b334a] text-slate-300"
            }`}
          >
            <span className="relative flex h-2 w-2">
              <span
                className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                  isAiSpeaking
                    ? "bg-cyan-400"
                    : isUserSpeaking
                    ? "bg-emerald-400"
                    : "bg-slate-400"
                }`}
              />
              <span
                className={`relative inline-flex rounded-full h-2 w-2 ${
                  isAiSpeaking
                    ? "bg-cyan-400"
                    : isUserSpeaking
                    ? "bg-emerald-400"
                    : "bg-slate-500"
                }`}
              />
            </span>
            <span className="text-[11px] font-semibold tracking-wide">
              {isAiSpeaking
                ? "Elena Speaking..."
                : isUserSpeaking
                ? "Candidate Speaking..."
                : interviewStarted
                ? "Listening for answers..."
                : "Standby"}
            </span>
          </motion.div>
        </div>
      </div>

      {/* SUBTLE GREEN AUDIO WAVEFORM & RIPPLE EFFECT BELOW ORB WHEN USER IS SPEAKING */}
      <div className="h-11 w-full flex flex-col items-center justify-center mt-1 px-4 relative">
        <AnimatePresence mode="wait">
          {isUserSpeaking && !isMuted ? (
            <motion.div
              key="user-speaking-indicator"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.2 }}
              className="w-full flex flex-col items-center justify-center"
            >
              {/* Expanding subtle green ripple rings behind bars */}
              <div className="relative flex items-center justify-center w-full">
                <motion.div
                  animate={{
                    scale: [0.8, 1.4],
                    opacity: [0.6, 0],
                  }}
                  transition={{
                    duration: 1.5,
                    repeat: Infinity,
                    ease: "easeOut",
                  }}
                  className="absolute w-24 h-8 rounded-full border border-emerald-400/40 pointer-events-none"
                />

                {/* Dynamic Green Waveform Bars */}
                <div className="flex items-center gap-[4px] h-8 px-3 py-1 bg-emerald-950/40 border border-emerald-500/30 rounded-xl shadow-lg shadow-emerald-950/50">
                  <Mic className="w-3.5 h-3.5 text-emerald-400 shrink-0 mr-1 animate-pulse" />
                  {[35, 65, 95, 50, 85, 100, 75, 45, 90, 60, 30].map((baseHeight, i) => {
                    const dynamicScale = Math.max(0.2, (userVolume / 100) * (baseHeight / 100));
                    return (
                      <motion.div
                        key={i}
                        animate={{
                          height: [
                            `${Math.max(6, baseHeight * 0.35)}px`,
                            `${Math.max(10, baseHeight * 0.95)}px`,
                            `${Math.max(6, baseHeight * 0.25)}px`,
                          ],
                        }}
                        transition={{
                          duration: 0.3 + (i % 4) * 0.1,
                          repeat: Infinity,
                          ease: "easeInOut",
                        }}
                        className="w-1 rounded-full bg-gradient-to-t from-emerald-600 to-teal-300"
                        style={{
                          height: `${Math.max(8, dynamicScale * 28)}px`,
                        }}
                      />
                    );
                  })}
                </div>
              </div>

              <div className="text-[10px] text-emerald-400 font-mono mt-1 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                <span>Microphone Input Active • Processing Stream</span>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="idle-indicator"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-center"
            >
              {isMuted ? (
                <div className="flex items-center gap-1.5 text-[11px] text-rose-400/80 bg-rose-950/20 border border-rose-900/30 px-2.5 py-1 rounded-full">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                  <span>Microphone Muted (Track Disabled)</span>
                </div>
              ) : (
                <p className="text-[11px] text-slate-500 font-mono">
                  {interviewStarted
                    ? "Speak naturally into your microphone"
                    : "Click 'Start Interview' to connect mic"}
                </p>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
