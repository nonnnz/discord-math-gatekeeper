import { GoogleGenAI } from "@google/genai";

async function testLiveConnection(model: string) {
  const apiKey = process.env.GEMINI_API_KEY;
  const ai = new GoogleGenAI({ apiKey });

  console.log(`\n--- 📡 Testing Live API: ${model} ---`);

  return new Promise((resolve) => {
    let completed = false;

    const session = ai.live.connect({
      model: model,
      config: {
        responseModalities: ["audio"],
      },
      callbacks: {
        onopen: () => {
          console.log(`✅ SUCCESS: Connected to ${model}`);
          completed = true;
          session.close();
          resolve(true);
        },
        onerror: (error) => {
          if (!completed) {
            console.log(`❌ FAILED ${model}: ${error.message || error}`);
            completed = true;
            resolve(false);
          }
        },
        onclose: () => {
          if (!completed) {
            console.log(`⚠️  Closed ${model} early.`);
            completed = true;
            resolve(false);
          }
        }
      }
    });

    // Timeout after 5 seconds
    setTimeout(() => {
      if (!completed) {
        console.log(`🕒 TIMEOUT for ${model}`);
        completed = true;
        resolve(false);
      }
    }, 5000);
  });
}

async function runTests() {
  await testLiveConnection("gemini-3.1-flash-live-preview");
  await testLiveConnection("gemini-3.1-flash-live");
}

runTests();
