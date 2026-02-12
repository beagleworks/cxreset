#!/usr/bin/env node

import { fetchCodexRateLimits } from "./codex.js";
import {
  formatResetTimes,
  formatOutput,
  formatFallbackOutput,
} from "./formatter.js";

async function main(): Promise<void> {
  try {
    // 1. Codex app-server からレートリミットを取得
    const { fiveHour, sevenDay } = await fetchCodexRateLimits();

    // 2. フォーマットして出力
    const times = formatResetTimes(fiveHour, sevenDay);
    console.log(formatOutput(times));
  } catch {
    console.log(formatFallbackOutput());
  }
}

main();
