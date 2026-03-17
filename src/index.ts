import {
  createEmptyCache,
  getFreshRateLimits,
  getStaleRateLimits,
  loadCache,
  saveCache,
  withSuccess,
} from "./cache.js";
import { fetchCodexRateLimits } from "./codex.js";
import {
  formatResetTimes,
  formatOutput,
  formatFallbackOutput,
} from "./formatter.js";
import type { CodexRateLimitCache } from "./types.js";

export interface RunOptions {
  fetchCodexRateLimitsFn?: typeof fetchCodexRateLimits;
  loadCacheFn?: typeof loadCache;
  saveCacheFn?: typeof saveCache;
  log?: (message: string) => void;
}

async function loadCacheSafely(
  loadCacheFn: typeof loadCache,
): Promise<CodexRateLimitCache> {
  try {
    return await loadCacheFn();
  } catch {
    return createEmptyCache();
  }
}

async function persistCache(
  saveCacheFn: typeof saveCache,
  cache: CodexRateLimitCache,
): Promise<void> {
  try {
    await saveCacheFn(cache);
  } catch {
    // キャッシュ保存の失敗で、本来表示できる最新値は捨てない
  }
}

export async function run(options: RunOptions = {}): Promise<void> {
  const {
    fetchCodexRateLimitsFn = fetchCodexRateLimits,
    loadCacheFn = loadCache,
    saveCacheFn = saveCache,
    log = console.log,
  } = options;

  const cache = await loadCacheSafely(loadCacheFn);
  const freshRateLimits = getFreshRateLimits(cache);

  if (freshRateLimits) {
    log(formatOutput(formatResetTimes(
      freshRateLimits.fiveHour,
      freshRateLimits.sevenDay,
    )));
    return;
  }

  try {
    // 1. Codex app-server からレートリミットを取得
    const rateLimits = await fetchCodexRateLimitsFn();
    await persistCache(saveCacheFn, withSuccess(rateLimits));

    // 2. フォーマットして出力
    const times = formatResetTimes(rateLimits.fiveHour, rateLimits.sevenDay);
    log(formatOutput(times));
  } catch {
    const staleRateLimits = getStaleRateLimits(cache);
    if (staleRateLimits) {
      log(formatOutput(formatResetTimes(
        staleRateLimits.fiveHour,
        staleRateLimits.sevenDay,
      )));
      return;
    }

    log(formatFallbackOutput());
  }
}
