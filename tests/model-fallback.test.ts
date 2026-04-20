import { expect, test, describe, mock } from "bun:test";
import { withModelFallback } from "../src/model-fallback";
import { TTS_MODELS } from "../src/tts";

describe("withModelFallback", () => {
  test("returns the result of the first model if it succeeds", async () => {
    const operation = mock(async (model: string) => `Success with ${model}`);
    const models = ["model-a", "model-b"];

    const result = await withModelFallback(models, operation);

    expect(result).toBe("Success with model-a");
    expect(operation).toHaveBeenCalledTimes(1);
    expect(operation).toHaveBeenCalledWith("model-a");
  });

  test("falls back to the next model if the first one fails", async () => {
    const operation = mock(async (model: string) => {
      if (model === "fail-1") throw new Error("Network error");
      return `Success with ${model}`;
    });
    const models = ["fail-1", "success-2"];

    const result = await withModelFallback(models, operation);

    expect(result).toBe("Success with success-2");
    expect(operation).toHaveBeenCalledTimes(2);
    expect(operation).toHaveBeenNthCalledWith(1, "fail-1");
    expect(operation).toHaveBeenNthCalledWith(2, "success-2");
  });

  test("stops early and throws if the error is INVALID_ARGUMENT (400)", async () => {
    const operation = mock(async (model: string) => {
      const err = new Error("INVALID_ARGUMENT: Bad Config");
      (err as any).status = 400;
      throw err;
    });
    const models = ["bad-config", "ignored-model"];

    await expect(withModelFallback(models, operation)).rejects.toThrow(/INVALID_ARGUMENT/);
    
    expect(operation).toHaveBeenCalledTimes(1);
    expect(operation).toHaveBeenCalledWith("bad-config");
  });

  test("throws an aggregate error if all models fail", async () => {
    const operation = mock(async (model: string) => {
      throw new Error(`Failed ${model}`);
    });
    const models = ["fail-1", "fail-2"];

    await expect(withModelFallback(models, operation)).rejects.toThrow(/All models failed/);
    
    expect(operation).toHaveBeenCalledTimes(2);
  });
});

describe("TTS_MODELS voice config", () => {
  test("every model entry has a model name and voiceName", () => {
    for (const entry of TTS_MODELS) {
      expect(entry.model).toBeString();
      expect(entry.voiceName).toBeString();
      expect(entry.model.length).toBeGreaterThan(0);
      expect(entry.voiceName.length).toBeGreaterThan(0);
    }
  });

  test("primary model uses Fenrir voice", () => {
    const primary = TTS_MODELS[0];
    expect(primary?.voiceName).toBe("Fenrir");
  });

  test("fallback model uses Aoede voice (universally supported)", () => {
    const fallback = TTS_MODELS[1];
    expect(fallback?.voiceName).toBe("Aoede");
  });

  test("no two models share the same voice (each fallback is distinct)", () => {
    const voices = TTS_MODELS.map((m) => m.voiceName);
    const uniqueVoices = new Set(voices);
    expect(uniqueVoices.size).toBe(voices.length);
  });
});
