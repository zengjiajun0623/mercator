/**
 * Server-side AI agent wrappers.
 *
 * Instantiates and calls the existing agent classes from src/agent/
 * to get AI decisions for non-human slots.
 */
import type { Action, Observation } from "../src/engine/types";
import type { AgentType } from "./game-state";
import { PersonalityAgent } from "../src/agent/personality-agent";
import type { Personality } from "../src/agent/personality-agent";
import { SmartAgent } from "../src/agent/smart-agent";
import { RandomAgent } from "../src/agent/random-agent";
import { enforceActionLimits } from "./round-stepper";

/**
 * Get AI actions for a given agent type and observation.
 * Returns enforced-limited actions.
 */
export async function getAIActions(
  agentType: AgentType,
  nationId: string,
  observation: Observation,
): Promise<Action[]> {
  if (agentType === "human") {
    throw new Error("Cannot get AI actions for human player");
  }

  let agent;

  if (agentType.startsWith("personality:")) {
    const personality = agentType.split(":")[1] as Personality;
    agent = new PersonalityAgent(personality);
  } else if (agentType === "smart") {
    agent = new SmartAgent();
  } else if (agentType === "random") {
    agent = new RandomAgent();
  } else if (agentType === "llm") {
    // LLM agent requires API key — for now fall back to smart agent
    // TODO: implement LLM agent with KV-backed history
    agent = new SmartAgent();
  } else {
    agent = new RandomAgent();
  }

  agent.nationId = nationId;

  try {
    const actions = await agent.decide(observation);
    return enforceActionLimits(actions);
  } catch (err) {
    console.error(`AI agent ${nationId} (${agentType}) error:`, err);
    return [];
  }
}
