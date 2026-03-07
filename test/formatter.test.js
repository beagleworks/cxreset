import assert from "node:assert/strict";
import test from "node:test";
import {
  formatFallbackOutput,
  formatOutput,
  formatResetTimes,
} from "../dist/formatter.js";

const originalDateNow = Date.now;

test.afterEach(() => {
  Date.now = originalDateNow;
});

test("formatResetTimes formats remaining windows and rounds usage", () => {
  const now = Date.UTC(2026, 0, 1, 0, 0, 0);
  Date.now = () => now;

  const actual = formatResetTimes(
    {
      usedPercent: 15.6,
      resetsAt: (now + (2 * 60 + 30) * 60 * 1000) / 1000,
      windowDurationMins: 300,
    },
    {
      usedPercent: 7.4,
      resetsAt: (now + (3 * 24 + 12) * 60 * 60 * 1000) / 1000,
      windowDurationMins: 10080,
    },
  );

  assert.deepEqual(actual, {
    fiveHour: {
      timeRemaining: "2h30m",
      usage: 16,
    },
    sevenDay: {
      timeRemaining: "3d12h",
      usage: 7,
    },
  });
});

test("formatResetTimes returns reset marker and preserves null secondary", () => {
  const now = Date.UTC(2026, 0, 1, 0, 0, 0);
  Date.now = () => now;

  const actual = formatResetTimes(
    {
      usedPercent: 0,
      resetsAt: (now - 1000) / 1000,
      windowDurationMins: 300,
    },
    null,
  );

  assert.deepEqual(actual, {
    fiveHour: {
      timeRemaining: "reset!",
      usage: 0,
    },
    sevenDay: null,
  });
});

test("formatOutput and formatFallbackOutput keep the statusline shape", () => {
  assert.equal(
    formatOutput({
      fiveHour: { timeRemaining: "2h30m", usage: 16 },
      sevenDay: { timeRemaining: "3d12h", usage: 7 },
    }),
    "Codex: 5h:2h30m(16%) | 7d:3d12h(7%)",
  );

  assert.equal(
    formatOutput({
      fiveHour: { timeRemaining: "2h30m", usage: 16 },
      sevenDay: null,
    }),
    "Codex: 5h:2h30m(16%)",
  );

  assert.equal(formatFallbackOutput(), "Codex: 5h:--(-%) | 7d:--(-%)");
});
