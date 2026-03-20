# リリース

[English](./RELEASING.md)

このリポジトリは、`v1.2.3` のようなタグを push すると GitHub Actions 経由で npm に公開されます。

## Workflow

- Workflow ファイル: `.github/workflows/npm-publish.yml`
- 発火条件: `v*.*.*` に一致するタグの push
- 公開コマンド: `npm publish --provenance --access public`

## 事前設定

1. npm パッケージ設定で Trusted Publisher を追加する。
2. Provider に `GitHub Actions` を選び、このリポジトリと workflow（`.github/workflows/npm-publish.yml`）を紐づける。
3. GitHub 側の `NPM_TOKEN` シークレットは不要。

## 公開手順

```bash
# 例: 0.1.0 を公開する場合
npm version 0.1.0
git push origin main --follow-tags
```

## チェック内容

- workflow は `npm ci`、`npm run typecheck`、`npm test`、`npm run build` を実行する。
- Git タグ（例: `v0.1.0`）と `package.json` の `version` が一致しない場合、workflow は失敗し公開しない。
