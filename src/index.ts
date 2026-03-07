import { fetchCodexRateLimits } from "./codex.js";
import {
  formatResetTimes,
  formatOutput,
  formatFallbackOutput,
} from "./formatter.js";

export interface RunOptions {
  fetchCodexRateLimitsFn?: typeof fetchCodexRateLimits;
  log?: (message: string) => void;
}

export async function run(options: RunOptions = {}): Promise<void> {
  const {
    fetchCodexRateLimitsFn = fetchCodexRateLimits,
    log = console.log,
  } = options;

  try {
    // 1. Codex app-server からレートリミットを取得
    const { fiveHour, sevenDay } = await fetchCodexRateLimitsFn();

    // 2. フォーマットして出力
    const times = formatResetTimes(fiveHour, sevenDay);
    log(formatOutput(times));
  } catch {
    log(formatFallbackOutput());
  }
}
