import { Action, Agent, BUILDING_TYPES, GOODS, Good, Observation } from "../engine/types.js";

/**
 * A baseline random agent that makes semi-sensible random decisions.
 * Trades actively — always sells surplus, always buys shortages.
 */
export class RandomAgent implements Agent {
  nationId: string = "";

  async decide(obs: Observation): Promise<Action[]> {
    const actions: Action[] = [];
    const nation = obs.nation;

    // Calculate pop needs (with 20% buffer over actual consumption)
    const popNeeds: Partial<Record<Good, number>> = {
      food: nation.pops.count * 1.0,      // 0.8 need + buffer
      textiles: nation.pops.count * 0.4,   // 0.3 need + buffer
    };

    // 1. Sell ALL surplus goods aggressively
    for (const good of GOODS) {
      const qty = nation.stockpile[good];
      const reserve = popNeeds[good] ?? 0;
      const surplus = qty - reserve;
      if (surplus > 0.5) {
        // Price at market rate with small random variance
        const basePrice = obs.marketPrices.prices[good];
        const price = basePrice * (0.7 + Math.random() * 0.3); // slight undercut to ensure sales
        actions.push({
          type: "market_order",
          good,
          quantity: Math.round(surplus),
          price: Math.round(price * 100) / 100,
          side: "sell",
        });
      }
    }

    // 2. Buy goods we're short on
    for (const good of (["food", "textiles"] as Good[])) {
      const qty = nation.stockpile[good];
      const needed = popNeeds[good] ?? 0;
      if (qty < needed) {
        const deficit = needed - qty;
        const basePrice = obs.marketPrices.prices[good];
        const price = basePrice * (1.1 + Math.random() * 0.3); // willing to pay premium
        const maxAfford = (nation.treasury * 0.3) / price;
        const buyQty = Math.round(Math.min(deficit, maxAfford));
        if (buyQty > 0) {
          actions.push({
            type: "market_order",
            good,
            quantity: buyQty,
            price: Math.round(price * 100) / 100,
            side: "buy",
          });
        }
      }
    }

    // 3. Build in empty slots if we have money (less random, more strategic)
    const usedSlots = new Set(nation.buildings.map((b) => b.slotIndex));
    const emptySlots: number[] = [];
    for (let i = 0; i < nation.totalSlots; i++) {
      if (!usedSlots.has(i)) emptySlots.push(i);
    }

    if (emptySlots.length > 0 && nation.treasury > 200 && Math.random() > 0.4) {
      const slot = emptySlots[0];
      // Prefer building what we lack
      const hasFarm = nation.buildings.some((b) => b.type === "farm");
      const hasMill = nation.buildings.some((b) => b.type === "mill");
      const hasMine = nation.buildings.some((b) => b.type === "mine");

      let buildingType: typeof BUILDING_TYPES[number];
      if (!hasFarm) buildingType = "farm";
      else if (!hasMill && nation.treasury > 150) buildingType = "mill";
      else if (!hasMine && nation.treasury > 120) buildingType = "mine";
      else buildingType = BUILDING_TYPES[Math.floor(Math.random() * BUILDING_TYPES.length)];

      actions.push({ type: "build", buildingType, slotIndex: slot });
    }

    // 4. Set welfare between 5–15%
    if (obs.round === 1 || obs.round % 10 === 0) {
      const sat = nation.pops.satisfaction;
      // More welfare if pops are unhappy
      const level = sat < 0.4 ? 0.15 : sat < 0.6 ? 0.10 : 0.05;
      actions.push({ type: "set_welfare", level });
    }

    return actions.slice(0, 5);
  }
}
