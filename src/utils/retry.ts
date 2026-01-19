type RetryOptions = {
    retries: number,
    minDelayMs: number,
    maxDelayMs: number,
    factor: number
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const jitter = (ms: number) => {
  const j = ms * 0.2;
  return Math.max(0, ms + (Math.random() * 2 - 1) * j);
};

export async function retry<T>(
    fn: (attempt: number) => Promise<T>,
    opts: RetryOptions,
    isRetriable: (err: unknown) => boolean,
    getRetryAfterMs: (err: unknown) => number | null): Promise<T> {
    let attempt = 0;
    let delay = opts.minDelayMs;
    while (true) {
        try {
            return await fn(attempt);
        }
        catch (err) {
            if (attempt >= opts.retries || !isRetriable(err)) {
                throw err;
            }
            const retryAfter = getRetryAfterMs?.(err);
            const waitTime = retryAfter !== null ? retryAfter: jitter(Math.min(delay,opts.maxDelayMs));
            await sleep(waitTime)

            attempt++
            delay = Math.min(opts.maxDelayMs, delay * opts.factor);
        }
    }}