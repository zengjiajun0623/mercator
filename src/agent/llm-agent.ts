import Anthropic from "@anthropic-ai/sdk";
import { Action, Agent, Observation, BUILDING_TYPES, GOODS } from "../engine/types.js";

const SYSTEM_PROMPT = `You are an AI governing a nation in the economic simulation game "Mercator".
Your goal is to MAXIMIZE your final score after all rounds.

SCORING:
  score = treasury + building_asset_value + (population × satisfaction × 100)

ECONOMY:
- Your nation has buildings that produce goods each round
- Buildings need inputs from your stockpile to operate
- Pops need food (0.8/pop), textiles (0.3/pop), and luxuries (0.1/pop for bonus satisfaction)
- Population grows at 2%/round if satisfaction > 0.7, declines 3%/round if < 0.3
- More pops = more productive capacity

BUILDING RECIPES:
  Farm:     → 20 food              (cost: $100, build: 2 rounds)
  Mill:     8 food → 12 textiles   (cost: $150, build: 2 rounds)
  Mine:     → 10 iron              (cost: $120, build: 2 rounds)
  Factory:  5 iron → 4 machinery   (cost: $250, build: 3 rounds)
  Workshop: 3 textiles + 1 machinery → 6 luxuries (cost: $300, build: 3 rounds)

MARKET:
- All nations trade on a shared market each round
- Set sell orders to export surplus, buy orders to import what you need
- Prices are set by supply and demand
- Tariffs: you can tax imports (0-100%)

WELFARE:
- Set welfare spending (0-100% of treasury) to auto-buy food/textiles for pops
- Higher welfare = happier pops = population growth = more capacity

STRATEGY TIPS:
- Early game: ensure food supply, start building capacity
- Mid game: develop supply chains (iron → machinery → luxuries)
- Late game: luxuries are the most valuable, population growth compounds
- Trade surplus goods, import what you lack
- Balance investment (buildings) vs consumption (welfare) vs savings (treasury)

You have UP TO 5 actions per round. Use the provided tools to take actions.`;

const TOOLS: Anthropic.Tool[] = [
  {
    name: "build",
    description:
      "Construct a new building in an empty slot. Costs treasury and takes several rounds to complete.",
    input_schema: {
      type: "object",
      properties: {
        buildingType: {
          type: "string",
          enum: BUILDING_TYPES as unknown as string[],
          description: "Type of building to construct",
        },
        slotIndex: {
          type: "number",
          description: "Slot index (0-based) to build in. Must be an empty slot.",
        },
      },
      required: ["buildingType", "slotIndex"],
    },
  },
  {
    name: "upgrade",
    description: "Upgrade an existing operational building. Doubles its output.",
    input_schema: {
      type: "object",
      properties: {
        buildingId: {
          type: "string",
          description: "ID of the building to upgrade",
        },
      },
      required: ["buildingId"],
    },
  },
  {
    name: "market_order",
    description:
      "Place a buy or sell order on the shared market. Sell surplus goods or buy what you need.",
    input_schema: {
      type: "object",
      properties: {
        good: {
          type: "string",
          enum: GOODS as unknown as string[],
          description: "Which good to trade",
        },
        quantity: {
          type: "number",
          description: "How many units to buy/sell",
        },
        price: {
          type: "number",
          description: "Price per unit you're willing to pay/accept",
        },
        side: {
          type: "string",
          enum: ["buy", "sell"],
          description: "Whether to buy or sell",
        },
      },
      required: ["good", "quantity", "price", "side"],
    },
  },
  {
    name: "set_tariff",
    description: "Set an import tariff rate on a specific good (0 to 1).",
    input_schema: {
      type: "object",
      properties: {
        good: {
          type: "string",
          enum: GOODS as unknown as string[],
        },
        rate: {
          type: "number",
          description: "Tariff rate from 0 (free trade) to 1 (100% tariff)",
        },
      },
      required: ["good", "rate"],
    },
  },
  {
    name: "set_welfare",
    description:
      "Set welfare spending as a fraction of treasury (0 to 1). This auto-buys food and textiles for your pops.",
    input_schema: {
      type: "object",
      properties: {
        level: {
          type: "number",
          description: "Fraction of treasury to spend on welfare (0.0 to 1.0)",
        },
      },
      required: ["level"],
    },
  },
];

