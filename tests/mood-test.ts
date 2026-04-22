import { generateTTSAudio } from "../src/tts";

const MOOD_PROMPTS = {
  angry: `# VOICE: Angry Rager
Speak with pure rage. Shout unpredictably. Heavy gaming slang and Thai profanity.
VERBATIM ONLY: Read the text exactly. No intro, no outro, no filler words.`,

  crying: `# VOICE: Crying/Sad
Speak with sadness, sniffing, and despair. Pathetic and miserable tone.
VERBATIM ONLY: Read the text exactly. No intro, no outro, no filler words.`,

  excited: `# VOICE: Hyped and Energetic
Speak with high energy, enthusiasm, and excitement. Fast-paced and animated.
VERBATIM ONLY: Read the text exactly. No intro, no outro, no filler words.`,

  podcast: `# VOICE: Professional Podcaster
Speak clearly, professionally, and engagingly. Warm and conversational.
VERBATIM ONLY: Read the text exactly. No intro, no outro, no filler words.`,
} as const;

async function testMood(mood: keyof typeof MOOD_PROMPTS) {
  const prompt = MOOD_PROMPTS[mood];
  const testText = "hello world";

  console.log(`\n--- 🎭 Testing mood: ${mood} ---`);

  try {
    const audioBuffer = await generateTTSAudio(testText, prompt);
    console.log(`✅ SUCCESS: ${mood} mood generated ${audioBuffer.length} bytes`);
    console.log(`   Text sent: "${testText}"`);
    return true;
  } catch (error: any) {
    console.log(`❌ FAILED ${mood}: ${error.message || error}`);
    return false;
  }
}

async function runTests() {
  console.log("╔══════════════════════════════════════╗");
  console.log("║   🧪 Mood System Smoke Test       ║");
  console.log("╚══════════════════════════════════════╝");

  const results: { mood: string; passed: boolean }[] = [];

  results.push({ mood: "angry", passed: await testMood("angry") });
  results.push({ mood: "crying", passed: await testMood("crying") });
  results.push({ mood: "excited", passed: await testMood("excited") });
  results.push({ mood: "podcast", passed: await testMood("podcast") });

  console.log("\n╔══════════════════════════════════════╗");
  console.log("║   📊 Results Summary                ║");
  console.log("╚══════════════════════════════════════╝");

  const passed = results.filter((r) => r.passed).length;
  const total = results.length;

  results.forEach((r) => {
    const status = r.passed ? "✅ PASS" : "❌ FAIL";
    console.log(`   ${status} - ${r.mood}`);
  });

  console.log(`\n   Total: ${passed}/${total} passed`);

  process.exit(passed === total ? 0 : 1);
}

runTests();
