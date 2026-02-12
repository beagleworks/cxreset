import type { CodexRateLimit, ResetTimes } from "./types.js";

/**
 * ミリ秒を人間が読める形式に変換
 * 例: 9000000 -> "2h30m"
 */
function formatDuration(ms: number): string {
  if (ms <= 0) return "0m";

  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  const remainingHours = hours % 24;
  const remainingMinutes = minutes % 60;

  const parts: string[] = [];

  if (days > 0) {
    parts.push(`${days}d`);
    if (remainingHours > 0) {
      parts.push(`${remainingHours}h`);
    }
  } else if (hours > 0) {
    parts.push(`${hours}h`);
    if (remainingMinutes > 0) {
      parts.push(`${remainingMinutes}m`);
    }
  } else {
    parts.push(`${remainingMinutes}m`);
  }

  return parts.join("");
}

/**
 * リセット時刻（Unix timestamp 秒）から残り時間を計算してフォーマット
 */
function getTimeRemaining(resetAt: number): string {
  const resetTime = resetAt * 1000;

  const now = Date.now();
  const remaining = resetTime - now;

  if (remaining <= 0) {
    return "reset!";
  }

  return formatDuration(remaining);
}

/**
 * 使用率を取得
 */
function getUsagePercentage(usedPercent: number): number {
  return Math.round(usedPercent);
}

/**
 * Codex レートリミットをフォーマット済み構造に変換
 */
export function formatResetTimes(fiveHour: CodexRateLimit, sevenDay: CodexRateLimit | null): ResetTimes {
  return {
    fiveHour: {
      timeRemaining: getTimeRemaining(fiveHour.resetsAt),
      usage: getUsagePercentage(fiveHour.usedPercent),
    },
    sevenDay: sevenDay
      ? {
          timeRemaining: getTimeRemaining(sevenDay.resetsAt),
          usage: getUsagePercentage(sevenDay.usedPercent),
        }
      : null,
  };
}

/**
 * 最終出力形式に整形
 * 例: "Codex: 5h:2h30m(5%) | 7d:3d12h(11%)"
 * secondary=null時: "Codex: 5h:2h30m(5%)"
 */
export function formatOutput(times: ResetTimes): string {
  const fiveHour = `5h:${times.fiveHour.timeRemaining}(${times.fiveHour.usage}%)`;

  if (!times.sevenDay) {
    return `Codex: ${fiveHour}`;
  }

  const sevenDay = `7d:${times.sevenDay.timeRemaining}(${times.sevenDay.usage}%)`;
  return `Codex: ${fiveHour} | ${sevenDay}`;
}

/**
 * エラー時のフォールバック出力を生成
 */
export function formatFallbackOutput(): string {
  return "Codex: 5h:--(-%) | 7d:--(-%)";
}
