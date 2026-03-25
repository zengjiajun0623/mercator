"use client";

import { use } from "react";
import { useGamePolling } from "../../../lib/hooks/useGamePolling";
import RoomLobby from "../../../components/lobby/RoomLobby";
import GameBoard from "../../../components/game/GameBoard";
import Scoreboard from "../../../components/shared/Scoreboard";

interface Props {
  params: Promise<{ roomId: string }>;
}

export default function RoomPage({ params }: Props) {
  const { roomId } = use(params);
  const state = useGamePolling(roomId);

  // Loading
  if (state.loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <div className="font-pixel text-[10px] text-[#4fc3f7]">
          CONNECTING
          <span className="dots" />
        </div>
      </div>
    );
  }

  // Error
  if (state.error || !state.room) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <div className="font-pixel text-[10px] text-[#ef5350] mb-4">CONNECTION ERROR</div>
        <p className="text-[#6b7280] text-sm">{state.error || "Room not found"}</p>
        <a
          href="/"
          className="mt-4 px-4 py-2 border border-[#4fc3f7] text-[#4fc3f7] font-pixel text-[8px] hover:bg-[#4fc3f7] hover:text-[#0a0e17] transition-colors"
        >
          [ BACK ]
        </a>
      </div>
    );
  }

  // Lobby
  if (state.room.status === "lobby") {
    return <RoomLobby room={state.room} roomId={roomId} />;
  }

  // Game over
  if (state.room.status === "finished" && state.result) {
    return <Scoreboard result={state.result} />;
  }

  // Playing
  if (state.observation) {
    return (
      <GameBoard
        observation={state.observation}
        roomId={roomId}
        pendingPlayers={state.pendingPlayers}
        submitted={state.submitted}
        lastRoundSummary={state.lastRoundSummary}
        lastEvent={state.lastEvent}
      />
    );
  }

  // Fallback
  return (
    <div className="flex flex-col items-center justify-center min-h-screen">
      <div className="font-pixel text-[10px] text-[#6b7280]">
        LOADING GAME STATE
        <span className="dots" />
      </div>
    </div>
  );
}
