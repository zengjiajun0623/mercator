import * as readline from "node:readline";
import { Action, Agent, BuildingType, Good, GOODS, RECIPES, Observation } from "../engine/types.js";

const C = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  dim: "\x1b[2m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  cyan: "\x1b[36m",
};

type Focus = "food" | "industry" | "trade" | "people";
type Posture = "free" | "protectionist" | "aggressive";

const BUILDING_ICONS: Record<string, string> = {
  farm: "🌾", mill: "🧵", mine: "⛏️", factory: "🏭", workshop: "💎",
};

// Shared readline interface — creating/closing per-question loses piped input
let _rl: readline.Interface | null = null;
function getRL(): readline.Interface {
  if (!_rl) {
    _rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    _rl.on("close", () => { _rl = null; });
  }
  return _rl;
}

function prompt(question: string): Promise<string> {
  const rl = getRL();
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer.trim());
    });
  });
}

function printState(obs: Observation): void {
  const n = obs.nation;

  console.log(`\n${C.bold}╔══════════════════════════════════════════════════════╗${C.reset}`);
  console.log(`${C.bold}║  ROUND ${obs.round}/${obs.totalRounds} — ${n.name}${" ".repeat(Math.max(0, 37 - n.name.length - String(obs.round).length - String(obs.totalRounds).length))}║${C.reset}`);
  console.log(`${C.bold}╚══════════════════════════════════════════════════════╝${C.reset}`);

  // Key stats
  const satPct = (n.pops.satisfaction * 100).toFixed(0);
  const satColor = n.pops.satisfaction > 0.7 ? C.green : n.pops.satisfaction < 0.3 ? C.red : C.yellow;
  console.log(`\n  💰 $${n.treasury.toFixed(0)}    👥 ${n.pops.count} pops    ${satColor}😊 ${satPct}%${C.reset}    🏥 Welfare ${(n.welfareSpending * 100).toFixed(0)}%`);

  // Stockpile as a compact bar
  console.log(`\n  ${C.cyan}Stockpile:${C.reset}`);
  for (const good of GOODS) {
    const qty = n.stockpile[good];
    const price = obs.marketPrices.prices[good];
    const barLen = Math.min(30, Math.round(qty / 5));
    const bar = qty > 0 ? `${"█".repeat(barLen)}` : `${C.dim}empty${C.reset}`;
    console.log(`    ${good.padEnd(11)} ${String(qty.toFixed(0)).padStart(5)}  ${C.dim}@$${price.toFixed(1)}${C.reset}  ${C.green}${bar}${C.reset}`);
  }

  // Buildings as icons
  const operational = n.buildings.filter((b) => b.constructionTurnsLeft === 0);
  const building = n.buildings.filter((b) => b.constructionTurnsLeft > 0);
  const emptyCount = n.totalSlots - n.buildings.length;

  const opIcons = operational.map((b) => {
    const icon = BUILDING_ICONS[b.type] || "?";
    return b.level > 1 ? `${icon}★` : icon;
  }).join(" ");
  const buildIcons = building.map((b) => `${C.yellow}${BUILDING_ICONS[b.type]}(${b.constructionTurnsLeft})${C.reset}`).join(" ");
  const emptyIcons = emptyCount > 0 ? ` ${C.dim}${"⬜".repeat(emptyCount)}${C.reset}` : "";

  console.log(`\n  ${C.cyan}Buildings:${C.reset} ${opIcons} ${buildIcons}${emptyIcons}`);

  // Pop needs analysis
  const foodNeeded = n.pops.count * 0.8;
  const textilesNeeded = n.pops.count * 0.3;
  const foodStatus = n.stockpile.food >= foodNeeded ? `${C.green}OK${C.reset}` : `${C.red}SHORT (need ${foodNeeded.toFixed(0)})${C.reset}`;
  const textileStatus = n.stockpile.textiles >= textilesNeeded ? `${C.green}OK${C.reset}` : `${C.red}SHORT (need ${textilesNeeded.toFixed(0)})${C.reset}`;
  console.log(`\n  ${C.cyan}Needs:${C.reset} Food ${foodStatus}  Textiles ${textileStatus}`);

  // Other nations — with personality context from game
  console.log(`\n  ${C.cyan}Rivals:${C.reset}`);
  for (const o of obs.otherNations) {
    const popBar = "█".repeat(Math.min(15, Math.round(o.pops / 10)));
    console.log(`    ${o.name.padEnd(12)} 👥 ${String(o.pops).padStart(3)}  🏭 ${o.buildingCount}  ${C.dim}${popBar}${C.reset}`);
  }
}

