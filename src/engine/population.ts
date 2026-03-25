import { Nation } from "./types.js";

/**
 * Pops consume needs from the nation's stockpile and update satisfaction.
 *
 * Needs per pop per round:
 *   - Food:     1.0 (essential)
 *   - Textiles: 0.5 (basic)
 *   - Luxuries: contributes to satisfaction bonus
 *
 * Satisfaction is calculated as:
 *   - foodRatio (0–1):     how much food need was met
 *   - textileRatio (0–1):  how much textile need was met
 *   - luxuryBonus (0–0.3): bonus from luxuries consumed
 *   - satisfaction = 0.5 * foodRatio + 0.3 * textileRatio + 0.2 * luxuryBonus
 *
 * Satisfaction is smoothed: newSat = 0.7 * calculated + 0.3 * previous
 */
export function consumeNeeds(nation: Nation): void {
  const popCount = nation.pops.count;
  if (popCount <= 0) return;

  // Food consumption (0.8 per pop)
  const foodNeeded = popCount * 0.8;
  const foodConsumed = Math.min(nation.stockpile.food, foodNeeded);
  nation.stockpile.food -= foodConsumed;
  const foodRatio = foodNeeded > 0 ? foodConsumed / foodNeeded : 0;

  // Textiles consumption (0.3 per pop)
  const textilesNeeded = popCount * 0.3;
  const textilesConsumed = Math.min(nation.stockpile.textiles, textilesNeeded);
  nation.stockpile.textiles -= textilesConsumed;
  const textileRatio = textilesNeeded > 0 ? textilesConsumed / textilesNeeded : 0;

  // Luxuries consumption (up to 0.1 per pop for max bonus)
  const luxuriesWanted = popCount * 0.1;
  const luxuriesConsumed = Math.min(nation.stockpile.luxuries, luxuriesWanted);
  nation.stockpile.luxuries -= luxuriesConsumed;
  const luxuryRatio = luxuriesWanted > 0 ? luxuriesConsumed / luxuriesWanted : 0;

  // Calculate raw satisfaction
  const rawSatisfaction = 0.5 * foodRatio + 0.3 * textileRatio + 0.2 * luxuryRatio;

  // Smooth with previous value
  nation.pops.satisfaction = 0.7 * rawSatisfaction + 0.3 * nation.pops.satisfaction;
  nation.pops.satisfaction = Math.max(0, Math.min(1, nation.pops.satisfaction));
}

/**
 * Grow or decline population based on satisfaction.
 *
 * - satisfaction > 0.7  → grow 2% per round
 * - satisfaction < 0.3  → decline 3% per round
 * - between 0.3–0.7    → linear interpolation from -1% to +1%
 *
 * Minimum population: 10 (nations don't die completely)
 */
export function updatePopulation(nation: Nation): void {
  const sat = nation.pops.satisfaction;
  let growthRate: number;

  if (sat > 0.7) {
    growthRate = 0.02;
  } else if (sat < 0.3) {
    growthRate = -0.03;
  } else {
    // Linear interpolation: 0.3 → -0.01, 0.5 → 0.0, 0.7 → 0.01
    growthRate = (sat - 0.5) * 0.05;
  }

  nation.pops.count = Math.max(10, Math.round(nation.pops.count * (1 + growthRate)));
}

/**
 * Get the labor capacity of a nation (max operational buildings).
 * Each building needs 10 pops to operate.
 */
export function laborCapacity(nation: Nation): number {
  return Math.floor(nation.pops.count / 10);
}
