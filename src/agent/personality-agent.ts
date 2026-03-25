import { Action, Agent, BuildingType, Good, GOODS, Observation } from "../engine/types.js";

export type Personality = "merchant" | "warlord" | "isolationist" | "industrialist";

const PERSONALITY_DESC: Record<Personality, string> = {
  merchant: "🏪 Merchant — trades aggressively, buys low sells high, invests in diverse buildings",
  warlord: "⚔️ Warlord — hoards resources, builds heavy industry, undercuts competitors",
  isolationist: "🏔️ Isolationist — focuses on self-sufficiency, high welfare, grows population",
  industrialist: "🏗️ Industrialist — rushes factories and workshops, exports high-value goods",
};

export class PersonalityAgent implements Agent {
  nationId: string = "";
  personality: Personality;
  label: string;

  constructor(personality: Personality) {
    this.personality = personality;
    this.label = PERSONALITY_DESC[personality];
  }

  async decide(obs: Observation): Promise<Action[]> {
    switch (this.personality) {
      case "merchant": return this.merchantStrategy(obs);
      case "warlord": return this.warlordStrategy(obs);
      case "isolationist": return this.isolationistStrategy(obs);
      case "industrialist": return this.industrialistStrategy(obs);
    }
  }

  // ── MERCHANT: trade everything, profit from price differences ──────────
  private merchantStrategy(obs: Observation): Action[] {
    const actions: Action[] = [];
    const n = obs.nation;
    const phase = obs.round / obs.totalRounds;

    // Set moderate welfare
    if (obs.round === 1) actions.push({ type: "set_welfare", level: 0.08 });

    // Sell EVERYTHING above minimum needs at competitive prices
    for (const good of GOODS) {
      const stock = n.stockpile[good];
      const reserve = good === "food" ? n.pops.count * 1.0
        : good === "textiles" ? n.pops.count * 0.4
        : 0;
      const sellable = stock - reserve;
      if (sellable > 2 && actions.length < 4) {
        // Undercut market by 15% to guarantee sales
        const price = obs.marketPrices.prices[good] * 0.85;
        actions.push({ type: "market_order", good, quantity: Math.round(sellable), price: round2(price), side: "sell" });
      }
    }

    // Buy goods that are cheap relative to base price — arbitrage
    const cheapGoods = GOODS.filter((g) => {
      const base = { food: 5, textiles: 10, iron: 12, machinery: 25, luxuries: 40 }[g];
      return obs.marketPrices.prices[g] < base * 0.8;
    });
    for (const good of cheapGoods) {
      if (actions.length >= 4) break;
      const price = obs.marketPrices.prices[good] * 1.05;
      const qty = Math.min(20, (n.treasury * 0.15) / price);
      if (qty > 1) {
        actions.push({ type: "market_order", good, quantity: Math.round(qty), price: round2(price), side: "buy" });
      }
    }

    // Build diverse buildings
    const emptySlots = this.getEmptySlots(obs);
    if (emptySlots.length > 0 && n.treasury > 200 && actions.length < 5) {
      const buildOrder: BuildingType[] = ["farm", "mill", "mine", "factory", "workshop"];
      const existing = new Set(n.buildings.map((b) => b.type));
      const next = buildOrder.find((b) => !existing.has(b)) ?? "farm";
      actions.push({ type: "build", buildingType: next, slotIndex: emptySlots[0] });
    }

    return actions.slice(0, 5);
  }

  // ── WARLORD: hoard resources, undercut competitors, dominate market ────
  private warlordStrategy(obs: Observation): Action[] {
    const actions: Action[] = [];
    const n = obs.nation;

    // Low welfare — spend on buildings instead
    if (obs.round === 1) actions.push({ type: "set_welfare", level: 0.03 });

    // Hoard food and iron, dump textiles and luxuries at below-market prices
    for (const good of (["textiles", "luxuries", "machinery"] as Good[])) {
      const stock = n.stockpile[good];
      if (stock > 3 && actions.length < 4) {
        // Aggressive undercut — sell at 60% of market price to crash the price
        const price = obs.marketPrices.prices[good] * 0.6;
        actions.push({ type: "market_order", good, quantity: Math.round(stock * 0.8), price: round2(price), side: "sell" });
      }
    }

    // Buy food cheaply if available
    if (n.stockpile.food < n.pops.count * 1.0 && n.treasury > 50 && actions.length < 4) {
      const price = obs.marketPrices.prices.food * 0.9;
      actions.push({ type: "market_order", good: "food", quantity: Math.round(n.pops.count * 0.5), price: round2(price), side: "buy" });
    }

    // Rush mines and factories
    const emptySlots = this.getEmptySlots(obs);
    if (emptySlots.length > 0 && n.treasury > 150 && actions.length < 5) {
      const mineCount = n.buildings.filter((b) => b.type === "mine").length;
      const factoryCount = n.buildings.filter((b) => b.type === "factory").length;
      const farmCount = n.buildings.filter((b) => b.type === "farm").length;
      let build: BuildingType;
      if (farmCount < 1) build = "farm";
      else if (mineCount < 2) build = "mine";
      else if (factoryCount < 1) build = "factory";
      else build = "mine";
      actions.push({ type: "build", buildingType: build, slotIndex: emptySlots[0] });
    }

    // Set high tariffs to protect domestic production
    if (obs.round <= 3) {
      actions.push({ type: "set_tariff", good: "iron", rate: 0.5 });
    }

    return actions.slice(0, 5);
  }

