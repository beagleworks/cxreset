import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdtemp } from "node:fs/promises";
import test from "node:test";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";
import { createEmptyCache, withSuccess } from "../dist/cache.js";
import { run } from "../dist/index.js";

const originalDateNow = Date.now;
const execFileAsync = promisify(execFile);
const cliPath = fileURLToPath(new URL("../dist/cli.js", import.meta.url));

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
    loadCacheFn: async () => createEmptyCache(),
    saveCacheFn: async () => {},
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
    loadCacheFn: async () => createEmptyCache(),
    saveCacheFn: async () => {},
  });

  assert.deepEqual(logs, ["Codex: 5h:2h30m(16%)"]);
});

test("run uses fresh cache and skips codex app-server calls", async () => {
  const logs = [];
  const now = Date.UTC(2026, 0, 1, 0, 0, 0);
  Date.now = () => now;

  await run({
    fetchCodexRateLimitsFn: async () => {
      throw new Error("fetch should not run");
    },
    loadCacheFn: async () => withSuccess({
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
    }, now),
    saveCacheFn: async () => {},
    log: (message) => {
      logs.push(message);
    },
  });

  assert.deepEqual(logs, ["Codex: 5h:2h30m(16%) | 7d:3d12h(7%)"]);
});

test("run uses stale cache when codex fetch fails", async () => {
  const logs = [];
  const now = Date.UTC(2026, 0, 1, 0, 0, 0);
  Date.now = () => now;

  await run({
    fetchCodexRateLimitsFn: async () => {
      throw new Error("boom");
    },
    loadCacheFn: async () => withSuccess({
      fiveHour: {
        usedPercent: 15.6,
        resetsAt: (now + (2 * 60 + 30) * 60 * 1000) / 1000,
        windowDurationMins: 300,
      },
      sevenDay: null,
    }, now - 5 * 60 * 1000),
    saveCacheFn: async () => {},
    log: (message) => {
      logs.push(message);
    },
  });

  assert.deepEqual(logs, ["Codex: 5h:2h30m(16%)"]);
});

test("run falls back to placeholder output when dependencies fail without cache", async () => {
  const logs = [];

  await run({
    fetchCodexRateLimitsFn: async () => {
      throw new Error("boom");
    },
    loadCacheFn: async () => createEmptyCache(),
    saveCacheFn: async () => {},
    log: (message) => {
      logs.push(message);
    },
  });

  assert.deepEqual(logs, ["Codex: 5h:--(-%) | 7d:--(-%)"]);
});

test("cli bootstrap writes fallback output when codex is unavailable", async () => {
  const xdgCacheHome = await mkdtemp(join(tmpdir(), "cxreset-cli-cache-"));
  const { stdout } = await execFileAsync(process.execPath, [cliPath], {
    cwd: process.cwd(),
    env: { ...process.env, PATH: "", XDG_CACHE_HOME: xdgCacheHome },
  });

  assert.equal(stdout.trim(), "Codex: 5h:--(-%) | 7d:--(-%)");
});
