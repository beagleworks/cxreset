# cxreset

[English README](./README.md)

Codex CLI の使用量リセット時間を表示する非公式 CLI ツール。statusline での表示に最適。[ccstatusline](https://github.com/sirmalloc/ccstatusline) の表示パーツとしても利用可能。

> 非公式プロジェクトです。OpenAI の提携、承認、サポートは受けていません。

![ccstatusline と併用した cxreset の表示例](https://raw.githubusercontent.com/beagleworks/cxreset/main/docs/assets/inaction.png)

*赤丸部分が cxreset の出力。[ccstatusline](https://github.com/sirmalloc/ccstatusline) と併用した例*

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
node dist/cli.js
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

### ccstatusline と併用する場合

[ccstatusline](https://github.com/sirmalloc/ccstatusline) のアドオンとして使う場合、timeout を 2000ms に設定することを推奨します。cxreset は Codex app-server と JSON-RPC で通信するため、通常の HTTP リクエストより時間がかかることがあります。

## 必要条件

- Node.js 18+ または [Bun](https://bun.sh/) ランタイム
- [Codex CLI](https://github.com/openai/codex) がインストール・認証済みであること

## 仕組み

ローカルにインストールされた Codex CLI の app-server を起動し、JSON-RPC で通信して使用量情報を取得します。

## 互換性に関する注意

- cxreset は、インストール済みの Codex CLI が公開している app-server インターフェースに依存します
- `codex app-server` は、Codex CLI の help 上では現時点で experimental 扱いです
- 将来の Codex CLI 更新により、プロトコルやレスポンス形式が変わって互換性が崩れる可能性があります

## リリース

リリース手順は [RELEASING.ja.md](./RELEASING.ja.md) に移動しました。

## ライセンス

MIT

## GitHub Pages

ランディングページ（`docs/`）は `.github/workflows/pages.yml` でデプロイします。GitHub の `Settings > Pages` の Source は `GitHub Actions` を選択してください。
