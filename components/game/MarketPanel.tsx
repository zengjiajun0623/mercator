"use client";

import type { MarketPrices } from "../../src/engine/types";
import { GOODS } from "../../src/engine/types";

const GOOD_COLORS: Record<string, string> = {
  food: "#66bb6a",
  textiles: "#42a5f5",
  iron: "#bdbdbd",
  machinery: "#ff7043",
  luxuries: "#ab47bc",
};

interface Props {
  prices: MarketPrices;
}

export default function MarketPanel({ prices }: Props) {
  return (
    <div className="panel">
      <div className="panel-header">{">"} MARKET PRICES</div>
      <div className="space-y-1">
        {GOODS.map((good) => (
          <div key={good} className="flex items-center justify-between text-xs">
            <span className="text-[#6b7280] w-20">{good}</span>
            <span style={{ color: GOOD_COLORS[good] }} className="font-bold">
              ${prices.prices[good].toFixed(1)}
            </span>
            <span className="text-[#6b7280] text-[10px] w-12 text-right">
              vol:{Math.round(prices.volume[good])}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
