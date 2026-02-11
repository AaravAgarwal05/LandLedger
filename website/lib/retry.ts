/**
 * Retry Utility
 * Provides retry logic with exponential backoff for async operations
 */

export interface RetryOptions {
  maxAttempts?: number;
  initialDelayMs?: number;
  maxDelayMs?: number;
  backoffMultiplier?: number;
  onRetry?: (attempt: number, error: Error) => void;
}

const DEFAULT_RETRY_OPTIONS: Required<RetryOptions> = {
  maxAttempts: 3,
  initialDelayMs: 1000,
  maxDelayMs: 10000,
  backoffMultiplier: 2,
  onRetry: () => {},
};

/**
 * Sleep for a specified duration
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Retry an async operation with exponential backoff
 * @param operation - The async function to retry
 * @param options - Retry configuration options
 * @returns The result of the operation
 * @throws The last error if all retries fail
 */
export async function retryWithBackoff<T>(
  operation: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const config = { ...DEFAULT_RETRY_OPTIONS, ...options };
  
  let lastError: Error | undefined;
  let delay = config.initialDelayMs;

  for (let attempt = 1; attempt <= config.maxAttempts; attempt++) {
    try {
      // Attempt the operation
      const result = await operation();
      
      // Success - return the result
      if (attempt > 1) {
        console.log(`✅ Operation succeeded on attempt ${attempt}/${config.maxAttempts}`);
      }
      return result;
      
    } catch (error: any) {
      lastError = error;
      
      // If this was the last attempt, throw the error
      if (attempt === config.maxAttempts) {
        console.error(`❌ Operation failed after ${config.maxAttempts} attempts`);
        throw error;
      }
      
      // Log the retry
      console.warn(`⚠️ Attempt ${attempt}/${config.maxAttempts} failed: ${error.message}`);
      console.log(`🔄 Retrying in ${delay}ms...`);
      
      // Call the onRetry callback if provided
      config.onRetry(attempt, error);
      
      // Wait before retrying
      await sleep(delay);
      
      // Calculate next delay with exponential backoff
      delay = Math.min(delay * config.backoffMultiplier, config.maxDelayMs);
    }
  }

  // This should never be reached, but TypeScript needs it
  throw lastError || new Error('Operation failed with unknown error');
}

/**
 * Retry an operation with custom retry logic
 * @param operation - The async function to retry
 * @param shouldRetry - Function to determine if retry should happen based on error
 * @param options - Retry configuration options
 */
export async function retryWithCondition<T>(
  operation: () => Promise<T>,
  shouldRetry: (error: Error, attempt: number) => boolean,
  options: RetryOptions = {}
): Promise<T> {
  const config = { ...DEFAULT_RETRY_OPTIONS, ...options };
  
  let lastError: Error | undefined;
  let delay = config.initialDelayMs;

  for (let attempt = 1; attempt <= config.maxAttempts; attempt++) {
    try {
      const result = await operation();
      if (attempt > 1) {
        console.log(`✅ Operation succeeded on attempt ${attempt}/${config.maxAttempts}`);
      }
      return result;
      
    } catch (error: any) {
      lastError = error;
      
      // Check if we should retry
      if (!shouldRetry(error, attempt) || attempt === config.maxAttempts) {
        console.error(`❌ Operation failed after ${attempt} attempts`);
        throw error;
      }
      
      console.warn(`⚠️ Attempt ${attempt}/${config.maxAttempts} failed: ${error.message}`);
      console.log(`🔄 Retrying in ${delay}ms...`);
      
      config.onRetry(attempt, error);
      await sleep(delay);
      delay = Math.min(delay * config.backoffMultiplier, config.maxDelayMs);
    }
  }

  throw lastError || new Error('Operation failed with unknown error');
}
