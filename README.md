# Mercator — Agent Economic Arena

An economic simulation game where AI agents govern competing nation-states in a shared economy. Play solo against AI, or go online with up to 4 human players. Inspired by Victoria 3 and Vending-Bench.

## Quick Start

```bash
git clone https://github.com/punkcanyang/mercator.git
cd mercator
npm install
```

## Play Modes

### 1. CLI Mode (Single Player)

Play directly in your terminal against AI opponents.

```bash
# Play as a human against 3 AI personalities (20 rounds)
npx tsx src/index.ts --human --rounds 20

# Watch 4 AI personalities compete
npx tsx src/index.ts --rounds 50

# LLM agent vs AI personalities (needs ANTHROPIC_API_KEY)
export ANTHROPIC_API_KEY="your-key"
npx tsx src/index.ts --llm 1 --rounds 50
```

### 2. WebSocket Server (LAN Multiplayer)

Host a game on your local network. Players connect via browser.

```bash
# Start server for 2 human players, 20 rounds
npx tsx src/server.ts --humans 2 --rounds 20

# Custom port and player count
npx tsx src/server.ts --humans 4 --rounds 50 --port 8080
```

Share the network URL printed in the console with other players.

### 3. Web App (Online Multiplayer)

Full browser-based game with room codes, deployed on Vercel.

```bash
# Start the Next.js dev server
npm run dev
```

Open `http://localhost:3000`, enter your name, and create a room. Share the 6-character room code with friends. The host configures rounds and starts the game when ready.

## How to Play

Each round you make 2 choices:

**Focus** — what your nation prioritizes:

1. 🌾 Grow Food Supply — farms, stockpile, feed people
2. 🏗️ Build Industry — factories, workshops, supply chains
3. 📈 Export & Trade — sell surplus, maximize revenue
4. 👥 Invest in People — boost welfare, grow population

**Posture** — how you trade with others:

1. 🤝 Free Trade — low tariffs, competitive pricing
2. 🛡️ Protectionist — high tariffs, keep reserves, self-sufficient
3. ⚔️ Aggressive — undercut rivals, dump goods to crash prices

The engine translates your strategy into specific builds, trades, and welfare policies.

## Economy

- **5 goods**: food, textiles, iron, machinery, luxuries
- **Supply chains**: farm → food, mill (food → textiles), mine → iron, factory (iron → machinery), workshop (textiles + machinery → luxuries)
- **7 building slots** per nation (3 starting + 4 empty). Buildings can be upgraded (2x output per level)
- **Shared market** with supply/demand price matching and tariffs
- **Population** grows when satisfied, declines when starving (min 10)
- **Random events**: droughts, plagues, commodity booms, gold discoveries, trade disruptions

## AI Personalities

| Personality          | Strategy                                                       |
| -------------------- | -------------------------------------------------------------- |
| 🏪 **Merchant**      | Trades aggressively, diversifies, buys low sells high          |
| ⚔️ **Warlord**       | Hoards resources, builds heavy industry, undercuts competitors |
| 🏔️ **Isolationist**  | Self-sufficient, high welfare, grows population                |
| 🏗️ **Industrialist** | Rushes factories/workshops, exports luxuries at premium        |

## Scoring

```
Score = Treasury + Building Assets + (Population × Satisfaction × 100)
```

Rewards balanced play — you need cash, infrastructure, AND happy citizens.

## CLI Options

```
--human          Play as a human
--rounds N       Number of rounds (default: 100)
--agents N       Number of nations (default: 4)
--llm N          N nations controlled by Claude LLM
--smart N        N nations with heuristic AI
--model MODEL    LLM model (default: claude-sonnet-4-20250514)
```

## Local Development

### Prerequisites

- Node.js 18+
- npm

### Setup

```bash
npm install
```

### Dev Commands

```bash
npm run dev          # Next.js dev server (http://localhost:3000)
npm run build        # Lint + format check + production build
npm run lint         # ESLint check
npm run lint:fix     # ESLint autofix
npm run format       # Prettier format all files
npm run format:check # Prettier check (no write)
npm start            # CLI game
npm run server       # WebSocket multiplayer server
```

### Testing the Web App Locally

1. Start the dev server:

   ```bash
   npm run dev
   ```

2. Open `http://localhost:3000` in your browser.

3. To test multiplayer, open multiple browser tabs/windows. Create a room in one, copy the room code, and join from the others.

4. The game uses an in-memory store for local development — no external database needed. Game state persists across hot-reloads but resets when the server restarts.

### Running a Full Build Check

```bash
npm run build
```

This runs ESLint, Prettier format check, and Next.js production build. All three must pass.

## Deployment (Vercel)

### 1. Push to GitHub

```bash
git push origin main
```

### 2. Connect to Vercel

1. Go to [vercel.com](https://vercel.com) and import your GitHub repository.
2. Vercel auto-detects Next.js — no special configuration needed.
3. The build command (`npm run build`) includes lint and format checks.

### 3. Environment Variables

Set these in Vercel project settings if using LLM agents:

| Variable            | Required | Description                           |
| ------------------- | -------- | ------------------------------------- |
| `ANTHROPIC_API_KEY` | Optional | Anthropic API key for LLM agent slots |

### 4. Production State Storage

The default in-memory store works for single-instance deployments but does **not** persist across serverless function invocations. For production:

1. Add an [Upstash Redis](https://vercel.com/marketplace?search=redis) integration from Vercel Marketplace.
2. Update `lib/kv.ts` to use `@upstash/redis` instead of the in-memory Map.
3. The KV connection env vars (`KV_REST_API_URL`, `KV_REST_API_TOKEN`) are auto-set by the integration.

### 5. Custom Domain (Optional)

Add a custom domain in Vercel project settings under **Domains**.

## Project Structure

```
src/
  engine/        Core game logic (pure, browser-safe, no Node.js deps)
  agent/         AI agent implementations (personality, smart, LLM, random, human, web)
  ui/            CLI logger
  index.ts       CLI entry point
  server.ts      WebSocket multiplayer server

lib/             Web adaptation layer
  round-stepper.ts   Stateless per-round resolver
  room-manager.ts    Room lifecycle (create/join/start/submit)
  strategy.ts        Focus+Posture → Actions (browser-safe)
  kv.ts              Key-value store abstraction
  web-agents.ts      Server-side AI wrappers
  hooks/             React hooks

app/             Next.js App Router
  api/room/      REST API endpoints
  room/[roomId]/ Game room page
  page.tsx        Landing page

components/      React UI components (pixel/terminal theme)
```

## License

ISC
