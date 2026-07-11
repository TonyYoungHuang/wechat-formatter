export async function withTimeout<T>(promise: Promise<T>, timeoutMs: number, message: string) {
  let timeout: ReturnType<typeof setTimeout> | undefined;

  try {
    return await Promise.race([
      promise,
      new Promise<never>((_, reject) => {
        timeout = setTimeout(() => reject(new Error(message)), timeoutMs);
      }),
    ]);
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}

export async function withAbortableTimeout<T>(
  task: (signal: AbortSignal) => Promise<T>,
  timeoutMs: number,
  message: string,
  parentSignal?: AbortSignal,
) {
  const controller = new AbortController();
  let timedOut = false;
  const abortFromParent = () => controller.abort(parentSignal?.reason);
  const timeout = setTimeout(() => {
    timedOut = true;
    controller.abort(new Error(message));
  }, timeoutMs);

  if (parentSignal?.aborted) {
    abortFromParent();
  } else {
    parentSignal?.addEventListener("abort", abortFromParent, { once: true });
  }

  try {
    return await task(controller.signal);
  } catch (error) {
    if (timedOut) {
      throw new Error(message);
    }
    throw error;
  } finally {
    clearTimeout(timeout);
    parentSignal?.removeEventListener("abort", abortFromParent);
  }
}

export async function fetchWithTimeout(input: RequestInfo | URL, init: RequestInit = {}, timeoutMs: number) {
  const controller = new AbortController();
  const abortFromParent = () => controller.abort(init.signal?.reason);
  const timeout = setTimeout(() => controller.abort(new Error(`Request timed out after ${timeoutMs}ms.`)), timeoutMs);

  if (init.signal?.aborted) {
    abortFromParent();
  } else {
    init.signal?.addEventListener("abort", abortFromParent, { once: true });
  }

  try {
    return await fetch(input, {
      ...init,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
    init.signal?.removeEventListener("abort", abortFromParent);
  }
}
