// Editorial Machine Sight HUD, Sensor Switcher, Monospace Telemetry, TTC Alerts, and Mission Controller
import React, { useState } from "react";
import { SensorMode, TtcAlert, PerceptionAnalytics } from "@/lib/sim/perception";
import {
  Play,
  Pause,
  RotateCcw,
  Sparkles,
  Zap,
  Radio,
  Eye,
  Sliders,
  AlertTriangle,
  Layers,
  Activity,
  Maximize2,
  Minimize2,
  Volume2,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { DecisionLogEntry } from "@/lib/sim/types";

interface MachineSightHudProps {
  sensorMode: SensorMode;
  onSetSensorMode: (mode: SensorMode) => void;
  analytics: PerceptionAnalytics;
  isSlowMotion: boolean;
  isRunning: boolean;
  onTogglePlay: () => void;
  onReset: () => void;
  greenCorridorActive: boolean;
  onToggleGreenCorridor: () => void;
  compareMode: boolean;
  onToggleCompare: () => void;
  lowQuality: boolean;
  onToggleLowQuality: () => void;
  decisionLogs: DecisionLogEntry[];
  shiftHeld: boolean;
}

export function MachineSightHud({
  sensorMode,
  onSetSensorMode,
  analytics,
  isSlowMotion,
  isRunning,
  onTogglePlay,
  onReset,
  greenCorridorActive,
  onToggleGreenCorridor,
  compareMode,
  onToggleCompare,
  lowQuality,
  onToggleLowQuality,
  decisionLogs,
  shiftHeld,
}: MachineSightHudProps) {
  const [missionCardOpen, setMissionCardOpen] = useState(true);

  return (
    <div className="pointer-events-none absolute inset-0 z-20 flex flex-col justify-between p-6">
      {/* TOP BAR: Editorial Headline, View Switcher, Mission Controller */}
      <div className="flex items-start justify-between gap-4">
        {/* Top-Left: Editorial Headline & Sensor Tabs */}
        <div className="space-y-3">
          <div className="pointer-events-auto rounded-2xl border border-slate-800/80 bg-slate-950/80 p-4 shadow-xl backdrop-blur-xl">
            <div className="flex items-center gap-3">
              <span className="flex size-2 rounded-full bg-emerald-400 animate-pulse" />
              <h1 className="font-display text-2xl font-bold tracking-tight text-white">Machine sight</h1>
              <span className="rounded bg-slate-800 px-1.5 py-0.5 font-mono text-[9px] font-semibold text-slate-300">
                EMERGENCY CORRIDOR
              </span>
              <span className="rounded border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 font-mono text-[9px] text-amber-300">
                Simulation (modelled data)
              </span>
            </div>
            <p className="mt-1 font-mono text-xs text-slate-400">
              Autonomous multi-sensor spatial perception, intent prediction & preemption corridor
            </p>

            {/* Sensor Switcher Tabs */}
            <div className="mt-3 flex items-center gap-1.5 border-t border-slate-800/80 pt-3">
              <button
                onClick={() => onSetSensorMode("lidar")}
                className={`pointer-events-auto flex items-center gap-1.5 rounded-lg px-2.5 py-1 font-mono text-xs font-semibold transition ${
                  sensorMode === "lidar"
                    ? "bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20"
                    : "bg-slate-900 text-slate-300 hover:bg-slate-800"
                }`}
              >
                <span className="text-[10px] opacity-60">[1]</span>
                <span>LIDAR</span>
              </button>

              <button
                onClick={() => onSetSensorMode("segments")}
                className={`pointer-events-auto flex items-center gap-1.5 rounded-lg px-2.5 py-1 font-mono text-xs font-semibold transition ${
                  sensorMode === "segments"
                    ? "bg-orange-500 text-white shadow-md shadow-orange-500/20"
                    : "bg-slate-900 text-slate-300 hover:bg-slate-800"
                }`}
              >
                <span className="text-[10px] opacity-60">[2]</span>
                <span>SEGMENTS</span>
              </button>

              <button
                onClick={() => onSetSensorMode("depth")}
                className={`pointer-events-auto flex items-center gap-1.5 rounded-lg px-2.5 py-1 font-mono text-xs font-semibold transition ${
                  sensorMode === "depth"
                    ? "bg-teal-400 text-slate-950 shadow-md shadow-teal-400/20"
                    : "bg-slate-900 text-slate-300 hover:bg-slate-800"
                }`}
              >
                <span className="text-[10px] opacity-60">[3]</span>
                <span>DEPTH</span>
              </button>

              <button
                onClick={onToggleLowQuality}
                className={`pointer-events-auto ml-2 rounded-lg border px-2 py-1 font-mono text-[10px] transition ${
                  lowQuality
                    ? "border-amber-500/40 bg-amber-500/20 text-amber-300"
                    : "border-slate-800 bg-slate-900/60 text-slate-400 hover:text-slate-200"
                }`}
              >
                {lowQuality ? "LOW QUALITY ON" : "HIGH QUALITY"}
              </button>
            </div>
          </div>

          {/* Shift Move Zone Indicator */}
          {shiftHeld && (
            <div className="pointer-events-none inline-flex items-center gap-2 rounded-lg border border-cyan-500/50 bg-cyan-950/80 px-2.5 py-1 font-mono text-[11px] text-cyan-300 animate-pulse">
              <span className="size-1.5 rounded-full bg-cyan-400" />
              <span>Shift Active: Vision Zone Centered on Cursor</span>
            </div>
          )}
        </div>

        {/* Top-Right: Collapsible Mission Operator Card */}
        <div className="pointer-events-auto w-80 rounded-2xl border border-slate-800/80 bg-slate-950/85 p-3.5 shadow-xl backdrop-blur-xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Radio className="size-4 text-emerald-400 animate-pulse" />
              <span className="font-mono text-xs font-bold text-white uppercase tracking-wider">Mission Controller</span>
            </div>
            <button
              onClick={() => setMissionCardOpen(!missionCardOpen)}
              className="text-slate-400 hover:text-white"
            >
              {missionCardOpen ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
            </button>
          </div>

          {missionCardOpen && (
            <div className="mt-3 space-y-3 font-mono text-xs">
              {/* Play / Pause / Reset Buttons */}
              <div className="flex items-center gap-2">
                <Button
                  onClick={onTogglePlay}
                  size="sm"
                  className={`flex-1 font-mono text-xs font-bold ${
                    isRunning
                      ? "bg-amber-500 text-slate-950 hover:bg-amber-400"
                      : "bg-emerald-500 text-slate-950 hover:bg-emerald-400"
                  }`}
                >
                  {isRunning ? <Pause className="mr-1 size-3.5" /> : <Play className="mr-1 size-3.5" />}
                  {isRunning ? "PAUSE SIM" : "START MISSION"}
                </Button>
                <Button
                  onClick={onReset}
                  variant="outline"
                  size="sm"
                  className="border-slate-800 bg-slate-900/80 text-slate-300 hover:bg-slate-800"
                >
                  <RotateCcw className="size-3.5" />
                </Button>
              </div>

              {/* Corridor Toggle & Compare */}
              <div className="flex items-center justify-between border-t border-slate-800/80 pt-2.5 text-[11px]">
                <span className="text-slate-400">Green Corridor AI</span>
                <button
                  onClick={onToggleGreenCorridor}
                  className={`rounded px-2 py-0.5 font-bold transition ${
                    greenCorridorActive
                      ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40"
                      : "bg-slate-800 text-slate-400"
                  }`}
                >
                  {greenCorridorActive ? "ENGAGED" : "OFF"}
                </button>
              </div>

              <div className="flex items-center justify-between text-[11px]">
                <span className="text-slate-400">Baseline Comparison</span>
                <button
                  onClick={onToggleCompare}
                  className={`rounded px-2 py-0.5 font-bold transition ${
                    compareMode
                      ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/40"
                      : "bg-slate-800 text-slate-400"
                  }`}
                >
                  {compareMode ? "ACTIVE" : "INACTIVE"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* CENTER / MIDDLE: Slow Motion Indicator */}
      {isSlowMotion && (
        <div className="pointer-events-none self-center rounded-full border border-cyan-400/40 bg-cyan-950/80 px-4 py-1.5 font-mono text-xs font-bold text-cyan-300 shadow-xl backdrop-blur-md animate-pulse">
          ⚡ 0.25x SLOW MOTION ACTIVE (Spacebar to toggle)
        </div>
      )}

      {/* BOTTOM SECTION: Monospace Stats HUD, TTC Alert Bar & Live AI Decisions */}
      <div className="space-y-3">
        {/* Monospace Stats Telemetry Bar */}
        <div className="pointer-events-auto grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7 rounded-2xl border border-slate-800/80 bg-slate-950/85 p-3 font-mono text-xs shadow-2xl backdrop-blur-xl">
          <div className="p-1">
            <p className="text-[10px] uppercase tracking-wider text-slate-500">Live FPS</p>
            <p className="font-bold text-emerald-400">{analytics.fps} <span className="text-[10px] text-slate-500">fps</span></p>
          </div>
          <div className="p-1">
            <p className="text-[10px] uppercase tracking-wider text-slate-500">Tracked in Zone</p>
            <p className="font-bold text-cyan-400">{analytics.trackedCount} <span className="text-[10px] text-slate-500">agents</span></p>
          </div>
          <div className="p-1">
            <p className="text-[10px] uppercase tracking-wider text-slate-500">Point Cloud</p>
            <p className="font-bold text-slate-200">{analytics.pointsCount.toLocaleString()} <span className="text-[10px] text-slate-500">pts</span></p>
          </div>
          <div className="p-1">
            <p className="text-[10px] uppercase tracking-wider text-slate-500">Close Calls Prevented</p>
            <p className="font-bold text-amber-400">{analytics.closeCallsCount}</p>
          </div>
          <div className="p-1">
            <p className="text-[10px] uppercase tracking-wider text-slate-500">Signals Preempted</p>
            <p className="font-bold text-emerald-400">{analytics.signalsPreempted} <span className="text-[10px] text-slate-500">junctions</span></p>
          </div>
          <div className="p-1">
            <p className="text-[10px] uppercase tracking-wider text-slate-500">Time Saved</p>
            <p className="font-bold text-cyan-300">+{analytics.corridorTimeSavedSec.toFixed(1)} <span className="text-[10px] text-slate-500">s</span></p>
          </div>
          <div className="p-1">
            <p className="text-[10px] uppercase tracking-wider text-slate-500">Mission ETA</p>
            <p className="font-bold text-orange-400">{Math.floor(analytics.etaSec / 60)}m {analytics.etaSec % 60}s</p>
          </div>
        </div>

        {/* Bottom-Left Real-time TTC Collision Alert Banner */}
        {analytics.activeAlerts.length > 0 && (
          <div className="pointer-events-auto flex items-center gap-3 rounded-xl border border-red-500/80 bg-red-950/90 p-3 font-mono text-xs text-red-200 shadow-2xl backdrop-blur-xl animate-bounce">
            <AlertTriangle className="size-5 shrink-0 text-red-400 animate-ping" />
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="font-bold text-red-100">
                  {analytics.activeAlerts[0].label1} × {analytics.activeAlerts[0].label2}
                </span>
                <span className="rounded bg-red-900/80 px-1.5 py-0.5 text-[10px] font-bold text-red-200">
                  TTC {analytics.activeAlerts[0].ttcSec}s
                </span>
                <span className="text-[11px] text-red-300">
                  Closing at {analytics.activeAlerts[0].closingSpeedKmh} km/h
                </span>
              </div>
              <p className="text-[10px] text-red-300/80 mt-0.5">{analytics.activeAlerts[0].detail}</p>
            </div>
          </div>
        )}

        {/* Live AI Decision Stream Timeline */}
        {decisionLogs.length > 0 && (
          <div className="pointer-events-auto flex items-center gap-2 overflow-x-auto rounded-xl border border-slate-800/80 bg-slate-950/80 px-3 py-1.5 font-mono text-[11px] text-slate-300 backdrop-blur-md">
            <span className="shrink-0 text-[10px] font-bold text-emerald-400 uppercase tracking-wider">AI Decisions:</span>
            <div className="flex items-center gap-4 whitespace-nowrap">
              {decisionLogs.slice(0, 3).map((log) => (
                <div key={log.id} className="flex items-center gap-1.5 text-slate-300">
                  <span className="text-[10px] text-slate-500">[{log.timestamp}]</span>
                  <span className="font-semibold text-slate-200">{log.junctionName}:</span>
                  <span className="text-slate-400">{log.action}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Bottom Control Hint Bar */}
        <div className="text-center">
          <span className="inline-block rounded-full border border-slate-800 bg-slate-950/75 px-3 py-1 font-mono text-[10px] text-slate-400 shadow-md backdrop-blur-md">
            Drag look · Click track · Space slow time · 1-2-3 views · Shift move zone
          </span>
        </div>
      </div>
    </div>
  );
}
