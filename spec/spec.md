# cxreset - 仕様書

## 概要

OpenAI Codex の使用量リセット時間と使用率を表示する CLI ツール。
statusline での表示を想定。ccreset（Claude Code 版）の姉妹ツール。

## 実行環境

- Node.js 18+ または Bun
- npm / pnpm / bunx いずれの実行方法でも利用可能

## 出力形式

### 正常系（primary + secondary）

```
Codex: 5h:2h30m(5%) | 7d:3d12h(11%)
```

| 項目 | 説明 |
|------|------|
| `Codex:` | プレフィクス（ccreset との差別化） |
| `5h:` | 5時間リセット枠（primary, windowDurationMins=300） |
| `2h30m` | リセットまでの残り時間 |
| `(5%)` | 使用量（%） |
| `7d:` | 7日間リセット枠（secondary, windowDurationMins=10080） |
| `3d12h` | リセットまでの残り時間 |
| `(11%)` | 使用量（%） |

### 正常系（primary のみ、secondary=null）

```
Codex: 5h:2h30m(5%)
```

secondary が null の場合、7d 枠は表示しない。

### リセット済み

残り時間が 0 以下の場合、`reset!` と表示する。

```
Codex: 5h:reset!(5%) | 7d:3d12h(11%)
```

### フォールバック出力

すべてのエラー発生時:

```
Codex: 5h:--(-%) | 7d:--(-%)
```

---

## 通信プロトコル

### 概要

`codex app-server` プロセスを起動し、stdin/stdout で JSON-RPC 2.0（ヘッダー省略形式）通信を行う。

### プロトコル形式

- JSON-RPC 2.0 だが **`"jsonrpc":"2.0"` フィールドを省略**する
- JSONL over stdio（1行1メッセージ）
- 初期化前のリクエストは "Not initialized" エラーで拒否される

### シーケンス

```
cxreset                    codex app-server
  |                              |
  |  spawn("codex", ["app-server"])
  |----------------------------->|
  |                              |
  |  initialize (id=1)          |
  |----------------------------->|
  |                              |
  |  initialize response (id=1) |
  |<-----------------------------|
  |                              |
  |  account/rateLimits/read (id=2)
  |----------------------------->|
  |                              |
  |  rateLimits response (id=2) |
  |<-----------------------------|
  |                              |
  |  SIGTERM                     |
  |----------------------------->|
```

### initialize リクエスト（id=1）

```json
{
  "method": "initialize",
  "id": 1,
  "params": {
    "clientInfo": { "name": "cxreset", "version": "<package.jsonのversion>" },
    "capabilities": {}
  }
}
```

### initialize レスポンス（id=1）

```json
{
  "id": 1,
  "result": {
    "userAgent": "cxreset/0.98.0 ..."
  }
}
```

- `result` が存在すれば成功
- `error` が存在する場合は初期化失敗 → フォールバック

### account/rateLimits/read リクエスト（id=2）

```json
{ "method": "account/rateLimits/read", "id": 2 }
```

### account/rateLimits/read レスポンス（id=2）

```json
{
  "id": 2,
  "result": {
    "rateLimits": {
      "primary": {
        "usedPercent": 5,
        "windowDurationMins": 300,
        "resetsAt": 1770859735
      },
      "secondary": {
        "usedPercent": 11,
        "windowDurationMins": 10080,
        "resetsAt": 1771311795
      },
      "credits": { "hasCredits": false, "unlimited": false, "balance": "0" },
      "planType": "plus"
    }
  }
}
```

### レスポンスフィールド

| フィールド | 型 | 説明 |
|------------|-----|------|
| `usedPercent` | `number`（整数） | 使用率（%）。**required** |
| `windowDurationMins` | `number \| null` | ウィンドウ幅（分）。nullable |
| `resetsAt` | `number \| null` | リセット時刻（Unix timestamp 秒）。nullable |

### windowDurationMins 検証

実機確認結果:
- primary: **300**（= 5時間）
- secondary: **10080**（= 7日）

検証条件:
- primary の `windowDurationMins` が `300` でない場合 → フォールバック
- secondary（非null時）の `windowDurationMins` が `10080` でない場合 → フォールバック
- `windowDurationMins` が null の場合 → フォールバック

### resetsAt の処理

- Unix timestamp（秒）をミリ秒に変換して使用: `resetsAt * 1000`
- `resetsAt` が null、0、または負値の場合 → フォールバック
- ccreset との違い: ccreset は ISO 8601 文字列を `Date.parse()` で処理

---

## タイムアウト

