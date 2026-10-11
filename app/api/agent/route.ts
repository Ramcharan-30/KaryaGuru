import { NextRequest, NextResponse } from "next/server";

/**
 * Sarvam AI Interviewer Agent Orchestrator API Route
 * Official Schema Reference: https://docs.sarvam.ai/api-reference/chat/chat-completions-v1
 * Endpoint: POST https://api.sarvam.ai/v1/chat/completions
 * Model: sarvam-105b (128K context Indic flagship model)
 * Authentication: api-subscription-key header
 */

export interface AgentRequest {
  transcript: string;
  interviewStage: "DSA_1" | "DSA_2" | "SYS_DESIGN";
  code?: string;
}

export interface AgentResponse {
  responseText: string;
  nextStage: "DSA_1" | "DSA_2" | "SYS_DESIGN";
  shouldIncrementStage: boolean;
  stageIncrementCommand?: "ADVANCE_STAGE" | "RETAIN_STAGE";
  persona: string;
  systemPrompt: string;
  modelUsed?: string;
  meta?: {
    candidateTranscriptLength: number;
    codeSnippetLength: number;
    timestamp: string;
  };
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const transcript = (body.transcript || body.text || "").trim();
    const interviewStage: "DSA_1" | "DSA_2" | "SYS_DESIGN" =
      body.interviewStage || "DSA_1";
    const code = body.code || "";

    const lowerTranscript = transcript.toLowerCase();

    let systemPrompt = "";
    let persona = "";
    let fallbackResponseText = "";
    let nextStage: "DSA_1" | "DSA_2" | "SYS_DESIGN" = interviewStage;
    let shouldIncrementStage = false;

    // Engineered Persona & System Prompt switch
    switch (interviewStage) {
      case "DSA_1": {
        persona = "Friendly Junior Mentor";
        systemPrompt =
          "You are Elena, a friendly and encouraging junior engineering mentor evaluating DSA Level 1 (LRU Cache & Array/Pointer Logic). " +
          "Your tone is supportive, warm, and constructive. You verify basic pointer arithmetic, sentinel nodes, and O(1) operations. " +
          "If the candidate explains the logic well or asks to move forward, celebrate their progress and issue an increment command to advance to DSA_2.";

        const hasPassedOrReady =
          lowerTranscript.includes("next") ||
          lowerTranscript.includes("done") ||
          lowerTranscript.includes("pass") ||
          lowerTranscript.includes("ready") ||
          lowerTranscript.includes("complete") ||
          lowerTranscript.includes("sentinel") ||
          code.includes("class DistributedLRUCache") ||
          code.includes("def put");

        if (hasPassedOrReady && transcript.length > 0) {
          fallbackResponseText =
            "Awesome work! You handled the sentinel nodes and the O(1) doubly linked list eviction really smoothly. " +
            "Your edge case handling for TTL looks great. Let's level up! Advancing you to DSA Level 2: Concurrency & Rate Limiting.";
          nextStage = "DSA_2";
          shouldIncrementStage = true;
        } else if (transcript.length > 0) {
          fallbackResponseText =
            "That's a great train of thought! How do the dummy head and tail sentinel nodes make your removeNode and addNode methods simpler?";
          nextStage = "DSA_1";
          shouldIncrementStage = false;
        } else {
          fallbackResponseText =
            "Welcome to DSA Level 1! Walk me through your plan for implementing the LRU Cache with O(1) amortized get and put operations.";
          nextStage = "DSA_1";
          shouldIncrementStage = false;
        }
        break;
      }

      case "DSA_2": {
        persona = "Senior Systems Evaluator";
        systemPrompt =
          "You are Elena, a Senior Systems Evaluator assessing DSA Level 2 (Concurrency, Thread-safety & Token Bucket Rate Limiting). " +
          "Your tone is analytical, precise, and focused on race conditions, locks, and memory footprint. " +
          "If the candidate demonstrates thread-safety under concurrent load, increment the stage to SYS_DESIGN.";

        const hasPassedOrReady =
          lowerTranscript.includes("next") ||
          lowerTranscript.includes("whiteboard") ||
          lowerTranscript.includes("system design") ||
          lowerTranscript.includes("lock") ||
          lowerTranscript.includes("thread") ||
          code.includes("threading.Lock") ||
          code.includes("allow_request");

        if (hasPassedOrReady && transcript.length > 0) {
          fallbackResponseText =
            "Solid concurrency engineering. Your synchronization avoids race conditions during token replenishment. " +
            "Let's move out of the code editor and into architecture. Advancing you to System Design!";
          nextStage = "SYS_DESIGN";
          shouldIncrementStage = true;
        } else if (transcript.length > 0) {
          fallbackResponseText =
            "I see your token replenishment calculation. What is the lock contention overhead if 10,000 concurrent worker threads hit allow_request simultaneously?";
          nextStage = "DSA_2";
          shouldIncrementStage = false;
        } else {
          fallbackResponseText =
            "Welcome to DSA Level 2. Please explain how you protect against token starvation under heavy concurrent bursts.";
          nextStage = "DSA_2";
          shouldIncrementStage = false;
        }
        break;
      }

      case "SYS_DESIGN": {
        persona = "Strict Lead Architect";
        systemPrompt =
          "You are Elena, a strict, no-nonsense Lead Architect evaluating System Design and High-Scale Architecture. " +
          "Your tone is demanding, rigorous, and direct. You probe single points of failure, partition tolerance, thundering herd / cache stampede, and database replication lag. " +
          "Do not accept superficial answers.";

        const mentionsScalability =
          lowerTranscript.includes("redis") ||
          lowerTranscript.includes("cluster") ||
          lowerTranscript.includes("stampede") ||
          lowerTranscript.includes("consistent hashing") ||
          lowerTranscript.includes("kafka") ||
          lowerTranscript.includes("replica");

        if (mentionsScalability) {
          fallbackResponseText =
            "Good call on consistent hashing and multi-region replication. Now, how do you handle cache stampede (thundering herd) when a hot key expires during peak traffic? Walk me through mutex leases versus probabilistic early expiration.";
          nextStage = "SYS_DESIGN";
          shouldIncrementStage = false;
        } else if (transcript.length > 0) {
          fallbackResponseText =
            "That architecture still has a bottleneck at the API gateway layer. How will you shard your cache tier if memory usage exceeds 2 Terabytes across nodes?";
          nextStage = "SYS_DESIGN";
          shouldIncrementStage = false;
        } else {
          fallbackResponseText =
            "Welcome to the System Design phase. On the whiteboard, lay out a distributed caching tier supporting 500,000 QPS with write-behind persistence.";
          nextStage = "SYS_DESIGN";
          shouldIncrementStage = false;
        }
        break;
      }

      default: {
        persona = "AI Evaluator";
        systemPrompt = "Default evaluation prompt.";
        fallbackResponseText = "This is a mock AI response.";
        nextStage = "DSA_1";
        shouldIncrementStage = false;
        break;
      }
    }

