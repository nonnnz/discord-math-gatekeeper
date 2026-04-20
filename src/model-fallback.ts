/**
 * Generic utility to try an operation with multiple models in order.
 * Falls back to the next model if the current one fails, unless the error
 * is clearly due to invalid arguments (which fallback won't fix).
 */
/**
 * Generic utility to try an operation with multiple models in order.
 */
export async function withModelFallback<T>(
  models: string[],
  operation: (model: string) => Promise<T>
): Promise<T> {
  const requestId = Math.random().toString(16).substring(2, 6).toUpperCase();
  const errors: Error[] = [];

  for (const model of models) {
    try {
      console.log(`[Fallback #${requestId}] Attempting: ${model}`);
      const result = await operation(model);
      console.log(`[Fallback #${requestId}] ✨ Success with model: ${model}`);
      return result;
    } catch (error: any) {
      const isInvalidArgument = 
        error?.status === 400 || 
        error?.message?.includes("INVALID_ARGUMENT");

      if (isInvalidArgument) {
        console.error(`[Fallback #${requestId}] 🛑 Aborting: Invalid argument for ${model}.`);
        throw error;
      }

      // Cleanup error message: if it's a huge JSON, just show the status and basic reason
      let errorMsg = error.message || String(error);
      if (error?.status === 429) {
        errorMsg = `Quota exceeded (429 RESOURCE_EXHAUSTED)`;
      } else if (errorMsg.length > 300) {
        errorMsg = errorMsg.substring(0, 300) + "... (truncated)";
      }

      console.warn(`[Fallback #${requestId}] ⚠️  Model ${model} failed: ${errorMsg}. Trying fallback...`);
      errors.push(error);
    }
  }

  const aggregateError = new Error(
    `[Fallback #${requestId}] All models failed: ${models.join(", ")}`
  );
  (aggregateError as any).errors = errors;
  throw aggregateError;
}
