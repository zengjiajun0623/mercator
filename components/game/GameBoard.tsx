"use client";

import { useState } from "react";
import type { Observation } from "../../src/engine/types";
import type { RoundSummary } from "../../src/engine/game";
import type { Focus, Posture } from "../../lib/strategy";
import { translateStrategy, FOCUS_OPTIONS, POSTURE_OPTIONS, describeAction } from "../../lib/strategy";
import { getPlayerId } from "../../lib/hooks/useGamePolling";
import NationDashboard from "./NationDashboard";
import BuildingSlots from "./BuildingSlots";
import StockpileBar from "./StockpileBar";
import MarketPanel from "./MarketPanel";
import RivalNations from "../shared/RivalNations";
import EventBanner from "../shared/EventBanner";

interface Props {
  observation: Observation;
  roomId: string;
  pendingPlayers: string[];
  submitted: boolean;
  lastRoundSummary: RoundSummary | null;
  lastEvent: string | null;
}

export default function GameBoard({
  observation,
  roomId,
  pendingPlayers,
  submitted,
  lastRoundSummary: _lastRoundSummary,
  lastEvent,
}: Props) {
  const [focus, setFocus] = useState<Focus | null>(null);
  const [posture, setPosture] = useState<Posture | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [actionLog, setActionLog] = useState<string[]>([]);

  const { nation, round, totalRounds } = observation;

  async function handleSubmit() {
    if (!focus || !posture) return;
    setSubmitting(true);

    const actions = translateStrategy(focus, posture, observation);
    setActionLog(actions.map(describeAction));

    try {
      const res = await fetch(`/api/room/${roomId}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playerId: getPlayerId(), actions }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to submit");
      }
    } catch {
      setSubmitting(false);
    }
  }

  // Reset selections on new round
  const roundRef = useState(round)[0];
  if (roundRef !== round && !submitted) {
    setFocus(null);
    setPosture(null);
    setSubmitting(false);
    setActionLog([]);
  }

  return (
    <div className="max-w-4xl mx-auto px-3 py-4">
      {/* Round header */}
      <div className="panel mb-3 text-center">
        <span className="font-pixel text-[10px] text-[#4fc3f7]">
          ROUND {round}/{totalRounds}
        </span>
        <span className="text-[#6b7280] text-xs ml-4">
          {nation.name}
        </span>
      </div>

      {/* Event banner */}
      {lastEvent && <EventBanner event={lastEvent} />}

      {/* Main grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* Left column — nation info */}
        <div className="space-y-3">
          <NationDashboard nation={nation} />
          <BuildingSlots buildings={nation.buildings} totalSlots={nation.totalSlots} />
          <StockpileBar stockpile={nation.stockpile} pops={nation.pops.count} />
        </div>

        {/* Right column — actions + market */}
        <div className="space-y-3">
          <MarketPanel prices={observation.marketPrices} />
          <RivalNations rivals={observation.otherNations} />

          {/* Strategy selection */}
          {!submitted && !submitting ? (
            <div className="space-y-3">
              {/* Focus */}
              <div className="panel">
                <div className="panel-header">{">"} NATION FOCUS</div>
                <div className="grid grid-cols-2 gap-2">
                  {FOCUS_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => setFocus(opt.value)}
                      className={`p-2 border text-left text-xs transition-colors ${
                        focus === opt.value
                          ? "border-[#4fc3f7] bg-[#0a0e17] text-[#4fc3f7]"
                          : "border-[#2a3444] text-[#6b7280] hover:border-[#4fc3f7]"
                      }`}
                    >
                      <span className="text-sm">{opt.icon}</span>{" "}
                      <span className="font-pixel text-[7px]">{opt.label}</span>
                      <div className="text-[10px] mt-1 text-[#6b7280]">{opt.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Posture */}
              <div className="panel">
                <div className="panel-header">{">"} TRADE POSTURE</div>
                <div className="grid grid-cols-3 gap-2">
                  {POSTURE_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => setPosture(opt.value)}
                      className={`p-2 border text-center text-xs transition-colors ${
                        posture === opt.value
                          ? "border-[#ffd54f] bg-[#0a0e17] text-[#ffd54f]"
                          : "border-[#2a3444] text-[#6b7280] hover:border-[#ffd54f]"
                      }`}
                    >
                      <span className="text-sm">{opt.icon}</span>
                      <div className="font-pixel text-[6px] mt-1">{opt.label}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Submit */}
              <button
                onClick={handleSubmit}
                disabled={!focus || !posture}
                className="w-full py-3 border-2 font-pixel text-[10px] tracking-wider transition-colors disabled:opacity-30 disabled:cursor-not-allowed border-[#66bb6a] text-[#66bb6a] hover:bg-[#66bb6a] hover:text-[#0a0e17]"
              >
                [ SUBMIT ORDERS ]
              </button>
            </div>
          ) : (
            /* Waiting state */
            <div className="panel text-center">
              {actionLog.length > 0 && (
                <div className="mb-3 text-left">
                  <div className="panel-header">{">"} ACTIONS SUBMITTED</div>
                  {actionLog.map((a, i) => (
                    <div key={i} className="text-xs text-[#66bb6a] py-0.5">
                      {a}
                    </div>
                  ))}
                </div>
              )}
              <p className="font-pixel text-[9px] text-[#6b7280]">
                WAITING FOR {pendingPlayers.length} PLAYER
                {pendingPlayers.length !== 1 ? "S" : ""}
                <span className="dots" />
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
