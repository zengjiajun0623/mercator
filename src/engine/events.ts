import { Good, GOODS, Nation } from "./types.js";

export interface GameEvent {
  name: string;
  description: string;
  apply(nations: Nation[]): void;
}

const EVENT_POOL: Array<(nations: Nation[]) => GameEvent> = [
  // ── Natural disasters ──
  (nations) => {
    const target = nations[Math.floor(Math.random() * nations.length)];
    return {
      name: "🌾 DROUGHT",
      description: `Drought strikes ${target.name}! Farm output halved this round.`,
      apply() {
        // Destroy half of food stockpile
        target.stockpile.food = Math.max(0, target.stockpile.food * 0.5);
      },
    };
  },
  (nations) => {
    const target = nations[Math.floor(Math.random() * nations.length)];
    return {
      name: "🏭 INDUSTRIAL ACCIDENT",
      description: `Explosion at ${target.name}'s factory! Lost 30% of iron stockpile.`,
      apply() {
        target.stockpile.iron *= 0.7;
      },
    };
  },
  // ── Economic events ──
  (nations) => {
    return {
      name: "📈 COMMODITY BOOM",
      description: `Global luxury demand surges! All nations gain bonus treasury.`,
      apply() {
        for (const n of nations) {
          const luxuryValue = n.stockpile.luxuries * 15;
          n.treasury += luxuryValue;
          n.stockpile.luxuries = 0;
        }
      },
    };
  },
  (nations) => {
    const target = nations[Math.floor(Math.random() * nations.length)];
    return {
      name: "💰 GOLD DISCOVERY",
      description: `Gold found in ${target.name}! Treasury +$500.`,
      apply() {
        target.treasury += 500;
      },
    };
  },
  (nations) => {
    return {
      name: "📉 RECESSION",
      description: `Global recession! All treasuries lose 10%.`,
      apply() {
        for (const n of nations) {
          n.treasury *= 0.9;
        }
      },
    };
  },
  // ── Population events ──
  (nations) => {
    const target = nations[Math.floor(Math.random() * nations.length)];
    return {
      name: "🤒 PLAGUE",
      description: `Plague sweeps ${target.name}! Population drops 15%.`,
      apply() {
        target.pops.count = Math.max(10, Math.round(target.pops.count * 0.85));
        target.pops.satisfaction *= 0.7;
      },
    };
  },
  (nations) => {
    const target = nations[Math.floor(Math.random() * nations.length)];
    return {
      name: "🎉 BABY BOOM",
      description: `Baby boom in ${target.name}! Population +20%.`,
      apply() {
        target.pops.count = Math.round(target.pops.count * 1.2);
        target.pops.satisfaction = Math.min(1, target.pops.satisfaction + 0.1);
      },
    };
  },
  // ── Trade events ──
  (nations) => {
    const good = GOODS[Math.floor(Math.random() * GOODS.length)];
    return {
      name: "🚢 TRADE DISRUPTION",
      description: `Storm destroys cargo ships! All ${good} stockpiles halved.`,
      apply() {
        for (const n of nations) {
          n.stockpile[good] *= 0.5;
        }
      },
    };
  },
  (nations) => {
    const target = nations[Math.floor(Math.random() * nations.length)];
    return {
      name: "🎁 FOREIGN AID",
      description: `${target.name} receives foreign aid: +30 food, +15 textiles.`,
      apply() {
        target.stockpile.food += 30;
        target.stockpile.textiles += 15;
      },
    };
  },
  (nations) => {
    return {
      name: "⚡ TECH BREAKTHROUGH",
      description: `New farming technique discovered! All nations gain +20 food.`,
      apply() {
        for (const n of nations) {
          n.stockpile.food += 20;
        }
      },
    };
  },
];

/**
 * Maybe generate a random event. Events happen ~30% of rounds.
 */
export function maybeGenerateEvent(nations: Nation[], round: number): GameEvent | null {
  // No events in first 3 rounds (let players settle)
  if (round <= 3) return null;
  if (Math.random() > 0.3) return null;

  const generator = EVENT_POOL[Math.floor(Math.random() * EVENT_POOL.length)];
  return generator(nations);
}
