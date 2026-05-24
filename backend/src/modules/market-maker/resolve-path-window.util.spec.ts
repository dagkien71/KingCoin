import { resolvePathTimeWindow } from './resolve-path-window.util';

describe('resolvePathTimeWindow', () => {
  const now = 1_700_000_000_000;

  it('uses durationMin when no endAt', () => {
    const w = resolvePathTimeWindow({ durationMin: 10 }, now);
    expect(w.startAt).toBe(now);
    expect(w.endAt).toBe(now + 10 * 60_000);
  });

  it('re-anchors when client endAt is in the past', () => {
    const w = resolvePathTimeWindow(
      {
        startAt: new Date(now - 15 * 60_000).toISOString(),
        endAt: new Date(now - 5 * 60_000).toISOString(),
      },
      now,
    );
    expect(w.startAt).toBe(now);
    expect(w.endAt).toBe(now + 10 * 60_000);
  });

  it('preserves future scheduled window', () => {
    const start = now + 60 * 60_000;
    const end = start + 10 * 60_000;
    const w = resolvePathTimeWindow(
      {
        startAt: new Date(start).toISOString(),
        endAt: new Date(end).toISOString(),
      },
      now,
    );
    expect(w.startAt).toBe(start);
    expect(w.endAt).toBe(end);
  });

  it('shifts late start to now but keeps remaining time', () => {
    const w = resolvePathTimeWindow(
      {
        startAt: new Date(now - 2 * 60_000).toISOString(),
        endAt: new Date(now + 8 * 60_000).toISOString(),
      },
      now,
    );
    expect(w.startAt).toBe(now);
    expect(w.endAt).toBe(now + 8 * 60_000);
  });
});
