import { Action, Agent, BUILDING_TYPES, BuildingType, Good, GOODS, Observation } from "../engine/types.js";

/**
 * A heuristic-based "smart" agent that plays a coherent economic strategy.
 * Mimics what a good LLM agent would do: balance food supply, develop supply chains,
 * trade surplus, and invest in growth.
 */
export class SmartAgent implements Agent {
  nationId: string = "";

  async decide(obs: Observation): Promise<Action[]> {
    const actions: Action[] = [];
    const n = obs.nation;
    const round = obs.round;
    const totalRounds = obs.totalRounds;

    // ── Analysis ────────────────────────────────────────────────────────
    const foodPerRound = this.estimateProduction(obs, "food");
    const foodNeeded = n.pops.count * 0.8;
    const foodSurplus = n.stockpile.food + foodPerRound - foodNeeded;

    const textileProduction = this.estimateProduction(obs, "textiles");
    const textileNeeded = n.pops.count * 0.3;
    const textileSurplus = n.stockpile.textiles + textileProduction - textileNeeded;

    const ironProduction = this.estimateProduction(obs, "iron");
    const machineryProduction = this.estimateProduction(obs, "machinery");
    const luxuryProduction = this.estimateProduction(obs, "luxuries");

    const usedSlots = new Set(n.buildings.map((b) => b.slotIndex));
    const emptySlots: number[] = [];
    for (let i = 0; i < n.totalSlots; i++) {
      if (!usedSlots.has(i)) emptySlots.push(i);
    }

    const operationalBuildings = n.buildings.filter((b) => b.constructionTurnsLeft === 0);
    const hasFarm = operationalBuildings.some((b) => b.type === "farm");
    const hasMill = operationalBuildings.some((b) => b.type === "mill");
    const hasMine = operationalBuildings.some((b) => b.type === "mine");
    const hasFactory = operationalBuildings.some((b) => b.type === "factory");
    const hasWorkshop = operationalBuildings.some((b) => b.type === "workshop");
    const farmCount = operationalBuildings.filter((b) => b.type === "farm").length;

    // ── Phase-based strategy ────────────────────────────────────────────
    const phase = round / totalRounds; // 0..1

    // 1. WELFARE — keep pops happy
    if (round === 1 || round % 5 === 0) {
      const sat = n.pops.satisfaction;
      let welfare: number;
      if (sat < 0.4) welfare = 0.15;
      else if (sat < 0.6) welfare = 0.08;
      else if (sat < 0.8) welfare = 0.04;
      else welfare = 0.02;
      actions.push({ type: "set_welfare", level: welfare });
    }

    // 2. BUILD — invest in capacity
    if (emptySlots.length > 0 && actions.length < 4) {
      const buildType = this.chooseBuild(phase, foodSurplus, textileSurplus, ironProduction, hasMill, hasMine, hasFactory, hasWorkshop, farmCount, n.treasury);
      if (buildType && n.treasury > 200) {
        actions.push({ type: "build", buildingType: buildType, slotIndex: emptySlots[0] });
      }
    }

    // 3. UPGRADE — upgrade high-value buildings in mid/late game
    if (phase > 0.3 && n.treasury > 500) {
      // Prioritize upgrading workshops > factories > farms
      const upgradeOrder: BuildingType[] = ["workshop", "factory", "mill", "farm", "mine"];
      for (const type of upgradeOrder) {
        const building = operationalBuildings.find((b) => b.type === type && b.level === 1);
        if (building) {
          actions.push({ type: "upgrade", buildingId: building.id });
          break;
        }
      }
    }

    // 4. SELL surplus goods
    for (const good of GOODS) {
      const stock = n.stockpile[good];
      let reserve: number;
      if (good === "food") reserve = foodNeeded * 1.5;
      else if (good === "textiles") reserve = textileNeeded * 1.5;
      else reserve = 0;

      // Keep some inputs for own buildings
      if (good === "iron" && hasFactory) reserve = Math.max(reserve, 5);
      if (good === "textiles" && hasWorkshop) reserve = Math.max(reserve, 3);
      if (good === "machinery" && hasWorkshop) reserve = Math.max(reserve, 1);

      const sellable = stock - reserve;
      if (sellable > 1 && actions.length < 5) {
        // Price slightly below market to ensure sale
        const price = obs.marketPrices.prices[good] * (0.85 + Math.random() * 0.1);
        actions.push({
          type: "market_order",
          good,
          quantity: Math.round(sellable),
          price: Math.round(price * 100) / 100,
          side: "sell",
        });
      }
    }

    // 5. BUY goods we're short on
    if (actions.length < 5) {
      // Buy food if we're going to be short
      if (foodSurplus < 0 && n.treasury > 100) {
        const deficit = Math.abs(foodSurplus);
        const price = obs.marketPrices.prices.food * 1.2;
        const maxBuy = Math.min(deficit, (n.treasury * 0.25) / price);
        if (maxBuy > 1) {
          actions.push({
            type: "market_order",
            good: "food",
            quantity: Math.round(maxBuy),
            price: Math.round(price * 100) / 100,
            side: "buy",
          });
        }
      }

      // Buy textiles if short
      if (textileSurplus < 0 && n.treasury > 100 && actions.length < 5) {
        const deficit = Math.abs(textileSurplus);
        const price = obs.marketPrices.prices.textiles * 1.2;
        const maxBuy = Math.min(deficit, (n.treasury * 0.15) / price);
        if (maxBuy > 1) {
          actions.push({
            type: "market_order",
            good: "textiles",
            quantity: Math.round(maxBuy),
            price: Math.round(price * 100) / 100,
            side: "buy",
          });
        }
      }

      // Buy machinery for workshops if we need it
      if (hasWorkshop && n.stockpile.machinery < 2 && machineryProduction === 0 && n.treasury > 200 && actions.length < 5) {
        const price = obs.marketPrices.prices.machinery * 1.3;
        actions.push({
          type: "market_order",
          good: "machinery",
          quantity: 2,
          price: Math.round(price * 100) / 100,
          side: "buy",
        });
      }
    }

    return actions.slice(0, 5);
  }

