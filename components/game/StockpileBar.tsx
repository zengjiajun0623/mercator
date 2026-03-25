"use client";

import type { Stockpile } from "../../src/engine/types";
import { GOODS } from "../../src/engine/types";

const GOOD_COLORS: Record<string, string> = {
  food: "#66bb6a",
  textiles: "#42a5f5",
  iron: "#bdbdbd",
  machinery: "#ff7043",
  luxuries: "#ab47bc",
};

const GOOD_ICONS: Record<string, string> = {
  food: "🌾",
  textiles: "🧵",
  iron: "⛏️",
  machinery: "⚙️",
  luxuries: "💎",
};

interface Props {
  stockpile: Stockpile;
  pops: number;
}

export default function StockpileBar({ stockpile, pops }: Props) {
  const maxQty = Math.max(1, ...GOODS.map((g) => stockpile[g]));
  const foodNeeded = pops * 0.8;
  const textilesNeeded = pops * 0.3;

  return (
    <div className="panel">
      <div className="panel-header">{">"} STOCKPILE</div>
      <div className="space-y-1.5">
        {GOODS.map((good) => {
          const qty = Math.round(stockpile[good] * 10) / 10;
          const pct = (qty / maxQty) * 100;
          const needed = good === "food" ? foodNeeded : good === "textiles" ? textilesNeeded : 0;
          const isShort = needed > 0 && qty < needed;

          return (
            <div key={good} className="flex items-center gap-2">
              <span className="text-xs w-4">{GOOD_ICONS[good]}</span>
              <span className="font-pixel text-[6px] w-16 text-[#6b7280]">
                {good.toUpperCase()}
              </span>
              <div className="flex-1 bg-[#0a0e17] h-3 relative">
                <div
                  className="h-full pixel-bar transition-all duration-300"
                  style={{
                    width: `${Math.min(100, pct)}%`,
                    backgroundColor: GOOD_COLORS[good],
                  }}
                />
                {isShort && (
                  <div
                    className="absolute top-0 h-full border-r-2 border-[#ef5350]"
                    style={{ left: `${(needed / maxQty) * 100}%` }}
                  />
                )}
              </div>
              <span
                className={`text-xs w-10 text-right ${isShort ? "text-[#ef5350]" : "text-[#6b7280]"}`}
              >
                {Math.round(qty)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
