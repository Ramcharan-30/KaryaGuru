import { NextRequest, NextResponse } from "next/server";

/**
 * Sarvam AI Text-to-Speech (TTS) API Route
 * Official Schema Reference: https://docs.sarvam.ai/api-reference/text-to-speech/convert
 * Endpoint: POST https://api.sarvam.ai/text-to-speech
 * Authentication: api-subscription-key header
 */

// Supported BCP-47 language codes for Sarvam TTS
const VALID_LANGUAGE_CODES = new Set([
  "bn-IN", "en-IN", "gu-IN", "hi-IN", "kn-IN",
  "ml-IN", "mr-IN", "od-IN", "pa-IN", "ta-IN", "te-IN"
]);

// Minimal valid 44-byte PCM WAV header for local dev fallback
function createSilentWavBuffer(): Uint8Array {
  const sampleRate = 16000;
  const numChannels = 1;
  const bitsPerSample = 16;
  const numSamples = 8000; // 0.5s of silence
  const dataByteLength = numSamples * numChannels * (bitsPerSample / 8);
  const buffer = Buffer.alloc(44 + dataByteLength);

  buffer.write("RIFF", 0);
  buffer.writeUInt32LE(36 + dataByteLength, 4);
  buffer.write("WAVE", 8);

  buffer.write("fmt ", 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20); // PCM
  buffer.writeUInt16LE(numChannels, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate * numChannels * (bitsPerSample / 8), 28);
  buffer.writeUInt16LE(numChannels * (bitsPerSample / 8), 32);
  buffer.writeUInt16LE(bitsPerSample, 34);

  buffer.write("data", 36);
  buffer.writeUInt32LE(dataByteLength, 40);

  return new Uint8Array(buffer);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const rawText = body.text || "";

    if (!rawText || typeof rawText !== "string" || rawText.trim().length === 0) {
      return NextResponse.json(
        {
          error: {
            code: "invalid_request_error",
            message: "Missing or invalid 'text' parameter in request body",
            request_id: null,
          },
        },
        { status: 400 }
      );
    }

    const apiKey = process.env.SARVAM_API_KEY;

    // Local dev fallback when SARVAM_API_KEY is not configured
    if (!apiKey || apiKey === "your_sarvam_api_key_here") {
      const fallbackWav = createSilentWavBuffer();
      return new Response(fallbackWav as unknown as BodyInit, {
        status: 200,
        headers: {
          "Content-Type": "audio/wav",
          "Content-Length": fallbackWav.byteLength.toString(),
          "X-Mock-Fallback": "true",
        },
      });
    }

    // Model limits: max 2500 characters for bulbul:v3 and bulbul:v4-flash
    const sanitizedText = rawText.trim().slice(0, 2500);

    // Validate and sanitize language_code per Sarvam BCP-47 enum
    let languageCode = body.language_code || "en-IN";
    if (!VALID_LANGUAGE_CODES.has(languageCode)) {
      languageCode = "en-IN";
    }

    const model = body.model || "bulbul:v3";
    const speaker = (body.speaker || "shubh").toLowerCase();
    const pace = typeof body.pace === "number" ? Math.max(0.5, Math.min(2.0, body.pace)) : 1.0;
    const speechSampleRate = body.speech_sample_rate || 22050;
    const outputAudioCodec = body.output_audio_codec || "wav";
    const temperature = typeof body.temperature === "number" ? Math.max(0.01, Math.min(1.0, body.temperature)) : 0.6;

    // Strictly construct request body matching Sarvam_Model_API_TextToSpeechRequest
    const sarvamRequestBody: {
      text: string;
      language_code: string;
      speaker: string;
      model: string;
      pace: number;
      speech_sample_rate: number;
      output_audio_codec: string;
      temperature: number;
      dict_id?: string | null;
    } = {
      text: sanitizedText,
      language_code: languageCode,
      speaker: speaker,
      model: model,
      pace: pace,
      speech_sample_rate: speechSampleRate,
      output_audio_codec: outputAudioCodec,
      temperature: temperature,
    };

    if (body.dict_id) {
      sarvamRequestBody.dict_id = body.dict_id;
    }

    // Fetch call to Sarvam AI Text-to-Speech REST endpoint
    const sarvamResponse = await fetch("https://api.sarvam.ai/text-to-speech", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "api-subscription-key": apiKey,
      },
      body: JSON.stringify(sarvamRequestBody),
    });

    if (!sarvamResponse.ok) {
      let errorPayload: { code?: string; message?: string; request_id?: string | null } = {
        code: "text_to_speech_error",
        message: "Sarvam TTS request failed with status " + sarvamResponse.status,
        request_id: null,
      };

      try {
        const errorJson = await sarvamResponse.json();
        if (errorJson.error) {
          errorPayload = errorJson.error;
        } else {
          errorPayload.message = JSON.stringify(errorJson);
        }
      } catch {
        const errText = await sarvamResponse.text().catch(() => "");
        if (errText) errorPayload.message = errText;
      }

      return NextResponse.json(
        {
          error: errorPayload,
          status: sarvamResponse.status,
        },
        { status: sarvamResponse.status }
      );
    }

    const data = await sarvamResponse.json();

    if (!data.audios || !Array.isArray(data.audios) || data.audios.length === 0) {
      return NextResponse.json(
        {
          error: {
            code: "empty_audio_response",
            message: "Sarvam TTS returned empty audio list in response",
            request_id: data.request_id || null,
          },
        },
        { status: 502 }
      );
    }

    // If client requested JSON response (format=json or Accept: application/json)
    const wantsJson =
      req.headers.get("accept")?.includes("application/json") ||
      body.format === "json";

    if (wantsJson) {
      return NextResponse.json({
        request_id: data.request_id || null,
        audios: data.audios,
      });
    }

    // Decode Base64 audio into binary buffer
    const base64Audio = data.audios[0];
    const audioBuffer = Buffer.from(base64Audio, "base64");
    const uint8Array = new Uint8Array(audioBuffer);

    const contentType = outputAudioCodec === "mp3" ? "audio/mpeg" : "audio/wav";

    return new Response(uint8Array as unknown as BodyInit, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Length": uint8Array.byteLength.toString(),
        "X-Request-Id": data.request_id || "",
        "Cache-Control": "public, max-age=1800",
      },
    });
  } catch (error) {
    console.error("Error in /api/tts handler:", error);
    return NextResponse.json(
      {
        error: {
          code: "internal_server_error",
          message: error instanceof Error ? error.message : String(error),
          request_id: null,
        },
      },
      { status: 500 }
    );
  }
}

// Support GET for streaming directly into <audio src="/api/tts?text=...">
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const text = searchParams.get("text") || "";
  const languageCode = searchParams.get("language_code") || "en-IN";
  const speaker = searchParams.get("speaker") || "shubh";
  const model = searchParams.get("model") || "bulbul:v3";
  const pace = searchParams.get("pace") ? parseFloat(searchParams.get("pace")!) : 1.0;

  const syntheticReq = new NextRequest(req.url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      text,
      language_code: languageCode,
      speaker,
      model,
      pace,
    }),
  });

  return POST(syntheticReq);
}