function formatObservation(obs: Observation): string {
  const n = obs.nation;
  const usedSlots = new Set(n.buildings.map((b) => b.slotIndex));
  const emptySlots = [];
  for (let i = 0; i < n.totalSlots; i++) {
    if (!usedSlots.has(i)) emptySlots.push(i);
  }

  const buildings = n.buildings
    .map((b) => {
      const status = b.constructionTurnsLeft > 0 ? ` (building: ${b.constructionTurnsLeft} rounds left)` : ` (operational, level ${b.level})`;
      return `  ${b.id}: ${b.type}${status} [slot ${b.slotIndex}]`;
    })
    .join("\n");

  const stockpile = GOODS.map((g) => `${g}: ${n.stockpile[g].toFixed(1)}`).join(", ");
  const prices = GOODS.map((g) => `${g}: $${obs.marketPrices.prices[g].toFixed(1)}`).join(", ");
  const volumes = GOODS.map((g) => `${g}: ${obs.marketPrices.volume[g]}`).join(", ");

  const others = obs.otherNations
    .map((o) => `  ${o.name}: ${o.pops} pops, ${o.buildingCount} buildings`)
    .join("\n");

  return `ROUND ${obs.round}/${obs.totalRounds}

YOUR NATION: ${n.name}
Treasury: $${n.treasury.toFixed(2)}
Population: ${n.pops.count} (satisfaction: ${(n.pops.satisfaction * 100).toFixed(0)}%)
Welfare spending: ${(n.welfareSpending * 100).toFixed(0)}%
Stockpile: ${stockpile}

Buildings:
${buildings}
Empty slots: ${emptySlots.join(", ") || "none"}

Market prices: ${prices}
Trade volume: ${volumes}

Other nations:
${others}

What actions will you take this round? (up to 5)`;
}

export class LLMAgent implements Agent {
  nationId: string = "";
  private client: Anthropic;
  private model: string;
  private previousRoundSummaries: string[] = [];

  constructor(model: string = "claude-sonnet-4-20250514") {
    this.client = new Anthropic();
    this.model = model;
  }

  async decide(obs: Observation): Promise<Action[]> {
    const userMessage = formatObservation(obs);

    // Include brief summaries of last 3 rounds for context
    let fullMessage = userMessage;
    if (this.previousRoundSummaries.length > 0) {
      const recentHistory = this.previousRoundSummaries.slice(-3).join("\n");
      fullMessage = `RECENT HISTORY:\n${recentHistory}\n\nCURRENT STATE:\n${userMessage}`;
    }

    // Single-turn call each round — avoids tool_use/tool_result sync issues
    const response = await this.client.messages.create({
      model: this.model,
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      tools: TOOLS,
      tool_choice: { type: "any" },
      messages: [{ role: "user", content: fullMessage }],
    });

    // Extract tool calls as actions
    const actions: Action[] = [];

    for (const block of response.content) {
      if (block.type === "tool_use") {
        const input = block.input as Record<string, unknown>;

        switch (block.name) {
          case "build":
            actions.push({
              type: "build",
              buildingType: input.buildingType as any,
              slotIndex: input.slotIndex as number,
            });
            break;
          case "upgrade":
            actions.push({
              type: "upgrade",
              buildingId: input.buildingId as string,
            });
            break;
          case "market_order":
            actions.push({
              type: "market_order",
              good: input.good as any,
              quantity: input.quantity as number,
              price: input.price as number,
              side: input.side as "buy" | "sell",
            });
            break;
          case "set_tariff":
            actions.push({
              type: "set_tariff",
              good: input.good as any,
              rate: input.rate as number,
            });
            break;
          case "set_welfare":
            actions.push({
              type: "set_welfare",
              level: input.level as number,
            });
            break;
        }
      }
    }

    // Save a brief summary for future rounds
    this.previousRoundSummaries.push(
      `Round ${obs.round}: treasury=$${obs.nation.treasury.toFixed(0)}, pops=${obs.nation.pops.count}, sat=${(obs.nation.pops.satisfaction * 100).toFixed(0)}%, actions=${actions.map((a) => a.type).join(",")}`
    );

    return actions;
  }
}
