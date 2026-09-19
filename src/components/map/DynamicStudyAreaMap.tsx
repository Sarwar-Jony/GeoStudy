"use client";

import dynamic from "next/dynamic";

const DynamicStudyAreaMap = dynamic(() => import("./StudyAreaMap"), {
  ssr: false,
  loading: () => (
    <div className="grid h-[420px] w-full place-items-center rounded-xl border border-slate-200 bg-slate-50 text-sm text-slate-400 dark:border-slate-800 dark:bg-slate-900">
      Loading map…
    </div>
  ),
});

export default DynamicStudyAreaMap;
