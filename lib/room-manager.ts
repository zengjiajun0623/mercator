/**
 * Room lifecycle management — create, join, start, resolve rounds.
 */
import { customAlphabet } from "nanoid";
import type { Action, GameConfig } from "../src/engine/types.js";
import { DEFAULT_CONFIG } from "../src/engine/types.js";
import type { RoomState, GameState, PlayerSlot, AgentType } from "./game-state.js";
import {
  createNation,
  initialPrices,
  buildObservation,
  stepRound,
} from "./round-stepper.js";
import { getRoom, setRoom, getGameState, setGameState, appendHistory } from "./kv.js";
import { getAIActions } from "./web-agents.js";

const generateCode = customAlphabet("ABCDEFGHJKLMNPQRSTUVWXYZ23456789", 6);

const DEFAULT_AI_TYPES: AgentType[] = [
  "personality:merchant",
  "personality:warlord",
  "personality:isolationist",
  "personality:industrialist",
];

// ── Create room ─────────────────────────────────────────────────────────────

export async function createRoom(
  playerId: string,
  playerName: string
): Promise<RoomState> {
  const roomId = generateCode();

  const players: PlayerSlot[] = [
    {
      nationIndex: 0,
      type: "human",
      playerId,
      playerName,
      connected: true,
      lastSeen: Date.now(),
    },
    // Fill remaining slots with AI
    ...([1, 2, 3] as const).map((i) => ({
      nationIndex: i,
      type: DEFAULT_AI_TYPES[i] as AgentType,
      connected: false,
      lastSeen: 0,
    })),
  ];

  const room: RoomState = {
    id: roomId,
    hostPlayerId: playerId,
    status: "lobby",
    config: { ...DEFAULT_CONFIG, totalRounds: 20, nationCount: 4 },
    players,
    createdAt: Date.now(),
  };

  await setRoom(room);
  return room;
}

// ── Join room ───────────────────────────────────────────────────────────────

export async function joinRoom(
  roomId: string,
  playerId: string,
  playerName: string
): Promise<{ room: RoomState; playerIndex: number }> {
  const room = await getRoom(roomId);
  if (!room) throw new Error("Room not found");
  if (room.status !== "lobby") throw new Error("Game already started");

  // Check if player already in room
  const existing = room.players.find((p) => p.playerId === playerId);
  if (existing) {
    existing.connected = true;
    existing.lastSeen = Date.now();
    existing.playerName = playerName;
    await setRoom(room);
    return { room, playerIndex: existing.nationIndex };
  }

  // Find first AI slot to replace
  const aiSlot = room.players.find((p) => p.type !== "human");
  if (!aiSlot) throw new Error("Room is full");

  aiSlot.type = "human";
  aiSlot.playerId = playerId;
  aiSlot.playerName = playerName;
  aiSlot.connected = true;
  aiSlot.lastSeen = Date.now();

  await setRoom(room);
  return { room, playerIndex: aiSlot.nationIndex };
}

// ── Start game ──────────────────────────────────────────────────────────────

export async function startGame(
  roomId: string,
  playerId: string,
  config?: Partial<GameConfig>
): Promise<GameState> {
  const room = await getRoom(roomId);
  if (!room) throw new Error("Room not found");
  if (room.hostPlayerId !== playerId) throw new Error("Only host can start");
  if (room.status !== "lobby") throw new Error("Game already started");

  // Apply config overrides
  if (config) {
    if (config.totalRounds) room.config.totalRounds = config.totalRounds;
    if (config.totalSlots) room.config.totalSlots = config.totalSlots;
  }

  // Create nations
  const nations = Array.from({ length: room.config.nationCount }, (_, i) =>
    createNation(i, room.config)
  );

  // Build labels
  const agentLabels: Record<string, string> = {};
  for (const slot of room.players) {
    const nationId = `nation-${slot.nationIndex}`;
    agentLabels[nationId] =
      slot.type === "human" ? slot.playerName ?? "Human" : slot.type;
  }

  // Get human nation IDs
  const humanNationIds = room.players
    .filter((p) => p.type === "human")
    .map((p) => `nation-${p.nationIndex}`);

  // Run AI agents for round 1
  const marketPrices = initialPrices();
  const submittedActions: Record<string, Action[]> = {};

  for (const slot of room.players) {
    if (slot.type === "human") continue;
    const nationId = `nation-${slot.nationIndex}`;
    const nation = nations[slot.nationIndex];
    const obs = buildObservation(
      nation,
      nations,
      1,
      room.config.totalRounds,
      marketPrices
    );
    submittedActions[nationId] = await getAIActions(slot.type, nationId, obs);
  }

  const gameState: GameState = {
    nations,
    marketPrices,
    currentRound: 1,
    totalRounds: room.config.totalRounds,
    roundPhase: "waiting",
    pendingPlayers: humanNationIds,
    submittedActions,
    agentLabels,
  };

  room.status = "playing";
  await setRoom(room);
  await setGameState(roomId, gameState);

  return gameState;
}

