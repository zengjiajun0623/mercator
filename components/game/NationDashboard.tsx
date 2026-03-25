"use client";

import type { Nation } from "../../src/engine/types";

interface Props {
  nation: Nation;
}

export default function NationDashboard({ nation }: Props) {
  const satPct = Math.round(nation.pops.satisfaction * 100);
  const satColor =
    satPct >= 70 ? "#66bb6a" : satPct >= 40 ? "#ffd54f" : "#ef5350";

  return (
    <div className="panel">
      <div className="panel-header">{">"} {nation.name.toUpperCase()}</div>
      <div className="grid grid-cols-3 gap-3 text-center">
        <div>
          <div className="text-[#ffd54f] text-lg font-bold">
            ${Math.round(nation.treasury)}
          </div>
          <div className="font-pixel text-[6px] text-[#6b7280]">TREASURY</div>
        </div>
        <div>
          <div className="text-[#4fc3f7] text-lg font-bold">{nation.pops.count}</div>
          <div className="font-pixel text-[6px] text-[#6b7280]">POP</div>
        </div>
        <div>
          <div style={{ color: satColor }} className="text-lg font-bold">
            {satPct}%
          </div>
          <div className="font-pixel text-[6px] text-[#6b7280]">HAPPY</div>
        </div>
      </div>
      {/* Satisfaction bar */}
      <div className="mt-2 bg-[#0a0e17] h-2 w-full">
        <div
          className="h-full transition-all duration-500"
          style={{
            width: `${satPct}%`,
            backgroundColor: satColor,
          }}
        />
      </div>
      <div className="text-right mt-1">
        <span className="text-[10px] text-[#6b7280]">
          Welfare: {Math.round(nation.welfareSpending * 100)}%
        </span>
      </div>
    </div>
  );
}
