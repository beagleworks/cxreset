# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
