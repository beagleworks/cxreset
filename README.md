# cxreset

[日本語版 README](./README.ja.md)

A CLI tool to display OpenAI Codex usage reset time. Ideal for statusline display.

## Installation

```bash
# Recommended: run without global install
bunx cxreset

# or with npx
npx cxreset

# or with pnpm
pnpm dlx cxreset
```

### Optional: Global install

```bash
bun add -g cxreset
# or
npm install -g cxreset
```

## Usage

### Package execution

```bash
bunx cxreset
# or
npx cxreset
# or
pnpm dlx cxreset
```

### Local execution (from source)

```bash
npm install
npm run build
node dist/index.js
```

### Output

```
Codex: 5h:2h30m(5%) | 7d:3d12h(11%)
```

| Field | Description |
|-------|-------------|
| `Codex:` | Prefix (distinguishes from ccreset) |
| `5h:` | 5-hour reset window |
| `2h30m` | Time remaining until reset |
| `(5%)` | Current usage |
| `7d:` | 7-day (weekly) reset window |
| `3d12h` | Time remaining until reset |
| `(11%)` | Current usage |

When the secondary window is not available, only the 5-hour window is shown:

```
Codex: 5h:2h30m(5%)
```

## Claude Code Statusline

Add the following to `~/.claude/settings.json`.

### Bun runtime

```json
{
  "statusLine": {
    "type": "command",
    "command": "bunx cxreset"
  }
}
```

### Node.js-only runtime

```json
{
  "statusLine": {
    "type": "command",
    "command": "npx cxreset"
  }
}
```

## Requirements

- Node.js 18+ or [Bun](https://bun.sh/) runtime
- [Codex CLI](https://github.com/openai/codex) installed and authenticated

## How it works

Launches the Codex CLI's app-server and communicates via JSON-RPC to fetch usage information.

## npm Auto Publish (GitHub Actions)

This repo includes CI (`.github/workflows/npm-publish.yml`) that automatically publishes to npm when you push a tag like `v1.2.3`.

Prerequisites:

1. Add a Trusted Publisher in your npm package settings
2. Select `GitHub Actions` as the provider and bind this repository and workflow (`.github/workflows/npm-publish.yml`)
3. No `NPM_TOKEN` GitHub secret is required

Release flow:

```bash
# Example: release 0.1.0
npm version 0.1.0
git push origin main --follow-tags
```

If the Git tag (for example `v0.1.0`) and `package.json` version do not match, the workflow fails and does not publish.

## License

MIT

## GitHub Pages

The landing page (`docs/`) is deployed by `.github/workflows/pages.yml`. In GitHub `Settings > Pages`, set Source to `GitHub Actions`.
