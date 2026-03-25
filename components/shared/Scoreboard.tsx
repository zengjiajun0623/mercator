"use client";

import type { GameResult } from "../../src/engine/game";

const MEDALS = ["🥇", "🥈", "🥉", "  "];

const NATION_COLORS: Record<string, string> = {
  Aurelia: "#4fc3f7",
  Borealis: "#ab47bc",
  Crescentia: "#ffd54f",
  Delmara: "#66bb6a",
};

interface Props {
  result: GameResult;
}

export default function Scoreboard({ result }: Props) {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-4">
      <div className="w-full max-w-2xl">
        {/* Title */}
        <div className="text-center mb-8">
          <p className="font-pixel text-[12px] text-[#ffd54f] mb-2">GAME OVER</p>
          <p className="text-[#6b7280] text-xs">{result.rounds} rounds completed</p>
        </div>

        {/* Scoreboard */}
        <div className="panel">
          <div className="panel-header">{">"} FINAL SCOREBOARD</div>

          {/* Header row */}
          <div className="flex items-center gap-2 px-2 py-1 text-[#6b7280] font-pixel text-[6px] border-b border-[#2a3444] mb-1">
            <span className="w-6">#</span>
            <span className="w-28">NATION</span>
            <span className="w-16 text-right">TREASURY</span>
            <span className="w-16 text-right">ASSETS</span>
            <span className="w-16 text-right">POP</span>
            <span className="w-20 text-right">TOTAL</span>
          </div>

          {/* Score rows */}
          {result.scores.map((s, i) => (
            <div
              key={s.nationId}
              className={`flex items-center gap-2 px-2 py-2 ${i === 0 ? "bg-[#1a1800]" : ""}`}
            >
              <span className="w-6 text-sm">{MEDALS[i] || `${i + 1}`}</span>
              <span
                style={{ color: NATION_COLORS[s.name] || "#e0e0e0" }}
                className="w-28 font-bold text-sm"
              >
                {s.name}
                <span className="text-[10px] text-[#6b7280] ml-1">({s.label})</span>
              </span>
              <span className="w-16 text-right text-xs text-[#ffd54f]">
                ${Math.round(s.treasury)}
              </span>
              <span className="w-16 text-right text-xs text-[#6b7280]">
                ${Math.round(s.assetValue)}
              </span>
              <span className="w-16 text-right text-xs text-[#4fc3f7]">
                ${Math.round(s.popScore)}
              </span>
              <span className="w-20 text-right font-bold text-sm text-[#ffd54f]">
                ${Math.round(s.totalScore)}
              </span>
            </div>
          ))}
        </div>

        {/* Winner announcement */}
        {result.scores[0] && (
          <div className="text-center mt-6 mb-4">
            <p className="font-pixel text-[10px] text-[#ffd54f]">
              {result.scores[0].name.toUpperCase()} WINS!
            </p>
            <p className="text-[#6b7280] text-xs mt-1">
              Total score: ${Math.round(result.scores[0].totalScore)}
            </p>
          </div>
        )}

        {/* Play again */}
        <div className="text-center mt-6">
          <a
            href="/"
            className="inline-block px-6 py-3 border border-[#4fc3f7] text-[#4fc3f7] font-pixel text-[9px] tracking-wider hover:bg-[#4fc3f7] hover:text-[#0a0e17] transition-colors"
          >
            [ PLAY AGAIN ]
          </a>
        </div>
      </div>
    </div>
  );
}
