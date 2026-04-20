import { GoogleGenAI } from "@google/genai";

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

  const response = await ai.models.generateContent({
    model: "gemini-3.1-flash-tts-preview",
    contents: [{ parts: [{ text: fullPrompt }] }],
    config: {
      responseModalities: ["AUDIO"],
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: { voiceName: "Fenrir" },
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
      `No audio data returned from Gemini TTS. Reason: ${reason} (${message})`,
    );
  }

  return Buffer.from(data, "base64");
}
