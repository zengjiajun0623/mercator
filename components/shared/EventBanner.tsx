"use client";

interface Props {
  event: string;
}

export default function EventBanner({ event }: Props) {
  return (
    <div className="mb-3 px-3 py-2 border border-[#ff7043] bg-[#1a1000] text-center">
      <span className="text-[#ff7043] text-xs">{event}</span>
    </div>
  );
}
