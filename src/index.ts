import { runGame } from "./engine/game.js";
import { DEFAULT_CONFIG, GameConfig } from "./engine/types.js";
import { RandomAgent } from "./agent/random-agent.js";
import { SmartAgent } from "./agent/smart-agent.js";
import { PersonalityAgent, Personality } from "./agent/personality-agent.js";
import { LLMAgent } from "./agent/llm-agent.js";
import { HumanAgent } from "./agent/human-agent.js";
import { logRound, logFinalScoreboard } from "./ui/logger.js";

const PERSONALITIES: Personality[] = ["merchant", "warlord", "isolationist", "industrialist"];

function parseArgs(): { config: GameConfig; agentTypes: string[] } {
  const args = process.argv.slice(2);
  const config = { ...DEFAULT_CONFIG };
  const agentTypes: string[] = [];

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case "--rounds":
        config.totalRounds = parseInt(args[++i], 10);
        break;
      case "--agents":
        config.nationCount = parseInt(args[++i], 10);
        break;
      case "--slots":
        config.totalSlots = parseInt(args[++i], 10);
        break;
      case "--llm": {
        const count = parseInt(args[++i], 10);
        for (let j = 0; j < count; j++) agentTypes.push("llm");
        break;
      }
      case "--smart": {
        const count = parseInt(args[++i], 10);
        for (let j = 0; j < count; j++) agentTypes.push("smart");
        break;
      }
      case "--human":
        agentTypes.push("human");
        break;
      case "--model":
        i++;
        break;
      default:
        break;
    }
  }

  // Fill remaining with personality agents (cycling through types)
  let pIdx = 0;
  while (agentTypes.length < config.nationCount) {
    agentTypes.push(`personality:${PERSONALITIES[pIdx % PERSONALITIES.length]}`);
    pIdx++;
  }

  return { config, agentTypes };
}

async function main() {
  const { config, agentTypes } = parseArgs();
  const modelArg = process.argv.find((_, i) => process.argv[i - 1] === "--model") ?? "claude-sonnet-4-20250514";

  console.log(`\n🌍 ${"\x1b[1m"}MERCATOR — Agent Economic Arena${"\x1b[0m"}`);
  console.log(`   ${config.nationCount} nations, ${config.totalRounds} rounds\n`);

  const agents = agentTypes.map((type) => {
    if (type === "llm") return new LLMAgent(modelArg);
    if (type === "smart") return new SmartAgent();
    if (type === "human") return new HumanAgent();
    if (type.startsWith("personality:")) {
      const p = type.split(":")[1] as Personality;
      return new PersonalityAgent(p);
    }
    return new RandomAgent();
  });

  // Print agent lineup
  console.log("   Players:");
  const agentLabels = new Map<string, string>();
  for (let i = 0; i < agents.length; i++) {
    const agent = agents[i];
    const nationName = ["Aurelia", "Borealis", "Crescentia", "Delmara", "Elythia", "Feronia", "Galdoria", "Hespera"][i];
    let label: string;
    if (agent instanceof PersonalityAgent) {
      label = agent.personality;
      console.log(`   ${agent.label}`);
    } else if (agent instanceof LLMAgent) {
      label = "LLM";
      console.log(`   🤖 ${nationName} — LLM Agent (${modelArg})`);
    } else if (agent instanceof HumanAgent) {
      label = "Human";
      console.log(`   🧑 ${nationName} — Human Player (you!)`);
    } else if (agent instanceof SmartAgent) {
      label = "Smart";
      console.log(`   🧠 ${nationName} — Smart Heuristic`);
    } else {
      label = "Random";
      console.log(`   🎲 ${nationName} — Random Agent`);
    }
    // We'll set labels after nation IDs are assigned
    agentLabels.set(`nation-${i}`, label);
  }
  console.log();

  const hasHuman = agentTypes.includes("human");
  const result = await runGame(agents, config, hasHuman ? undefined : logRound, agentLabels);
  logFinalScoreboard(result);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
