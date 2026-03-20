# Releasing

[日本語版](./RELEASING.ja.md)

This repository publishes to npm via GitHub Actions when you push a tag like `v1.2.3`.

## Workflow

- Workflow file: `.github/workflows/npm-publish.yml`
- Trigger: push of a tag matching `v*.*.*`
- Publish command: `npm publish --provenance --access public`

## Prerequisites

1. Add a Trusted Publisher in your npm package settings.
2. Select `GitHub Actions` as the provider and bind this repository and workflow (`.github/workflows/npm-publish.yml`).
3. No `NPM_TOKEN` GitHub secret is required.

## Release Flow

```bash
# Example: release 0.1.0
npm version 0.1.0
git push origin main --follow-tags
```

## Checks

- The workflow runs `npm ci`, `npm run typecheck`, `npm test`, and `npm run build`.
- If the Git tag (for example `v0.1.0`) and `package.json` version do not match, the workflow fails and does not publish.
