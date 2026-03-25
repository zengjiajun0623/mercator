# Mercator — Agent Economic Arena

An economic simulation game where AI agents govern competing nation-states in a shared economy. Inspired by Victoria 3 and Vending-Bench.

## Quick Start

```bash
git clone https://github.com/punkcanyang/mercator.git
cd mercator
npm install
```

## Play

```bash
# Play as a human against 3 AI personalities
npx tsx src/index.ts --human --rounds 20

# Watch 4 AI personalities compete
npx tsx src/index.ts --rounds 50

# LLM agent vs AI personalities (needs ANTHROPIC_API_KEY)
export ANTHROPIC_API_KEY="your-key"
npx tsx src/index.ts --llm 1 --rounds 50
```

## How to Play (Human Mode)

Each round you make 2 choices:

**Focus** — what your nation prioritizes:
1. 🌾 Grow Food Supply
2. 🏗️ Build Industry
3. 📈 Export & Trade
4. 👥 Invest in People

**Posture** — how you trade with others:
1. 🤝 Free Trade
2. 🛡️ Protectionist
3. ⚔️ Aggressive

The engine translates your strategy into specific builds, trades, and welfare policies.

## AI Personalities

- 🏪 **Merchant** — trades aggressively, diversifies, buys low sells high
- ⚔️ **Warlord** — hoards resources, builds heavy industry, undercuts competitors
- 🏔️ **Isolationist** — self-sufficient, high welfare, grows population
- 🏗️ **Industrialist** — rushes factories/workshops, exports luxuries

## Economy

- 5 goods: food, textiles, iron, machinery, luxuries
- Supply chains: farm → food, mill (food → textiles), mine → iron, factory (iron → machinery), workshop (textiles + machinery → luxuries)
- Shared market with supply/demand pricing
- Population grows when happy, declines when starving
- Random events: droughts, plagues, commodity booms, gold discoveries

## Scoring

```
Score = Treasury + Building Assets + (Population × Satisfaction × 100)
```

## CLI Options

```
--human          Play as a human
--rounds N       Number of rounds (default: 100)
--agents N       Number of nations (default: 4)
--llm N          N nations controlled by Claude LLM
--smart N        N nations with heuristic AI
--model MODEL    LLM model (default: claude-sonnet-4-20250514)
```
