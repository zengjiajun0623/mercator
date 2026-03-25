// ── Goods ──────────────────────────────────────────────────────────────────
export const GOODS = ["food", "textiles", "iron", "machinery", "luxuries"] as const;
export type Good = (typeof GOODS)[number];

export type Stockpile = Record<Good, number>;

export function emptyStockpile(): Stockpile {
  return { food: 0, textiles: 0, iron: 0, machinery: 0, luxuries: 0 };
}

// ── Buildings ──────────────────────────────────────────────────────────────
export const BUILDING_TYPES = ["farm", "mill", "mine", "factory", "workshop"] as const;
export type BuildingType = (typeof BUILDING_TYPES)[number];

export interface BuildingRecipe {
  inputs: Partial<Record<Good, number>>;
  outputs: Partial<Record<Good, number>>;
  buildCost: number;       // treasury cost to construct
  buildTime: number;       // rounds to construct
  upgradeCost: number;     // treasury cost to upgrade
  upgradeTime: number;     // rounds to upgrade
}

export const RECIPES: Record<BuildingType, BuildingRecipe> = {
  farm:     { inputs: {},                              outputs: { food: 20 },      buildCost: 100, buildTime: 2, upgradeCost: 200, upgradeTime: 3 },
  mill:     { inputs: { food: 8 },                     outputs: { textiles: 12 },  buildCost: 150, buildTime: 2, upgradeCost: 300, upgradeTime: 3 },
  mine:     { inputs: {},                              outputs: { iron: 10 },      buildCost: 120, buildTime: 2, upgradeCost: 250, upgradeTime: 3 },
  factory:  { inputs: { iron: 5 },                     outputs: { machinery: 4 },  buildCost: 250, buildTime: 3, upgradeCost: 500, upgradeTime: 4 },
  workshop: { inputs: { textiles: 3, machinery: 1 },   outputs: { luxuries: 6 },   buildCost: 300, buildTime: 3, upgradeCost: 600, upgradeTime: 4 },
};

export interface Building {
  id: string;
  type: BuildingType;
  level: number;                // 1 = base, each upgrade doubles output
  constructionTurnsLeft: number; // 0 = operational
  slotIndex: number;
}

// ── Population ─────────────────────────────────────────────────────────────
export interface Population {
  count: number;
  satisfaction: number; // 0–1
}

// ── Nation ──────────────────────────────────────────────────────────────────
export interface Nation {
  id: string;
  name: string;
  treasury: number;
  pops: Population;
  buildings: Building[];
  totalSlots: number;
  stockpile: Stockpile;
  tariffs: Partial<Record<Good, number>>; // good → rate (0–1)
  welfareSpending: number;                // 0–1, fraction of treasury for pop needs
}

// ── Market ─────────────────────────────────────────────────────────────────
export interface MarketOrder {
  nationId: string;
  good: Good;
  quantity: number;
  price: number;
  side: "buy" | "sell";
}

export interface Trade {
  buyerNationId: string;
  sellerNationId: string;
  good: Good;
  quantity: number;
  price: number;
}

export interface MarketPrices {
  prices: Record<Good, number>;        // last clearing price
  volume: Record<Good, number>;        // units traded this round
}

// ── Actions ────────────────────────────────────────────────────────────────
export type Action =
  | { type: "build"; buildingType: BuildingType; slotIndex: number }
  | { type: "upgrade"; buildingId: string }
  | { type: "demolish"; buildingId: string }
  | { type: "market_order"; good: Good; quantity: number; price: number; side: "buy" | "sell" }
  | { type: "set_tariff"; good: Good; rate: number }
  | { type: "set_welfare"; level: number };

// ── Agent Interface ────────────────────────────────────────────────────────
export interface Agent {
  nationId: string;
  decide(observation: Observation): Promise<Action[]>;
}

// ── Observation ────────────────────────────────────────────────────────────
export interface Observation {
  round: number;
  totalRounds: number;
  nation: Nation;
  marketPrices: MarketPrices;
  otherNations: Array<{
    id: string;
    name: string;
    pops: number;
    buildingCount: number;
  }>;
}

// ── Game Config ────────────────────────────────────────────────────────────
export interface GameConfig {
  totalRounds: number;
  nationCount: number;
  startingTreasury: number;
  startingPops: number;
  totalSlots: number;
}

export const DEFAULT_CONFIG: GameConfig = {
  totalRounds: 100,
  nationCount: 4,
  startingTreasury: 1000,
  startingPops: 50,
  totalSlots: 7, // 3 starting + 4 empty = 7 total
};
