import type { RoomState, GameState } from "./game-state";
import type { RoundSummary } from "../src/engine/game";

// ── In-memory store (local dev) / Vercel KV (production) ────────────────────
//
// We use a simple Map for local development so no external Redis is needed.
// In production on Vercel, swap to @vercel/kv or @upstash/redis.

const store = new Map<string, string>();

async function get<T>(key: string): Promise<T | null> {
  const val = store.get(key);
  if (!val) return null;
  return JSON.parse(val) as T;
}

async function set(key: string, value: unknown, ttlSeconds?: number): Promise<void> {
  store.set(key, JSON.stringify(value));
  if (ttlSeconds) {
    setTimeout(() => store.delete(key), ttlSeconds * 1000);
  }
}

async function del(key: string): Promise<void> {
  store.delete(key);
}

// ── Room helpers ────────────────────────────────────────────────────────────

const ROOM_TTL = 7200; // 2 hours

export async function getRoom(roomId: string): Promise<RoomState | null> {
  return get<RoomState>(`room:${roomId}`);
}

export async function setRoom(room: RoomState): Promise<void> {
  await set(`room:${room.id}`, room, ROOM_TTL);
}

export async function deleteRoom(roomId: string): Promise<void> {
  await del(`room:${roomId}`);
  await del(`room:${roomId}:game`);
  await del(`room:${roomId}:history`);
}

// ── Game state helpers ──────────────────────────────────────────────────────

export async function getGameState(roomId: string): Promise<GameState | null> {
  return get<GameState>(`room:${roomId}:game`);
}

export async function setGameState(roomId: string, state: GameState): Promise<void> {
  await set(`room:${roomId}:game`, state, ROOM_TTL);
}

// ── History helpers ─────────────────────────────────────────────────────────

export async function getHistory(roomId: string): Promise<RoundSummary[]> {
  return (await get<RoundSummary[]>(`room:${roomId}:history`)) ?? [];
}

export async function appendHistory(roomId: string, summary: RoundSummary): Promise<void> {
  const history = await getHistory(roomId);
  history.push(summary);
  await set(`room:${roomId}:history`, history, ROOM_TTL);
}
