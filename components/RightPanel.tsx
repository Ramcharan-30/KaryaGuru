"use client";

import React, { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import Editor from "@monaco-editor/react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Code2,
  PenTool,
  Play,
  Terminal,
  Clock,
  Sparkles,
  CheckCircle2,
  Copy,
  Check,
  Cpu,
} from "lucide-react";

// Dynamically import Excalidraw to ensure client-side only execution in Next.js App Router
const ExcalidrawWorkspace = dynamic(
  () => import("@/components/ExcalidrawWrapper"),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-full flex items-center justify-center bg-[#0a0b12] text-slate-400">
        <div className="flex items-center gap-2.5">
          <div className="w-4 h-4 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
          <span className="text-xs font-mono">Loading Architecture Whiteboard...</span>
        </div>
      </div>
    ),
  }
);

export type InterviewStage = "DSA_1" | "DSA_2" | "SYS_DESIGN";

interface RightPanelProps {
  interviewStage?: InterviewStage;
  onStageChange?: (stage: InterviewStage) => void;
  onCodeChange?: (code: string) => void;
}

const PYTHON_DSA_1_STARTER = `# Micro1 Assessment - DSA Level 1: LRU Cache with Millisecond TTL
# Design an O(1) Cache data structure with millisecond-precision key expiration.

import time
from typing import Any, Optional

class Node:
    def __init__(self, key: str, val: Any, ttl_ms: int):
        self.key = key
        self.val = val
        self.expires_at = time.time() * 1000 + ttl_ms
        self.prev: Optional['Node'] = None
        self.next: Optional['Node'] = None

class DistributedLRUCache:
    def __init__(self, capacity: int):
        self.capacity = capacity
        self.cache = {}
        # Dummy sentinel nodes to avoid null pointers
        self.head = Node("__HEAD__", None, float('inf'))
        self.tail = Node("__TAIL__", None, float('inf'))
        self.head.next = self.tail
        self.tail.prev = self.head

    def get(self, key: str) -> Any:
        if key not in self.cache:
            return -1
        node = self.cache[key]
        # Check TTL expiration
        if time.time() * 1000 > node.expires_at:
            self._remove(node)
            del self.cache[key]
            return -1
        self._move_to_head(node)
        return node.val

    def put(self, key: str, val: Any, ttl_ms: int = 60000) -> None:
        if key in self.cache:
            node = self.cache[key]
            node.val = val
            node.expires_at = time.time() * 1000 + ttl_ms
            self._move_to_head(node)
            return

        if len(self.cache) >= self.capacity:
            lru = self.tail.prev
            self._remove(lru)
            del self.cache[lru.key]

        new_node = Node(key, val, ttl_ms)
        self.cache[key] = new_node
        self._add_to_head(new_node)

    def _add_to_head(self, node: Node) -> None:
        node.prev = self.head
        node.next = self.head.next
        self.head.next.prev = node
        self.head.next = node

    def _remove(self, node: Node) -> None:
        node.prev.next = node.next
        node.next.prev = node.prev

    def _move_to_head(self, node: Node) -> None:
        self._remove(node)
        self._add_to_head(node)
`;

const CPP_DSA_1_STARTER = `// Micro1 Assessment - DSA Level 1: LRU Cache with Millisecond TTL
#include <iostream>
#include <unordered_map>
#include <chrono>
#include <string>

using namespace std;

struct Node {
    string key;
    int val;
    long long expiresAt;
    Node* prev;
    Node* next;
    Node(string k, int v, long long exp) : key(k), val(v), expiresAt(exp), prev(nullptr), next(nullptr) {}
};

class DistributedLRUCache {
private:
    int capacity;
    unordered_map<string, Node*> cache;
    Node* head;
    Node* tail;

    long long currentMs() {
        return chrono::duration_cast<chrono::milliseconds>(
            chrono::system_clock::now().time_since_epoch()).count();
    }

public:
    DistributedLRUCache(int cap) : capacity(cap) {
        head = new Node("__HEAD__", -1, 1e18);
        tail = new Node("__TAIL__", -1, 1e18);
        head->next = tail;
        tail->prev = head;
    }

    int get(string key) {
        if (cache.find(key) == cache.end()) return -1;
        Node* node = cache[key];
        if (currentMs() > node->expiresAt) {
            removeNode(node);
            cache.erase(key);
            delete node;
            return -1;
        }
        moveToHead(node);
        return node->val;
    }

    void put(string key, int value, int ttlMs = 60000) {
        if (cache.find(key) != cache.end()) {
            Node* node = cache[key];
            node->val = value;
            node->expiresAt = currentMs() + ttlMs;
            moveToHead(node);
            return;
        }
        if (cache.size() >= capacity) {
            Node* lru = tail->prev;
            removeNode(lru);
            cache.erase(lru->key);
            delete lru;
        }
        Node* newNode = new Node(key, value, currentMs() + ttlMs);
        cache[key] = newNode;
        addNode(newNode);
    }

private:
    void addNode(Node* node) {
        node->prev = head;
        node->next = head->next;
        head->next->prev = node;
        head->next = node;
    }

    void removeNode(Node* node) {
        node->prev->next = node->next;
        node->next->prev = node->prev;
    }

    void moveToHead(Node* node) {
        removeNode(node);
        addNode(node);
    }
};
`;

