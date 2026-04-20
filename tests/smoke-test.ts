import { GoogleGenAI } from "@google/genai";

async function smokeTest() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error("❌ GEMINI_API_KEY not found in environment.");
    return;
  }

  const ai = new GoogleGenAI({ apiKey });
  const models = [
    "gemini-3.1-flash-tts-preview",
    "gemini-2.5-flash-tts-preview",
    "gemini-1.5-flash",
    "gemini-3.1-flash-live-preview"
  ];

  for (const model of models) {
    console.log(`\n--- 🧪 Testing: ${model} ---`);
    
    try {
      const response = await ai.models.generateContent({
        model: model,
        contents: [{ parts: [{ text: "Testing, testing, one two three." }] }],
        config: {
          responseModalities: ["AUDIO"],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: "Aoede" },
            },
          },
        },
      });

      const data = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;

      if (data) {
        console.log(`✅ SUCCESS! Received ${Math.round(Buffer.from(data, "base64").length / 1024)} KB of audio data.`);
      } else {
        const candidate = response.candidates?.[0];
        console.log(`⚠️  NO DATA returned. Finish Reason: ${candidate?.finishReason}. Message: ${candidate?.finishMessage}`);
      }
    } catch (error: any) {
      console.log(`❌ FAILED: ${error.message || error}`);
      if (error.status) console.log(`   Status: ${error.status}`);
    }
  }
}

smokeTest();
