"use client";

import type { RoomState } from "../../lib/game-state";
import { getPlayerId } from "../../lib/hooks/useGamePolling";
import { useState } from "react";

const NATION_NAMES = ["Aurelia", "Borealis", "Crescentia", "Delmara"];
const NATION_COLORS = ["#4fc3f7", "#ab47bc", "#ffd54f", "#66bb6a"];

const AI_LABELS: Record<string, string> = {
  "personality:merchant": "AI Merchant",
  "personality:warlord": "AI Warlord",
  "personality:isolationist": "AI Isolationist",
  "personality:industrialist": "AI Industrialist",
  smart: "AI Smart",
  random: "AI Random",
};

const AI_ICONS: Record<string, string> = {
  "personality:merchant": "🏪",
  "personality:warlord": "⚔️",
  "personality:isolationist": "🏔️",
  "personality:industrialist": "🏗️",
  smart: "🧠",
  random: "🎲",
};

interface Props {
  room: RoomState;
  roomId: string;
}

export default function RoomLobby({ room, roomId }: Props) {
  const [starting, setStarting] = useState(false);
  const [rounds, setRounds] = useState(room.config.totalRounds);
  const playerId = getPlayerId();
  const isHost = playerId === room.hostPlayerId;

  async function handleStart() {
    setStarting(true);
    try {
      const res = await fetch(`/api/room/${roomId}/start`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playerId, config: { totalRounds: rounds } }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to start");
      }
    } catch {
      setStarting(false);
    }
  }

  const humanCount = room.players.filter((p) => p.type === "human").length;

  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-4">
      <div className="w-full max-w-lg">
        {/* Room code header */}
        <div className="text-center mb-8">
          <p className="font-pixel text-[8px] text-[#6b7280] mb-2">ROOM CODE</p>
          <div className="inline-block px-6 py-3 bg-[#1a2233] border border-[#4fc3f7]">
            <span className="font-pixel text-2xl text-[#4fc3f7] tracking-[0.5em]">{roomId}</span>
          </div>
          <p className="text-[#6b7280] text-xs mt-2">Share this code with other players</p>
        </div>

        {/* Player slots */}
        <div className="panel mb-6">
          <div className="panel-header">
            {">"} NATIONS ({humanCount}/4 players)
          </div>
          <div className="space-y-2">
            {room.players.map((slot, i) => (
              <div
                key={i}
                className="flex items-center gap-3 px-3 py-2 border border-[#2a3444] bg-[#0a0e17]"
              >
                <span className="text-lg">
                  {slot.type === "human" ? "👤" : AI_ICONS[slot.type] || "🤖"}
                </span>
                <span style={{ color: NATION_COLORS[i] }} className="font-pixel text-[9px] w-24">
                  {NATION_NAMES[i]}
                </span>
                <span className="text-sm flex-1">
                  {slot.type === "human" ? (
                    <span className="text-[#66bb6a]">
                      {slot.playerName}
                      {slot.playerId === room.hostPlayerId && (
                        <span className="text-[#ffd54f] ml-1">[HOST]</span>
                      )}
                    </span>
                  ) : (
                    <span className="text-[#6b7280]">{AI_LABELS[slot.type] || slot.type}</span>
                  )}
                </span>
                {slot.type === "human" && (
                  <span className="w-2 h-2 rounded-full bg-[#66bb6a] animate-pulse" />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Game config (host only) */}
        {isHost && (
          <div className="panel mb-6">
            <div className="panel-header">{">"} GAME CONFIG</div>
            <div className="flex items-center gap-4">
              <span className="text-xs text-[#6b7280]">ROUNDS:</span>
              <div className="flex gap-2">
                {[10, 20, 50, 100].map((r) => (
                  <button
                    key={r}
                    onClick={() => setRounds(r)}
                    className={`px-3 py-1 text-xs border transition-colors ${
                      rounds === r
                        ? "border-[#4fc3f7] text-[#4fc3f7] bg-[#0a0e17]"
                        : "border-[#2a3444] text-[#6b7280] hover:border-[#4fc3f7]"
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Start button */}
        {isHost ? (
          <button
            onClick={handleStart}
            disabled={starting}
            className="w-full py-3 bg-[#1a2233] border-2 border-[#66bb6a] text-[#66bb6a] font-pixel text-[11px] tracking-wider hover:bg-[#66bb6a] hover:text-[#0a0e17] disabled:opacity-50 transition-colors"
          >
            {starting ? "STARTING..." : "[ START GAME ]"}
          </button>
        ) : (
          <div className="text-center py-3">
            <span className="text-[#6b7280] font-pixel text-[9px]">
              WAITING FOR HOST TO START
              <span className="dots" />
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