- デフォルト: **2000ms**（2秒）
- statusline は約 3 秒で `[Timeout]` を表示するため、2 秒で打ち切る
- 環境変数 `CXRESET_TIMEOUT_MS` でオーバーライド可能:
  - 未設定 / 空文字: デフォルト 2000ms
  - 数値以外（NaN）: デフォルト 2000ms にフォールバック
  - 0 以下: デフォルト 2000ms にフォールバック
  - 10000 超過: 10000ms にクランプ
  - 有効範囲: 1〜10000ms

---

## エラーハンドリング

### 設計思想

statusline 用途のため、エラー時も一貫した形式で出力する。
これにより、UI の乱れを防ぎ、ユーザー体験を損なわない。
プロセスは常に exit code 0 で終了する。

### 対象エラー

| エラーケース | 発生箇所 | 処理 |
|-------------|---------|------|
| `codex` 未インストール（ENOENT） | spawn error | フォールバック |
| `codex` 未認証 | initialize 応答の error | フォールバック |
| initialize 失敗（id=1 エラー応答） | stdout id=1 | フォールバック（本命リクエスト送信せず） |
| タイムアウト（デフォルト2秒超過） | setTimeout | SIGKILL + フォールバック |
| プロセス異常終了（非0 exit） | close イベント | settled=false の場合のみフォールバック |
| JSON パースエラー | stdout 行処理 | 該当行スキップ（最終的にタイムアウト） |
| `rateLimits` / `primary` 欠落 | 応答検証 | フォールバック |
| `secondary` が null | 応答検証 | 5h のみ表示（エラーではない） |
| `windowDurationMins` 範囲外 | 応答検証 | フォールバック |
| `resetsAt` が null / 0 / 負値 | 応答検証 | フォールバック |

### 子プロセスの終了処理（settled フラグ）

内部状態フラグ `settled: boolean` を持ち、resolve/reject 後は `true` に設定:

- **レスポンス受信成功時**: `settled=true` → `clearTimeout` → `resolve` → `child.kill("SIGTERM")`
- **タイムアウト時**: `settled=true` → `child.kill("SIGKILL")` → `reject`
- **spawn エラー時**: `settled=false` なら `settled=true` → `clearTimeout` → `reject`
- **close イベント（非0 exit）**: `settled=true` なら無視。`settled=false` なら `reject`

これにより、成功後に SIGTERM で子プロセスが非 0 終了しても、フォールバックに倒れない。

---

## 使用方法

### bunx 実行

```bash
bunx cxreset
```

### npx 実行

```bash
npx cxreset
```

### pnpm 実行

```bash
pnpm dlx cxreset
```

### ローカル実行（ソースから）

```bash
npm install
npm run build
node dist/index.js
```

### statusline 設定

`~/.claude/settings.json`:

#### Bun を使う場合

```json
{
  "statusLine": {
    "type": "command",
    "command": "bunx cxreset"
  }
}
```

#### Node.js のみで使う場合

```json
{
  "statusLine": {
    "type": "command",
    "command": "npx cxreset"
  }
}
```

---

## ランディングページ（GitHub Pages）

### 概要

`docs/` ディレクトリが GitHub Pages のランディングページとして公開される。

### 公開URL

```
https://beagleworks.github.io/cxreset/
```

### 構成ファイル

| ファイル | 役割 |
|----------|------|
| `docs/index.html` | LP本体（単一HTMLファイル） |
| `docs/style.css` | スタイルシート |

### 機能

- **多言語対応**: EN / JA の切り替えボタン
- **テーマ切り替え**: ダーク / ライトモード
- **コピーボタン**: インストールコマンドや設定JSONをワンクリックでコピー
- **アクセントカラー**: ccreset（amber）とは異なる色で差別化

### デプロイ

- `.github/workflows/pages.yml` による自動デプロイ
- トリガー: `main` ブランチへの push（`docs/**` または workflow ファイル自体の変更時）
- 手動実行（`workflow_dispatch`）も可能

---

## npm 公開 CI 仕様（GitHub Actions）

### 対象 workflow

- `.github/workflows/npm-publish.yml`

### 実行トリガー

- `v*.*.*` 形式の Git タグ push 時のみ実行

### 実行手順

1. `npm ci`
2. `npm run typecheck`
3. `npm run build`
4. タグ版数（`vX.Y.Z`）と `package.json` の `version` 一致チェック
5. `npm publish --provenance --access public`

### 認証・セキュリティ要件

- npm Trusted Publishing（OIDC）を使用
- GitHub Actions の `NPM_TOKEN` シークレットは使用しない
- workflow permissions は `id-token: write` を含むこと

### 失敗条件

- タグ版数と `package.json` の `version` が不一致
- Trusted Publisher 未設定または権限不足
