"use client";

const NATION_COLORS: Record<string, string> = {
  Aurelia: "#4fc3f7",
  Borealis: "#ab47bc",
  Crescentia: "#ffd54f",
  Delmara: "#66bb6a",
  Elythia: "#ff7043",
  Feronia: "#26c6da",
  Galdoria: "#ef5350",
  Hespera: "#bdbdbd",
};

interface Props {
  rivals: Array<{
    id: string;
    name: string;
    pops: number;
    buildingCount: number;
  }>;
}

export default function RivalNations({ rivals }: Props) {
  return (
    <div className="panel">
      <div className="panel-header">{">"} RIVAL NATIONS</div>
      <div className="space-y-1">
        {rivals.map((r) => (
          <div key={r.id} className="flex items-center justify-between text-xs">
            <span style={{ color: NATION_COLORS[r.name] || "#e0e0e0" }} className="font-bold">
              {r.name}
            </span>
            <span className="text-[#6b7280]">
              pop:{r.pops} bld:{r.buildingCount}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
