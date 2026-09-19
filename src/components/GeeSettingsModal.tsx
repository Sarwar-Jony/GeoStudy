"use client";

import { useState } from "react";
import { X, Key, CheckCircle2, AlertCircle, Loader2, Globe2, ExternalLink } from "lucide-react";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  currentStatus?: {
    isConfigured: boolean;
    isConnected: boolean;
    project?: string;
    email?: string;
  };
}

export default function GeeSettingsModal({ isOpen, onClose, onSuccess, currentStatus }: Props) {
  const [jsonKey, setJsonKey] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  async function handleConnect() {
    setError(null);
    setSuccessMsg(null);
    if (!jsonKey.trim()) {
      setError("Please paste your Google Earth Engine service account JSON key.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/gee/credentials", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jsonKey }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to authenticate with Google Earth Engine.");

      setSuccessMsg(`Successfully connected to GEE! (Account: ${data.email || "Active"})`);
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 1500);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="relative w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200"
        >
          <X size={18} />
        </button>

        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400">
            <Globe2 size={22} />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              Google Earth Engine (GEE) Setup
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Access real 10m Sentinel-2, 30m SRTM DEM, and Dynamic World datasets
            </p>
          </div>
        </div>

        {currentStatus?.isConnected && (
          <div className="mt-4 flex items-center gap-2 rounded-xl bg-emerald-50 p-3 text-xs font-medium text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
            <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
            <div>
              <strong>GEE Connected:</strong> {currentStatus.email} (Project: {currentStatus.project || "Default"})
            </div>
          </div>
        )}

        <div className="mt-4 space-y-3">
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
            Paste Service Account JSON Key:
          </label>
          <textarea
            rows={7}
            value={jsonKey}
            onChange={(e) => setJsonKey(e.target.value)}
            placeholder='{\n  "type": "service_account",\n  "project_id": "...",\n  "private_key_id": "...",\n  "private_key": "-----BEGIN PRIVATE KEY-----...",\n  "client_email": "..."\n}'
            className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 font-mono text-xs text-slate-800 outline-none focus:border-emerald-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200"
          />

          <div className="flex items-center justify-between text-[11px] text-slate-400">
            <span>Keys are verified locally and kept secure in your project.</span>
            <a
              href="https://earthengine.google.com"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-emerald-600 hover:underline dark:text-emerald-400"
            >
              Earth Engine Docs <ExternalLink size={11} />
            </a>
          </div>
        </div>

        {error && (
          <div className="mt-3 flex items-center gap-2 rounded-lg bg-rose-50 p-3 text-xs text-rose-700 dark:bg-rose-950/50 dark:text-rose-300">
            <AlertCircle size={14} className="shrink-0" />
            {error}
          </div>
        )}

        {successMsg && (
          <div className="mt-3 flex items-center gap-2 rounded-lg bg-emerald-50 p-3 text-xs text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300">
            <CheckCircle2 size={14} className="shrink-0" />
            {successMsg}
          </div>
        )}

        <div className="mt-5 flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            className="rounded-lg px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
          >
            Cancel
          </button>
          <button
            onClick={handleConnect}
            disabled={loading}
            className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white shadow transition hover:bg-emerald-700 disabled:opacity-60"
          >
            {loading ? <Loader2 size={14} className="animate-spin" /> : <Key size={14} />}
            {loading ? "Authenticating..." : "Connect Earth Engine"}
          </button>
        </div>
      </div>
    </div>
  );
}
