import { NextRequest, NextResponse } from "next/server";

/**
 * Sarvam AI Interviewer Agent Orchestrator API Route
 * Integrates live LLM calls (Sarvam 105B Conversations / Generic wrapper)
 * Evaluates logic in Hinglish and outputs { responseText, nextStage }
 */

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

// Helper to safely extract JSON from LLM response (handling markdown code blocks or raw text)
function parseLlmJsonOutput(rawText: string): { responseText?: string; nextStage?: string } | null {
  if (!rawText) return null;
  const cleaned = rawText
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "")
    .trim();

  // Try direct parse
  try {
    const parsed = JSON.parse(cleaned);
    if (parsed && typeof parsed === "object") return parsed;
  } catch {
    // Try regex extraction of first {...}
  }

  const match = cleaned.match(/\{[\s\S]*\}/);
  if (match) {
    try {
      const parsed = JSON.parse(match[0]);
      if (parsed && typeof parsed === "object") return parsed;
    } catch {
      // Ignored
    }
  }

  return null;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const transcribedText = (body.transcript || body.text || "").trim();
    const interviewStage: "DSA_1" | "DSA_2" | "SYS_DESIGN" =
      body.interviewStage || "DSA_1";
    const code = body.code || "";

    // Determine the progression target
    const nextStageIfCorrect =
      interviewStage === "DSA_1"
        ? "DSA_2"
        : interviewStage === "DSA_2"
        ? "SYS_DESIGN"
        : "SYS_DESIGN";

    // System prompt exactly matching requested template
    const systemPrompt = `You are an expert technical interviewer. The user is currently at the ${interviewStage} level. The user just said: ${transcribedText}. Evaluate their logic. Respond in a mix of Hindi and English (Hinglish) in under 3 sentences. If they are correct, output a JSON object containing { responseText: "...", nextStage: "${nextStageIfCorrect}" }. If they are struggling, output { responseText: "...", nextStage: "${interviewStage}" }. Return ONLY the JSON object.`;

    let responseText = "";
    let nextStage: "DSA_1" | "DSA_2" | "SYS_DESIGN" = interviewStage;
    let modelUsed = "local_heuristic";

    const sarvamApiKey = process.env.SARVAM_API_KEY?.trim();
    const openaiApiKey = process.env.OPENAI_API_KEY?.trim();
    const geminiApiKey = process.env.GEMINI_API_KEY?.trim();

    // 1. Try Sarvam AI LLM (sarvam-105b-conversations or sarvam-105b)
    if (sarvamApiKey && sarvamApiKey !== "your_sarvam_api_key_here" && transcribedText.length > 0) {
      try {
        const sarvamRes = await fetch("https://api.sarvam.ai/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "api-subscription-key": sarvamApiKey,
          },
          body: JSON.stringify({
            model: "sarvam-105b-conversations",
            messages: [
              { role: "system", content: systemPrompt },
              {
                role: "user",
                content: code
                  ? `${transcribedText}\n\n[Candidate Code]:\n${code.slice(0, 500)}`
                  : transcribedText,
              },
            ],
            temperature: 0.2,
            max_tokens: 512,
          }),
        });

        if (sarvamRes.ok) {
          const sarvamData = await sarvamRes.json();
          const rawContent = sarvamData.choices?.[0]?.message?.content || "";
          const parsed = parseLlmJsonOutput(rawContent);

          if (parsed?.responseText) {
            responseText = parsed.responseText.trim();
            if (
              parsed.nextStage === "DSA_1" ||
              parsed.nextStage === "DSA_2" ||
              parsed.nextStage === "SYS_DESIGN"
            ) {
              nextStage = parsed.nextStage;
            }
            modelUsed = "sarvam-105b-conversations";
          }
        }
      } catch (err) {
        console.warn("Sarvam LLM call encountered an error:", err);
      }
    }

    // 2. Optional OpenAI fallback wrapper
    if (!responseText && openaiApiKey && transcribedText.length > 0) {
      try {
        const openaiRes = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${openaiApiKey}`,
          },
          body: JSON.stringify({
            model: "gpt-4o-mini",
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: transcribedText },
            ],
            response_format: { type: "json_object" },
            temperature: 0.2,
          }),
        });

        if (openaiRes.ok) {
          const data = await openaiRes.json();
          const rawContent = data.choices?.[0]?.message?.content || "";
          const parsed = parseLlmJsonOutput(rawContent);
          if (parsed?.responseText) {
            responseText = parsed.responseText.trim();
            if (parsed.nextStage) nextStage = parsed.nextStage as typeof nextStage;
            modelUsed = "openai-gpt-4o-mini";
          }
        }
      } catch (err) {
        console.warn("OpenAI fallback encountered an error:", err);
      }
    }

    // 3. Optional Gemini fallback wrapper
    if (!responseText && geminiApiKey && transcribedText.length > 0) {
      try {
        const geminiRes = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiApiKey}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [{ role: "user", parts: [{ text: `${systemPrompt}\n\nCandidate Input: ${transcribedText}` }] }],
              generationConfig: { responseMimeType: "application/json" },
            }),
          }
        );

        if (geminiRes.ok) {
          const data = await geminiRes.json();
          const rawContent = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
          const parsed = parseLlmJsonOutput(rawContent);
          if (parsed?.responseText) {
            responseText = parsed.responseText.trim();
            if (parsed.nextStage) nextStage = parsed.nextStage as typeof nextStage;
            modelUsed = "gemini-1.5-flash";
          }
        }
      } catch (err) {
        console.warn("Gemini fallback encountered an error:", err);
      }
    }

    // 4. Resilient Heuristic Fallback (guarantees graceful response if offline or empty input)
    if (!responseText) {
      const lower = transcribedText.toLowerCase();
      const isCorrect =
        lower.includes("sentinel") ||
        lower.includes("hash") ||
        lower.includes("doubly") ||
        lower.includes("o(1)") ||
        lower.includes("lock") ||
        lower.includes("token") ||
        lower.includes("redis") ||
        lower.includes("cluster") ||
        lower.includes("done") ||
        lower.includes("ready") ||
        lower.includes("pass");

      if (isCorrect && transcribedText.length > 0) {
        responseText =
          interviewStage === "DSA_1"
            ? "Aapka logic bilkul sahi hai! Sentinel nodes aur doubly linked list ke sath O(1) operations perfectly achieve ho rahe hain, chaliye ab agle round par move karte hain."
            : interviewStage === "DSA_2"
            ? "Concurrency handling aur lock synchronization bohot badhiya hai! Token replenishment race conditions avoid karta hai, advancing to System Design."
            : "Consistent hashing aur partition replication architecture bohot solid hai. Scalability criteria meet ho chuki hai!";
        nextStage = nextStageIfCorrect;
      } else if (transcribedText.length > 0) {
        responseText =
          interviewStage === "DSA_1"
            ? "Aapki approach achi hai par O(1) eviction ke liye doubly linked list ke pointers ko kaise update karenge? Thoda detail me explain karein."
            : interviewStage === "DSA_2"
            ? "High concurrent worker threads ke case me lock contention overhead kaise manage karenge? Thoda analyze karein."
            : "Whiteboard par distributed caching tier me cache stampede handle karne ke liye kya strategy use karenge?";
        nextStage = interviewStage;
      } else {
        responseText =
          interviewStage === "DSA_1"
            ? "Welcome to DSA Level 1! LRU Cache ke O(1) get aur put operations ke liye apna core plan explain kijiye."
            : interviewStage === "DSA_2"
            ? "Welcome to DSA Level 2! Rate limiting concurrency aur thread synchronization ke baare me batayein."
            : "Welcome to System Design! Whiteboard par high-scale distributed cache architecture draw kijiye.";
        nextStage = interviewStage;
      }
    }

    const shouldIncrementStage = nextStage !== interviewStage;

    const payload: AgentResponse = {
      responseText,
      nextStage,
      shouldIncrementStage,
      stageIncrementCommand: shouldIncrementStage ? "ADVANCE_STAGE" : "RETAIN_STAGE",
      persona: "Elena (Expert Technical Interviewer)",
      systemPrompt,
      modelUsed,
      meta: {
        candidateTranscriptLength: transcribedText.length,
        codeSnippetLength: code.length,
        timestamp: new Date().toISOString(),
      },
    };

    return NextResponse.json(payload);
  } catch (error) {
    console.error("Error in /api/agent route:", error);
    return NextResponse.json(
      {
        responseText: "Kuch technical issue hua, kripya apna point dobara explain karein.",
        nextStage: "DSA_1",
        shouldIncrementStage: false,
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