    let finalResponseText = fallbackResponseText;
    let modelUsed = "local_engineered_prompt";

    const apiKey = process.env.SARVAM_API_KEY;

    // If Sarvam API key is configured, call Sarvam-105B Chat Completion API strictly matching its REST schema
    if (apiKey && apiKey !== "your_sarvam_api_key_here" && transcript.length > 0) {
      try {
        const sarvamChatResponse = await fetch("https://api.sarvam.ai/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "api-subscription-key": apiKey,
          },
          body: JSON.stringify({
            model: "sarvam-105b",
            messages: [
              {
                role: "system",
                content: `${systemPrompt}\n\nCandidate is currently at stage: ${interviewStage}.\nProvide concise, direct interviewer feedback (2 to 3 sentences maximum) suitable for spoken audio. You may use natural Hinglish where appropriate.`,
              },
              {
                role: "user",
                content: `Candidate said: "${transcript}"\nCurrent code on screen:\n\`\`\`\n${code}\n\`\`\``,
              },
            ],
            temperature: 0.2,
            max_tokens: 256,
          }),
        });

        if (sarvamChatResponse.ok) {
          const chatData = await sarvamChatResponse.json();
          const choice = chatData.choices?.[0];
          if (choice?.message?.content) {
            finalResponseText = choice.message.content.trim();
            modelUsed = "sarvam-105b";
          }
        } else {
          console.warn("Sarvam Chat Completion returned status:", sarvamChatResponse.status);
        }
      } catch (chatError) {
        console.warn("Failed calling Sarvam Chat Completion, using fallback logic:", chatError);
      }
    }

    const payload: AgentResponse = {
      responseText: finalResponseText,
      nextStage,
      shouldIncrementStage,
      stageIncrementCommand: shouldIncrementStage ? "ADVANCE_STAGE" : "RETAIN_STAGE",
      persona,
      systemPrompt,
      modelUsed,
      meta: {
        candidateTranscriptLength: transcript.length,
        codeSnippetLength: code.length,
        timestamp: new Date().toISOString(),
      },
    };

    return NextResponse.json(payload);
  } catch (error) {
    console.error("Error in /api/agent route:", error);
    return NextResponse.json(
      {
        error: "Internal server error in AI agent route",
        responseText: "This is a mock AI response",
        nextStage: "DSA_1",
        shouldIncrementStage: false,
        message: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
