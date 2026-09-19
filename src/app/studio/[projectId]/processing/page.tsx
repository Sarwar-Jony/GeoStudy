"use client";

import { use, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { 
  Loader2, 
  CheckCircle2, 
  AlertCircle, 
  Layers, 
  MapPin, 
  Sparkles, 
  ArrowRight,
  RefreshCw,
  Clock
} from "lucide-react";

interface Job {
  id: string;
  projectId: string;
  status: "queued" | "running" | "completed" | "failed";
  progress: number;
  message: string;
  totalLayers: number;
  completedLayers: number;
  startedAt?: string | null;
  finishedAt?: string | null;
  error?: string | null;
}

interface ProjectData {
  project: {
    id: string;
    name: string;
    boundaryName: string;
    pathLabels: string[];
    areaKm2: number;
    resolution: number;
    selectedLayers: string[];
  };
  job: Job | null;
  catalog: Record<string, { label: string; category: string; description: string; unit?: string }>;
}

export default function ProcessingPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = use(params);
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryJobId = searchParams.get("jobId");

  const [liveJob, setLiveJob] = useState<Job | null>(null);
  const [streamError, setStreamError] = useState<string | null>(null);

  // Fetch project details and initial job
  const { data, refetch: refetchProject } = useQuery<ProjectData>({
    queryKey: ["project", projectId],
    queryFn: async () => {
      const res = await fetch(`/api/projects/${projectId}`);
      if (!res.ok) throw new Error("Failed to load project details");
      return res.json();
    },
  });

  const activeJobId = queryJobId || liveJob?.id || data?.job?.id;

  // Real-time EventSource connection with fallback polling
  useEffect(() => {
    if (!activeJobId) return;

    let es: EventSource | null = null;
    let pollInterval: NodeJS.Timeout | null = null;

    try {
      es = new EventSource(`/api/jobs/${activeJobId}/stream`);

      es.addEventListener("progress", (e) => {
        try {
          const payload = JSON.parse(e.data);
          if (payload.job) {
            setLiveJob(payload.job);
          }
        } catch {}
      });

      es.addEventListener("done", (e) => {
        try {
          const payload = JSON.parse(e.data);
          if (payload.job) {
            setLiveJob(payload.job);
            if (payload.job.status === "completed") {
              setTimeout(() => {
                router.push(`/studio/${projectId}`);
              }, 1200);
            }
          }
        } catch {}
      });

      es.onerror = () => {
        // Switch to lightweight polling fallback if SSE fails
        es?.close();
        pollInterval = setInterval(async () => {
          try {
            const res = await fetch(`/api/jobs/${activeJobId}`);
            if (res.ok) {
              const j = await res.json();
              if (j.job) {
                setLiveJob(j.job);
                if (j.job.status === "completed") {
                  clearInterval(pollInterval!);
                  setTimeout(() => router.push(`/studio/${projectId}`), 1200);
                } else if (j.job.status === "failed") {
                  clearInterval(pollInterval!);
                }
              }
            }
          } catch {}
        }, 1000);
      };
    } catch {
      // Fallback polling
      pollInterval = setInterval(async () => {
        try {
          const res = await fetch(`/api/jobs/${activeJobId}`);
          if (res.ok) {
            const j = await res.json();
            if (j.job) setLiveJob(j.job);
          }
        } catch {}
      }, 1000);
    }

    return () => {
      if (es) es.close();
      if (pollInterval) clearInterval(pollInterval);
    };
  }, [activeJobId, projectId, router]);

  const currentJob = liveJob || data?.job;
  const progress = currentJob?.progress ?? 5;
  const status = currentJob?.status ?? "running";
  const selectedLayers = data?.project.selectedLayers ?? [];
  const catalog = data?.catalog ?? {};

  // Auto-redirect if already completed
  useEffect(() => {
    if (status === "completed") {
      const timer = setTimeout(() => {
        router.push(`/studio/${projectId}`);
      }, 1200);
      return () => clearTimeout(timer);
    }
  }, [status, projectId, router]);

  return (
    <main className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
      {/* Header */}
      <div className="text-center">
        <div className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
          <Sparkles size={13} className="animate-spin text-emerald-500" />
          Step 3 of 4: Real-Time Layer Generation
        </div>
        <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl dark:text-white">
          {status === "completed" ? "Generation Complete!" : "Synthesizing Raster Layers"}
        </h1>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
          Computing high-precision DEM, Terrain Derivatives, and Spectral Indices aligned with your Study Area.
        </p>
      </div>

      {/* Target Study Area card */}
      {data?.project && (
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white/70 p-4 shadow-sm backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/70">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400">
              <MapPin size={20} />
            </div>
            <div>
              <div className="font-semibold text-slate-900 dark:text-white">
                {data.project.boundaryName || data.project.name}
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400">
                {Array.isArray(data.project.pathLabels) && data.project.pathLabels.length > 0
                  ? data.project.pathLabels.join(" › ")
                  : "Study Area Polygon"}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-4 text-xs font-medium text-slate-600 dark:text-slate-300">
            <span className="rounded-md bg-slate-100 px-2.5 py-1 dark:bg-slate-800">
              Area: <strong className="text-slate-900 dark:text-white">{Number(data.project.areaKm2).toFixed(1)} km²</strong>
            </span>
            <span className="rounded-md bg-slate-100 px-2.5 py-1 dark:bg-slate-800">
              Resolution: <strong className="text-slate-900 dark:text-white">{data.project.resolution}m</strong>
            </span>
          </div>
        </div>
      )}

      {/* Main Progress Display */}
      <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-xl dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {status === "completed" ? (
              <CheckCircle2 className="h-6 w-6 text-emerald-500" />
            ) : status === "failed" ? (
              <AlertCircle className="h-6 w-6 text-rose-500" />
            ) : (
              <Loader2 className="h-6 w-6 animate-spin text-emerald-500" />
            )}
            <span className="text-base font-semibold text-slate-900 dark:text-white">
              {currentJob?.message || "Processing raster layers..."}
            </span>
          </div>
          <div className="text-2xl font-black tracking-tight text-emerald-600 dark:text-emerald-400">
            {progress}%
          </div>
        </div>

        {/* Dynamic Progress Bar */}
        <div className="mt-4 h-3 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
          <div
            className="h-full rounded-full bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-500 transition-all duration-500 ease-out"
            style={{ width: `${Math.max(5, progress)}%` }}
          />
        </div>

        {status === "failed" && (
          <div className="mt-4 rounded-lg bg-rose-50 p-3 text-sm text-rose-700 dark:bg-rose-950/40 dark:text-rose-300">
            {currentJob?.error || "Processing encountered an error."}
            <button
              onClick={() => router.push(`/studio/${projectId}/layers`)}
              className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-rose-700 underline hover:text-rose-800 dark:text-rose-300"
            >
              <RefreshCw size={12} /> Go back and retry
            </button>
          </div>
        )}

        {status === "completed" && (
          <div className="mt-6 flex items-center justify-between rounded-xl bg-emerald-50 p-4 dark:bg-emerald-950/40">
            <div className="flex items-center gap-2 text-sm font-medium text-emerald-800 dark:text-emerald-300">
              <CheckCircle2 size={18} className="text-emerald-600 dark:text-emerald-400" />
              All layers generated and ready for exploration & export!
            </div>
            <button
              onClick={() => router.push(`/studio/${projectId}`)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white shadow-md transition hover:bg-emerald-700"
            >
              Open Layer Viewer <ArrowRight size={14} />
            </button>
          </div>
        )}
      </div>

      {/* Layers Checklist */}
      <div className="mt-8">
        <h3 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          <Layers size={16} /> Selected Layers ({selectedLayers.length})
        </h3>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {selectedLayers.map((key, index) => {
            const meta = catalog[key];
            const isDone = status === "completed" || (currentJob?.completedLayers ?? 0) > index;
            const isWorking = !isDone && status === "running" && (currentJob?.completedLayers ?? 0) === index;

            return (
              <div
                key={key}
                className={`flex items-center justify-between rounded-xl border p-3.5 transition-all ${
                  isDone
                    ? "border-emerald-500/30 bg-emerald-50/40 dark:border-emerald-900/50 dark:bg-emerald-950/20"
                    : isWorking
                    ? "border-emerald-500 bg-white ring-2 ring-emerald-500/20 dark:border-emerald-400 dark:bg-slate-900"
                    : "border-slate-200 bg-white/50 opacity-60 dark:border-slate-800 dark:bg-slate-900/50"
                }`}
              >
                <div className="min-w-0 pr-3">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-900 dark:text-white">
                      {meta?.label || key}
                    </span>
                    <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                      {meta?.category || "Raster"}
                    </span>
                  </div>
                  <p className="mt-0.5 line-clamp-1 text-xs text-slate-500 dark:text-slate-400">
                    {meta?.description || "Geospatial raster surface"}
                  </p>
                </div>
                <div className="shrink-0">
                  {isDone ? (
                    <CheckCircle2 size={18} className="text-emerald-500" />
                  ) : isWorking ? (
                    <Loader2 size={18} className="animate-spin text-emerald-500" />
                  ) : (
                    <Clock size={18} className="text-slate-300 dark:text-slate-600" />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </main>
  );
}
