"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Map, Moon, Sun, LayoutGrid, Menu, X, LogOut, User, Smartphone, Download } from "lucide-react";
import { useUIStore } from "@/store/uiStore";
import { GeoStudyBrand } from "@/components/common/GeoStudyLogo";

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

interface Me {
  user: { userId: string; email: string; name: string } | null;
}

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const qc = useQueryClient();
  const { theme, toggleTheme, setTheme } = useUIStore();
  const [open, setOpen] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    const stored = typeof window !== "undefined" ? localStorage.getItem("gsa-theme") : null;
    if (stored === "dark" || stored === "light") setTheme(stored);

    // Check if running in standalone mode (already installed PWA)
    if (typeof window !== "undefined") {
      const isStandalone =
        window.matchMedia("(display-mode: standalone)").matches ||
        (window.navigator as any).standalone === true;
      setIsInstalled(Boolean(isStandalone));

      const handleBeforeInstallPrompt = (e: Event) => {
        e.preventDefault();
        setDeferredPrompt(e);
      };

      window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.addEventListener("appinstalled", () => {
        setIsInstalled(true);
        setDeferredPrompt(null);
      });

      return () => {
        window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      };
    }
  }, [setTheme]);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const choiceResult = await deferredPrompt.userChoice;
      if (choiceResult.outcome === "accepted") {
        setIsInstalled(true);
      }
      setDeferredPrompt(null);
    } else {
      alert(
        "To install GeoStudy on mobile:\n\n• On iOS (Safari): Tap the Share button, then select 'Add to Home Screen'.\n• On Android (Chrome): Tap the menu (3 dots) and select 'Install app' or 'Add to Home Screen'."
      );
    }
  };

  const { data } = useQuery<Me>({
    queryKey: ["me"],
    queryFn: async () => (await fetch("/api/auth/me")).json(),
  });

  const logout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    qc.invalidateQueries({ queryKey: ["me"] });
    router.push("/");
  };

  const links = [
    { href: "/studio", label: "New Study Area" },
    { href: "/projects", label: "My Projects" },
  ];

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/85 backdrop-blur-md dark:border-slate-800/80 dark:bg-[#060913]/90">
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-4 py-2.5 sm:px-6">
        <Link href="/" className="transition hover:opacity-95">
          <GeoStudyBrand />
        </Link>

        <div className="hidden items-center gap-1 md:flex">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={`rounded-lg px-3 py-2 text-sm font-medium transition ${
                pathname?.startsWith(l.href)
                  ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400"
                  : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
              }`}
            >
              {l.label}
            </Link>
          ))}
        </div>

        <div className="hidden items-center gap-2 md:flex">
          {!isInstalled && (
            <button
              onClick={handleInstallClick}
              className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-500/30 bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700 transition hover:bg-emerald-100 dark:border-emerald-500/40 dark:bg-emerald-950/40 dark:text-emerald-300 dark:hover:bg-emerald-900/50"
              title="Install App on Device"
            >
              <Smartphone size={13} className="text-emerald-600 dark:text-emerald-400" />
              <span>Install App</span>
            </button>
          )}

          <a
            href="https://github.com/Sarwar-Jony/GeoStudy"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="GitHub Repository"
            className="grid h-9 w-9 place-items-center rounded-lg border border-slate-200 text-slate-600 transition hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            <GithubIcon className="h-4 w-4" />
          </a>
          <button
            onClick={toggleTheme}
            aria-label="Toggle theme"
            className="grid h-9 w-9 place-items-center rounded-lg border border-slate-200 text-slate-600 transition hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
          </button>
          {data?.user ? (
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1.5 rounded-lg bg-slate-100 px-3 py-2 text-sm text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                <User size={14} /> {data.user.name}
              </span>
              <button
                onClick={logout}
                className="grid h-9 w-9 place-items-center rounded-lg border border-slate-200 text-slate-600 transition hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                aria-label="Log out"
              >
                <LogOut size={16} />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link href="/login" className="rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800">
                Log in
              </Link>
              <Link href="/register" className="rounded-lg bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 px-3.5 py-2 text-sm font-semibold text-white shadow-sm shadow-emerald-950/20 transition hover:from-emerald-500 hover:to-cyan-500">
                Sign up
              </Link>
            </div>
          )}
        </div>

        {/* Mobile Header Right Icons: Install App + Hamburger */}
        <div className="flex items-center gap-1.5 md:hidden">
          {!isInstalled && (
            <button
              onClick={handleInstallClick}
              className="flex items-center gap-1 rounded-lg border border-emerald-500/40 bg-emerald-50/80 px-2.5 py-1.5 text-xs font-bold text-emerald-800 transition active:scale-95 dark:border-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300"
              aria-label="Install GeoStudy"
            >
              <Download size={13} className="text-emerald-600 dark:text-emerald-400" />
              <span>Install</span>
            </button>
          )}

          <button
            className="grid h-10 w-10 place-items-center rounded-xl border border-slate-200/90 text-slate-700 transition active:bg-slate-100 dark:border-slate-800 dark:text-slate-200 dark:active:bg-slate-800"
            onClick={() => setOpen((v) => !v)}
            aria-label="Menu"
          >
            {open ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </nav>

      {/* Mobile Drawer */}
      {open && (
        <div className="border-t border-slate-200 bg-white/95 px-4 py-4 backdrop-blur-lg md:hidden dark:border-slate-800 dark:bg-[#060913]/95">
          <div className="flex flex-col gap-2">
            {!isInstalled && (
              <button
                onClick={() => {
                  setOpen(false);
                  handleInstallClick();
                }}
                className="flex min-h-[44px] items-center gap-3 rounded-xl border border-emerald-500/40 bg-gradient-to-r from-emerald-50 to-teal-50 px-3.5 py-2.5 text-left text-sm font-bold text-emerald-800 dark:from-emerald-950/50 dark:to-teal-950/30 dark:text-emerald-200"
              >
                <Smartphone size={18} className="text-emerald-600 dark:text-emerald-400" />
                <div className="flex-1">
                  <div>Install App on Home Screen</div>
                  <div className="text-[11px] font-normal text-emerald-600/80 dark:text-emerald-400/70">
                    Works smoothly like a native mobile app
                  </div>
                </div>
              </button>
            )}

            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className={`flex min-h-[44px] items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-semibold transition ${
                  pathname?.startsWith(l.href)
                    ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400"
                    : "text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
                }`}
                onClick={() => setOpen(false)}
              >
                <LayoutGrid size={16} /> {l.label}
              </Link>
            ))}

            <button
              onClick={toggleTheme}
              className="flex min-h-[44px] items-center gap-3 rounded-xl px-3.5 py-2.5 text-left text-sm font-semibold text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              {theme === "dark" ? <Sun size={16} className="text-amber-500" /> : <Moon size={16} className="text-slate-500" />}
              <span>{theme === "dark" ? "Light Mode" : "Dark Mode"}</span>
            </button>

            {data?.user ? (
              <button
                onClick={logout}
                className="flex min-h-[44px] items-center gap-3 rounded-xl px-3.5 py-2.5 text-left text-sm font-semibold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30"
              >
                <LogOut size={16} /> Log out ({data.user.name})
              </button>
            ) : (
              <div className="mt-2 flex gap-2">
                <Link
                  href="/login"
                  onClick={() => setOpen(false)}
                  className="flex min-h-[44px] flex-1 items-center justify-center rounded-xl border border-slate-200 px-3 py-2 text-center text-sm font-semibold text-slate-800 dark:border-slate-700 dark:text-slate-200"
                >
                  Log in
                </Link>
                <Link
                  href="/register"
                  onClick={() => setOpen(false)}
                  className="flex min-h-[44px] flex-1 items-center justify-center rounded-xl bg-emerald-600 px-3 py-2 text-center text-sm font-semibold text-white shadow-sm hover:bg-emerald-500"
                >
                  Sign up
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
