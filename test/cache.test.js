import assert from "node:assert/strict";
import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import {
  getCachePath,
  getFreshRateLimits,
  getStaleRateLimits,
  loadCache,
  saveCache,
  STALE_CACHE_TTL_MS,
  SUCCESS_CACHE_TTL_MS,
  withSuccess,
} from "../dist/cache.js";

const originalXdgCacheHome = process.env.XDG_CACHE_HOME;

test.afterEach(() => {
  if (originalXdgCacheHome === undefined) {
    delete process.env.XDG_CACHE_HOME;
    return;
  }

  process.env.XDG_CACHE_HOME = originalXdgCacheHome;
});

test("saveCache and loadCache persist validated snapshots under XDG_CACHE_HOME", async () => {
  const cacheDir = await mkdtemp(join(tmpdir(), "cxreset-cache-"));
  process.env.XDG_CACHE_HOME = cacheDir;

  const cache = withSuccess({
    fiveHour: {
      usedPercent: 16,
      resetsAt: 1770859735,
      windowDurationMins: 300,
    },
    sevenDay: {
      usedPercent: 7,
      resetsAt: 1771311795,
      windowDurationMins: 10080,
    },
  }, 1234);

  await saveCache(cache);

  assert.equal(getCachePath(), join(cacheDir, "cxreset", "cache.json"));
  assert.deepEqual(await loadCache(), cache);
  assert.deepEqual(
    JSON.parse(await readFile(getCachePath(), "utf8")),
    cache,
  );
});

test("fresh and stale TTLs are evaluated independently", () => {
  const now = Date.UTC(2026, 0, 1, 0, 0, 0);
  const cache = withSuccess({
    fiveHour: {
      usedPercent: 16,
      resetsAt: 1770859735,
      windowDurationMins: 300,
    },
    sevenDay: {
      usedPercent: 7,
      resetsAt: 1771311795,
      windowDurationMins: 10080,
    },
  }, now);

  assert.deepEqual(getFreshRateLimits(cache, now + SUCCESS_CACHE_TTL_MS), {
    fiveHour: {
      usedPercent: 16,
      resetsAt: 1770859735,
      windowDurationMins: 300,
    },
    sevenDay: {
      usedPercent: 7,
      resetsAt: 1771311795,
      windowDurationMins: 10080,
    },
  });
  assert.equal(getFreshRateLimits(cache, now + SUCCESS_CACHE_TTL_MS + 1), null);
  assert.notEqual(getStaleRateLimits(cache, now + SUCCESS_CACHE_TTL_MS + 1), null);
  assert.equal(getStaleRateLimits(cache, now + STALE_CACHE_TTL_MS + 1), null);
});