// ── Submit actions ──────────────────────────────────────────────────────────

export async function submitActions(
  roomId: string,
  playerId: string,
  actions: Action[]
): Promise<{ resolved: boolean }> {
  const room = await getRoom(roomId);
  if (!room) throw new Error("Room not found");
  if (room.status !== "playing") throw new Error("Game not in progress");

  const game = await getGameState(roomId);
  if (!game) throw new Error("Game state not found");
  if (game.roundPhase !== "waiting") throw new Error("Not accepting actions");

  // Find the player's nation
  const slot = room.players.find((p) => p.playerId === playerId);
  if (!slot) throw new Error("Player not in room");
  const nationId = `nation-${slot.nationIndex}`;

  if (!game.pendingPlayers.includes(nationId)) {
    throw new Error("Already submitted for this round");
  }

  // Store actions and remove from pending
  game.submittedActions[nationId] = actions;
  game.pendingPlayers = game.pendingPlayers.filter((id) => id !== nationId);

  // If all players submitted, resolve the round
  if (game.pendingPlayers.length === 0) {
    await resolveRound(roomId, room, game);
    return { resolved: true };
  }

  await setGameState(roomId, game);
  return { resolved: false };
}

// ── Resolve round ───────────────────────────────────────────────────────────

async function resolveRound(
  roomId: string,
  room: RoomState,
  game: GameState
): Promise<void> {
  game.roundPhase = "resolving";

  // Step the round
  const result = stepRound(
    game.nations,
    game.marketPrices,
    game.submittedActions,
    game.currentRound,
    game.totalRounds,
    game.agentLabels
  );

  game.nations = result.nations;
  game.marketPrices = result.marketPrices;
  game.lastRoundSummary = result.summary;
  game.lastEvent = result.summary.event;

  await appendHistory(roomId, result.summary);

  // Check if game is over
  if (game.currentRound >= game.totalRounds) {
    game.roundPhase = "resolved";
    room.status = "finished";
    await setRoom(room);
    await setGameState(roomId, game);
    return;
  }

  // Advance to next round
  game.currentRound++;
  game.submittedActions = {};

  // Get human nation IDs for next round
  const humanNationIds = room.players
    .filter((p) => p.type === "human")
    .map((p) => `nation-${p.nationIndex}`);

  // Run AI agents for next round
  for (const slot of room.players) {
    if (slot.type === "human") continue;
    const nationId = `nation-${slot.nationIndex}`;
    const nation = game.nations[slot.nationIndex];
    const obs = buildObservation(
      nation,
      game.nations,
      game.currentRound,
      game.totalRounds,
      game.marketPrices
    );
    game.submittedActions[nationId] = await getAIActions(
      slot.type,
      nationId,
      obs
    );
  }

  game.pendingPlayers = humanNationIds;
  game.roundPhase = "waiting";

  await setRoom(room);
  await setGameState(roomId, game);
}

// ── Get player observation ──────────────────────────────────────────────────

export function getPlayerObservation(game: GameState, nationIndex: number) {
  const nation = game.nations[nationIndex];
  return buildObservation(
    nation,
    game.nations,
    game.currentRound,
    game.totalRounds,
    game.marketPrices
  );
}
