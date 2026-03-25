# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build & Development Commands

```bash
npm run dev          # Start Next.js dev server (web frontend)
npm run build        # Lint + format check + Next.js production build (mandatory checks)
npm run lint         # ESLint on app/, lib/, components/
npm run lint:fix     # ESLint autofix
npm run format       # Prettier write all files
npm run format:check # Prettier check (no write)
npm start            # Run CLI game: npx tsx src/index.ts
npm run server       # Run WebSocket multiplayer server: npx tsx src/server.ts
```

CLI game flags: `--rounds N`, `--agents N`, `--human`, `--llm N`, `--smart N`, `--model NAME`

## Architecture

Mercator is a turn-based economic strategy game with three execution modes sharing the same core engine:

### Dual Codebase: CLI + Web

**`src/engine/`** — Pure game engine (zero Node.js deps, browser-safe). Production, market clearing, population, events. All functions are synchronous and stateless except `runGame()` which orchestrates the loop.

**`src/agent/`** — Agent implementations. All implement `Agent { nationId: string; decide(obs: Observation): Promise<Action[]> }`. These have Node.js deps (readline, Anthropic SDK) — only used server-side.

**`lib/`** — Web adaptation layer that bridges `src/engine/` to Next.js:
- `round-stepper.ts` — Extracts the per-round body from `src/engine/game.ts:runGame()` into a stateless `stepRound()` function. This is the key architectural piece: the CLI runs a loop calling `agent.decide()`, while the web decomposes this into request/response pairs via `stepRound()`.
- `room-manager.ts` — Room lifecycle (create/join/start/submit/resolve). When all humans submit, calls `stepRound()` then runs AI agents for next round.
- `kv.ts` — In-memory KV store using `globalThis` for dev persistence. Replace with Upstash Redis for production.
- `strategy.ts` — Pure `translateStrategy(focus, posture, observation) → Action[]` extracted from `web-agent.ts`, browser-safe.

**`app/`** — Next.js App Router. API routes call into `lib/room-manager.ts`. Frontend polls `/api/room/[roomId]/state` every 1.5s.

### Game Flow (Web)

1. Create room → 6-char code, 1 human + 3 AI slots
2. Others join → replace AI slots (up to 4 humans)
3. Host starts → `createNation()` for each slot, AI agents run for round 1
4. Each round: humans submit via UI → when all submitted → `stepRound()` resolves → AI runs for next round → repeat
5. After final round → `computeScores()` → game over

### Engine Files Use `.js` Extensions

Files in `src/engine/` and `src/agent/` use `.js` extensions in imports (e.g., `from "./types.js"`). This is for Node.js/tsx compatibility. `next.config.ts` has `extensionAlias` to resolve `.js` → `.ts` for webpack. Do NOT remove `.js` from `src/` imports — it breaks the CLI.

Files in `lib/`, `app/`, and `components/` do NOT use `.js` extensions and use `@/` path aliases for cross-directory imports.

## Linting Rules

ESLint strict mode for `app/`, `lib/`, `components/`. Relaxed for `src/` (pre-existing engine code):
- `@typescript-eslint/no-explicit-any`: error
- `@typescript-eslint/consistent-type-imports`: error (use `import type`)
- `no-console`: warn (use `console.warn`/`console.error` only — `console.log` allowed in `src/`)
- `curly`: multi-line blocks must use braces

Prettier: double quotes, semicolons, trailing commas, 100 char width.

## Key Types (src/engine/types.ts)

- `Action` — union of build, upgrade, demolish, market_order, set_tariff, set_welfare
- `Observation` — what an agent sees each round (own nation + market prices + rivals' public info)
- `Nation` — treasury, pops, buildings, stockpile, tariffs, welfare
- 5 goods: food, textiles, iron, machinery, luxuries
- 5 buildings: farm, mill, mine, factory, workshop (supply chain)

## Visual Theme

Web frontend uses pixel/terminal aesthetic: Press Start 2P for headings, JetBrains Mono for body, dark background (#0a0e17), terminal-style `.panel` and `.panel-header` CSS classes, scanline overlay.
