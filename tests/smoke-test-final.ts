import { generateTTSAudio } from "../src/tts";
import { writeFileSync } from "fs";

async function testLiveTTS() {
  console.log("--- 🧪 Testing Live API TTS Rewrite ---");
  const text = "Yo, check it out. This is coming through the Live API now. Unlimited power! ⚡";
  const prompt = "You are a cool, confident AI assistant.";

  try {
    const audioBuffer = await generateTTSAudio(text, prompt);
    console.log(`✅ SUCCESS! Received ${Math.round(audioBuffer.length / 1024)} KB of audio data.`);
    
    // Save to file for manual inspection if needed
    const filename = "smoke-test-output.pcm";
    writeFileSync(filename, audioBuffer);
    console.log(`💾 Saved audio to ${filename}`);
    
    console.log("\nDone.");
    process.exit(0);
  } catch (error: any) {
    console.error("❌ FAILED:", error.message || error);
    process.exit(1);
  }
}

testLiveTTS();
