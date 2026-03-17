import { mkdir, readFile, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import type {
  CachedCodexRateLimits,
  CodexRateLimit,
  CodexRateLimitCache,
  CodexRateLimits,
} from "./types.js";

export const SUCCESS_CACHE_TTL_MS = 60 * 1000;
export const STALE_CACHE_TTL_MS = 30 * 60 * 1000;

const EXPECTED_PRIMARY_WINDOW = 300;
const EXPECTED_SECONDARY_WINDOW = 10080;

export function createEmptyCache(): CodexRateLimitCache {
  return {
    version: 1,
    lastSuccess: null,
  };
}

function getCacheDirectory(): string {
  const xdgCacheHome = process.env.XDG_CACHE_HOME?.trim();
  return xdgCacheHome || join(homedir(), ".cache");
}

export function getCachePath(): string {
  return join(getCacheDirectory(), "cxreset", "cache.json");
}

function isCachedRateLimit(
  value: unknown,
  expectedWindow: number,
): value is CodexRateLimit {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const rateLimit = value as Partial<CodexRateLimit>;
  return (
    typeof rateLimit.usedPercent === "number" &&
    typeof rateLimit.resetsAt === "number" &&
    rateLimit.resetsAt > 0 &&
    rateLimit.windowDurationMins === expectedWindow
  );
}

function normalizeLastSuccess(value: unknown): CachedCodexRateLimits | null {
  if (typeof value !== "object" || value === null) {
    return null;
  }

  const lastSuccess = value as Partial<CachedCodexRateLimits>;
  if (typeof lastSuccess.fetchedAt !== "number") {
    return null;
  }

  if (!isCachedRateLimit(lastSuccess.fiveHour, EXPECTED_PRIMARY_WINDOW)) {
    return null;
  }

  const sevenDay = lastSuccess.sevenDay;
  if (
    sevenDay !== null &&
    sevenDay !== undefined &&
    !isCachedRateLimit(sevenDay, EXPECTED_SECONDARY_WINDOW)
  ) {
    return null;
  }

  return {
    fetchedAt: lastSuccess.fetchedAt,
    fiveHour: lastSuccess.fiveHour,
    sevenDay: sevenDay ?? null,
  };
}

function normalizeCache(value: unknown): CodexRateLimitCache {
  if (typeof value !== "object" || value === null) {
    return createEmptyCache();
  }

  const cache = value as Partial<CodexRateLimitCache>;

  return {
    version: 1,
    lastSuccess: normalizeLastSuccess(cache.lastSuccess),
  };
}

export async function loadCache(): Promise<CodexRateLimitCache> {
  try {
    const content = await readFile(getCachePath(), "utf8");
    return normalizeCache(JSON.parse(content) as unknown);
  } catch {
    return createEmptyCache();
  }
}

export async function saveCache(cache: CodexRateLimitCache): Promise<void> {
  const cachePath = getCachePath();
  await mkdir(dirname(cachePath), { recursive: true });
  await writeFile(cachePath, JSON.stringify(cache), "utf8");
}

export function getFreshRateLimits(
  cache: CodexRateLimitCache,
  now: number = Date.now(),
): CodexRateLimits | null {
  if (!cache.lastSuccess) {
    return null;
  }

  if (now - cache.lastSuccess.fetchedAt > SUCCESS_CACHE_TTL_MS) {
    return null;
  }

  return {
    fiveHour: cache.lastSuccess.fiveHour,
    sevenDay: cache.lastSuccess.sevenDay,
  };
}

export function getStaleRateLimits(
  cache: CodexRateLimitCache,
  now: number = Date.now(),
): CodexRateLimits | null {
  if (!cache.lastSuccess) {
    return null;
  }

  if (now - cache.lastSuccess.fetchedAt > STALE_CACHE_TTL_MS) {
    return null;
  }

  return {
    fiveHour: cache.lastSuccess.fiveHour,
    sevenDay: cache.lastSuccess.sevenDay,
  };
}

export function withSuccess(
  rateLimits: CodexRateLimits,
  now: number = Date.now(),
): CodexRateLimitCache {
  return {
    version: 1,
    lastSuccess: {
      fetchedAt: now,
      fiveHour: rateLimits.fiveHour,
      sevenDay: rateLimits.sevenDay,
    },
  };
}