async function chooseFocus(): Promise<Focus> {
  console.log(`\n  ${C.bold}┌─ What should your nation focus on? ──────────────────┐${C.reset}`);
  console.log(`  ${C.bold}│${C.reset}  ${C.green}1${C.reset}. 🌾 Grow Food Supply    ${C.dim}— farms, stockpile, feed people${C.reset}`);
  console.log(`  ${C.bold}│${C.reset}  ${C.green}2${C.reset}. 🏗️  Build Industry      ${C.dim}— factories, workshops, supply chains${C.reset}`);
  console.log(`  ${C.bold}│${C.reset}  ${C.green}3${C.reset}. 📈 Export & Trade       ${C.dim}— sell surplus, maximize revenue${C.reset}`);
  console.log(`  ${C.bold}│${C.reset}  ${C.green}4${C.reset}. 👥 Invest in People     ${C.dim}— boost welfare, grow population${C.reset}`);
  console.log(`  ${C.bold}└──────────────────────────────────────────────────────┘${C.reset}`);

  const map: Record<string, Focus> = { "1": "food", "2": "industry", "3": "trade", "4": "people" };
  for (let attempts = 0; attempts < 10; attempts++) {
    const input = await prompt(`  ${C.cyan}Choose (1-4):${C.reset} `);
    if (map[input]) return map[input];
    if (input === "") return "food"; // default on empty/EOF
    console.log(`  ${C.red}Pick 1, 2, 3, or 4${C.reset}`);
  }
  return "food";
}

async function choosePosture(): Promise<Posture> {
  console.log(`\n  ${C.bold}┌─ Trade posture? ─────────────────────────────────────┐${C.reset}`);
  console.log(`  ${C.bold}│${C.reset}  ${C.green}1${C.reset}. 🤝 Free Trade     ${C.dim}— low tariffs, competitive pricing${C.reset}`);
  console.log(`  ${C.bold}│${C.reset}  ${C.green}2${C.reset}. 🛡️  Protectionist  ${C.dim}— high tariffs, keep reserves, self-sufficient${C.reset}`);
  console.log(`  ${C.bold}│${C.reset}  ${C.green}3${C.reset}. ⚔️  Aggressive     ${C.dim}— undercut rivals, dump goods to crash prices${C.reset}`);
  console.log(`  ${C.bold}└──────────────────────────────────────────────────────┘${C.reset}`);

  const map: Record<string, Posture> = { "1": "free", "2": "protectionist", "3": "aggressive" };
  for (let attempts = 0; attempts < 10; attempts++) {
    const input = await prompt(`  ${C.cyan}Choose (1-3):${C.reset} `);
    if (map[input]) return map[input];
    if (input === "") return "free"; // default on empty/EOF
    console.log(`  ${C.red}Pick 1, 2, or 3${C.reset}`);
  }
  return "free";
}

