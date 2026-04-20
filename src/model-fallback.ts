/**
 * Generic utility to try an operation with multiple models in order.
 * Falls back to the next model if the current one fails, unless the error
 * is clearly due to invalid arguments (which fallback won't fix).
 */
export async function withModelFallback<T>(
  models: string[],
  operation: (model: string) => Promise<T>
): Promise<T> {
  const errors: Error[] = [];

  for (const model of models) {
    try {
      console.log(`[ModelFallback] Attempting operation with model: ${model}`);
      return await operation(model);
    } catch (error: any) {
      // Check for INVALID_ARGUMENT (often 400 Bad Request)
      // Different SDKs/APIs might throw different error structures,
      // but commonly they contain a status code or a specific message.
      const isInvalidArgument = 
        error?.status === 400 || 
        error?.message?.includes("INVALID_ARGUMENT") ||
        error?.message?.includes("invalid argument");

      if (isInvalidArgument) {
        console.error(`[ModelFallback] Skipping fallback: Invalid argument for model ${model}.`);
        throw error;
      }

      console.warn(`[ModelFallback] Model ${model} failed: ${error.message || error}. Falling back...`);
      errors.push(error);
    }
  }

  // If we reach here, all models failed
  const aggregateError = new Error(
    `All models failed. Attempted: ${models.join(", ")}. Last error: ${errors[errors.length - 1]?.message}`
  );
  (aggregateError as any).errors = errors;
  throw aggregateError;
}
