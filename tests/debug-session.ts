import { GoogleGenAI } from "@google/genai";

async function debugSession() {
  const apiKey = process.env.GEMINI_API_KEY;
  const ai = new GoogleGenAI({ apiKey });

  console.log("--- 🔍 Debugging Session Object ---");

  const session = ai.live.connect({
    model: "gemini-3.1-flash-live-preview",
    config: { responseModalities: ["audio"] },
    callbacks: {
      onopen: () => {
        console.log("Connected!");
        console.log("Session Keys:", Object.keys(session));
        console.log("Session Prototype Keys:", Object.keys(Object.getPrototypeOf(session)));
        
        // Let's also check if it's send() or similar
        for (const key of Object.getOwnPropertyNames(Object.getPrototypeOf(session))) {
            if (typeof (session as any)[key] === 'function') {
                console.log(`- function: ${key}`);
            }
        }
        
        session.close();
        process.exit(0);
      },
      onerror: (e) => {
          console.error("Error:", e);
          process.exit(1);
      }
    }
  });
}

debugSession();