function translateStrategy(focus: Focus, posture: Posture, obs: Observation): Action[] {
  // Policy actions (welfare + tariffs) don't count toward the 5-action limit.
  // We return them separately and merge at the end.
  const policyActions: Action[] = [];
  const actions: Action[] = []; // builds + trades — these are the "real" actions
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
  const foodNeeded = n.pops.count * 0.8;
  const textilesNeeded = n.pops.count * 0.3;

  // ── POLICY: WELFARE (always applied) ───────────────────────────────
  const welfareLevel: Record<Focus, number> = {
    people: 0.15,
    food: 0.10,
    trade: 0.06,
    industry: 0.05,
  };
  policyActions.push({ type: "set_welfare", level: welfareLevel[focus] });

  // ── POLICY: TARIFFS (only set once per posture change) ─────────────
  const tariffRate: Record<Posture, number> = {
    free: 0,
    protectionist: 0.25,
    aggressive: 0.10,
  };
  // Only set a single representative tariff to signal the posture
  const currentRate = n.tariffs["food"] ?? 0;
  if (Math.abs(currentRate - tariffRate[posture]) > 0.01) {
    for (const good of GOODS) {
      policyActions.push({ type: "set_tariff", good, rate: tariffRate[posture] });
    }
  }

  // ── 1. BUILD (highest priority) ────────────────────────────────────
  const millCount = opBuildings.filter((b) => b.type === "mill").length;
  const textileProduction = millCount * 12; // base output per mill
  const textileShort = n.stockpile.textiles < textilesNeeded && textileProduction < textilesNeeded;
  const foodShort = n.stockpile.food < foodNeeded;

  if (emptySlots.length > 0) {
    let buildType: BuildingType | null = null;
    const canAfford = (type: BuildingType) => n.treasury > RECIPES[type].buildCost;

    // Critical shortage override: always fix food/textile shortages first
    if (foodShort && farmCount < 4 && canAfford("farm")) {
      buildType = "farm";
    } else if (textileShort && canAfford("mill")) {
      buildType = "mill";
    } else {
      switch (focus) {
        case "food":
          if (canAfford("farm")) buildType = "farm";
          break;
        case "industry":
          if (!types.has("mine") && canAfford("mine")) buildType = "mine";
          else if (!types.has("factory") && types.has("mine") && canAfford("factory")) buildType = "factory";
          else if (!types.has("workshop") && types.has("mill") && canAfford("workshop")) buildType = "workshop";
          else if (canAfford("mill")) buildType = "mill";
          else if (canAfford("factory")) buildType = "factory";
          break;
        case "trade":
          if (!types.has("workshop") && types.has("mill") && types.has("factory") && canAfford("workshop")) buildType = "workshop";
          else if (!types.has("factory") && types.has("mine") && canAfford("factory")) buildType = "factory";
          else if (canAfford("mill")) buildType = "mill";
          else if (!types.has("mine") && canAfford("mine")) buildType = "mine";
          break;
        case "people":
          if (canAfford("farm")) buildType = "farm";
          else if (canAfford("mill")) buildType = "mill";
          break;
      }
    }

    if (buildType) {
      actions.push({ type: "build", buildingType: buildType, slotIndex: emptySlots[0] });
    }
  } else if (emptySlots.length === 0) {
    // No empty slots — demolish and replace if focus requires missing building types
    const wantTypes: Record<Focus, BuildingType[]> = {
      food: [],  // no need to demolish for food focus
      industry: ["mine", "factory", "workshop"],
      trade: ["mine", "factory", "workshop"],
      people: [],
    };
    const needed = wantTypes[focus].find((t) => !types.has(t));
    if (needed) {
      // Find the most redundant building to demolish (most duplicated type)
      const typeCounts = new Map<BuildingType, number>();
      for (const b of opBuildings) {
        typeCounts.set(b.type, (typeCounts.get(b.type) || 0) + 1);
      }
      // Demolish one of the most duplicated type
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
          actions.push({ type: "build", buildingType: needed, slotIndex: victim.slotIndex });
        }
      }
    }
  }

  // ── 2. UPGRADE (when slots full and no demolish needed) ────────────
  if (emptySlots.length === 0 && !actions.some((a) => a.type === "demolish") && n.treasury > 500) {
    const upgradePreference: Record<Focus, BuildingType[]> = {
      food: ["farm", "mill"],
      industry: ["workshop", "factory", "mill"],
      trade: ["workshop", "factory", "mine"],
      people: ["farm", "mill"],
    };
    for (const type of upgradePreference[focus]) {
      const b = opBuildings.find((b) => b.type === type && b.level === 1);
      if (b && n.treasury > RECIPES[type].upgradeCost) {
        actions.push({ type: "upgrade", buildingId: b.id });
        break;
      }
    }
  }

  // ── 5. TRADE ORDERS ─────────────────────────────────────────────────
  const priceMultiplier: Record<Posture, { sell: number; buy: number }> = {
    free: { sell: 0.95, buy: 1.10 },
    protectionist: { sell: 1.15, buy: 1.05 },
    aggressive: { sell: 0.60, buy: 0.85 },
  };

  const reserveMultiplier: Record<Posture, number> = {
    free: 1.2,
    protectionist: 2.0,
    aggressive: 1.0,
  };

  const mult = priceMultiplier[posture];
  const resMult = reserveMultiplier[posture];

  // Sell surplus
  for (const good of GOODS) {
    const stock = n.stockpile[good];
    let reserve: number;
    if (good === "food") reserve = foodNeeded * resMult;
    else if (good === "textiles") reserve = textilesNeeded * resMult;
    else reserve = 0;

    // Keep inputs for own buildings
    if (good === "food" && types.has("mill")) reserve += 8;
    if (good === "iron" && types.has("factory")) reserve += 5;
    if (good === "textiles" && types.has("workshop")) reserve += 3;
    if (good === "machinery" && types.has("workshop")) reserve += 1;

    const sellable = stock - reserve;
    if (sellable > 1 && actions.length < 5) {
      const price = prices[good] * mult.sell;
      actions.push({
        type: "market_order",
        good,
        quantity: Math.round(sellable),
        price: Math.round(price * 100) / 100,
        side: "sell",
      });
    }
  }

  // Buy shortages (only if we have money)
  if (n.treasury > 100 && actions.length < 5) {
    if (n.stockpile.food < foodNeeded) {
      const deficit = foodNeeded - n.stockpile.food;
      const price = prices.food * mult.buy;
      const qty = Math.min(deficit, (n.treasury * 0.2) / price);
      if (qty > 1) {
        actions.push({ type: "market_order", good: "food", quantity: Math.round(qty), price: Math.round(price * 100) / 100, side: "buy" });
      }
    }
    if (n.stockpile.textiles < textilesNeeded && actions.length < 5) {
      const deficit = textilesNeeded - n.stockpile.textiles;
      const price = prices.textiles * mult.buy;
      const qty = Math.min(deficit, (n.treasury * 0.15) / price);
      if (qty > 1) {
        actions.push({ type: "market_order", good: "textiles", quantity: Math.round(qty), price: Math.round(price * 100) / 100, side: "buy" });
      }
    }
  }

  return [...policyActions, ...actions];
}

