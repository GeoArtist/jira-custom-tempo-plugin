import { describe, expect, it } from 'vite-plus/test';
import { AbortedError, RequestPool } from '../../src/jira/request-pool';
import { flush, response } from '../fake-gateway';

const ok = response({ status: 200 });
const limited = (retryAfter?: string) =>
  response({ status: 429, headers: retryAfter === undefined ? {} : { 'Retry-After': retryAfter } });

describe('RequestPool', () => {
  it('keeps at most five requests in flight', async () => {
    const pool = new RequestPool();
    const release: Array<() => void> = [];
    let inFlight = 0;
    let peak = 0;
    const send = () =>
      new Promise<typeof ok>((resolve) => {
        inFlight += 1;
        peak = Math.max(peak, inFlight);
        release.push(() => {
          inFlight -= 1;
          resolve(ok);
        });
      });

    const all = Promise.all(Array.from({ length: 12 }, () => pool.run(send)));
    await flush();
    expect(inFlight).toBe(5);
    while (release.length > 0) {
      release.shift()?.();
      await flush();
    }
    await all;
    expect(peak).toBe(5);
  });

  it('retries after 429, waiting at least Retry-After', async () => {
    const waits: number[] = [];
    const pool = new RequestPool({ sleep: async (ms) => void waits.push(ms), random: () => 0.5 });
    const answers = [limited('7'), ok];
    const result = await pool.run(async () => answers.shift() ?? ok);
    expect(result.status).toBe(200);
    expect(waits).toEqual([7000]);
  });

  it('doubles the delay with jitter when no Retry-After is given, and gives up after four tries', async () => {
    const waits: number[] = [];
    let calls = 0;
    const pool = new RequestPool({ sleep: async (ms) => void waits.push(ms), random: () => 0.5 });
    const result = await pool.run(async () => {
      calls += 1;
      return limited();
    });
    expect(result.status).toBe(429);
    expect(calls).toBe(4);
    expect(waits).toEqual([2000, 4000, 8000]);
  });

  it('applies jitter between 0.7 and 1.3 and caps the delay at 30 seconds', async () => {
    const waits: number[] = [];
    const low = new RequestPool({ sleep: async (ms) => void waits.push(ms), random: () => 0, maxAttempts: 2 });
    await low.run(async () => limited());
    const high = new RequestPool({ sleep: async (ms) => void waits.push(ms), random: () => 0.999, maxAttempts: 7 });
    await high.run(async () => limited());
    expect(waits[0]).toBeCloseTo(1400);
    expect(Math.max(...waits)).toBeLessThanOrEqual(30_000 * 1.3);
    expect(Math.max(...waits)).toBeGreaterThan(30_000);
  });

  it('holds other requests back while Jira asks to slow down', async () => {
    let wake: () => void = () => {};
    const pool = new RequestPool({ sleep: () => new Promise<void>((resolve) => (wake = resolve)) });
    const order: string[] = [];
    const answers = [limited('1'), ok];
    const first = pool.run(async () => {
      order.push('first');
      return answers.shift() ?? ok;
    });
    await flush();
    const second = pool.run(async () => {
      order.push('second');
      return ok;
    });
    await flush();
    expect(order).toEqual(['first']);
    wake();
    await Promise.all([first, second]);
    expect(order).toHaveLength(3);
  });

  it('stops queued work when the load is aborted', async () => {
    const abort = new AbortController();
    const pool = new RequestPool({ signal: abort.signal, concurrency: 1 });
    let finish: () => void = () => {};
    const running = pool.run(() => new Promise<typeof ok>((resolve) => (finish = () => resolve(ok))));
    const queued = pool.run(async () => ok);
    await flush();
    abort.abort();
    finish();
    await running;
    await expect(queued).rejects.toBeInstanceOf(AbortedError);
    await expect(pool.run(async () => ok)).rejects.toBeInstanceOf(AbortedError);
  });
});
