"use client";

import type { Building } from "../../src/engine/types";

const BUILDING_ICONS: Record<string, string> = {
  farm: "🌾",
  mill: "🧵",
  mine: "⛏️",
  factory: "🏭",
  workshop: "💎",
};

interface Props {
  buildings: Building[];
  totalSlots: number;
}

export default function BuildingSlots({ buildings, totalSlots }: Props) {
  const slots: (Building | null)[] = Array.from({ length: totalSlots }, (_, i) => {
    return buildings.find((b) => b.slotIndex === i) ?? null;
  });

  return (
    <div className="panel">
      <div className="panel-header">
        {">"} BUILDINGS ({buildings.length}/{totalSlots})
      </div>
      <div className="grid grid-cols-7 gap-1">
        {slots.map((slot, i) => (
          <div
            key={i}
            className={`aspect-square border flex flex-col items-center justify-center text-xs ${
              slot
                ? slot.constructionTurnsLeft > 0
                  ? "border-[#ff7043] bg-[#0a0e17]"
                  : "border-[#2a3444] bg-[#0a0e17]"
                : "border-dashed border-[#2a3444]"
            }`}
            title={
              slot
                ? `${slot.type} L${slot.level}${slot.constructionTurnsLeft > 0 ? ` (${slot.constructionTurnsLeft}t)` : ""}`
                : "Empty"
            }
          >
            {slot ? (
              <>
                <span className="text-sm">{BUILDING_ICONS[slot.type] || "?"}</span>
                {slot.level > 1 && (
                  <span className="font-pixel text-[5px] text-[#ffd54f]">L{slot.level}</span>
                )}
                {slot.constructionTurnsLeft > 0 && (
                  <span className="font-pixel text-[5px] text-[#ff7043]">
                    {slot.constructionTurnsLeft}t
                  </span>
                )}
              </>
            ) : (
              <span className="text-[#2a3444]">+</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