const PYTHON_DSA_2_STARTER = `# Micro1 Assessment - DSA Level 2: Distributed Concurrency & Rate Limiter
# Design a Token Bucket algorithm with Sliding Window Log under high concurrency.

import time
import threading

class DistributedRateLimiter:
    def __init__(self, capacity: int, refill_rate_per_sec: float):
        self.capacity = capacity
        self.tokens = float(capacity)
        self.refill_rate = refill_rate_per_sec
        self.last_refill = time.time()
        self.lock = threading.Lock()

    def allow_request(self, tokens_needed: int = 1) -> bool:
        with self.lock:
            now = time.time()
            elapsed = now - self.last_refill
            self.tokens = min(self.capacity, self.tokens + elapsed * self.refill_rate)
            self.last_refill = now

            if self.tokens >= tokens_needed:
                self.tokens -= tokens_needed
                return True
            return False
`;

export default function RightPanel({
  interviewStage: propStage,
  onStageChange,
  onCodeChange,
}: RightPanelProps) {
  // Internal stage state with fallback
  const [internalStage, setInternalStage] = useState<InterviewStage>("DSA_1");
  const interviewStage = propStage ?? internalStage;

  const handleStageSelect = (stage: InterviewStage) => {
    if (onStageChange) {
      onStageChange(stage);
    } else {
      setInternalStage(stage);
    }
  };

  // Editor states with per-stage preservation
  const [language, setLanguage] = useState<"python" | "cpp">("python");
  const [stageCodes, setStageCodes] = useState<Record<string, Record<"python" | "cpp", string>>>({
    DSA_1: { python: PYTHON_DSA_1_STARTER, cpp: CPP_DSA_1_STARTER },
    DSA_2: { python: PYTHON_DSA_2_STARTER, cpp: CPP_DSA_1_STARTER },
  });
  const [isRunning, setIsRunning] = useState(false);
  const [activeTestTab, setActiveTestTab] = useState<"test1" | "test2" | "test3">("test1");
  const [copied, setCopied] = useState(false);
  const [showConsole, setShowConsole] = useState(true);

  const currentCode = stageCodes[interviewStage]?.[language] || "";

  useEffect(() => {
    onCodeChange?.(currentCode);
  }, [currentCode, onCodeChange]);

  const setCurrentCode = (val: string) => {
    setStageCodes((prev) => ({
      ...prev,
      [interviewStage]: {
        ...(prev[interviewStage] || { python: "", cpp: "" }),
        [language]: val,
      },
    }));
  };

  const handleRunCode = () => {
    setIsRunning(true);
    setShowConsole(true);
    setTimeout(() => {
      setIsRunning(false);
    }, 750);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(currentCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const isDsaStage = interviewStage === "DSA_1" || interviewStage === "DSA_2";

  return (
    <section className="w-[70%] h-full flex flex-col bg-[#090a10] border-l border-[#1a1f2e] relative overflow-hidden select-none shadow-2xl shadow-black/60">
      {/* TOP HEADER: WORKSPACE DYNAMIC STAGE SELECTOR & CONTROLS */}
      <header className="h-12 border-b border-[#1b2030] bg-[#0c0e16]/95 backdrop-blur-md px-4 flex items-center justify-between z-20 shrink-0">
        {/* Left: Interactive Stage Selector Tabs */}
        <div className="flex items-center gap-1.5 bg-[#121522] p-1 rounded-lg border border-[#1f2538] shadow-inner">
          <button
            onClick={() => handleStageSelect("DSA_1")}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium transition-all ${
              interviewStage === "DSA_1"
                ? "bg-indigo-600/30 text-indigo-300 border border-indigo-500/40 shadow-sm"
                : "text-slate-400 hover:text-slate-200 hover:bg-white/5"
            }`}
          >
            <Code2 className="w-3.5 h-3.5 text-cyan-400" />
            <span>DSA Level 1</span>
          </button>

          <button
            onClick={() => handleStageSelect("DSA_2")}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium transition-all ${
              interviewStage === "DSA_2"
                ? "bg-indigo-600/30 text-indigo-300 border border-indigo-500/40 shadow-sm"
                : "text-slate-400 hover:text-slate-200 hover:bg-white/5"
            }`}
          >
            <Cpu className="w-3.5 h-3.5 text-indigo-400" />
            <span>DSA Level 2</span>
          </button>

          <button
            onClick={() => handleStageSelect("SYS_DESIGN")}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium transition-all ${
              interviewStage === "SYS_DESIGN"
                ? "bg-indigo-600/30 text-indigo-300 border border-indigo-500/40 shadow-sm"
                : "text-slate-400 hover:text-slate-200 hover:bg-white/5"
            }`}
          >
            <PenTool className="w-3.5 h-3.5 text-purple-400" />
            <span>System Design</span>
          </button>
        </div>

        {/* Right: Stage Specific Controls */}
        <div className="flex items-center gap-2.5">
          {/* Language Selector (Python by default, or C++) for DSA */}
          {isDsaStage && (
            <div className="flex items-center gap-1.5 bg-[#131625] border border-[#22273a] px-2.5 py-1 rounded-md text-xs text-slate-300 shadow-sm">
              <span className={`w-2 h-2 rounded-full ${language === "python" ? "bg-emerald-400" : "bg-blue-400"}`} />
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value as "python" | "cpp")}
                className="bg-transparent text-slate-200 text-xs focus:outline-none cursor-pointer font-medium"
              >
                <option value="python" className="bg-[#121522]">Python 3.12 (Default)</option>
                <option value="cpp" className="bg-[#121522]">C++ (GCC 14)</option>
              </select>
            </div>
          )}

          {/* Session Timer */}
          <div className="flex items-center gap-1.5 bg-[#131625] border border-[#22273a] px-2.5 py-1 rounded-md text-xs font-mono text-amber-300 shadow-sm">
            <Clock className="w-3.5 h-3.5 text-amber-400" />
            <span>34:18 remaining</span>
          </div>

          {/* Run Code Button (Prominent at top right for DSA) */}
          {isDsaStage && (
            <div className="flex items-center gap-2">
              <button
                onClick={handleCopy}
                className="p-1.5 rounded-md bg-[#131625] border border-[#22273a] text-slate-400 hover:text-white transition-colors"
                title="Copy solution code"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              </button>

              <button
                onClick={handleRunCode}
                disabled={isRunning}
                className="flex items-center gap-2 bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 hover:from-emerald-500 hover:via-teal-500 hover:to-cyan-500 text-white shadow-lg shadow-emerald-700/25 border border-emerald-400/30 px-3.5 py-1.5 rounded-md text-xs font-semibold transition-all active:scale-95 cursor-pointer"
              >
                {isRunning ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Executing...</span>
                  </>
                ) : (
                  <>
                    <Play className="w-3.5 h-3.5 fill-white" />
                    <span>Run Code</span>
                  </>
                )}
              </button>
            </div>
          )}

          {/* Whiteboard Badge for System Design */}
          {interviewStage === "SYS_DESIGN" && (
            <div className="flex items-center gap-1.5 bg-purple-950/40 border border-purple-800/40 px-3 py-1 rounded-md text-xs text-purple-300">
              <Sparkles className="w-3.5 h-3.5 text-purple-400" />
              <span>Interactive Architecture Canvas</span>
            </div>
          )}
        </div>
      </header>

      {/* DYNAMIC CONTENT WORKSPACE WITH SMOOTH FADE TRANSITIONS */}
      <div className="flex-1 flex flex-col min-h-0 relative overflow-hidden bg-[#0a0b12]">
        <AnimatePresence mode="wait">
          {/* DSA LEVEL 1 & DSA LEVEL 2: MONACO EDITOR */}
          {isDsaStage && (
            <motion.div
              key={interviewStage}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.22, ease: "easeInOut" }}
              className="flex-1 flex flex-col min-h-0 w-full h-full"
            >
              {/* Problem Brief Header */}
              <div className="bg-[#0e101a] border-b border-[#1b1f2e] px-4 py-2 flex items-center justify-between text-xs shrink-0">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-white">
                    {interviewStage === "DSA_1" ? "Problem 1 (DSA Level 1):" : "Problem 2 (DSA Level 2):"}
                  </span>
                  <span className="text-slate-300">
                    {interviewStage === "DSA_1"
                      ? "In-Memory LRU Cache with Millisecond TTL Expiration"
                      : "Distributed Token Bucket Rate Limiter with Sliding Window"}
                  </span>
                  <span className="bg-indigo-500/15 text-indigo-300 border border-indigo-500/30 px-2 py-0.5 rounded text-[10px] font-mono">
                    {language.toUpperCase()}
                  </span>
                </div>
                <div className="text-[11px] text-slate-400 font-mono">
                  Complexity Target: O(1) Amortized
                </div>
              </div>

              {/* Monaco Code Editor */}
              <div className="flex-1 min-h-0 relative overflow-hidden border-b border-[#1b1f2e]">
                <Editor
                  height="100%"
                  theme="vs-dark"
                  language={language === "cpp" ? "cpp" : "python"}
                  value={currentCode}
                  onChange={(val) => setCurrentCode(val || "")}
                  options={{
                    minimap: { enabled: false },
                    fontSize: 13,
                    fontFamily: "'JetBrains Mono', 'Fira Code', Menlo, Consolas, monospace",
                    fontLigatures: true,
                    lineNumbers: "on",
                    glyphMargin: false,
                    folding: true,
                    lineDecorationsWidth: 10,
                    lineNumbersMinChars: 3,
                    scrollBeyondLastLine: false,
                    automaticLayout: true,
                    tabSize: 4,
                    padding: { top: 12, bottom: 12 },
                    renderLineHighlight: "all",
                    scrollbar: {
                      vertical: "hidden",
                      horizontal: "hidden",
                      handleMouseWheel: true,
                    },
                  }}
                  loading={
                    <div className="w-full h-full flex items-center justify-center bg-[#0a0b12] text-slate-400">
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
                        <span className="text-xs font-mono">Loading Monaco Editor (vs-dark)...</span>
                      </div>
                    </div>
                  }
                />
              </div>

              {/* Bottom Console / Test Execution Suite Drawer */}
              {showConsole && (
                <div className="h-40 border-t border-[#1b1f2e] bg-[#0c0e17] flex flex-col shrink-0 shadow-lg">
                  <div className="flex items-center justify-between px-4 py-2 border-b border-[#1a1e2d] bg-[#0f121d]">
                    <div className="flex items-center gap-2">
                      <Terminal className="w-3.5 h-3.5 text-cyan-400" />
                      <span className="text-xs font-semibold text-slate-200">Test Execution Output</span>
                      <span className="text-[10px] text-emerald-400 bg-emerald-950/60 border border-emerald-800/40 px-2 py-0.5 rounded-full font-mono">
                        3/3 Passing
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => setActiveTestTab("test1")}
                        className={`px-2.5 py-1 rounded text-[11px] font-medium transition-colors ${
                          activeTestTab === "test1"
                            ? "bg-indigo-600/30 text-indigo-300 border border-indigo-500/40"
                            : "text-slate-400 hover:text-white"
                        }`}
                      >
                        Case 1 (Basic)
                      </button>
                      <button
                        onClick={() => setActiveTestTab("test2")}
                        className={`px-2.5 py-1 rounded text-[11px] font-medium transition-colors ${
                          activeTestTab === "test2"
                            ? "bg-indigo-600/30 text-indigo-300 border border-indigo-500/40"
                            : "text-slate-400 hover:text-white"
                        }`}
                      >
                        Case 2 (TTL Eviction)
                      </button>
                      <button
                        onClick={() => setActiveTestTab("test3")}
                        className={`px-2.5 py-1 rounded text-[11px] font-medium transition-colors ${
                          activeTestTab === "test3"
                            ? "bg-indigo-600/30 text-indigo-300 border border-indigo-500/40"
                            : "text-slate-400 hover:text-white"
                        }`}
                      >
                        Case 3 (Concurrency)
                      </button>
                    </div>
                  </div>

                  <div className="flex-1 p-3 font-mono text-xs flex items-center justify-between gap-6 overflow-hidden">
                    <div className="flex-1 space-y-1 text-slate-300">
                      {activeTestTab === "test1" && (
                        <>
                          <div className="flex items-center gap-2 text-emerald-400 font-semibold">
                            <CheckCircle2 className="w-4 h-4" />
                            <span>Test Case 1 Passed (1.2ms)</span>
                          </div>
                          <div className="text-slate-400 text-[11px]">
                            Input: <code className="text-cyan-300">cache.put(&apos;alpha&apos;, 100); cache.get(&apos;alpha&apos;)</code>
                          </div>
                          <div className="text-slate-400 text-[11px]">
                            Expected: <span className="text-slate-200">100</span> | Output: <span className="text-emerald-400">100</span>
                          </div>
                        </>
                      )}

                      {activeTestTab === "test2" && (
                        <>
                          <div className="flex items-center gap-2 text-emerald-400 font-semibold">
                            <CheckCircle2 className="w-4 h-4" />
                            <span>Test Case 2 Passed (51.4ms)</span>
                          </div>
                          <div className="text-slate-400 text-[11px]">
                            Input: <code className="text-cyan-300">cache.put(&apos;key&apos;, 42, ttl=50); sleep(0.06); cache.get(&apos;key&apos;)</code>
                          </div>
                          <div className="text-slate-400 text-[11px]">
                            Expected: <span className="text-slate-200">-1 (TTL Expired)</span> | Output: <span className="text-emerald-400">-1</span>
                          </div>
                        </>
                      )}

                      {activeTestTab === "test3" && (
                        <>
                          <div className="flex items-center gap-2 text-emerald-400 font-semibold">
                            <CheckCircle2 className="w-4 h-4" />
                            <span>Test Case 3 Passed (9.8ms)</span>
                          </div>
                          <div className="text-slate-400 text-[11px]">
                            Input: <code className="text-cyan-300">10,000 Concurrent Writes across 8 Threads</code>
                          </div>
                          <div className="text-slate-400 text-[11px]">
                            Status: <span className="text-emerald-400">0 Data Races, 0 Memory Leaks</span>
                          </div>
                        </>
                      )}
                    </div>

                    <div className="w-48 bg-[#131625] border border-[#21273c] p-2.5 rounded-lg space-y-1 text-[11px] shrink-0">
                      <div className="flex justify-between text-slate-400">
                        <span>Runtime:</span>
                        <span className="text-emerald-400 font-semibold">12 ms (99%)</span>
                      </div>
                      <div className="flex justify-between text-slate-400">
                        <span>Memory:</span>
                        <span className="text-slate-200">34.1 MB (96%)</span>
                      </div>
                      <div className="flex justify-between text-slate-400">
                        <span>Complexity:</span>
                        <span className="text-cyan-300">O(1)</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {/* SYSTEM DESIGN: EXCALIDRAW WHITEBOARD */}
          {interviewStage === "SYS_DESIGN" && (
            <motion.div
              key="SYS_DESIGN"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.22, ease: "easeInOut" }}
              className="flex-1 flex flex-col min-h-0 w-full h-full relative"
            >
              {/* Whiteboard Sub-header */}
              <div className="bg-[#0e101a] border-b border-[#1b1f2e] px-4 py-2 flex items-center justify-between text-xs shrink-0">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-white">System Design Architecture Challenge:</span>
                  <span className="text-slate-300">
                    Design a Global Distributed Caching Tier with Read-Through / Write-Behind replication
                  </span>
                </div>
                <div className="text-[11px] text-purple-300 flex items-center gap-1.5 font-mono">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span>Excalidraw Canvas Active</span>
                </div>
              </div>

              {/* Excalidraw Component Container */}
              <div className="flex-1 min-h-0 w-full h-full relative overflow-hidden">
                <ExcalidrawWorkspace />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </section>
  );
}