function describeActions(actions: Action[]): void {
  console.log(`\n  ${C.bold}Actions taken:${C.reset}`);
  for (const a of actions) {
    let desc: string;
    switch (a.type) {
      case "build":
        desc = `🔨 Building ${BUILDING_ICONS[a.buildingType] || ""} ${a.buildingType} in slot ${a.slotIndex}`;
        break;
      case "upgrade":
        desc = `⬆️  Upgrading ${a.buildingId}`;
        break;
      case "demolish":
        desc = `🏚️  Demolishing ${a.buildingId} to free up slot`;
        break;
      case "market_order":
        desc = a.side === "sell"
          ? `📤 Selling ${Math.round(a.quantity)} ${a.good} @$${a.price.toFixed(1)}`
          : `📥 Buying ${Math.round(a.quantity)} ${a.good} @$${a.price.toFixed(1)}`;
        break;
      case "set_tariff":
        desc = `🛃 Tariff on ${a.good}: ${(a.rate * 100).toFixed(0)}%`;
        break;
      case "set_welfare":
        desc = `🏥 Welfare spending: ${(a.level * 100).toFixed(0)}%`;
        break;
    }
    console.log(`    ${C.green}→${C.reset} ${desc}`);
  }
  console.log();
}

export class HumanAgent implements Agent {
  nationId: string = "";

  async decide(obs: Observation): Promise<Action[]> {
    printState(obs);

    const focus = await chooseFocus();
    const posture = await choosePosture();

    const focusLabels: Record<Focus, string> = {
      food: "🌾 Growing food supply",
      industry: "🏗️  Building industry",
      trade: "📈 Maximizing trade",
      people: "👥 Investing in people",
    };
    const postureLabels: Record<Posture, string> = {
      free: "🤝 Free trade",
      protectionist: "🛡️  Protectionist",
      aggressive: "⚔️  Aggressive",
    };
    console.log(`\n  ${C.bold}Strategy:${C.reset} ${focusLabels[focus]} + ${postureLabels[posture]}`);

    const actions = translateStrategy(focus, posture, obs);
    describeActions(actions);

    return actions;
  }
}
