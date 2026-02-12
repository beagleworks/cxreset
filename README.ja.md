# cxreset

[English README](./README.md)

OpenAI Codex の使用量リセット時間を表示する CLI ツール。statusline での表示に最適。

## インストール

```bash
# 推奨: グローバルインストールせず実行
bunx cxreset

# または npx
npx cxreset

# または pnpm
pnpm dlx cxreset
```

### 任意: グローバルインストール

```bash
bun add -g cxreset
# または
npm install -g cxreset
```

## 使い方

### パッケージ実行

```bash
bunx cxreset
# または
npx cxreset
# または
pnpm dlx cxreset
```

### ローカル実行（ソースから）

```bash
npm install
npm run build
node dist/index.js
```

### 出力例

```
Codex: 5h:2h30m(5%) | 7d:3d12h(11%)
```

| 項目 | 説明 |
|------|------|
| `Codex:` | プレフィクス（ccreset との差別化） |
| `5h:` | 5時間リセット枠 |
| `2h30m` | リセットまでの残り時間 |
| `(5%)` | 使用量 |
| `7d:` | 7日間（週間）リセット枠 |
| `3d12h` | リセットまでの残り時間 |
| `(11%)` | 使用量 |

secondary ウィンドウが利用できない場合は、5時間枠のみ表示:

```
Codex: 5h:2h30m(5%)
```

## Claude Code Statusline

`~/.claude/settings.json` に以下を追加。

### Bun ランタイム

```json
{
  "statusLine": {
    "type": "command",
    "command": "bunx cxreset"
  }
}
```

### Node.js のみで使う場合

```json
{
  "statusLine": {
    "type": "command",
    "command": "npx cxreset"
  }
}
```

## 必要条件

- Node.js 18+ または [Bun](https://bun.sh/) ランタイム
- [Codex CLI](https://github.com/openai/codex) がインストール・認証済みであること

## 仕組み

Codex CLI の app-server を起動し、JSON-RPC で通信して使用量情報を取得します。

## npm 自動公開（GitHub Actions）

このリポジトリには、`v1.2.3` のようなタグを push すると npm に自動公開する CI（`.github/workflows/npm-publish.yml`）が含まれます。

事前設定:

1. npm のパッケージ設定で Trusted Publisher を追加する
2. Provider に `GitHub Actions` を選び、このリポジトリと workflow（`.github/workflows/npm-publish.yml`）を紐づける
3. GitHub 側の `NPM_TOKEN` シークレットは不要（使いません）

公開手順:

```bash
# 例: 0.1.0 を公開する場合
npm version 0.1.0
git push origin main --follow-tags
```

タグ（`v0.1.0`）と `package.json` の `version` が一致しない場合、CI は失敗して公開しません。

## ライセンス

MIT

## GitHub Pages

ランディングページ（`docs/`）は `.github/workflows/pages.yml` でデプロイします。GitHub の `Settings > Pages` の Source は `GitHub Actions` を選択してください。
