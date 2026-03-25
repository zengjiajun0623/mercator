import express from "express";
import { createServer } from "http";
import { WebSocketServer, WebSocket } from "ws";
import path from "path";
import { fileURLToPath } from "url";
import os from "os";
import { runGame } from "./engine/game.js";
import { DEFAULT_CONFIG, GameConfig } from "./engine/types.js";
import { PersonalityAgent, Personality } from "./agent/personality-agent.js";
import { WebAgent } from "./agent/web-agent.js";
import { RoundSummary } from "./engine/game.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ── Parse args ──────────────────────────────────────────────────────────────
function parseArgs() {
  const args = process.argv.slice(2);
  let humans = 2;
  let rounds = 20;
  let port = 3000;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--humans") humans = parseInt(args[++i], 10);
    if (args[i] === "--rounds") rounds = parseInt(args[++i], 10);
    if (args[i] === "--port") port = parseInt(args[++i], 10);
  }

  return { humans, rounds, port };
}

const { humans: humanCount, rounds, port } = parseArgs();
const totalNations = 4;

// ── Setup agents ────────────────────────────────────────────────────────────
const PERSONALITIES: Personality[] = ["merchant", "warlord", "isolationist", "industrialist"];
const webAgents: WebAgent[] = [];
const allAgents: (WebAgent | PersonalityAgent)[] = [];
const agentLabels = new Map<string, string>();

for (let i = 0; i < totalNations; i++) {
  if (i < humanCount) {
    const wa = new WebAgent();
    webAgents.push(wa);
    allAgents.push(wa);
    agentLabels.set(`nation-${i}`, "Human");
  } else {
    const p = PERSONALITIES[(i - humanCount) % PERSONALITIES.length];
    allAgents.push(new PersonalityAgent(p));
    agentLabels.set(`nation-${i}`, p);
  }
}

// ── Express + WebSocket ─────────────────────────────────────────────────────
const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ server });

app.use(express.static(path.join(__dirname, "public")));

// Broadcast to all connected web agents
function broadcastAll(msg: object) {
  for (const wa of webAgents) {
    wa.send(msg);
  }
}

// Track connected players
let connectedCount = 0;
let gameStarted = false;

wss.on("connection", (ws) => {
  if (connectedCount >= humanCount) {
    ws.send(JSON.stringify({ type: "error", message: "Game is full" }));
    ws.close();
    return;
  }

  const playerIndex = connectedCount;
  const agent = webAgents[playerIndex];
  agent.setSocket(ws);
  connectedCount++;

  const nationNames = ["Aurelia", "Borealis", "Crescentia", "Delmara"];
  agent.playerName = nationNames[playerIndex];

  console.log(`Player ${connectedCount}/${humanCount} connected → ${nationNames[playerIndex]}`);

  // Tell this player their assignment
  ws.send(JSON.stringify({
    type: "joined",
    nationName: nationNames[playerIndex],
    playerIndex,
    playersNeeded: humanCount,
    playersJoined: connectedCount,
  }));

  // Tell all players the lobby state
  broadcastAll({
    type: "lobby",
    playersJoined: connectedCount,
    playersNeeded: humanCount,
  });

  ws.on("close", () => {
    console.log(`Player disconnected: ${nationNames[playerIndex]}`);
  });

  // Start game when all players connected
  if (connectedCount === humanCount && !gameStarted) {
    gameStarted = true;
    console.log("All players connected — starting game!\n");
    startGame();
  }
});

// ── Game ─────────────────────────────────────────────────────────────────────
async function startGame() {
  broadcastAll({ type: "starting", rounds });

  const config: GameConfig = {
    ...DEFAULT_CONFIG,
    totalRounds: rounds,
    nationCount: totalNations,
  };

  const result = await runGame(
    allAgents,
    config,
    (summary: RoundSummary) => {
      // Broadcast round results to all players
      broadcastAll({ type: "results", summary });
      console.log(`Round ${summary.round}/${summary.totalRounds} — Trades: ${summary.tradeCount}${summary.event ? ` — ${summary.event}` : ""}`);
    },
    agentLabels
  );

  // Broadcast final scores
  broadcastAll({ type: "gameover", scores: result.scores });
  console.log("\nGame over! Final scores:");
  for (const s of result.scores) {
    console.log(`  ${s.name} (${s.label}): $${Math.round(s.totalScore)}`);
  }
}

// ── Start server ─────────────────────────────────────────────────────────────
function getLocalIP(): string {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name] || []) {
      if (iface.family === "IPv4" && !iface.internal) {
        return iface.address;
      }
    }
  }
  return "localhost";
}

server.listen(port, () => {
  const ip = getLocalIP();
  console.log(`\n🌍 MERCATOR — Online Multiplayer`);
  console.log(`   ${totalNations} nations, ${rounds} rounds, waiting for ${humanCount} players\n`);
  console.log(`   Local:   http://localhost:${port}`);
  console.log(`   Network: http://${ip}:${port}`);
  console.log(`\n   Share the network URL with your friend!\n`);
});
