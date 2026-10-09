// Floating Agent Inspector Card with Turn Intent Probabilities, Signal Countdown & Telemetry
import React from "react";
import { PerceptionAgent } from "@/lib/sim/perception";
import { X, ShieldCheck, AlertTriangle, Clock, Compass, Activity, Navigation, ArrowUpRight, ShieldAlert } from "lucide-react";

interface AgentInspectorCardProps {
  agent: PerceptionAgent | null;
  onClose: () => void;
}

export function AgentInspectorCard({ agent, onClose }: AgentInspectorCardProps) {
  if (!agent) return null;

  const isAmbulance = agent.type === "ambulance";

  return (
    <div className="absolute right-6 top-20 z-40 w-80 rounded-2xl border border-slate-700/80 bg-slate-950/90 p-4 font-mono text-xs text-slate-200 shadow-2xl backdrop-blur-xl animate-in fade-in zoom-in-95 duration-200">
      {/* Card Header */}
      <div className="flex items-start justify-between border-b border-slate-800 pb-3">
        <div>
          <div className="flex items-center gap-2">
            <span
              className={`rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                agent.statusBadge === "ALERT"
                  ? "bg-red-500/20 text-red-400 border border-red-500/40 animate-pulse"
                  : agent.statusBadge === "WAIT"
                  ? "bg-amber-500/20 text-amber-400 border border-amber-500/40"
                  : "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40"
              }`}
            >
              {agent.statusBadge}
            </span>
            <h3 className="font-bold text-sm tracking-tight text-white">{agent.label}</h3>
          </div>
          <p className="mt-1 text-[11px] text-slate-400">{agent.statusHeadline}</p>
        </div>
        <button
          onClick={onClose}
          className="grid size-6 place-items-center rounded-lg border border-slate-800 text-slate-400 transition hover:bg-slate-800 hover:text-white"
          title="Deselect (Esc)"
        >
          <X className="size-3.5" />
        </button>
      </div>

      {/* Primary Metrics Grid */}
      <div className="grid grid-cols-2 gap-2 py-3">
        <div className="rounded-xl border border-slate-800/80 bg-slate-900/60 p-2.5">
          <p className="text-[10px] uppercase tracking-wider text-slate-400">Velocity</p>
          <p className="mt-1 font-display text-lg font-bold text-cyan-400">{agent.speedKmh} <span className="text-xs font-normal text-slate-400">km/h</span></p>
        </div>
        <div className="rounded-xl border border-slate-800/80 bg-slate-900/60 p-2.5">
          <p className="text-[10px] uppercase tracking-wider text-slate-400">Following Gap</p>
          <p className="mt-1 font-display text-lg font-bold text-emerald-400">{agent.followingGapMeters} <span className="text-xs font-normal text-slate-400">m</span></p>
        </div>
      </div>

      {/* Turn Intent Probabilities (Deterministic Heuristic Engine) */}
      <div className="space-y-2 rounded-xl border border-slate-800/80 bg-slate-900/40 p-3">
        <div className="flex items-center justify-between text-[11px]">
          <span className="font-semibold text-slate-300">Turn Intent Prediction</span>
          <span className="text-[10px] text-slate-400">Graph Model</span>
        </div>

        {/* Straight Bar */}
        <div>
          <div className="flex justify-between text-[10px] text-slate-400">
            <span>Straight (Corridor)</span>
            <span className="font-bold text-cyan-300">{agent.turnIntent.straight}%</span>
          </div>
          <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
            <div
              className="h-full bg-cyan-500 rounded-full transition-all duration-300"
              style={{ width: `${agent.turnIntent.straight}%` }}
            />
          </div>
        </div>

        {/* Left Turn Bar */}
        <div>
          <div className="flex justify-between text-[10px] text-slate-400">
            <span>Left Branch</span>
            <span className="font-bold text-indigo-300">{agent.turnIntent.left}%</span>
          </div>
          <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
            <div
              className="h-full bg-indigo-500 rounded-full transition-all duration-300"
              style={{ width: `${agent.turnIntent.left}%` }}
            />
          </div>
        </div>

        {/* Right Turn / Yielding Bar */}
        {agent.turnIntent.yielding > 0 ? (
          <div>
            <div className="flex justify-between text-[10px] text-slate-400">
              <span>Shoulder Yield</span>
              <span className="font-bold text-amber-300">{agent.turnIntent.yielding}%</span>
            </div>
            <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
              <div
                className="h-full bg-amber-500 rounded-full transition-all duration-300"
                style={{ width: `${agent.turnIntent.yielding}%` }}
              />
            </div>
          </div>
        ) : (
          <div>
            <div className="flex justify-between text-[10px] text-slate-400">
              <span>Right Branch</span>
              <span className="font-bold text-sky-300">{agent.turnIntent.right}%</span>
            </div>
            <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
              <div
                className="h-full bg-sky-500 rounded-full transition-all duration-300"
                style={{ width: `${agent.turnIntent.right}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Junction & Signal Status */}
      <div className="mt-3 space-y-1.5 text-[11px] border-t border-slate-800/80 pt-3">
        <div className="flex items-center justify-between">
          <span className="text-slate-400">Upcoming Signal</span>
          <span className="font-semibold text-emerald-400">{agent.signalCountdown}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-slate-400">Next Node</span>
          <span className="text-slate-200">{agent.nextJunctionName} ({agent.distToNextJunctionM}m)</span>
        </div>
        {!isAmbulance && (
          <div className="flex items-center justify-between">
            <span className="text-slate-400">Distance to Ambulance</span>
            <span className="font-semibold text-orange-400">{Math.round(agent.distToAmbulance * 4.5)} m</span>
          </div>
        )}
        {agent.hasTtcWarning && (
          <div className="mt-2 flex items-center gap-1.5 rounded-lg border border-red-500/40 bg-red-950/60 p-2 text-[10px] text-red-300">
            <ShieldAlert className="size-4 shrink-0 text-red-400" />
            <span>TTC Warning: Estimated {agent.ttcSec}s to collision threshold</span>
          </div>
        )}
      </div>

      <div className="mt-3 text-center">
        <span className="text-[9px] text-slate-500">Press ESC or click empty ground to return to corridor tracking</span>
      </div>
    </div>
  );
}
