// Floating Agent Inspector Card with glowing border aura and dot-pattern-card texture
import React from "react";
import { PerceptionAgent } from "@/lib/sim/perception";
import { X, Navigation, Shield, AlertTriangle, Eye } from "lucide-react";

interface AgentInspectorCardProps {
  agent: PerceptionAgent | null;
  onClose: () => void;
}

export function AgentInspectorCard({ agent, onClose }: AgentInspectorCardProps) {
  if (!agent) return null;

  const isAlert = agent.statusBadge === "ALERT";
  const isWait = agent.statusBadge === "WAIT";

  return (
    <div className="pointer-events-auto absolute right-6 sm:right-8 top-20 sm:top-24 z-40 w-80 sm:w-96 overflow-hidden rounded-3xl border border-indigo-500/35 bg-slate-950/90 text-white shadow-[0_0_40px_-5px_rgba(99,102,241,0.4)] backdrop-blur-2xl dot-pattern-card animate-in fade-in zoom-in-95 duration-200">
      {/* Top Banner with Semantic Status Color */}
      <div
        className={`relative p-5 transition-colors border-b ${
          isAlert
            ? "bg-rose-500/20 border-rose-500/40 text-rose-100"
            : isWait
            ? "bg-sky-500/20 border-sky-500/40 text-sky-100"
            : "bg-emerald-500/20 border-emerald-500/40 text-emerald-100"
        }`}
      >
        <div className="flex items-center justify-between">
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-mono font-bold uppercase tracking-wider border ${
              isAlert
                ? "bg-rose-500/30 text-rose-200 border-rose-400"
                : isWait
                ? "bg-sky-500/30 text-sky-200 border-sky-400"
                : "bg-emerald-500/30 text-emerald-200 border-emerald-400"
            }`}
          >
            <span
              className={`size-1.5 rounded-full ${
                isAlert ? "bg-rose-400 animate-ping" : isWait ? "bg-sky-300" : "bg-emerald-300"
              }`}
            />
            {agent.statusBadge}
          </span>

          <button
            onClick={onClose}
            className="grid size-7 place-items-center rounded-full bg-slate-900/60 text-slate-300 hover:text-white hover:bg-slate-800 transition"
            title="Deselect (Esc)"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Large Headline Title */}
        <h2 className="mt-2.5 text-lg sm:text-xl font-bold tracking-tight text-white flex items-center gap-2">
          <Eye className="size-4 text-indigo-400" />
          <span>{agent.headline}</span>
        </h2>
        {/* Descriptive sentence */}
        <p className="mt-1 text-xs leading-relaxed text-slate-300">
          {agent.explanation}
        </p>
      </div>

      {/* Monospace Data Table */}
      <div className="space-y-2.5 p-5 font-mono text-[12px] bg-slate-950/60">
        <div className="flex items-center justify-between border-b border-indigo-500/20 pb-2">
          <span className="text-slate-400">entity id</span>
          <span className="font-semibold text-white">
            {agent.typeLabel} · <span className="underline decoration-indigo-400 text-indigo-300">{agent.label}</span>
          </span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-slate-400">velocity</span>
          <span className="font-bold text-cyan-400">{agent.speedKmh} km/h</span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-slate-400">turn intent</span>
          <span className="font-medium text-slate-200">
            {agent.turnIntent.yielding > 0 ? (
              <span className="text-amber-400 font-semibold">shoulder yield {agent.turnIntent.yielding}%</span>
            ) : (
              `straight ${agent.turnIntent.straight}% · left ${agent.turnIntent.left}%`
            )}
          </span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-slate-400">signal phase</span>
          <span className="font-medium text-emerald-400">{agent.signalCountdown}</span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-slate-400">node proximity</span>
          <span className="text-slate-200">{agent.distToNextJunctionM} m from node</span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-slate-400">approach</span>
          <span className="text-slate-200">{agent.approachName}</span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-slate-400">following</span>
          <span className="text-slate-300">{agent.followingText}</span>
        </div>

        {agent.type !== "ambulance" && (
          <div className="flex items-center justify-between border-t border-indigo-500/20 pt-2">
            <span className="text-slate-400">dist to emergency</span>
            <span className="font-bold text-orange-400">
              {Math.round(agent.distToAmbulance * 4.5)} m
            </span>
          </div>
        )}
      </div>

      <div className="border-t border-indigo-500/20 bg-slate-900/40 px-5 py-2.5 text-center text-[10px] font-mono text-slate-400">
        Click ground or press Esc to release tracking
      </div>
    </div>
  );
}
