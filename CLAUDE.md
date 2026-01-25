# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Workers-Research is a serverless AI-powered deep research agent built on Cloudflare Workers with Google Gemini 2.0. It provides automated research capabilities through a web dashboard, allowing users to conduct in-depth research on any topic with configurable depth and breadth parameters.

## Commands

- `npm test` - Run Vitest unit tests
- `npm run lint` - Check and auto-fix code with Biome
- `npm run build-css` - Compile Tailwind CSS (automatically runs on deploy)
- `wrangler deploy` - Deploy to Cloudflare Workers
- `npx wrangler secret put <SECRET_NAME>` - Set environment secrets

## Architecture

**Core Files:**
- `src/index.tsx` - Main Hono app with HTTP routes and server-rendered JSX UI
- `src/workflows.ts` - Cloudflare Workflows orchestrating multi-step research execution
- `src/webSearch.ts` - Browser automation with Puppeteer + DuckDuckGo for web crawling
- `src/prompts.ts` - LLM system prompts for Gemini
- `src/templates/layout.tsx` - JSX components for dashboard UI

**Research Flow:**
1. User submits query with depth/breadth parameters
2. System generates follow-up questions for clarification
3. Cloudflare Workflow orchestrates iterative research cycles:
   - Generate search queries based on accumulated learnings
   - Web search via DuckDuckGo + Browser Rendering
   - Extract content from URLs (HTML→Markdown)
   - Process learnings with Gemini
   - Repeat based on depth setting
4. Compile findings into final report stored in D1

**Key Bindings (wrangler.toml):**
- `DB` - Cloudflare D1 database
- `RESEARCH_WORKFLOW` - Workflow binding (class: ResearchWorkflow)
- `BROWSER` - Browser Rendering for Puppeteer
- `AI` - Cloudflare AI (for AutoRAG feature)

**Environment Secrets:**
- `GOOGLE_API_KEY` - Required, from Google AI Studio
- `AI_GATEWAY_ACCOUNT_ID`, `AI_GATEWAY_NAME`, `AI_GATEWAY_API_KEY` - Optional, for Cloudflare AI Gateway

## Tech Stack

- **Runtime:** Cloudflare Workers + Workflows
- **Database:** Cloudflare D1 (SQLite)
- **Web Framework:** Hono with JSX (server-rendered)
- **LLM:** Google Gemini 2.0 Flash Experimental (fallback: Gemini 2.0 Flash)
- **Web Crawling:** Cloudflare Browser Rendering + Puppeteer
- **Styling:** Tailwind CSS
- **Validation:** Zod schemas
- **Query Builder:** workers-qb for D1

## Testing

Tests use Vitest with mocks for `cloudflare:*` imports located in `src/__mocks__/`. The test configuration aliases all `cloudflare:*` imports to the mock file.

## Code Style

- Uses Biome for linting and formatting (configured with tabs)
- TypeScript strict mode enabled
- ESM modules (`"type": "module"`)
