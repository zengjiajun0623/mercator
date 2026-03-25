import { NextResponse } from "next/server";
import { startGame } from "../../../../../lib/room-manager.js";

export async function POST(request: Request, { params }: { params: Promise<{ roomId: string }> }) {
  try {
    const { roomId } = await params;
    const { playerId, config } = await request.json();

    if (!playerId) {
      return NextResponse.json({ error: "playerId required" }, { status: 400 });
    }

    const gameState = await startGame(roomId, playerId, config);
    return NextResponse.json({
      round: gameState.currentRound,
      totalRounds: gameState.totalRounds,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal error";
    const status = message.includes("not found")
      ? 404
      : message.includes("Only host") || message.includes("already")
        ? 403
        : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
