import { NextRequest, NextResponse } from "next/server";

/**
 * Sarvam AI Speech-to-Text (STT) API Route
 * Official Schema Reference: https://docs.sarvam.ai/api-reference/speech-to-text/transcribe
 * Endpoint: POST https://api.sarvam.ai/speech-to-text
 * Authentication: api-subscription-key header
 */
export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const audioFile = (formData.get("file") || formData.get("audio")) as File | Blob | null;

    if (!audioFile) {
      return NextResponse.json(
        {
          error: {
            code: "invalid_request_error",
            message: "Missing audio file in multipart form data (expected field 'file' or 'audio')",
            request_id: null,
          },
        },
        { status: 400 }
      );
    }

    const apiKey = process.env.SARVAM_API_KEY;

    // Graceful fallback for local dev if SARVAM_API_KEY is not configured in .env.local
    if (!apiKey || apiKey === "your_sarvam_api_key_here") {
      return NextResponse.json({
        request_id: "mock_req_" + Date.now(),
        transcript:
          "Haan, maine LRU cache structure build kar liya hai with TTL millisecond expiration. Complexity O(1) maintain karne ke liye dummy head and tail sentinel nodes use kiye hain.",
        language_code: "hi-IN",
        timestamps: null,
        language_probability: 0.99,
        is_mock: true,
        note: "Using mock Hinglish transcription because SARVAM_API_KEY is not configured in .env.local",
      });
    }

    // Extract parameters per Sarvam STT REST API schema
    const model = (formData.get("model") as string) || "saaras:v4";
    const languageCode = (formData.get("language_code") as string) || "hi-IN";
    const mode = (formData.get("mode") as string) || (model === "saaras:v3" ? "codemix" : undefined);
    const withTimestamps = formData.get("with_timestamps") === "true";
    const inputAudioCodec = formData.get("input_audio_codec") as string | null;
    const rawKeyterms = formData.get("keyterms") as string | null;

    // Prepare multipart form data payload strictly matching Sarvam API specification
    const outgoingFormData = new FormData();
    const filename = (audioFile as File).name || "speech.wav";
    outgoingFormData.append("file", audioFile, filename);
    outgoingFormData.append("model", model);

    if (languageCode) {
      outgoingFormData.append("language_code", languageCode);
    }

    // 'mode' is strictly applicable when using saaras:v3, or when explicitly requested
    if (mode) {
      outgoingFormData.append("mode", mode);
    }

    if (withTimestamps) {
      outgoingFormData.append("with_timestamps", "true");
    }

    if (inputAudioCodec) {
      outgoingFormData.append("input_audio_codec", inputAudioCodec);
    }

    // 'keyterms' is only supported with model=saaras:v4, sent as JSON-encoded array string
    if (rawKeyterms) {
      outgoingFormData.append("keyterms", rawKeyterms);
    }

    // Call Sarvam AI REST Speech-to-Text endpoint
    const sarvamResponse = await fetch("https://api.sarvam.ai/speech-to-text", {
      method: "POST",
      headers: {
        "api-subscription-key": apiKey,
      },
      body: outgoingFormData,
    });

    if (!sarvamResponse.ok) {
      let errorPayload: { code?: string; message?: string; request_id?: string | null } = {
        code: "speech_to_text_error",
        message: "Sarvam STT request failed with status " + sarvamResponse.status,
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

    // 200 Successful Response per schema:
    // request_id, transcript, language_code, timestamps?, language_probability?
    return NextResponse.json({
      request_id: data.request_id ?? null,
      transcript: data.transcript ?? "",
      language_code: data.language_code ?? languageCode,
      timestamps: data.timestamps ?? null,
      language_probability: data.language_probability ?? null,
    });
  } catch (error) {
    console.error("Error in /api/stt handler:", error);
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
