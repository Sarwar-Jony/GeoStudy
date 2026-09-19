"use client";

import { useState } from "react";
import { GitCompareArrows } from "lucide-react";

interface LayerLike {
  layerKey: string;
  layerLabel: string;
  thumbnail: string;
}

export default function SwipeCompare({ left, right }: { left: LayerLike; right: LayerLike }) {
  const [pos, setPos] = useState(50);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
      <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-800 dark:text-white">
        <GitCompareArrows size={16} className="text-emerald-600 dark:text-emerald-400" />
        Swipe Compare: {left.layerLabel} vs {right.layerLabel}
      </div>
      <div className="relative aspect-square w-full max-w-lg select-none overflow-hidden rounded-xl border border-slate-200 bg-slate-100 dark:border-slate-700 dark:bg-slate-800 sm:aspect-video">
        <img src={right.thumbnail} alt={right.layerLabel} className="absolute inset-0 h-full w-full object-cover" draggable={false} />
        <div className="absolute inset-0 overflow-hidden" style={{ width: `${pos}%` }}>
          <img
            src={left.thumbnail}
            alt={left.layerLabel}
            className="h-full object-cover"
            style={{ width: `${10000 / pos}%`, maxWidth: "none" }}
            draggable={false}
          />
        </div>
        <div className="pointer-events-none absolute inset-y-0 w-0.5 bg-white shadow-lg" style={{ left: `${pos}%` }} />
        <div
          className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white px-2 py-1 text-[10px] font-bold text-slate-700 shadow"
          style={{ left: `${pos}%` }}
        >
          ↔
        </div>
        <span className="absolute left-2 top-2 rounded bg-black/60 px-2 py-0.5 text-[10px] font-medium text-white">{left.layerLabel}</span>
        <span className="absolute right-2 top-2 rounded bg-black/60 px-2 py-0.5 text-[10px] font-medium text-white">{right.layerLabel}</span>
      </div>
      <input
        type="range"
        min={1}
        max={99}
        value={pos}
        onChange={(e) => setPos(Number(e.target.value))}
        className="mt-3 w-full max-w-lg accent-emerald-600"
      />
    </div>
  );
}
