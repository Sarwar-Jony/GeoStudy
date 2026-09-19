import Link from "next/link";
import { Map, GraduationCap, Heart, Shield, Code, Globe2 } from "lucide-react";

function GithubIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fillRule="evenodd"
        d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
        clipRule="evenodd"
      />
    </svg>
  );
}

export default function Footer() {
  return (
    <footer className="border-t border-slate-200 bg-white dark:border-slate-800/80 dark:bg-slate-950">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
        <div className="grid gap-8 md:grid-cols-12">
          {/* Brand & Project Summary */}
          <div className="space-y-3 md:col-span-5">
            <Link href="/" className="inline-flex items-center gap-2 font-bold text-slate-900 dark:text-white">
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-md">
                <Map size={18} />
              </span>
              <span className="text-lg tracking-tight">
                GeoStudy<span className="text-emerald-600 dark:text-emerald-400">Area</span>
              </span>
            </Link>
            <p className="max-w-sm text-xs leading-relaxed text-slate-500 dark:text-slate-400">
              Autonomous Geospatial Study Area Intelligence &amp; Remote Sensing Analytics Platform. Built for urban planners, geographers, and environmental scientists to generate publication-grade cartography, live satellite indices, and academic methodology monographs.
            </p>
            <div className="flex items-center gap-3 pt-1">
              <a
                href="https://github.com/Sarwar-Jony/GeoStudy"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                <GithubIcon className="h-3.5 w-3.5" />
                <span>GitHub Repository</span>
              </a>
              <span className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 px-2.5 py-1.5 text-[11px] font-bold text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
                <Shield size={12} /> MIT License
              </span>
            </div>
          </div>

          {/* Quick Navigation */}
          <div className="space-y-3 md:col-span-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
              Platform Features
            </h4>
            <ul className="space-y-2 text-xs text-slate-500 dark:text-slate-400">
              <li>
                <Link href="/studio" className="transition hover:text-emerald-600 dark:hover:text-emerald-400">
                  Study Area Wizard &amp; Geocoding
                </Link>
              </li>
              <li>
                <Link href="/studio" className="transition hover:text-emerald-600 dark:hover:text-emerald-400">
                  Open-Elevation Transect Profiles
                </Link>
              </li>
              <li>
                <Link href="/projects" className="transition hover:text-emerald-600 dark:hover:text-emerald-400">
                  Raster Layer Analysis (GEE)
                </Link>
              </li>
              <li>
                <Link href="/projects" className="transition hover:text-emerald-600 dark:hover:text-emerald-400">
                  Academic Monograph &amp; LaTeX Export
                </Link>
              </li>
            </ul>
          </div>

          {/* Developer & Affiliation Card */}
          <div className="space-y-3 md:col-span-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
              Developer &amp; Affiliation
            </h4>
            <div className="rounded-2xl border border-slate-200/80 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-900/60">
              <div className="flex items-start gap-3">
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-emerald-600 text-white shadow-md">
                  <GraduationCap size={20} />
                </div>
                <div>
                  <h5 className="text-sm font-extrabold text-slate-900 dark:text-white">
                    Sarwar Jony
                  </h5>
                  <p className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                    Lead Developer &amp; GIS Researcher
                  </p>
                  <p className="mt-1 text-[11px] leading-snug text-slate-500 dark:text-slate-400">
                    Department of Urban and Regional Planning (URP)<br />
                    <span className="font-semibold text-slate-700 dark:text-slate-300">Khulna University of Engineering &amp; Technology (KUET)</span>
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom copyright & attribution bar */}
        <div className="mt-10 flex flex-col items-center justify-between gap-3 border-t border-slate-200/80 pt-6 text-xs text-slate-500 sm:flex-row dark:border-slate-800 dark:text-slate-400">
          <p className="flex items-center gap-1">
            Built with <Heart size={13} className="fill-red-500 text-red-500" /> by{" "}
            <span className="font-bold text-slate-800 dark:text-slate-200">Sarwar Jony</span> (KUET URP)
          </p>
          <div className="flex items-center gap-4">
            <span className="text-[11px]">
              &copy; {new Date().getFullYear()} GeoStudy. Open-source under{" "}
              <a
                href="https://github.com/Sarwar-Jony/GeoStudy/blob/main/LICENSE"
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold text-emerald-600 underline hover:text-emerald-500 dark:text-emerald-400"
              >
                MIT License
              </a>
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
