import type {
  Action,
  GameConfig,
  Good,
  MarketPrices,
  Nation,
} from "../src/engine/types.js";
import type { RoundSummary } from "../src/engine/game.js";

// ── Player identity ─────────────────────────────────────────────────────────

export type AgentType =
  | "human"
  | "personality:merchant"
  | "personality:warlord"
  | "personality:isolationist"
  | "personality:industrialist"
  | "smart"
  | "random"
  | "llm";

export interface PlayerSlot {
  nationIndex: number; // 0-3
  type: AgentType;
  playerId?: string; // browser UUID for humans
  playerName?: string;
  connected: boolean;
  lastSeen: number; // timestamp
}

// ── Room state (lobby + config) ─────────────────────────────────────────────

export interface RoomState {
  id: string; // 6-char code
  hostPlayerId: string;
  status: "lobby" | "playing" | "finished";
  config: GameConfig;
  players: PlayerSlot[];
  createdAt: number;
}

// ── Game state (active game) ────────────────────────────────────────────────

export interface GameState {
  nations: Nation[];
  marketPrices: MarketPrices;
  currentRound: number;
  totalRounds: number;
  roundPhase: "waiting" | "resolving" | "resolved";
  pendingPlayers: string[]; // nationIds that haven't submitted
  submittedActions: Record<string, Action[]>; // nationId → actions
  lastEvent?: string;
  lastRoundSummary?: RoundSummary;
  agentLabels: Record<string, string>; // nationId → label
}

// ── API response types ──────────────────────────────────────────────────────

export interface RoomStateResponse {
  room: RoomState;
  game?: {
    observation: {
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
    };
    roundPhase: string;
    pendingPlayers: string[];
    submitted: boolean;
    lastRoundSummary?: RoundSummary;
  };
  result?: {
    rounds: number;
    scores: Array<{
      nationId: string;
      name: string;
      label: string;
      treasury: number;
      assetValue: number;
      popScore: number;
      totalScore: number;
    }>;
    history: RoundSummary[];
  };
}
