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
      <div className="text-6xl mb-4">🌍</div>
      <h1 className="text-4xl font-bold mb-2">Mercator</h1>
      <p className="text-gray-500 text-lg mb-10">
        Economic Strategy Arena — up to 4 players
      </p>

      {/* Player name */}
      <input
        type="text"
        placeholder="Your name"
        value={playerName}
        onChange={(e) => setPlayerName(e.target.value)}
        maxLength={20}
        className="w-72 px-4 py-3 bg-[#1a2233] rounded-xl border border-[#2a3444] text-center text-lg focus:outline-none focus:border-sky-400 mb-6"
      />

      {/* Create Room */}
      <button
        onClick={handleCreate}
        disabled={creating}
        className="w-72 py-3 bg-sky-600 hover:bg-sky-500 disabled:opacity-50 rounded-xl font-semibold text-lg transition mb-4"
      >
        {creating ? "Creating..." : "Create Room"}
      </button>

      {/* Divider */}
      <div className="flex items-center gap-3 w-72 my-2">
        <div className="flex-1 h-px bg-[#2a3444]" />
        <span className="text-gray-500 text-sm">or join</span>
        <div className="flex-1 h-px bg-[#2a3444]" />
      </div>

      {/* Join Room */}
      <div className="flex gap-2 mt-2">
        <input
          type="text"
          placeholder="Room code"
          value={joinCode}
          onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
          maxLength={6}
          className="w-36 px-4 py-3 bg-[#1a2233] rounded-xl border border-[#2a3444] text-center text-lg tracking-widest uppercase focus:outline-none focus:border-sky-400"
        />
        <button
          onClick={handleJoin}
          disabled={joining}
          className="px-6 py-3 bg-[#1a2233] hover:bg-[#243044] border border-[#2a3444] hover:border-sky-400 disabled:opacity-50 rounded-xl font-semibold transition"
        >
          {joining ? "..." : "Join"}
        </button>
      </div>

      {error && (
        <p className="mt-4 text-red-400 text-sm">{error}</p>
      )}
    </div>
  );
}
