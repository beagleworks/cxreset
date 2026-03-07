import assert from "node:assert/strict";
import test from "node:test";
import { run } from "../dist/index.js";

const originalDateNow = Date.now;

test.afterEach(() => {
  Date.now = originalDateNow;
});

test("run outputs formatted statusline text on success", async () => {
  const logs = [];
  const now = Date.UTC(2026, 0, 1, 0, 0, 0);
  Date.now = () => now;

  await run({
    fetchCodexRateLimitsFn: async () => ({
      fiveHour: {
        usedPercent: 15.6,
        resetsAt: (now + (2 * 60 + 30) * 60 * 1000) / 1000,
        windowDurationMins: 300,
      },
      sevenDay: {
        usedPercent: 7.4,
        resetsAt: (now + (3 * 24 + 12) * 60 * 60 * 1000) / 1000,
        windowDurationMins: 10080,
      },
    }),
    log: (message) => {
      logs.push(message);
    },
  });

  assert.deepEqual(logs, ["Codex: 5h:2h30m(16%) | 7d:3d12h(7%)"]);
});

test("run omits weekly window when secondary rate limit is unavailable", async () => {
  const logs = [];
  const now = Date.UTC(2026, 0, 1, 0, 0, 0);
  Date.now = () => now;

  await run({
    fetchCodexRateLimitsFn: async () => ({
      fiveHour: {
        usedPercent: 15.6,
        resetsAt: (now + (2 * 60 + 30) * 60 * 1000) / 1000,
        windowDurationMins: 300,
      },
      sevenDay: null,
    }),
    log: (message) => {
      logs.push(message);
    },
  });

  assert.deepEqual(logs, ["Codex: 5h:2h30m(16%)"]);
});

test("run falls back to placeholder output when dependencies fail", async () => {
  const logs = [];

  await run({
    fetchCodexRateLimitsFn: async () => {
      throw new Error("boom");
    },
    log: (message) => {
      logs.push(message);
    },
  });

  assert.deepEqual(logs, ["Codex: 5h:--(-%) | 7d:--(-%)"]);
});
