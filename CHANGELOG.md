# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.2.0] - 2026-03-18

### Added

- Add a persistent cache under `XDG_CACHE_HOME` or `~/.cache` to reuse recent Codex rate limit snapshots
- Add fresh/stale TTL handling so statusline polling can reuse cached data across processes

### Fixed

- Fall back to stale cached values when `codex app-server` times out or returns an invalid response
- Reduce repeated `codex app-server` startups during statusline polling

## [0.1.4] - 2026-03-18

### Fixed

- Parse the final `codex app-server` response line even when it has no trailing newline
- Add a regression test for responses that end without a trailing newline

## [0.1.3] - 2026-03-08

### Fixed

- Restore `bunx cxreset` execution by splitting the dedicated CLI entrypoint
- Add a CLI bootstrap regression test for the packaged executable path

## [0.1.2] - 2026-03-08

### Fixed

- Add Node.js standard tests for CLI, formatter, and JSON-RPC flow
- Run `npm test` before npm publish and declare `engines.node >=18`
- Fix README screenshot links for published package rendering
- Fix GitHub Pages logo navigation on project site URLs

## [0.1.1] - 2026-02-12

### Fixed

- Handle stdin EPIPE when codex app-server exits early
- Validate initialize response has `result` field per spec

### Added

- Screenshot and ccstatusline usage guide with timeout recommendation

## [0.1.0] - 2026-02-12

### Added

- Initial release
- Display Codex 5-hour and 7-day usage reset time
- Show usage percentage
- Support for Claude Code statusline integration
- Configurable timeout via `CXRESET_TIMEOUT_MS` environment variable
