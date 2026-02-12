/**
 * JSON-RPC リクエスト（"jsonrpc" フィールドなし — Codex app-server の仕様）
 */
export interface JsonRpcRequest {
  method: string;
  id: number;
  params?: unknown;
}

/**
 * JSON-RPC レスポンス（"jsonrpc" フィールドなし）
 */
export interface JsonRpcResponse {
  id: number;
  result?: unknown;
  error?: { code: number; message: string };
}

/**
 * Codex レートリミット（単一ウィンドウ）
 */
export interface CodexRateLimit {
  /** 使用率（%） */
  usedPercent: number;
  /** リセット時刻（Unix timestamp 秒） */
  resetsAt: number;
  /** ウィンドウ幅（分） */
  windowDurationMins: number;
}

/**
 * account/rateLimits/read レスポンスの result 部分
 */
export interface CodexRateLimitsResult {
  rateLimits: {
    primary: CodexRateLimit | null;
    secondary: CodexRateLimit | null;
  };
}

/**
 * フォーマット済みリセット情報
 */
export interface ResetInfo {
  /** 残り時間（フォーマット済み） */
  timeRemaining: string;
  /** 使用量（%） */
  usage: number;
}

export interface ResetTimes {
  fiveHour: ResetInfo;
  sevenDay: ResetInfo | null;
}
