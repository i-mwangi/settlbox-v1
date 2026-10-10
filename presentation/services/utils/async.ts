export class TimeoutError extends Error {
    constructor(ms: number) {
        super(`Operation timed out after ${ms}ms`);
        this.name = "TimeoutError";
    }
}
export function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
    let timer: ReturnType<typeof setTimeout>;
    const timeout = new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new TimeoutError(ms)), ms);
    });
    return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}
export async function withRetry<T>(fn: () => Promise<T>, options: {
    maxRetries?: number;
    shouldRetry?: (error: unknown) => boolean;
    onRetry?: (attempt: number, error: unknown) => void;
} = {}): Promise<T> {
    const { maxRetries = 2, shouldRetry = (e) => e instanceof TimeoutError, onRetry } = options;
    let lastError: unknown;
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
            return await fn();
        }
        catch (err) {
            lastError = err;
            if (attempt < maxRetries && shouldRetry(err)) {
                onRetry?.(attempt + 1, err);
                await new Promise(resolve => setTimeout(resolve, 500 * (attempt + 1)));
                continue;
            }
            throw err;
        }
    }
    throw lastError;
}
