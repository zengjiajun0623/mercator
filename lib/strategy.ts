/**
 * Pure strategy translation — converts Focus + Posture into game Actions.
 *
 * Extracted from src/agent/web-agent.ts for browser-side reuse.
 * No Node.js dependencies — safe to import in React components.
 */
import type {
  Action,
  BuildingType,
  Good,
  Observation,
} from "../src/engine/types.js";
import { GOODS, RECIPES } from "../src/engine/types.js";

export type Focus = "food" | "industry" | "trade" | "people";
export type Posture = "free" | "protectionist" | "aggressive";

export const FOCUS_OPTIONS: Array<{
  value: Focus;
  icon: string;
  label: string;
  desc: string;
}> = [
  { value: "food", icon: "🌾", label: "Grow Food Supply", desc: "Farms, stockpile, feed people" },
  { value: "industry", icon: "🏗️", label: "Build Industry", desc: "Factories, workshops, supply chains" },
  { value: "trade", icon: "📈", label: "Export & Trade", desc: "Sell surplus, maximize revenue" },
  { value: "people", icon: "👥", label: "Invest in People", desc: "Boost welfare, grow population" },
];

export const POSTURE_OPTIONS: Array<{
  value: Posture;
  icon: string;
  label: string;
  desc: string;
}> = [
  { value: "free", icon: "🤝", label: "Free Trade", desc: "Low tariffs, competitive pricing" },
  { value: "protectionist", icon: "🛡️", label: "Protectionist", desc: "High tariffs, keep reserves" },
  { value: "aggressive", icon: "⚔️", label: "Aggressive", desc: "Undercut rivals, dump goods" },
];

