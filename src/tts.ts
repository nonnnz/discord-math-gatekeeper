import { GoogleGenAI } from "@google/genai";

/**
 * Generates audio using the Gemini Live API (WebSocket).
 * The Live API model (gemini-3.1-flash-live-preview) has a much higher quota
 * than the dedicated TTS models which are capped at 10 req/day on free tier.
 *
 * Audio format: Raw PCM, 16-bit little-endian, mono, 24kHz — compatible with
 * the existing voice-player.ts which handles ffmpeg resampling to 48kHz stereo.
 */
export async function generateTTSAudio(
  text: string,
  personaPrompt: string,
): Promise<Buffer> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not set in environment variables.");
  }

  const ai = new GoogleGenAI({ apiKey });
  const model = "gemini-3.1-flash-live-preview";

  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let isResolved = false;

    console.log(`[TTS] Connecting to Live API (${model})...`);

    (async () => {
      try {
        const session = await ai.live.connect({
          model,
          config: {
            responseModalities: ["audio"],
            // Prepend a strict TTS directive so the Live model does NOT treat
            // the input as a question to answer — it must read it verbatim, in
            // character. The persona prompt then defines HOW it should sound.
            systemInstruction: {
              parts: [
                {
                  text: `# ROLE: VOICE ACTOR (TTS MODE)
You are a voice actor. Your ONLY job is to speak aloud the EXACT text the user sends you.

## CRITICAL RULES
- **READ THE TEXT VERBATIM.** Do NOT answer it, comment on it, translate it, or rephrase it.
- **Do NOT say anything before or after** the given text.
- **Do NOT add filler words** like "Sure!", "Of course!", "Here you go:", etc.
- **Just speak the exact words given**, nothing more, nothing less.

## HOW TO SPEAK
Apply the following character voice and tone to your delivery:

${personaPrompt}`,
                },
              ],
            },
            speechConfig: {
              voiceConfig: {
                prebuiltVoiceConfig: { voiceName: "Fenrir" },
              },
            },
          },
          callbacks: {
            onmessage: (response: any) => {
              const content = response.serverContent;

              // Accumulate audio chunks — a single event can have multiple parts
              const parts = content?.modelTurn?.parts;
              if (parts) {
                for (const part of parts) {
                  if (part.inlineData?.data) {
                    chunks.push(Buffer.from(part.inlineData.data, "base64"));
                  }
                }
              }

              // Resolve when model signals end of its turn
              if (content?.turnComplete) {
                if (!isResolved) {
                  console.log(`[TTS] Turn complete. Received ${chunks.length} audio chunks.`);
                  isResolved = true;
                  session.close();
                  resolve(Buffer.concat(chunks));
                }
              }
            },
            onerror: (error: any) => {
              console.error(`[TTS] Live API Error:`, error);
              if (!isResolved) {
                isResolved = true;
                session.close();
                reject(new Error(error?.message || String(error)));
              }
            },
            onclose: () => {
              if (!isResolved) {
                isResolved = true;
                if (chunks.length > 0) {
                  resolve(Buffer.concat(chunks));
                } else {
                  reject(new Error("Connection closed with no audio received."));
                }
              }
            },
          },
        });

        // Per SKILL.md: Use sendRealtimeInput({ text }) for all real-time text input.
        // sendClientContent is ONLY for seeding initial history context, not active turns.
        console.log(`[TTS] Sending text via sendRealtimeInput...`);
        session.sendRealtimeInput({ text });

      } catch (err: any) {
        if (!isResolved) {
          isResolved = true;
          reject(err);
        }
      }
    })();

    // Safety timeout: resolve with partial audio or reject after 30s
    setTimeout(() => {
      if (!isResolved) {
        console.warn(`[TTS] Request timed out after 30s.`);
        isResolved = true;
        if (chunks.length > 0) {
          resolve(Buffer.concat(chunks));
        } else {
          reject(new Error("TTS request timed out with no audio received."));
        }
      }
    }, 30_000);
  });
}
