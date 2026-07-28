import { useState } from "react";
import Dashboard from "./components/Dashboard";
import GammaExposureView from "./components/GammaExposureView";

export default function App() {
  const [currentView, setCurrentView] = useState<"dashboard" | "gamma">("dashboard");

  return (
    <div className="min-h-screen bg-background text-foreground">
      <nav className="sticky top-0 z-40 border-b border-white/10 bg-slate-950/80 px-6 py-3 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1600px] items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-400 to-emerald-600 shadow-lg shadow-emerald-500/20">
              <span className="text-lg font-semibold text-white">S</span>
            </div>
            <div>
              <p className="text-sm font-semibold text-white">S&P 500 Intelligence</p>
              <p className="text-[11px] uppercase tracking-[0.24em] text-slate-400">Options intelligence console</p>
            </div>
          </div>

          <div className="flex items-center gap-2 rounded-full border border-white/10 bg-slate-900/70 p-1">
            <button
              onClick={() => setCurrentView("dashboard")}
              className={`rounded-full px-4 py-2 text-sm font-medium transition-all ${
                currentView === "dashboard"
                  ? "bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/20"
                  : "text-slate-300 hover:bg-white/5 hover:text-white"
              }`}
            >
              Dashboard
            </button>
            <button
              onClick={() => setCurrentView("gamma")}
              className={`rounded-full px-4 py-2 text-sm font-medium transition-all ${
                currentView === "gamma"
                  ? "bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/20"
                  : "text-slate-300 hover:bg-white/5 hover:text-white"
              }`}
            >
              Gamma Exposure Module
            </button>
          </div>
        </div>
      </nav>

      {currentView === "dashboard" ? <Dashboard /> : <GammaExposureView />}
    </div>
  );
}
