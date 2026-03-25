/**
 * Stateless round stepper — extracted from src/engine/game.ts runGame().
 *
 * Takes the current game state + all player actions and produces the next state.
 * This is the core function called by the web API when all players have submitted.
 */
import type {
  Action,
  MarketOrder,
  MarketPrices,
  Nation,
  GameConfig,
  Building,
} from "../src/engine/types.js";
import { GOODS, emptyStockpile } from "../src/engine/types.js";
import {
  runProduction,
  advanceConstruction,
  buildingAssetValue,
  startBuilding,
  startUpgrade,
} from "../src/engine/production.js";
import { clearMarket, generateWelfareOrders, initialPrices } from "../src/engine/market.js";
import { consumeNeeds, updatePopulation } from "../src/engine/population.js";
import { maybeGenerateEvent } from "../src/engine/events.js";
import type { RoundSummary, GameResult } from "../src/engine/game.js";

// ── Nation creation (mirrors game.ts createNation) ──────────────────────────

const NATION_NAMES = [
  "Aurelia",
  "Borealis",
  "Crescentia",
  "Delmara",
  "Elythia",
  "Feronia",
  "Galdoria",
  "Hespera",
];

const STARTING_BUILDS: Building["type"][][] = [
  ["farm", "farm", "mill"],
  ["farm", "mine", "mine"],
  ["farm", "farm", "farm"],
  ["farm", "mine", "factory"],
];

export function createNation(index: number, config: GameConfig): Nation {
  const id = `nation-${index}`;
  const types = STARTING_BUILDS[index % STARTING_BUILDS.length];
  const buildings: Building[] = types.map((type, i) => ({
    id: `${id}-b${i}`,
    type,
    level: 1,
    constructionTurnsLeft: 0,
    slotIndex: i,
  }));

  return {
    id,
    name: NATION_NAMES[index % NATION_NAMES.length],
    treasury: config.startingTreasury,
    pops: { count: config.startingPops, satisfaction: 0.6 },
    buildings,
    totalSlots: config.totalSlots,
    stockpile: emptyStockpile(),
    tariffs: {},
    welfareSpending: 0.1,
  };
}

export { initialPrices, NATION_NAMES };

// ── Action application (mirrors game.ts applyActions) ───────────────────────

function describeAction(action: Action): string {
  switch (action.type) {
    case "build":
      return `build ${action.buildingType} [slot ${action.slotIndex}]`;
    case "upgrade":
      return `upgrade ${action.buildingId}`;
    case "market_order":
      return `${action.side} ${Math.round(action.quantity)} ${action.good} @$${action.price.toFixed(1)}`;
    case "demolish":
      return `demolish ${action.buildingId}`;
    case "set_tariff":
      return `tariff ${action.good} ${(action.rate * 100).toFixed(0)}%`;
    case "set_welfare":
      return `welfare ${(action.level * 100).toFixed(0)}%`;
  }
}

function applyActions(nation: Nation, actions: Action[], marketOrders: MarketOrder[]): string[] {
  const descriptions: string[] = [];
  for (const action of actions) {
    switch (action.type) {
      case "build":
        if (startBuilding(nation, action.buildingType, action.slotIndex)) {
          descriptions.push(describeAction(action));
        }
        break;
      case "upgrade":
        if (startUpgrade(nation, action.buildingId)) {
          descriptions.push(describeAction(action));
        }
        break;
      case "demolish": {
        const idx = nation.buildings.findIndex((b) => b.id === action.buildingId);
        if (idx >= 0) {
          descriptions.push(describeAction(action));
          nation.buildings.splice(idx, 1);
        }
        break;
      }
      case "market_order": {
        if (action.side === "sell") {
          const available = nation.stockpile[action.good];
          if (action.quantity > available) action.quantity = available;
        }
        if (action.quantity > 0) {
          marketOrders.push({
            nationId: nation.id,
            good: action.good,
            quantity: action.quantity,
            price: action.price,
            side: action.side,
          });
          descriptions.push(describeAction(action));
        }
        break;
      }
      case "set_tariff":
        nation.tariffs[action.good] = Math.max(0, Math.min(1, action.rate));
        descriptions.push(describeAction(action));
        break;
      case "set_welfare":
        nation.welfareSpending = Math.max(0, Math.min(1, action.level));
        descriptions.push(describeAction(action));
        break;
    }
  }
  return descriptions;
}

// ── Enforce action limits (same as game.ts) ─────────────────────────────────

export function enforceActionLimits(actions: Action[]): Action[] {
  const policy = actions.filter((a) => a.type === "set_welfare" || a.type === "set_tariff");
  const operational = actions.filter((a) => a.type !== "set_welfare" && a.type !== "set_tariff");
  return [...policy, ...operational.slice(0, 5)];
}

