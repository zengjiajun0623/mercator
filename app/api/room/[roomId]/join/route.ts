import { NextResponse } from "next/server";
import { joinRoom } from "../../../../../lib/room-manager.js";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ roomId: string }> }
) {
  try {
    const { roomId } = await params;
    const { playerId, playerName } = await request.json();

    if (!playerId || !playerName) {
      return NextResponse.json(
        { error: "playerId and playerName required" },
        { status: 400 }
      );
    }

    const { room, playerIndex } = await joinRoom(roomId, playerId, playerName);
    return NextResponse.json({
      roomId: room.id,
      playerIndex,
      nationName: room.players[playerIndex]?.playerName,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal error";
    const status = message.includes("not found")
      ? 404
      : message.includes("full") || message.includes("started")
        ? 409
        : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
