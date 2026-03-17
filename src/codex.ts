import {
  spawn,
  type ChildProcessWithoutNullStreams,
} from "node:child_process";
import { createRequire } from "node:module";
import type {
  JsonRpcRequest,
  JsonRpcResponse,
  CodexRateLimit,
  CodexRateLimitsResult,
} from "./types.js";

const EXPECTED_PRIMARY_WINDOW = 300;
const EXPECTED_SECONDARY_WINDOW = 10080;
const DEFAULT_TIMEOUT_MS = 2000;
const MAX_TIMEOUT_MS = 10000;

export interface FetchCodexRateLimitsOptions {
  spawnFn?: typeof spawn;
  timeoutMs?: number;
  version?: string;
}

function getVersion(): string {
  const require = createRequire(import.meta.url);
  const pkg = require("../package.json") as { version: string };
  return pkg.version;
}

function getTimeoutMs(): number {
  const env = process.env["CXRESET_TIMEOUT_MS"];
  if (!env || env.trim() === "") return DEFAULT_TIMEOUT_MS;

  const value = Number(env);
  if (Number.isNaN(value) || value <= 0) return DEFAULT_TIMEOUT_MS;
  if (value > MAX_TIMEOUT_MS) return MAX_TIMEOUT_MS;

  return value;
}

function validateRateLimit(
  rl: unknown,
  expectedWindow: number,
): CodexRateLimit | null {
  if (!rl || typeof rl !== "object") return null;

  const obj = rl as Record<string, unknown>;

  if (typeof obj["usedPercent"] !== "number") return null;
  if (typeof obj["resetsAt"] !== "number" || obj["resetsAt"] <= 0) return null;
  if (obj["windowDurationMins"] !== expectedWindow) return null;

  return {
    usedPercent: obj["usedPercent"],
    resetsAt: obj["resetsAt"],
    windowDurationMins: obj["windowDurationMins"] as number,
  };
}

/**
 * Codex app-server を JSON-RPC で呼び出してレートリミットを取得
 */
export function fetchCodexRateLimits(
  options: FetchCodexRateLimitsOptions = {},
): Promise<{
  fiveHour: CodexRateLimit;
  sevenDay: CodexRateLimit | null;
}> {
  const {
    spawnFn = spawn,
    timeoutMs = getTimeoutMs(),
    version = getVersion(),
  } = options;

  return new Promise((resolve, reject) => {
    let settled = false;
    let buffer = "";

    const child = spawnFn("codex", ["app-server"], {
      stdio: ["pipe", "pipe", "pipe"],
    }) as ChildProcessWithoutNullStreams;

    // EPIPE 防止: 子プロセスが早期終了した場合に stdin.write() が
    // Unhandled 'error' event を発火させるのを防ぐ
    child.stdin.on("error", () => {});

    const timer = setTimeout(() => {
      if (!settled) {
        settled = true;
        clearTimeout(timer);
        child.kill("SIGKILL");
        reject(new Error("timeout"));
      }
    }, timeoutMs);

    function rejectRequest(error: Error, signal?: NodeJS.Signals): void {
      if (settled) return;

      settled = true;
      clearTimeout(timer);

      if (signal) {
        child.kill(signal);
      }

      reject(error);
    }

    function resolveRequest(
      fiveHour: CodexRateLimit,
      sevenDay: CodexRateLimit | null,
    ): void {
      if (settled) return;

      settled = true;
      clearTimeout(timer);
      resolve({ fiveHour, sevenDay });
      child.kill("SIGTERM");
    }

    function handleMessage(msg: JsonRpcResponse): void {
      if (msg.id === 1) {
        // initialize レスポンス
        if (msg.error || !msg.result) {
          rejectRequest(
            new Error(
              msg.error
                ? `initialize failed: ${msg.error.message}`
                : "initialize response missing result",
            ),
            "SIGTERM",
          );
          return;
        }

        // initialize 成功 → account/rateLimits/read 送信
        const rateLimitsReq: JsonRpcRequest = {
          method: "account/rateLimits/read",
          id: 2,
        };
        child.stdin.write(JSON.stringify(rateLimitsReq) + "\n");
        return;
      }

      if (msg.id !== 2) {
        return;
      }

      // rateLimits レスポンス
      if (msg.error) {
        rejectRequest(
          new Error(`rateLimits/read failed: ${msg.error.message}`),
          "SIGTERM",
        );
        return;
      }

      const result = msg.result as CodexRateLimitsResult | undefined;
      const rateLimits = result?.rateLimits;

      if (!rateLimits) {
        rejectRequest(new Error("rateLimits missing in response"), "SIGTERM");
        return;
      }

      const primary = validateRateLimit(
        rateLimits.primary,
        EXPECTED_PRIMARY_WINDOW,
      );
      if (!primary) {
        rejectRequest(
          new Error("invalid or missing primary rate limit"),
          "SIGTERM",
        );
        return;
      }

      const secondary = rateLimits.secondary
        ? validateRateLimit(
            rateLimits.secondary,
            EXPECTED_SECONDARY_WINDOW,
          )
        : null;

      // secondary が非null だが検証失敗 → フォールバック
      if (rateLimits.secondary && !secondary) {
        rejectRequest(new Error("invalid secondary rate limit"), "SIGTERM");
        return;
      }

      resolveRequest(primary, secondary);
    }

    function handleLine(line: string): void {
      if (!line.trim()) return;

      let msg: JsonRpcResponse;
      try {
        msg = JSON.parse(line) as JsonRpcResponse;
      } catch {
        // JSON パースエラー — 該当行スキップ
        return;
      }

      handleMessage(msg);
    }

    function flushBuffer(): void {
      if (!buffer.trim()) {
        buffer = "";
        return;
      }

      const remainingLine = buffer;
      buffer = "";
      handleLine(remainingLine);
    }

    child.on("error", (err) => {
      rejectRequest(err);
    });

    child.on("close", (code) => {
      flushBuffer();
      rejectRequest(new Error(`codex app-server exited with code ${code}`));
    });

    child.stdout.on("data", (data: Buffer) => {
      buffer += data.toString();
      const lines = buffer.split("\n");
      buffer = lines.pop()!;

      for (const line of lines) {
        handleLine(line);
        if (settled) return;
      }
    });

    child.stdout.on("end", () => {
      flushBuffer();
    });

    // initialize リクエスト送信
    const initReq: JsonRpcRequest = {
      method: "initialize",
      id: 1,
      params: {
        clientInfo: { name: "cxreset", version },
        capabilities: {},
      },
    };
    child.stdin.write(JSON.stringify(initReq) + "\n");
  });
}
