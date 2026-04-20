import { expect, test, describe, mock } from "bun:test";
import { withModelFallback } from "../src/model-fallback";

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
