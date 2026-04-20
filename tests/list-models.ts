import { GoogleGenAI } from "@google/genai";

async function listModels() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error("❌ GEMINI_API_KEY not found.");
    return;
  }

  const ai = new GoogleGenAI({ apiKey });

  try {
    console.log("--- 📋 Available Gemini Models ---\n");
    // models.list is usually an async generator or a direct call depending on SDK version
    const models = await ai.models.list();
    
    for (const model of models) {
      console.log(`- ${model.name}`);
      console.log(`  Description: ${model.description}`);
      console.log(`  Methods: ${model.supportedMethods.join(", ")}`);
      console.log("");
    }
  } catch (error: any) {
    console.error("❌ Failed to list models:", error.message || error);
  }
}

listModels();
