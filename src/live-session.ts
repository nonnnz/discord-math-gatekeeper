import { GoogleGenAI } from "@google/genai";
import { withModelFallback } from "./model-fallback";

/**
 * Live API models ordered by priority.
 */
export const LIVE_MODELS = [
  "gemini-3.1-flash-live-preview",
  "gemini-live-2.5-flash-native-audio",
];

/**
 * Connects to the Gemini Live API with automatic model fallback.
 * Returns the session and the name of the model that succeeded.
 */
export async function connectWithFallback(
  ai: any, // ai.live.connect is what we need
  config: any,
  callbacks: any
) {
  return await withModelFallback(LIVE_MODELS, async (model) => {
    const session = await ai.live.connect({
      model,
      config,
      callbacks,
    });
    return { session, model };
  });
}
