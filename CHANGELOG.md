# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- CHANGELOG.md for tracking all changes
- Database indexes on `status`, `created_at`, and `user` columns for faster queries (migration 0008)
- Database columns `updated_at` and `deleted_at` for soft delete support (migration 0009)
- Source tracking tables: `research_sources` and `research_learnings` with confidence levels (migration 0010)
- New TypeScript types: `ResearchSource`, `ResearchLearning`, `LearningWithSource`, `ConfidenceLevel`
- Confidence scoring for learnings (HIGH/MEDIUM/LOW based on source quality)
- Source attribution in learnings with URL tracking
- Learning deduplication to remove semantically similar findings
- New prompt templates: `LEARNING_EXTRACTION_PROMPT`, `EXECUTIVE_SUMMARY_PROMPT`, `FINAL_REPORT_PROMPT`, `SELF_REFLECTION_PROMPT`
- Improved title generation with specific examples and anti-patterns
- Centralized configuration in `src/config.ts` with validation schemas
- Input validation using Zod for all form inputs
- CSRF protection for all state-changing requests (POST/PUT/DELETE)
- Environment secret validation middleware
- HTML sanitization helper functions
- Dark mode support with toggle button in header and localStorage persistence
- Keyboard shortcuts: `?` for help modal, `n` for new research, `h` for home, `j/k` for list navigation, `Ctrl+D` for dark mode toggle, `/` to focus search, `Esc` to close modals
- Research intensity presets (Quick/Standard/Thorough) for depth/breadth parameters
- Tooltips explaining depth and breadth parameters
- Shortcuts help modal showing all available keyboard shortcuts
- Search functionality to filter research reports by title or query
- Status filter dropdown (All/Processing/Completed/Failed)
- Sort options (Newest/Oldest/Title A-Z/Title Z-A)
- Clone feature to create new research from existing report parameters
- Auto-generated Table of Contents for reports with 3+ headings
- Clickable anchor links on all headings in reports
- Color-coded confidence indicators in reports (HIGH=green, MEDIUM=yellow, LOW=red)
- JSON export format for structured data download
- Dark mode support for markdown report content
- Comprehensive test suite for markdown rendering (24 tests covering basic rendering, TOC, confidence indicators, dark mode, XSS prevention, slug generation)
- Edge case tests for workflow functions (deduplicateLearnings, processSerpResult, writeFinalReport)
- Test suite for cache utilities (18 tests covering KV operations, TTL, batch operations)
- Test suite for storage utilities (27 tests covering R2 operations, threshold detection, fallback logic)
- Test suite for config and validation (45 tests covering Zod schemas, CSRF, sanitization)
- Workers KV caching for URL content and search results with configurable TTLs
- Cache utility module (`src/cache.ts`) with batch operations support
- R2 storage for large reports (>512KB) with automatic fallback to D1
- Storage utility module (`src/storage.ts`) for R2 operations
- Source URL submission: users can provide specific URLs to crawl first (migration 0011)
- Domain exclusion: users can specify domains to exclude from search results
- Source URLs and excluded domains fields in research creation and clone forms

### Changed
- Unified `deepResearch` and `deepResearchAutoRAG` functions using strategy pattern (reduces code duplication by ~50%)
- Replaced magic numbers with centralized config values from `src/config.ts`
- Improved type safety: removed `any` types, added proper error type guards
- Better error handling with `isRateLimitError()` helper function
- Upgraded zod from v3 to v4 - using new top-level `z.uuid()` format validator
- Upgraded AI SDK from v4 to v6 for zod v4 compatibility
- Upgraded @ai-sdk/google from v1 to v3 for zod v4 support
- Upgraded @biomejs/biome from v1.9 to v2.3 with migrated config
- Upgraded hono from v4.7 to v4.11
- Upgraded marked from v15 to v17
- Upgraded node-html-markdown from v1.3 to v2.0
- Upgraded vitest from v3.2 to v4.0
- Upgraded wrangler from v4.20 to v4.60
- Upgraded workers-qb from v1.10 to v1.13
- Upgraded typescript from v5.8 to v5.9
- Upgraded @cloudflare/puppeteer from v1.0.2 to v1.0.5
- Upgraded @cloudflare/workers-types to v4.20260124
- Upgraded tailwindcss and @tailwindcss/cli from v4.1.8 to v4.1.18
- Upgraded @types/node from v22.15 to v25.0

### Fixed
- Fixed D1 migration error with `DEFAULT CURRENT_TIMESTAMP` in ALTER TABLE (not allowed by SQLite)
- Fixed research intensity presets (Quick/Standard/Thorough) not responding to clicks
- Fixed download report dropdown not opening
- Fixed re-run and delete buttons not working
- Fixed JavaScript functions with incorrect underscore prefixes causing onclick handlers to fail

### Security
- Fixed XSS vulnerability by adding HTML sanitization with `sanitize-html` in markdown rendering
- Added CSRF tokens to all forms and HTMX requests
- Added input validation with Zod schemas for query, depth, breadth parameters
- Added secret validation at startup for required API keys
- All external links now open with `rel="noopener noreferrer"` for security

### Removed
