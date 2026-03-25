import { GameResult, RoundSummary } from "../engine/game.js";
import { GOODS } from "../engine/types.js";

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
  white: "\x1b[37m",
};

const NATION_COLORS = [C.cyan, C.magenta, C.yellow, C.blue, C.green, C.red];

export function logRound(summary: RoundSummary): void {
  const { round, prices, nations, tradeCount, event, nationActions } = summary;

  // Print every 5 rounds for shorter games, every 10 for longer
  const interval = summary.totalRounds <= 50 ? 5 : 10;
  if (round !== 1 && round !== summary.totalRounds && round % interval !== 0) return;

  console.log(
    `\n${C.bold}${"─".repeat(60)}${C.reset}`
  );
  console.log(
    `${C.bold}  ROUND ${String(round).padStart(3)}/${summary.totalRounds}${C.reset}  ` +
    `${C.dim}Trades: ${tradeCount}${C.reset}`
  );

  // Show event if any
  if (event) {
    console.log(`  ${C.bold}${C.yellow}EVENT: ${event}${C.reset}`);
  }

  // Market prices with direction arrows
  const priceStr = GOODS.map((g) => {
    const p = prices.prices[g];
    return `${g}: $${p.toFixed(1)}`;
  }).join("  ");
  console.log(`  ${C.dim}Market: ${priceStr}${C.reset}`);
  console.log();

  // Nation summaries with actions
  for (let i = 0; i < nations.length; i++) {
    const n = nations[i];
    const color = NATION_COLORS[i % NATION_COLORS.length];
    const satBar = renderBar(n.satisfaction, 8);
    const label = n.label ? ` ${C.dim}(${n.label})${C.reset}` : "";

    console.log(
      `  ${color}${C.bold}${n.name.padEnd(12)}${C.reset}${label}`
    );
    console.log(
      `    💰 $${String(Math.round(n.treasury)).padStart(5)}  ` +
      `👥 ${String(n.pops).padStart(4)}  ` +
      `${satBar}  ` +
      `🏭 ${n.buildingCount}/${n.totalBuildings}`
    );

    // Show what this nation did
    const acts = nationActions?.[n.id];
    if (acts && acts.length > 0) {
      const actStr = acts.map(formatAction).join(", ");
      console.log(`    ${C.dim}→ ${actStr}${C.reset}`);
    }
  }
}

function formatAction(a: string): string {
  // Actions are pre-formatted strings from the game loop
  return a;
}

function renderBar(ratio: number, width: number): string {
  const filled = Math.round(ratio * width);
  const empty = width - filled;
  const color = ratio > 0.7 ? C.green : ratio < 0.3 ? C.red : C.yellow;
  return `${color}${"█".repeat(filled)}${"░".repeat(empty)}${C.reset}`;
}

export function logFinalScoreboard(result: GameResult): void {
  console.log(
    `\n${C.bold}${"═".repeat(65)}${C.reset}`
  );
  console.log(
    `${C.bold}  🏆 FINAL SCOREBOARD — ${result.rounds} Rounds${C.reset}`
  );
  console.log(`${"═".repeat(65)}`);
  console.log(
    `  ${"#".padEnd(4)} ${"Nation".padEnd(14)} ${"Type".padEnd(14)} ${"Treasury".padStart(10)} ${"Assets".padStart(8)} ${"Pop".padStart(8)} ${"TOTAL".padStart(10)}`
  );
  console.log(`  ${"-".repeat(60)}`);

  for (let i = 0; i < result.scores.length; i++) {
    const s = result.scores[i];
    const medal = i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : "  ";
    const color = NATION_COLORS[i % NATION_COLORS.length];
    console.log(
      `  ${medal}${String(i + 1).padStart(1)}  ` +
      `${color}${s.name.padEnd(14)}${C.reset}` +
      `${C.dim}${(s.label || "").padEnd(14)}${C.reset}` +
      `$${String(Math.round(s.treasury)).padStart(9)} ` +
      `$${String(s.assetValue).padStart(7)} ` +
      `$${String(s.popScore).padStart(7)} ` +
      `${C.bold}$${String(Math.round(s.totalScore)).padStart(9)}${C.reset}`
    );
  }

  console.log(`${"═".repeat(65)}\n`);
}
