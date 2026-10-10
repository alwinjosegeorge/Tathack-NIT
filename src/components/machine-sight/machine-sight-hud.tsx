// Editorial Machine Sight HUD matching the reference video layout with camera modes and zone controls
import React, { useState } from "react";
import { SensorMode, PerceptionAnalytics } from "@/lib/sim/perception";
import { CameraViewMode } from "./machine-sight-canvas";
import {
  Play,
  Pause,
  RotateCcw,
  Sparkles,
  Zap,
  Radio,
  Sliders,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Camera,
  Navigation,
  Lock,
  Unlock,
  Maximize2,
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
  selectedAgentLabel: string | null;
  cameraMode: CameraViewMode;
  onSetCameraMode: (m: CameraViewMode) => void;
  isLockedToAmbulance: boolean;
  onToggleLockAmbulance: () => void;
  zoneRadius: number;
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
  selectedAgentLabel,
  cameraMode,
  onSetCameraMode,
  isLockedToAmbulance,
  onToggleLockAmbulance,
  zoneRadius,
}: MachineSightHudProps) {
  const [missionCardOpen, setMissionCardOpen] = useState(false);

  return (
    <div className="pointer-events-none absolute inset-0 z-20 flex flex-col justify-between p-6 sm:p-8">
      {/* TOP SECTION: Editorial Header, Camera Modes & Mission Controller */}
      <div className="flex items-start justify-between gap-4 sm:gap-6">
        {/* Top-Left: Editorial Title, Subtitle, and View Switcher */}
        <div className="max-w-md space-y-2.5">
          {/* Node Badge */}
          <div className="flex items-center gap-2">
            <span className="size-2 rounded-full bg-red-500 animate-pulse" />
            <span className="font-mono text-[11px] font-bold tracking-widest text-red-500 uppercase">
              NODE 07 · INTERSECTION PERCEPTION
            </span>
            <span className="rounded border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 font-mono text-[9px] text-amber-700 dark:text-amber-300">
              Simulation (modelled data)
            </span>
          </div>

          {/* Large Editorial Headline */}
          <h1 className="font-display text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            Machine sight
          </h1>

          {/* Subtitle Description */}
          <p className="font-sans text-xs sm:text-[13px] leading-relaxed text-slate-600 dark:text-slate-400">
            The street, read the way an AI reads it. Move to look through the model&apos;s eyes, drag/orbit
            whatever you point at and see what the node&apos;s sensors see.
          </p>

          {/* Minimalist Switcher Tabs */}
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <button
              onClick={() => onSetSensorMode("lidar")}
              className={`pointer-events-auto flex items-center gap-1.5 rounded-full px-3.5 py-1.5 font-mono text-xs font-semibold transition shadow-xs ${
                sensorMode === "lidar"
                  ? "bg-slate-950 text-white dark:bg-white dark:text-slate-950"
                  : "bg-white/80 text-slate-700 hover:bg-white border border-slate-200 dark:bg-slate-900/80 dark:text-slate-300 dark:border-slate-800"
              }`}
            >
              <span>1. LIDAR</span>
            </button>

            <button
              onClick={() => onSetSensorMode("segments")}
              className={`pointer-events-auto flex items-center gap-1.5 rounded-full px-3.5 py-1.5 font-mono text-xs font-semibold transition shadow-xs ${
                sensorMode === "segments"
                  ? "bg-slate-950 text-white dark:bg-white dark:text-slate-950"
                  : "bg-white/80 text-slate-700 hover:bg-white border border-slate-200 dark:bg-slate-900/80 dark:text-slate-300 dark:border-slate-800"
              }`}
            >
              <span>Segments</span>
            </button>

            <button
              onClick={() => onSetSensorMode("depth")}
              className={`pointer-events-auto flex items-center gap-1.5 rounded-full px-3.5 py-1.5 font-mono text-xs font-semibold transition shadow-xs ${
                sensorMode === "depth"
                  ? "bg-slate-950 text-white dark:bg-white dark:text-slate-950"
                  : "bg-white/80 text-slate-700 hover:bg-white border border-slate-200 dark:bg-slate-900/80 dark:text-slate-300 dark:border-slate-800"
              }`}
            >
              <span>3. Depth</span>
            </button>

            {/* Quality toggle */}
            <button
              onClick={onToggleLowQuality}
              className={`pointer-events-auto rounded-full border px-2.5 py-1 font-mono text-[10px] transition ${
                lowQuality
                  ? "border-amber-500 bg-amber-500/10 text-amber-700 dark:text-amber-400 font-bold"
                  : "border-slate-300 bg-white/70 text-slate-600 hover:text-slate-900 dark:border-slate-800 dark:bg-slate-900/70 dark:text-slate-400"
              }`}
            >
              {lowQuality ? "LOW Q (120v)" : "HIGH Q (280v)"}
            </button>
          </div>

          {/* Camera View Switcher Bar */}
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <button
              onClick={() => onSetCameraMode(cameraMode === "overview" ? "follow_ambulance" : "overview")}
              className={`pointer-events-auto flex items-center gap-1.5 rounded-lg px-2.5 py-1 font-mono text-[11px] border transition shadow-xs ${
                cameraMode === "overview"
                  ? "bg-cyan-500/15 border-cyan-500 text-cyan-700 dark:text-cyan-300 font-bold"
                  : "bg-white/70 border-slate-200 text-slate-700 hover:bg-white dark:bg-slate-900/70 dark:border-slate-800 dark:text-slate-300"
              }`}
            >
              <Maximize2 className="size-3" />
              <span>{cameraMode === "overview" ? "Overview (Active)" : "City Overview"}</span>
            </button>

            <button
              onClick={() => onSetCameraMode("follow_ambulance")}
              className={`pointer-events-auto flex items-center gap-1.5 rounded-lg px-2.5 py-1 font-mono text-[11px] border transition shadow-xs ${
                cameraMode === "follow_ambulance"
                  ? "bg-orange-500/15 border-orange-500 text-orange-700 dark:text-orange-300 font-bold"
                  : "bg-white/70 border-slate-200 text-slate-700 hover:bg-white dark:bg-slate-900/70 dark:border-slate-800 dark:text-slate-300"
              }`}
            >
              <Navigation className="size-3" />
              <span>Follow AMB</span>
            </button>

            <button
              onClick={onToggleLockAmbulance}
              className={`pointer-events-auto flex items-center gap-1.5 rounded-lg px-2.5 py-1 font-mono text-[11px] border transition shadow-xs ${
                isLockedToAmbulance
                  ? "bg-orange-500/20 border-orange-500 text-orange-700 dark:text-orange-300 font-bold"
                  : "bg-white/70 border-slate-200 text-slate-600 hover:bg-white dark:bg-slate-900/70 dark:border-slate-800 dark:text-slate-400"
              }`}
              title="Lock vision zone to lead emergency ambulance"
            >
              {isLockedToAmbulance ? <Lock className="size-3" /> : <Unlock className="size-3" />}
              <span>{isLockedToAmbulance ? "Zone Locked to AMB" : "Zone on Cursor"}</span>
            </button>
          </div>
        </div>

        {/* Top-Right: Mission Operator Card */}
        <div className="pointer-events-auto w-64 sm:w-72 rounded-2xl border border-slate-200/80 bg-white/90 p-3.5 shadow-xl backdrop-blur-xl dark:border-slate-800/80 dark:bg-slate-950/90 font-mono text-xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="size-2 rounded-full bg-emerald-500 animate-ping" />
              <span className="font-bold tracking-tight text-slate-900 dark:text-white uppercase">Mission Controller</span>
            </div>
            <button
              onClick={() => setMissionCardOpen(!missionCardOpen)}
              className="text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white"
            >
              {missionCardOpen ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
            </button>
          </div>

          {missionCardOpen && (
            <div className="mt-3 space-y-2.5 pt-2 border-t border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Button
                  onClick={onTogglePlay}
                  size="sm"
                  className={`flex-1 font-mono text-xs font-bold ${
                    isRunning
                      ? "bg-amber-500 text-slate-950 hover:bg-amber-400"
                      : "bg-emerald-500 text-white hover:bg-emerald-600"
                  }`}
                >
                  {isRunning ? <Pause className="mr-1 size-3.5" /> : <Play className="mr-1 size-3.5" />}
                  {isRunning ? "PAUSE" : "START"}
                </Button>
                <Button
                  onClick={onReset}
                  variant="outline"
                  size="sm"
                  className="border-slate-300 bg-white text-slate-700 hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300"
                >
                  <RotateCcw className="size-3.5" />
                </Button>
              </div>

              <div className="flex items-center justify-between text-[11px] pt-1">
                <span className="text-slate-500 dark:text-slate-400">Green Corridor:</span>
                <button
                  onClick={onToggleGreenCorridor}
                  className={`rounded px-2 py-0.5 font-bold transition ${
                    greenCorridorActive
                      ? "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/40"
                      : "bg-slate-200 dark:bg-slate-800 text-slate-500"
                  }`}
                >
                  {greenCorridorActive ? "PREEMPTION ON" : "OFF"}
                </button>
              </div>

              <div className="flex items-center justify-between text-[11px]">
                <span className="text-slate-500 dark:text-slate-400">Baseline Mode:</span>
                <button
                  onClick={onToggleCompare}
                  className={`rounded px-2 py-0.5 font-bold transition ${
                    compareMode
                      ? "bg-cyan-500/20 text-cyan-600 dark:text-cyan-400 border border-cyan-500/40"
                      : "bg-slate-200 dark:bg-slate-800 text-slate-500"
                  }`}
                >
                  {compareMode ? "COMPARE" : "NORMAL"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* MIDDLE: Slow Motion Indicator */}
      {isSlowMotion && (
        <div className="pointer-events-none self-center rounded-full border border-cyan-500 bg-cyan-950/90 px-4 py-1.5 font-mono text-xs font-bold text-cyan-300 shadow-xl backdrop-blur-md animate-pulse">
          ⚡ 0.25x SLOW MOTION ACTIVE (Spacebar to toggle)
        </div>
      )}

      {/* BOTTOM SECTION: Telemetry Grid, TTC Alert Bar, Tracking Pill */}
      <div className="flex flex-col gap-3">
        {/* Genuine Hazard TTC Collision Alert Bar */}
        {analytics.activeAlerts.length > 0 && (
          <div className="pointer-events-auto self-start flex items-center gap-3 rounded-xl border border-red-500/80 bg-red-950/90 p-3 font-mono text-xs text-red-200 shadow-2xl backdrop-blur-xl animate-bounce">
            <AlertTriangle className="size-5 shrink-0 text-red-400 animate-ping" />
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-red-100">
                  {analytics.activeAlerts[0].label1} × {analytics.activeAlerts[0].label2}
                </span>
                <span className="rounded bg-red-900/80 px-1.5 py-0.5 text-[10px] font-bold text-red-200">
                  TTC {analytics.activeAlerts[0].ttcSec}s
                </span>
                <span className="text-[11px] text-red-300">
                  closing at {analytics.activeAlerts[0].closingSpeedKmh} km/h
                </span>
              </div>
              <p className="text-[10px] text-red-300/80 mt-0.5">{analytics.activeAlerts[0].detail}</p>
            </div>
          </div>
        )}

        <div className="flex items-end justify-between">
          {/* Bottom-Left: Monospace Telemetry Grid (Exact Video Format) */}
          <div className="pointer-events-auto rounded-2xl border border-slate-200/80 bg-white/90 p-4 font-mono text-xs text-slate-800 shadow-xl backdrop-blur-xl dark:border-slate-800/80 dark:bg-slate-950/90 dark:text-slate-200">
            {/* Red Alert Header Line */}
            <div className="flex items-center gap-2 text-red-500 font-bold pb-2 border-b border-slate-200 dark:border-slate-800 text-[11px]">
              <span className="size-2 rounded-full bg-red-500" />
              <span>
                {analytics.pedCount} PED · {analytics.carCount} CAR · {analytics.cycCount} CYC · {Math.round(zoneRadius * 2)}m ZONE
              </span>
            </div>

            {/* Monospace Key-Value Table */}
            <div className="mt-2.5 space-y-1 text-[11px]">
              <div className="flex justify-between gap-6">
                <span className="text-slate-400">tracked</span>
                <span className="font-bold text-cyan-600 dark:text-cyan-400">{analytics.trackedCount}</span>
              </div>
              <div className="flex justify-between gap-6">
                <span className="text-slate-400">close</span>
                <span className="font-bold text-amber-500">{analytics.closeCallsCount}</span>
              </div>
              <div className="flex justify-between gap-6">
                <span className="text-slate-400">preempt</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400">{analytics.signalsPreempted}</span>
              </div>
              <div className="flex justify-between gap-6">
                <span className="text-slate-400">saved</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400">+{analytics.corridorTimeSavedSec.toFixed(1)}s</span>
              </div>
              <div className="flex justify-between gap-6">
                <span className="text-slate-400">fps</span>
                <span className="font-medium text-slate-500">{analytics.fps} fps</span>
              </div>
            </div>
          </div>

          {/* Bottom Center: Tracking / Navigation Pill */}
          <div className="pointer-events-auto flex flex-col items-center gap-1.5">
            {selectedAgentLabel ? (
              <div className="flex items-center gap-2 rounded-full border border-slate-700/80 bg-slate-950/90 px-4 py-1.5 font-mono text-xs font-semibold text-white shadow-xl backdrop-blur-md">
                <span className="size-2 rounded-full bg-emerald-400 animate-ping" />
                <span>Tracking {selectedAgentLabel}</span>
                <span className="text-slate-400 font-normal">· click empty ground or Esc to release</span>
              </div>
            ) : null}

            <div className="rounded-full border border-slate-200/80 bg-white/80 px-4 py-1 font-mono text-[11px] text-slate-600 shadow-md backdrop-blur-md dark:border-slate-800 dark:bg-slate-950/80 dark:text-slate-400">
              Move: drag · Click: inspect · Space: slow time · [ ] / Scroll: radius
            </div>
          </div>

          {/* Bottom-Right Spacer */}
          <div className="w-48 hidden lg:block" />
        </div>
      </div>
    </div>
  );
}
