"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import type { RoomState } from "../game-state";
import type { Observation } from "../../src/engine/types";
import type { RoundSummary, GameResult } from "../../src/engine/game";

export interface GamePollState {
  room: RoomState | null;
  observation: Observation | null;
  roundPhase: string | null;
  pendingPlayers: string[];
  submitted: boolean;
  lastRoundSummary: RoundSummary | null;
  lastEvent: string | null;
  result: GameResult | null;
  loading: boolean;
  error: string | null;
}

function getPlayerId(): string {
  if (typeof window === "undefined") return "";
  let id = localStorage.getItem("mercator-player-id");
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem("mercator-player-id", id);
  }
  return id;
}

export function useGamePolling(roomId: string, intervalMs = 1500): GamePollState {
  const [state, setState] = useState<GamePollState>({
    room: null,
    observation: null,
    roundPhase: null,
    pendingPlayers: [],
    submitted: false,
    lastRoundSummary: null,
    lastEvent: null,
    result: null,
    loading: true,
    error: null,
  });

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const poll = useCallback(async () => {
    try {
      const playerId = getPlayerId();
      const res = await fetch(`/api/room/${roomId}/state?playerId=${playerId}`);
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to fetch state");
      }
      const data = await res.json();

      setState({
        room: data.room ?? null,
        observation: data.game?.observation ?? null,
        roundPhase: data.game?.roundPhase ?? null,
        pendingPlayers: data.game?.pendingPlayers ?? [],
        submitted: data.game?.submitted ?? false,
        lastRoundSummary: data.game?.lastRoundSummary ?? null,
        lastEvent: data.game?.lastEvent ?? null,
        result: data.result ?? null,
        loading: false,
        error: null,
      });
    } catch (err: unknown) {
      setState((prev) => ({
        ...prev,
        loading: false,
        error: err instanceof Error ? err.message : "Connection error",
      }));
    }
  }, [roomId]);

  useEffect(() => {
    poll();
    intervalRef.current = setInterval(poll, intervalMs);
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [poll, intervalMs]);

  return state;
}

export { getPlayerId };
