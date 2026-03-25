import { NextResponse } from "next/server";
import { submitActions } from "@/lib/room-manager";

export async function POST(request: Request, { params }: { params: Promise<{ roomId: string }> }) {
  try {
    const { roomId } = await params;
    const { playerId, actions } = await request.json();

    if (!playerId) {
      return NextResponse.json({ error: "playerId required" }, { status: 400 });
    }

    if (!Array.isArray(actions)) {
      return NextResponse.json({ error: "actions must be an array" }, { status: 400 });
    }

    const { resolved } = await submitActions(roomId, playerId, actions);
    return NextResponse.json({ accepted: true, roundResolved: resolved });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal error";
    const status = message.includes("Already submitted")
      ? 409
      : message.includes("not found") || message.includes("not in room")
        ? 404
        : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
