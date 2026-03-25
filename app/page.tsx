"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();
  const [joinCode, setJoinCode] = useState("");
  const [playerName, setPlayerName] = useState("");
  const [creating, setCreating] = useState(false);
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState("");

  function getPlayerId(): string {
    if (typeof window === "undefined") return "";
    let id = localStorage.getItem("mercator-player-id");
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem("mercator-player-id", id);
    }
    return id;
  }

  async function handleCreate() {
    if (!playerName.trim()) {
      setError("Enter your name first");
      return;
    }
    setCreating(true);
    setError("");
    try {
      const res = await fetch("/api/room/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          playerId: getPlayerId(),
          playerName: playerName.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create room");
      router.push(`/room/${data.roomId}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to create room");
      setCreating(false);
    }
  }

  async function handleJoin() {
    if (!playerName.trim()) {
      setError("Enter your name first");
      return;
    }
    if (!joinCode.trim()) {
      setError("Enter a room code");
      return;
    }
    setJoining(true);
    setError("");
    try {
      const res = await fetch(`/api/room/${joinCode.trim().toUpperCase()}/join`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          playerId: getPlayerId(),
          playerName: playerName.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to join room");
      router.push(`/room/${joinCode.trim().toUpperCase()}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to join room");
      setJoining(false);
    }
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-4">
      {/* ASCII art title */}
      <pre className="text-[#4fc3f7] text-[8px] sm:text-[10px] leading-tight mb-2 select-none">
        {`
 __  __ _____ ____   ____    _  _____ ___  ____
|  \\/  | ____|  _ \\ / ___|  / \\|_   _/ _ \\|  _ \\
| |\\/| |  _| | |_) | |     / _ \\ | || | | | |_) |
| |  | | |___|  _ <| |___ / ___ \\| || |_| |  _ <
|_|  |_|_____|_| \\_\\\\____/_/   \\_\\_| \\___/|_| \\_\\
        `}
      </pre>
      <p className="font-pixel text-[8px] text-[#6b7280] mb-10 tracking-wider">
        ECONOMIC STRATEGY ARENA
      </p>

      {/* Terminal box */}
      <div className="panel w-80 max-w-full mb-4">
        <div className="panel-header">{">"} IDENTIFY YOURSELF</div>
        <input
          type="text"
          placeholder="enter_name"
          value={playerName}
          onChange={(e) => setPlayerName(e.target.value)}
          maxLength={20}
          className="w-full px-3 py-2 bg-[#0a0e17] border border-[#2a3444] text-[#4fc3f7] text-center text-sm focus:outline-none focus:border-[#4fc3f7] placeholder-[#2a3444]"
        />
      </div>

      {/* Create Room */}
      <button
        onClick={handleCreate}
        disabled={creating}
        className="w-80 max-w-full py-3 bg-[#1a2233] border border-[#4fc3f7] text-[#4fc3f7] font-pixel text-[10px] tracking-wider hover:bg-[#4fc3f7] hover:text-[#0a0e17] disabled:opacity-50 transition-colors mb-4"
      >
        {creating ? "CREATING..." : "[ CREATE ROOM ]"}
      </button>

      {/* Divider */}
      <div className="flex items-center gap-3 w-80 max-w-full my-2">
        <div className="flex-1 border-t border-dashed border-[#2a3444]" />
        <span className="text-[#6b7280] font-pixel text-[7px]">OR</span>
        <div className="flex-1 border-t border-dashed border-[#2a3444]" />
      </div>

      {/* Join Room */}
      <div className="flex gap-2 mt-2 w-80 max-w-full">
        <input
          type="text"
          placeholder="CODE"
          value={joinCode}
          onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
          maxLength={6}
          className="flex-1 px-3 py-2 bg-[#0a0e17] border border-[#2a3444] text-[#ffd54f] text-center text-sm tracking-[0.3em] uppercase focus:outline-none focus:border-[#ffd54f] placeholder-[#2a3444]"
        />
        <button
          onClick={handleJoin}
          disabled={joining}
          className="px-4 py-2 bg-[#1a2233] border border-[#2a3444] text-[#e0e0e0] font-pixel text-[9px] hover:border-[#ffd54f] hover:text-[#ffd54f] disabled:opacity-50 transition-colors"
        >
          {joining ? "..." : "JOIN"}
        </button>
      </div>

      {error && <p className="mt-4 text-[#ef5350] font-pixel text-[8px]">! {error}</p>}

      {/* Footer */}
      <p className="mt-16 text-[#2a3444] font-pixel text-[6px]">UP TO 4 PLAYERS // PVP + PVE</p>
    </div>
  );
}
