import {
  Action,
  Agent,
  Building,
  DEFAULT_CONFIG,
  GameConfig,
  GOODS,
  MarketOrder,
  MarketPrices,
  Nation,
  Observation,
  emptyStockpile,
} from "./types.js";
import { advanceConstruction, buildingAssetValue, runProduction, startBuilding, startUpgrade } from "./production.js";
import { clearMarket, generateWelfareOrders, initialPrices } from "./market.js";
import { consumeNeeds, updatePopulation } from "./population.js";
import { maybeGenerateEvent } from "./events.js";

const NATION_NAMES = [
  "Aurelia", "Borealis", "Crescentia", "Delmara",
  "Elythia", "Feronia", "Galdoria", "Hespera",
];

export interface GameResult {
  rounds: number;
  scores: Array<{
    nationId: string;
    name: string;
    label: string;
    treasury: number;
    assetValue: number;
    popScore: number;
    totalScore: number;
  }>;
  history: RoundSummary[];
}

export interface RoundSummary {
  round: number;
  totalRounds: number;
  prices: MarketPrices;
  nations: Array<{
    id: string;
    name: string;
    label: string;
    treasury: number;
    pops: number;
    satisfaction: number;
    buildingCount: number;
    totalBuildings: number;
    stockpile: Record<string, number>;
  }>;
  tradeCount: number;
  event?: string;
  nationActions?: Record<string, string[]>;
}

// Different starting builds per nation to create asymmetric economies
const STARTING_BUILDS: Building["type"][][] = [
  ["farm", "farm", "mill"],        // Agrarian: food + textiles surplus
  ["farm", "mine", "mine"],        // Mining: iron surplus, needs textiles
  ["farm", "farm", "farm"],        // Breadbasket: huge food surplus
  ["farm", "mine", "factory"],     // Industrial: machinery producer, needs textiles
];

function createNation(index: number, config: GameConfig): Nation {
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

function buildObservation(
  nation: Nation,
  nations: Nation[],
  round: number,
  totalRounds: number,
  marketPrices: MarketPrices
): Observation {
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

function describeAction(action: Action): string {
  switch (action.type) {
    case "build": return `build ${action.buildingType} [slot ${action.slotIndex}]`;
    case "upgrade": return `upgrade ${action.buildingId}`;
    case "market_order": return `${action.side} ${Math.round(action.quantity)} ${action.good} @$${action.price.toFixed(1)}`;
    case "demolish": return `demolish ${action.buildingId}`;
    case "set_tariff": return `tariff ${action.good} ${(action.rate * 100).toFixed(0)}%`;
    case "set_welfare": return `welfare ${(action.level * 100).toFixed(0)}%`;
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

export async function runGame(
  agents: Agent[],
  config: GameConfig = DEFAULT_CONFIG,
  onRound?: (summary: RoundSummary) => void,
  agentLabels?: Map<string, string>
): Promise<GameResult> {
  const nations: Nation[] = [];
  const nationsMap = new Map<string, Nation>();
  for (let i = 0; i < config.nationCount; i++) {
    const nation = createNation(i, config);
    nations.push(nation);
    nationsMap.set(nation.id, nation);
  }

  for (let i = 0; i < agents.length; i++) {
    agents[i].nationId = nations[i].id;
  }

  let marketPrices = initialPrices();
  const history: RoundSummary[] = [];

  for (let round = 1; round <= config.totalRounds; round++) {
    // 0. RANDOM EVENT
    const event = maybeGenerateEvent(nations, round);
    if (event) {
      event.apply(nations);
    }

    // 1. PRODUCE
    for (const nation of nations) {
      runProduction(nation);
    }

    // 2. OBSERVE + DECIDE
    const allMarketOrders: MarketOrder[] = [];
    const nationActions: Record<string, string[]> = {};
    const decisions = await Promise.all(
      agents.map(async (agent) => {
        const nation = nationsMap.get(agent.nationId)!;
        const obs = buildObservation(nation, nations, round, config.totalRounds, marketPrices);
        try {
          const actions = await agent.decide(obs);
          // Policy actions (welfare, tariffs) are unlimited; operational actions capped at 5
          const policy = actions.filter((a) => a.type === "set_welfare" || a.type === "set_tariff");
          const operational = actions.filter((a) => a.type !== "set_welfare" && a.type !== "set_tariff");
          return { nationId: agent.nationId, actions: [...policy, ...operational.slice(0, 5)] };
        } catch (err) {
          console.error(`Agent ${agent.nationId} error:`, err);
          return { nationId: agent.nationId, actions: [] };
        }
      })
    );

    // 3. APPLY ACTIONS
    for (const { nationId, actions } of decisions) {
      const nation = nationsMap.get(nationId)!;
      nationActions[nationId] = applyActions(nation, actions, allMarketOrders);
    }

    // 4. GENERATE WELFARE ORDERS
    for (const nation of nations) {
      const welfareOrders = generateWelfareOrders(nation, marketPrices);
      allMarketOrders.push(...welfareOrders);
    }

    // 5. CLEAR MARKET
    const { trades, prices } = clearMarket(allMarketOrders, nationsMap, marketPrices);
    marketPrices = prices;

    // 6. CONSUME NEEDS
    for (const nation of nations) {
      consumeNeeds(nation);
    }

    // 7. ADVANCE CONSTRUCTION
    for (const nation of nations) {
      advanceConstruction(nation);
    }

    // 8. UPDATE POPULATION
    for (const nation of nations) {
      updatePopulation(nation);
    }

    // 9. TAX INCOME
    for (const nation of nations) {
      const taxIncome = nation.pops.count * 0.5 * nation.pops.satisfaction;
      nation.treasury += taxIncome;
    }

    // 10. LOG
    const summary: RoundSummary = {
      round,
      totalRounds: config.totalRounds,
      prices: structuredClone(marketPrices),
      nations: nations.map((n) => ({
        id: n.id,
        name: n.name,
        label: agentLabels?.get(n.id) ?? "",
        treasury: Math.round(n.treasury * 100) / 100,
        pops: n.pops.count,
        satisfaction: Math.round(n.pops.satisfaction * 100) / 100,
        buildingCount: n.buildings.filter((b) => b.constructionTurnsLeft === 0).length,
        totalBuildings: n.buildings.length,
        stockpile: Object.fromEntries(
          GOODS.map((g) => [g, Math.round(n.stockpile[g] * 10) / 10])
        ),
      })),
      tradeCount: trades.length,
      event: event?.description,
      nationActions,
    };
    history.push(summary);
    onRound?.(summary);
  }

  // Final scoring
  const scores = nations.map((n) => {
    const assetValue = buildingAssetValue(n);
    const popScore = n.pops.count * n.pops.satisfaction * 100;
    return {
      nationId: n.id,
      name: n.name,
      label: agentLabels?.get(n.id) ?? "",
      treasury: Math.round(n.treasury * 100) / 100,
      assetValue,
      popScore: Math.round(popScore),
      totalScore: Math.round((n.treasury + assetValue + popScore) * 100) / 100,
    };
  });
  scores.sort((a, b) => b.totalScore - a.totalScore);

  return { rounds: config.totalRounds, scores, history };
}