  private chooseBuild(
    phase: number,
    foodSurplus: number,
    textileSurplus: number,
    ironProduction: number,
    hasMill: boolean,
    hasMine: boolean,
    hasFactory: boolean,
    hasWorkshop: boolean,
    farmCount: number,
    treasury: number
  ): BuildingType | null {
    // Early game: secure food supply
    if (phase < 0.2) {
      if (foodSurplus < 10) return "farm";
      if (!hasMill) return "mill";
      if (!hasMine) return "mine";
      return "farm"; // more food = more growth
    }

    // Mid game: build supply chains
    if (phase < 0.5) {
      if (foodSurplus < 5) return "farm";
      if (!hasMill) return "mill";
      if (!hasMine && treasury > 120) return "mine";
      if (ironProduction > 0 && !hasFactory && treasury > 250) return "factory";
      if (hasMill && hasFactory && !hasWorkshop && treasury > 300) return "workshop";
      return foodSurplus > textileSurplus ? "mill" : "farm";
    }

    // Late game: maximize value (luxuries)
    if (!hasWorkshop && hasMill && treasury > 300) return "workshop";
    if (!hasFactory && hasMine && treasury > 250) return "factory";
    if (foodSurplus < 10) return "farm";
    return "workshop"; // luxuries are highest value
  }

  private estimateProduction(obs: Observation, good: Good): number {
    let total = 0;
    for (const b of obs.nation.buildings) {
      if (b.constructionTurnsLeft > 0) continue;
      // Simplified: assume buildings run at full capacity
      const recipes: Record<string, Partial<Record<Good, number>>> = {
        farm: { food: 20 },
        mill: { textiles: 12 },
        mine: { iron: 10 },
        factory: { machinery: 4 },
        workshop: { luxuries: 6 },
      };
      const output = recipes[b.type]?.[good] ?? 0;
      total += output * Math.pow(2, b.level - 1);
    }
    // Subtract what mills/factories consume
    if (good === "food") {
      for (const b of obs.nation.buildings) {
        if (b.constructionTurnsLeft > 0) continue;
        if (b.type === "mill") total -= 8 * Math.pow(2, b.level - 1);
      }
    }
    return total;
  }
}