  // ── ISOLATIONIST: self-sufficient, high welfare, grow population ───────
  private isolationistStrategy(obs: Observation): Action[] {
    const actions: Action[] = [];
    const n = obs.nation;

    // High welfare — priority is happy pops
    if (obs.round === 1 || obs.round % 5 === 0) {
      const welfare = n.pops.satisfaction < 0.6 ? 0.20 : 0.12;
      actions.push({ type: "set_welfare", level: welfare });
    }

    // Only sell massive surpluses
    for (const good of GOODS) {
      const stock = n.stockpile[good];
      const reserve = good === "food" ? n.pops.count * 2.0  // keep huge reserves
        : good === "textiles" ? n.pops.count * 1.0
        : 5;
      const sellable = stock - reserve;
      if (sellable > 10 && actions.length < 3) {
        const price = obs.marketPrices.prices[good] * 1.1; // sell at premium, doesn't care if it doesn't sell
        actions.push({ type: "market_order", good, quantity: Math.round(sellable * 0.5), price: round2(price), side: "sell" });
      }
    }

    // Build farms and mills — food security first
    const emptySlots = this.getEmptySlots(obs);
    if (emptySlots.length > 0 && n.treasury > 120 && actions.length < 5) {
      const farmCount = n.buildings.filter((b) => b.type === "farm").length;
      const millCount = n.buildings.filter((b) => b.type === "mill").length;
      let build: BuildingType;
      if (farmCount < 3) build = "farm";
      else if (millCount < 2) build = "mill";
      else build = "farm";
      actions.push({ type: "build", buildingType: build, slotIndex: emptySlots[0] });
    }

    // Set tariffs on everything — protect domestic economy
    if (obs.round <= 3) {
      for (const good of GOODS) {
        if (actions.length < 5) actions.push({ type: "set_tariff", good, rate: 0.3 });
      }
    }

    return actions.slice(0, 5);
  }

  // ── INDUSTRIALIST: rush workshops, export luxuries ─────────────────────
  private industrialistStrategy(obs: Observation): Action[] {
    const actions: Action[] = [];
    const n = obs.nation;
    const phase = obs.round / obs.totalRounds;

    if (obs.round === 1) actions.push({ type: "set_welfare", level: 0.06 });

    // Sell luxuries and machinery at premium prices
    for (const good of (["luxuries", "machinery"] as Good[])) {
      const stock = n.stockpile[good];
      if (stock > 1 && actions.length < 3) {
        const price = obs.marketPrices.prices[good] * 1.15; // premium pricing
        actions.push({ type: "market_order", good, quantity: Math.round(stock), price: round2(price), side: "sell" });
      }
    }

    // Sell food surplus
    const foodSurplus = n.stockpile.food - n.pops.count * 1.0;
    if (foodSurplus > 5 && actions.length < 4) {
      actions.push({ type: "market_order", good: "food", quantity: Math.round(foodSurplus), price: round2(obs.marketPrices.prices.food * 0.9), side: "sell" });
    }

    // Buy raw materials for factories
    if (n.buildings.some((b) => b.type === "mill") && n.stockpile.food < 10 && actions.length < 4) {
      const price = obs.marketPrices.prices.food * 1.2;
      actions.push({ type: "market_order", good: "food", quantity: 15, price: round2(price), side: "buy" });
    }
    if (n.buildings.some((b) => b.type === "factory") && n.stockpile.iron < 6 && actions.length < 4) {
      const price = obs.marketPrices.prices.iron * 1.2;
      actions.push({ type: "market_order", good: "iron", quantity: 10, price: round2(price), side: "buy" });
    }

    // Build path: farm → mine → mill → factory → workshop → workshop
    const emptySlots = this.getEmptySlots(obs);
    if (emptySlots.length > 0 && n.treasury > 150 && actions.length < 5) {
      const types = n.buildings.map((b) => b.type);
      let build: BuildingType;
      if (!types.includes("farm")) build = "farm";
      else if (!types.includes("mine")) build = "mine";
      else if (!types.includes("mill")) build = "mill";
      else if (!types.includes("factory")) build = "factory";
      else build = "workshop"; // stack workshops
      actions.push({ type: "build", buildingType: build, slotIndex: emptySlots[0] });
    }

    // Upgrade workshops and factories
    if (phase > 0.25 && n.treasury > 400 && actions.length < 5) {
      const workshop = n.buildings.find((b) => b.type === "workshop" && b.constructionTurnsLeft === 0 && b.level === 1);
      if (workshop) actions.push({ type: "upgrade", buildingId: workshop.id });
    }

    return actions.slice(0, 5);
  }

  private getEmptySlots(obs: Observation): number[] {
    const used = new Set(obs.nation.buildings.map((b) => b.slotIndex));
    const empty: number[] = [];
    for (let i = 0; i < obs.nation.totalSlots; i++) {
      if (!used.has(i)) empty.push(i);
    }
    return empty;
  }
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
