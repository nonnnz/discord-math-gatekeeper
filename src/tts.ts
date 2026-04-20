import { GoogleGenAI } from "@google/genai";
import { withModelFallback } from "./model-fallback";

/**
 * TTS model fallback chain with per-model voice config.
 * Fenrir is only available in newer (3.1) models.
 * Aoede is universally supported across model generations.
 */
export const TTS_MODELS: { model: string; voiceName: string }[] = [
  { model: "gemini-3.1-flash-tts-preview",  voiceName: "Fenrir" },
  { model: "gemini-2.5-flash-preview-tts",  voiceName: "Aoede"  },
];

export async function generateTTSAudio(
  text: string,
  personaPrompt: string,
): Promise<Buffer> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not set in environment variables.");
  }

  const ai = new GoogleGenAI({ apiKey });
  const fullPrompt = `${personaPrompt}\n\n#### TRANSCRIPT\n${text}`;

  // Build a flat list of model strings for the fallback utility
  const modelNames = TTS_MODELS.map((m) => m.model);

  return await withModelFallback(modelNames, async (model) => {
    const voiceName = TTS_MODELS.find((m) => m.model === model)!.voiceName;

    const response = await ai.models.generateContent({
      model,
      contents: [{ parts: [{ text: fullPrompt }] }],
      config: {
        responseModalities: ["AUDIO"],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName },
          },
        },
      },
    });

    const candidate = response.candidates?.[0];
    const data = candidate?.content?.parts?.[0]?.inlineData?.data;

    if (!data) {
      const reason = candidate?.finishReason || "UNKNOWN";
      const message = candidate?.finishMessage || "No additional info";
      throw new Error(
        `No audio data returned from ${model} (voice: ${voiceName}). Reason: ${reason} (${message})`,
      );
    }

    return Buffer.from(data, "base64");
  });
}