export function translateStrategy(
  focus: Focus,
  posture: Posture,
  obs: Observation
): Action[] {
  const policyActions: Action[] = [];
  const actions: Action[] = [];
  const n = obs.nation;
  const prices = obs.marketPrices.prices;

  const usedSlots = new Set(n.buildings.map((b) => b.slotIndex));
  const emptySlots: number[] = [];
  for (let i = 0; i < n.totalSlots; i++) {
    if (!usedSlots.has(i)) emptySlots.push(i);
  }

  const opBuildings = n.buildings.filter((b) => b.constructionTurnsLeft === 0);
  const types = new Set(opBuildings.map((b) => b.type));
  const farmCount = opBuildings.filter((b) => b.type === "farm").length;
  const millCount = opBuildings.filter((b) => b.type === "mill").length;
  const foodNeeded = n.pops.count * 0.8;
  const textilesNeeded = n.pops.count * 0.3;
  const textileProduction = millCount * 12;
  const textileShort =
    n.stockpile.textiles < textilesNeeded && textileProduction < textilesNeeded;
  const foodShort = n.stockpile.food < foodNeeded;

  // Policy: welfare
  const welfareLevel: Record<Focus, number> = {
    people: 0.15,
    food: 0.1,
    trade: 0.06,
    industry: 0.05,
  };
  policyActions.push({ type: "set_welfare", level: welfareLevel[focus] });

  // Policy: tariffs
  const tariffRate: Record<Posture, number> = {
    free: 0,
    protectionist: 0.25,
    aggressive: 0.1,
  };
  const currentRate = n.tariffs["food"] ?? 0;
  if (Math.abs(currentRate - tariffRate[posture]) > 0.01) {
    for (const good of GOODS) {
      policyActions.push({
        type: "set_tariff",
        good,
        rate: tariffRate[posture],
      });
    }
  }

  // Build
  const canAfford = (type: BuildingType) =>
    n.treasury > RECIPES[type].buildCost;

  if (emptySlots.length > 0) {
    let buildType: BuildingType | null = null;
    if (foodShort && farmCount < 4 && canAfford("farm")) buildType = "farm";
    else if (textileShort && canAfford("mill")) buildType = "mill";
    else {
      switch (focus) {
        case "food":
          if (canAfford("farm")) buildType = "farm";
          break;
        case "industry":
          if (!types.has("mine") && canAfford("mine")) buildType = "mine";
          else if (
            !types.has("factory") &&
            types.has("mine") &&
            canAfford("factory")
          )
            buildType = "factory";
          else if (
            !types.has("workshop") &&
            types.has("mill") &&
            canAfford("workshop")
          )
            buildType = "workshop";
          else if (canAfford("mill")) buildType = "mill";
          break;
        case "trade":
          if (
            !types.has("workshop") &&
            types.has("mill") &&
            types.has("factory") &&
            canAfford("workshop")
          )
            buildType = "workshop";
          else if (
            !types.has("factory") &&
            types.has("mine") &&
            canAfford("factory")
          )
            buildType = "factory";
          else if (canAfford("mill")) buildType = "mill";
          else if (!types.has("mine") && canAfford("mine")) buildType = "mine";
          break;
        case "people":
          if (canAfford("farm")) buildType = "farm";
          break;
      }
    }
    if (buildType) {
      actions.push({
        type: "build",
        buildingType: buildType,
        slotIndex: emptySlots[0],
      });
    }
  } else {
    // Demolish + replace if needed
    const wantTypes: Record<Focus, BuildingType[]> = {
      food: [],
      industry: ["mine", "factory", "workshop"],
      trade: ["mine", "factory", "workshop"],
      people: [],
    };
    const needed = wantTypes[focus].find((t) => !types.has(t));
    if (needed) {
      const typeCounts = new Map<BuildingType, number>();
      for (const b of opBuildings)
        typeCounts.set(b.type, (typeCounts.get(b.type) || 0) + 1);
      let maxCount = 0;
      let demolishType: BuildingType | null = null;
      for (const [t, count] of typeCounts) {
        if (count > maxCount && count > 1) {
          maxCount = count;
          demolishType = t;
        }
      }
      if (demolishType) {
        const victim = opBuildings.find((b) => b.type === demolishType);
        if (victim) {
          actions.push({ type: "demolish", buildingId: victim.id });
          actions.push({
            type: "build",
            buildingType: needed,
            slotIndex: victim.slotIndex,
          });
        }
      }
    }
    // Upgrade if no demolish
    if (!actions.some((a) => a.type === "demolish") && n.treasury > 500) {
      const pref: Record<Focus, BuildingType[]> = {
        food: ["farm", "mill"],
        industry: ["workshop", "factory", "mill"],
        trade: ["workshop", "factory", "mine"],
        people: ["farm", "mill"],
      };
      for (const type of pref[focus]) {
        const b = opBuildings.find((b) => b.type === type && b.level === 1);
        if (b && n.treasury > RECIPES[type].upgradeCost) {
          actions.push({ type: "upgrade", buildingId: b.id });
          break;
        }
      }
    }
  }

  // Trade
  const mult = {
    free: { sell: 0.95, buy: 1.1 },
    protectionist: { sell: 1.15, buy: 1.05 },
    aggressive: { sell: 0.6, buy: 0.85 },
  }[posture];
  const resMult = { free: 1.2, protectionist: 2.0, aggressive: 1.0 }[posture];

  for (const good of GOODS) {
    const stock = n.stockpile[good];
    let reserve =
      good === "food"
        ? foodNeeded * resMult
        : good === "textiles"
          ? textilesNeeded * resMult
          : 0;
    if (good === "food" && types.has("mill")) reserve += 8;
    if (good === "iron" && types.has("factory")) reserve += 5;
    if (good === "textiles" && types.has("workshop")) reserve += 3;
    if (good === "machinery" && types.has("workshop")) reserve += 1;
    const sellable = stock - reserve;
    if (sellable > 1 && actions.length < 5) {
      actions.push({
        type: "market_order",
        good,
        quantity: Math.round(sellable),
        price: Math.round(prices[good] * mult.sell * 100) / 100,
        side: "sell",
      });
    }
  }

  if (n.treasury > 100 && actions.length < 5) {
    if (n.stockpile.food < foodNeeded) {
      const qty = Math.min(
        foodNeeded - n.stockpile.food,
        (n.treasury * 0.2) / (prices.food * mult.buy)
      );
      if (qty > 1) {
        actions.push({
          type: "market_order",
          good: "food",
          quantity: Math.round(qty),
          price: Math.round(prices.food * mult.buy * 100) / 100,
          side: "buy",
        });
      }
    }
    if (n.stockpile.textiles < textilesNeeded && actions.length < 5) {
      const qty = Math.min(
        textilesNeeded - n.stockpile.textiles,
        (n.treasury * 0.15) / (prices.textiles * mult.buy)
      );
      if (qty > 1) {
        actions.push({
          type: "market_order",
          good: "textiles",
          quantity: Math.round(qty),
          price: Math.round(prices.textiles * mult.buy * 100) / 100,
          side: "buy",
        });
      }
    }
  }

  return [...policyActions, ...actions];
}

/** Describe an action in human-readable form */
export function describeAction(a: Action): string {
  switch (a.type) {
    case "build":
      return `🔨 Build ${a.buildingType} in slot ${a.slotIndex}`;
    case "upgrade":
      return `⬆️ Upgrade ${a.buildingId}`;
    case "demolish":
      return `🏚️ Demolish ${a.buildingId}`;
    case "market_order":
      return a.side === "sell"
        ? `📤 Sell ${Math.round(a.quantity)} ${a.good} @$${a.price.toFixed(1)}`
        : `📥 Buy ${Math.round(a.quantity)} ${a.good} @$${a.price.toFixed(1)}`;
    case "set_tariff":
      return `🛃 Tariff ${a.good}: ${(a.rate * 100).toFixed(0)}%`;
    case "set_welfare":
      return `🏥 Welfare: ${(a.level * 100).toFixed(0)}%`;
  }
}