// ── Build observation (mirrors game.ts buildObservation) ────────────────────

export function buildObservation(
  nation: Nation,
  nations: Nation[],
  round: number,
  totalRounds: number,
  marketPrices: MarketPrices,
) {
  return {
    round,
    totalRounds,
    nation: structuredClone(nation),
    marketPrices: structuredClone(marketPrices),
    otherNations: nations
      .filter((n) => n.id !== nation.id)
      .map((n) => ({
        id: n.id,
        name: n.name,
        pops: n.pops.count,
        buildingCount: n.buildings.filter((b) => b.constructionTurnsLeft === 0).length,
      })),
  };
}

// ── Step one round ──────────────────────────────────────────────────────────

export interface StepRoundResult {
  nations: Nation[];
  marketPrices: MarketPrices;
  summary: RoundSummary;
}

/**
 * Execute a single round of the game.
 *
 * @param nations - Current nation states (will be mutated)
 * @param marketPrices - Current market prices
 * @param allActions - Map of nationId → Action[] (pre-collected from all agents/players)
 * @param round - Current round number (1-based)
 * @param totalRounds - Total rounds in the game
 * @param agentLabels - Map of nationId → display label
 */
export function stepRound(
  nations: Nation[],
  marketPrices: MarketPrices,
  allActions: Record<string, Action[]>,
  round: number,
  totalRounds: number,
  agentLabels: Record<string, string>,
): StepRoundResult {
  const nationsMap = new Map<string, Nation>();
  for (const n of nations) {
    nationsMap.set(n.id, n);
  }

  // 0. RANDOM EVENT
  const event = maybeGenerateEvent(nations, round);
  if (event) {
    event.apply(nations);
  }

  // 1. PRODUCE
  for (const nation of nations) {
    runProduction(nation);
  }

  // 2. APPLY ACTIONS (actions already collected from players/AI)
  const allMarketOrders: MarketOrder[] = [];
  const nationActions: Record<string, string[]> = {};

  for (const [nationId, actions] of Object.entries(allActions)) {
    const nation = nationsMap.get(nationId);
    if (!nation) continue;
    const limited = enforceActionLimits(actions);
    nationActions[nationId] = applyActions(nation, limited, allMarketOrders);
  }

  // 3. GENERATE WELFARE ORDERS
  for (const nation of nations) {
    const welfareOrders = generateWelfareOrders(nation, marketPrices);
    allMarketOrders.push(...welfareOrders);
  }

  // 4. CLEAR MARKET
  const { trades, prices } = clearMarket(allMarketOrders, nationsMap, marketPrices);
  const newPrices = prices;

  // 5. CONSUME NEEDS
  for (const nation of nations) {
    consumeNeeds(nation);
  }

  // 6. ADVANCE CONSTRUCTION
  for (const nation of nations) {
    advanceConstruction(nation);
  }

  // 7. UPDATE POPULATION
  for (const nation of nations) {
    updatePopulation(nation);
  }

  // 8. TAX INCOME
  for (const nation of nations) {
    const taxIncome = nation.pops.count * 0.5 * nation.pops.satisfaction;
    nation.treasury += taxIncome;
  }

  // 9. BUILD SUMMARY
  const summary: RoundSummary = {
    round,
    totalRounds,
    prices: structuredClone(newPrices),
    nations: nations.map((n) => ({
      id: n.id,
      name: n.name,
      label: agentLabels[n.id] ?? "",
      treasury: Math.round(n.treasury * 100) / 100,
      pops: n.pops.count,
      satisfaction: Math.round(n.pops.satisfaction * 100) / 100,
      buildingCount: n.buildings.filter((b) => b.constructionTurnsLeft === 0).length,
      totalBuildings: n.buildings.length,
      stockpile: Object.fromEntries(GOODS.map((g) => [g, Math.round(n.stockpile[g] * 10) / 10])),
    })),
    tradeCount: trades.length,
    event: event?.description,
    nationActions,
  };

  return { nations, marketPrices: newPrices, summary };
}

// ── Compute final scores ────────────────────────────────────────────────────

export function computeScores(
  nations: Nation[],
  agentLabels: Record<string, string>,
): GameResult["scores"] {
  const scores = nations.map((n) => {
    const assetValue = buildingAssetValue(n);
    const popScore = n.pops.count * n.pops.satisfaction * 100;
    return {
      nationId: n.id,
      name: n.name,
      label: agentLabels[n.id] ?? "",
      treasury: Math.round(n.treasury * 100) / 100,
      assetValue,
      popScore: Math.round(popScore),
      totalScore: Math.round((n.treasury + assetValue + popScore) * 100) / 100,
    };
  });
  scores.sort((a, b) => b.totalScore - a.totalScore);
  return scores;
}
