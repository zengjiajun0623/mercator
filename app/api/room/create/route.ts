import { NextResponse } from "next/server";
import { createRoom } from "@/lib/room-manager";

export async function POST(request: Request) {
  try {
    const { playerId, playerName } = await request.json();

    if (!playerId || !playerName) {
      return NextResponse.json({ error: "playerId and playerName required" }, { status: 400 });
    }

    const room = await createRoom(playerId, playerName);
    return NextResponse.json({ roomId: room.id, playerIndex: 0 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
