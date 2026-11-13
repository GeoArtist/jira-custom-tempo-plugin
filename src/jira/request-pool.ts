// Limits concurrent Jira requests and handles rate limiting (contracts/jira-rest.md, "Errors and limits").
import type { GatewayResponse } from './gateway';

export interface PoolOptions {
  /** Requests in flight at the same time. */
  concurrency?: number;
  /** Total tries per request when Jira answers 429. */
  maxAttempts?: number;
  signal?: AbortSignal;
  /** Injectable for tests. */
  sleep?: (ms: number) => Promise<void>;
  /** Injectable for tests; returns a number in [0, 1). */
  random?: () => number;
}

const BASE_DELAY_MS = 2_000;
const MAX_DELAY_MS = 30_000;

export class AbortedError extends Error {
  constructor() {
    super('The load was superseded by a newer one.');
    this.name = 'AbortedError';
  }
}

const defaultSleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

export class RequestPool {
  private readonly concurrency: number;
  private readonly maxAttempts: number;
  private readonly signal: AbortSignal | undefined;
  private readonly sleep: (ms: number) => Promise<void>;
  private readonly random: () => number;

  private active = 0;
  private readonly waiting: Array<() => void> = [];
  /** While Jira asks us to slow down, every request waits for this. */
  private pause: Promise<void> | null = null;

  constructor(options: PoolOptions = {}) {
    this.concurrency = options.concurrency ?? 5;
    this.maxAttempts = options.maxAttempts ?? 4;
    this.signal = options.signal;
    this.sleep = options.sleep ?? defaultSleep;
    this.random = options.random ?? Math.random;
  }

  /** Runs one request, retrying it when Jira answers 429. Resolves with the final response. */
  async run(send: () => Promise<GatewayResponse>): Promise<GatewayResponse> {
    await this.acquire();
    try {
      for (let attempt = 1; ; attempt += 1) {
        if (this.pause) await this.pause;
        this.throwIfAborted();
        const response = await send();
        if (response.status !== 429 || attempt >= this.maxAttempts) return response;
        await this.backOff(response, attempt);
      }
    } finally {
      this.release();
    }
  }

  private throwIfAborted(): void {
    if (this.signal?.aborted) throw new AbortedError();
  }

  private async acquire(): Promise<void> {
    this.throwIfAborted();
    if (this.active >= this.concurrency) {
      await new Promise<void>((resolve) => this.waiting.push(resolve));
      this.throwIfAborted();
    }
    this.active += 1;
  }

  private release(): void {
    this.active -= 1;
    this.waiting.shift()?.();
  }

  /** Waits at least `Retry-After`, with doubling delay and jitter, pausing the whole pool. */
  private async backOff(response: GatewayResponse, attempt: number): Promise<void> {
    const retryAfterMs = Number(response.headers.get('Retry-After') ?? 0) * 1000;
    const jitter = 0.7 + this.random() * 0.6;
    const backoffMs = Math.min(BASE_DELAY_MS * 2 ** (attempt - 1), MAX_DELAY_MS) * jitter;
    const delay = Math.max(Number.isFinite(retryAfterMs) ? retryAfterMs : 0, backoffMs);
    const pause = this.sleep(delay).then(() => {
      if (this.pause === pause) this.pause = null;
    });
    this.pause = pause;
    await pause;
  }
}
