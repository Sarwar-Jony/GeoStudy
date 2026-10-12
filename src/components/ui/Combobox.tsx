"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, Search, X, Check, Loader2 } from "lucide-react";

export interface ComboboxOption {
  value: string;
  label: string;
  sublabel?: string;
}

interface Props {
  options: ComboboxOption[];
  value: string | null;
  onChange: (value: string | null) => void;
  placeholder?: string;
  disabled?: boolean;
  loading?: boolean;
  emptyLabel?: string;
}

export default function Combobox({ options, value, onChange, placeholder = "Select...", disabled, loading, emptyLabel = "No results found" }: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);

  const selected = options.find((o) => o.value === value) || null;

  useEffect(() => {
    function onPointerDown(e: PointerEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    // pointerdown reliably captures mouse clicks, mobile touch taps, and stylus pens
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, []);

  const filtered = useMemo(() => {
    if (!query.trim()) return options;
    const q = query.toLowerCase();
    return options.filter((o) => o.label.toLowerCase().includes(q));
  }, [options, query]);

  const handleSelect = (val: string) => {
    onChange(val);
    setOpen(false);
    setQuery("");
  };

  return (
    <div ref={rootRef} className={`relative ${open ? "z-40" : "z-10"}`}>
      <button
        type="button"
        disabled={disabled || loading}
        onClick={() => setOpen((v) => !v)}
        className={`flex min-h-[44px] w-full items-center justify-between gap-2 rounded-xl border px-3 py-2.5 text-left text-sm transition touch-manipulation ${
          disabled
            ? "cursor-not-allowed border-slate-200 bg-slate-50 text-slate-400 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-600"
            : loading
            ? "cursor-wait border-emerald-300/70 bg-emerald-50/40 text-emerald-800 dark:border-emerald-800/70 dark:bg-emerald-950/20 dark:text-emerald-300"
            : "border-slate-300 bg-white text-slate-800 hover:border-emerald-400 active:scale-[0.99] dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
        }`}
      >
        <span className="truncate flex items-center gap-1.5 font-medium">
          {loading && <Loader2 size={14} className="animate-spin text-emerald-600 dark:text-emerald-400 shrink-0" />}
          {loading ? "Loading areas..." : selected ? selected.label : placeholder}
        </span>
        <span className="flex items-center gap-1 shrink-0">
          {selected && !disabled && (
            <span
              role="button"
              tabIndex={0}
              className="p-1 text-slate-400 hover:text-red-500 active:text-red-600"
              onClick={(e) => {
                e.stopPropagation();
                onChange(null);
              }}
            >
              <X size={14} />
            </span>
          )}
          <ChevronDown size={15} className={`text-slate-400 transition-transform ${open ? "rotate-180" : ""}`} />
        </span>
      </button>

      {open && !disabled && (
        <div className="absolute z-50 mt-1.5 max-h-80 w-full overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-800">
          <div className="flex items-center gap-2 border-b border-slate-100 bg-slate-50/60 px-3 py-2.5 dark:border-slate-700 dark:bg-slate-800/80">
            <Search size={15} className="text-slate-400 shrink-0" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search or filter..."
              className="w-full bg-transparent text-base sm:text-sm outline-none dark:text-white"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery("")}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X size={14} />
              </button>
            )}
          </div>
          <div className="max-h-64 overflow-y-auto py-1">
            {loading ? (
              <div className="flex items-center justify-center gap-2 py-6 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                <Loader2 size={16} className="animate-spin" />
                <span>Loading available areas...</span>
              </div>
            ) : filtered.length === 0 ? (
              <p className="px-3 py-4 text-center text-xs text-slate-400">{emptyLabel}</p>
            ) : (
              filtered.map((o) => (
                <button
                  key={o.value}
                  type="button"
                  onPointerDown={(e) => {
                    // Critical for mobile: prevent input blur cancelling the touch event
                    e.preventDefault();
                    handleSelect(o.value);
                  }}
                  onClick={() => handleSelect(o.value)}
                  className="flex min-h-[44px] w-full items-center justify-between gap-2 px-3 py-2.5 text-left text-sm transition hover:bg-emerald-50 active:bg-emerald-100 dark:hover:bg-emerald-500/10 dark:active:bg-emerald-500/20 touch-manipulation"
                >
                  <span className="truncate">
                    <span className="font-medium text-slate-800 dark:text-slate-100">{o.label}</span>
                    {o.sublabel && <span className="ml-1.5 text-xs text-slate-400">({o.sublabel})</span>}
                  </span>
                  {o.value === value && <Check size={16} className="text-emerald-600 shrink-0" />}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
