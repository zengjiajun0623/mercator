import { Building, Good, Nation, RECIPES } from "./types.js";

/**
 * Run all operational buildings in a nation.
 * Each building consumes inputs from the nation's stockpile and produces outputs.
 * If inputs are insufficient, building runs at partial capacity (proportional to the scarcest input).
 */
export function runProduction(nation: Nation): void {
  for (const building of nation.buildings) {
    if (building.constructionTurnsLeft > 0) continue;

    const recipe = RECIPES[building.type];
    const outputMultiplier = Math.pow(2, building.level - 1); // level 1 = 1x, level 2 = 2x, etc.

    // Calculate capacity ratio based on available inputs
    let capacityRatio = 1.0;
    for (const [good, needed] of Object.entries(recipe.inputs) as [Good, number][]) {
      const required = needed * outputMultiplier;
      if (required > 0) {
        const available = nation.stockpile[good];
        capacityRatio = Math.min(capacityRatio, available / required);
      }
    }
    capacityRatio = Math.max(0, Math.min(1, capacityRatio));

    // Consume inputs
    for (const [good, needed] of Object.entries(recipe.inputs) as [Good, number][]) {
      const consumed = needed * outputMultiplier * capacityRatio;
      nation.stockpile[good] -= consumed;
    }

    // Produce outputs
    for (const [good, amount] of Object.entries(recipe.outputs) as [Good, number][]) {
      nation.stockpile[good] += amount * outputMultiplier * capacityRatio;
    }
  }
}

/**
 * Advance construction timers by 1 round.
 */
export function advanceConstruction(nation: Nation): void {
  for (const building of nation.buildings) {
    if (building.constructionTurnsLeft > 0) {
      building.constructionTurnsLeft--;
    }
  }
}

/**
 * Start building a new building in a slot.
 * Returns true if successful, false if slot occupied or insufficient funds.
 */
export function startBuilding(
  nation: Nation,
  buildingType: Building["type"],
  slotIndex: number
): boolean {
  if (slotIndex < 0 || slotIndex >= nation.totalSlots) return false;

  // Check slot is empty
  if (nation.buildings.some((b) => b.slotIndex === slotIndex)) return false;

  const recipe = RECIPES[buildingType];
  if (nation.treasury < recipe.buildCost) return false;

  nation.treasury -= recipe.buildCost;
  nation.buildings.push({
    id: `${nation.id}-b${slotIndex}`,
    type: buildingType,
    level: 1,
    constructionTurnsLeft: recipe.buildTime,
    slotIndex,
  });
  return true;
}

/**
 * Start upgrading an existing building.
 * Returns true if successful.
 */
export function startUpgrade(nation: Nation, buildingId: string): boolean {
  const building = nation.buildings.find((b) => b.id === buildingId);
  if (!building) return false;
  if (building.constructionTurnsLeft > 0) return false; // already building/upgrading

  const recipe = RECIPES[building.type];
  if (nation.treasury < recipe.upgradeCost) return false;

  nation.treasury -= recipe.upgradeCost;
  building.level++;
  building.constructionTurnsLeft = recipe.upgradeTime;
  return true;
}

/**
 * Calculate the replacement cost of all buildings (for scoring).
 */
export function buildingAssetValue(nation: Nation): number {
  let total = 0;
  for (const building of nation.buildings) {
    const recipe = RECIPES[building.type];
    total += recipe.buildCost;
    // Each upgrade level beyond 1 adds the upgrade cost
    for (let i = 1; i < building.level; i++) {
      total += recipe.upgradeCost;
    }
  }
  return total;
}
