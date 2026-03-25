import { NextResponse } from "next/server";
import { getRoom } from "../../../../../lib/kv.js";
import { getGameState } from "../../../../../lib/kv.js";
import { getHistory } from "../../../../../lib/kv.js";
import { getPlayerObservation } from "../../../../../lib/room-manager.js";
import { computeScores } from "../../../../../lib/round-stepper.js";

export async function GET(request: Request, { params }: { params: Promise<{ roomId: string }> }) {
  try {
    const { roomId } = await params;
    const url = new URL(request.url);
    const playerId = url.searchParams.get("playerId");

    const room = await getRoom(roomId);
    if (!room) {
      return NextResponse.json({ error: "Room not found" }, { status: 404 });
    }

    // Lobby state
    if (room.status === "lobby") {
      return NextResponse.json({ room });
    }

    const game = await getGameState(roomId);
    if (!game) {
      return NextResponse.json({ error: "Game state not found" }, { status: 500 });
    }

    // Find player's slot
    const slot = room.players.find((p) => p.playerId === playerId);
    const nationIndex = slot?.nationIndex;

    // Build response
    const response: Record<string, unknown> = { room };

    if (room.status === "playing" && nationIndex !== undefined) {
      const observation = getPlayerObservation(game, nationIndex);
      const nationId = `nation-${nationIndex}`;

      response.game = {
        observation,
        roundPhase: game.roundPhase,
        pendingPlayers: game.pendingPlayers,
        submitted: !game.pendingPlayers.includes(nationId),
        lastRoundSummary: game.lastRoundSummary,
        lastEvent: game.lastEvent,
      };
    }

    if (room.status === "finished") {
      const history = await getHistory(roomId);
      response.result = {
        rounds: game.totalRounds,
        scores: computeScores(game.nations, game.agentLabels),
        history,
      };
      // Also include final observation
      if (nationIndex !== undefined) {
        const observation = getPlayerObservation(game, nationIndex);
        response.game = {
          observation,
          roundPhase: "resolved",
          pendingPlayers: [],
          submitted: true,
          lastRoundSummary: game.lastRoundSummary,
        };
      }
    }

    return NextResponse.json(response);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
