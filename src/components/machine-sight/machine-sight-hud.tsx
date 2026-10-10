// Editorial Machine Sight HUD with glowing border aura, dot-matrix cards, camera modes and real-time telemetry
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
  Crosshair,
  ShieldCheck,
  Activity,
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
    <div className="pointer-events-none absolute inset-0 z-20 flex flex-col justify-between p-5 sm:p-7">
      {/* TOP SECTION: Glass Cyber Header & Mission Controller */}
      <div className="flex items-start justify-between gap-4 sm:gap-6">
        {/* Top-Left: Glowing Cyber HUD Card with Controls */}
        <div className="pointer-events-auto max-w-lg rounded-3xl border border-indigo-500/30 bg-slate-950/85 p-5 shadow-[0_0_35px_-5px_rgba(99,102,241,0.3)] backdrop-blur-2xl dot-pattern-card space-y-3">
          {/* Node Badge */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="size-2 rounded-full bg-emerald-400 animate-ping" />
            <span className="font-mono text-[11px] font-bold tracking-widest text-emerald-400 uppercase">
              NODE 07 · COCHIN SMART CORRIDOR
            </span>
            <span className="rounded-full border border-indigo-400/40 bg-indigo-500/15 px-2.5 py-0.5 font-mono text-[9px] font-semibold text-indigo-300">
              Live 3D Perception
            </span>
          </div>

          {/* Large Title */}
          <div className="flex items-baseline gap-3">
            <h1 className="font-display text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
              Machine Sight
            </h1>
            <span className="text-[10px] font-mono font-bold tracking-wider uppercase px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
              Vibrant 3D
            </span>
          </div>

          {/* Subtitle Description */}
          <p className="font-sans text-xs leading-relaxed text-slate-300/90">
            Real-time urban perception model simulating 16×16 blocks, dynamic multi-agent traffic, and green corridor safety preemption.
          </p>

          {/* Sensor Mode Switcher Pills */}
          <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-indigo-500/20">
            <button
              onClick={() => onSetSensorMode("lidar")}
              className={`flex items-center gap-1.5 rounded-full px-3.5 py-1.5 font-mono text-xs font-semibold transition ${
                sensorMode === "lidar"
                  ? "bg-indigo-600 text-white shadow-[0_0_15px_rgba(99,102,241,0.6)] border border-indigo-400"
                  : "bg-slate-900/80 text-slate-300 hover:text-white border border-slate-700/60 hover:border-indigo-400/40"
              }`}
            >
              <Activity className="size-3" />
              <span>1. LIDAR</span>
            </button>

            <button
              onClick={() => onSetSensorMode("segments")}
              className={`flex items-center gap-1.5 rounded-full px-3.5 py-1.5 font-mono text-xs font-semibold transition ${
                sensorMode === "segments"
                  ? "bg-emerald-600 text-white shadow-[0_0_15px_rgba(16,185,129,0.6)] border border-emerald-400"
                  : "bg-slate-900/80 text-slate-300 hover:text-white border border-slate-700/60 hover:border-emerald-400/40"
              }`}
            >
              <Sparkles className="size-3" />
              <span>2. Segments</span>
            </button>

            <button
              onClick={() => onSetSensorMode("depth")}
              className={`flex items-center gap-1.5 rounded-full px-3.5 py-1.5 font-mono text-xs font-semibold transition ${
                sensorMode === "depth"
                  ? "bg-sky-600 text-white shadow-[0_0_15px_rgba(14,165,233,0.6)] border border-sky-400"
                  : "bg-slate-900/80 text-slate-300 hover:text-white border border-slate-700/60 hover:border-sky-400/40"
              }`}
            >
              <Crosshair className="size-3" />
              <span>3. Depth</span>
            </button>

            {/* Quality toggle */}
            <button
              onClick={onToggleLowQuality}
              className={`rounded-full border px-2.5 py-1 font-mono text-[10px] transition ${
                lowQuality
                  ? "border-amber-400 bg-amber-500/20 text-amber-300 font-bold"
                  : "border-slate-700 bg-slate-900/70 text-slate-400 hover:text-slate-200"
              }`}
            >
              {lowQuality ? "LOW Q" : "HIGH Q (60fps)"}
            </button>
          </div>

          {/* Camera View Switcher Bar */}
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <button
              onClick={() => onSetCameraMode(cameraMode === "overview" ? "follow_ambulance" : "overview")}
              className={`flex items-center gap-1.5 rounded-xl px-3 py-1 font-mono text-[11px] border transition ${
                cameraMode === "overview"
                  ? "bg-indigo-500/25 border-indigo-400 text-indigo-300 font-bold shadow-[0_0_12px_rgba(99,102,241,0.4)]"
                  : "bg-slate-900/70 border-slate-700/60 text-slate-400 hover:text-slate-200"
              }`}
            >
              <Maximize2 className="size-3" />
              <span>{cameraMode === "overview" ? "City Overview" : "Overview"}</span>
            </button>

            <button
              onClick={() => onSetCameraMode("follow_ambulance")}
              className={`flex items-center gap-1.5 rounded-xl px-3 py-1 font-mono text-[11px] border transition ${
                cameraMode === "follow_ambulance"
                  ? "bg-emerald-500/25 border-emerald-400 text-emerald-300 font-bold shadow-[0_0_12px_rgba(16,185,129,0.4)]"
                  : "bg-slate-900/70 border-slate-700/60 text-slate-400 hover:text-slate-200"
              }`}
            >
              <Navigation className="size-3" />
              <span>Follow AMB 01</span>
            </button>

            <button
              onClick={onToggleLockAmbulance}
              className={`flex items-center gap-1.5 rounded-xl px-3 py-1 font-mono text-[11px] border transition ${
                isLockedToAmbulance
                  ? "bg-orange-500/25 border-orange-400 text-orange-300 font-bold shadow-[0_0_12px_rgba(249,115,22,0.4)]"
                  : "bg-slate-900/70 border-slate-700/60 text-slate-400 hover:text-slate-200"
              }`}
              title="Lock focus to lead emergency ambulance"
            >
              {isLockedToAmbulance ? <Lock className="size-3" /> : <Unlock className="size-3" />}
              <span>{isLockedToAmbulance ? "Locked to AMB" : "Free Camera"}</span>
            </button>
          </div>
        </div>

        {/* Top-Right: Mission Operator Card */}
        <div className="pointer-events-auto w-64 sm:w-72 rounded-3xl border border-indigo-500/30 bg-slate-950/85 p-4 shadow-[0_0_30px_-5px_rgba(99,102,241,0.3)] backdrop-blur-2xl dot-pattern-card font-mono text-xs text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="size-2 rounded-full bg-emerald-400 animate-ping" />
              <span className="font-bold tracking-tight text-white uppercase">Mission Control</span>
            </div>
            <button
              onClick={() => setMissionCardOpen(!missionCardOpen)}
              className="text-slate-400 hover:text-white transition p-1"
            >
              {missionCardOpen ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
            </button>
          </div>

          <div className={`mt-3 space-y-2.5 pt-2 border-t border-indigo-500/20 ${missionCardOpen ? "block" : "hidden sm:block"}`}>
            <div className="flex items-center gap-2">
              <Button
                onClick={onTogglePlay}
                size="sm"
                className={`flex-1 font-mono text-xs font-bold transition ${
                  isRunning
                    ? "bg-amber-500 text-slate-950 hover:bg-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.4)]"
                    : "bg-emerald-500 text-white hover:bg-emerald-600 shadow-[0_0_15px_rgba(16,185,129,0.4)]"
                }`}
              >
                {isRunning ? <Pause className="mr-1 size-3.5" /> : <Play className="mr-1 size-3.5" />}
                {isRunning ? "PAUSE" : "START"}
              </Button>
              <Button
                onClick={onReset}
                variant="outline"
                size="sm"
                className="border-slate-700 bg-slate-900/80 text-slate-300 hover:bg-slate-800 hover:text-white"
              >
                <RotateCcw className="size-3.5" />
              </Button>
            </div>

            <div className="flex items-center justify-between text-[11px] pt-1">
              <span className="text-slate-400">Green Corridor:</span>
              <button
                onClick={onToggleGreenCorridor}
                className={`rounded-full px-2.5 py-0.5 font-bold transition text-[10px] ${
                  greenCorridorActive
                    ? "bg-emerald-500/20 text-emerald-300 border border-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.3)]"
                    : "bg-slate-800 text-slate-400 border border-slate-700"
                }`}
              >
                {greenCorridorActive ? "PREEMPTION ON" : "OFF"}
              </button>
            </div>

            <div className="flex items-center justify-between text-[11px]">
              <span className="text-slate-400">Baseline Mode:</span>
              <button
                onClick={onToggleCompare}
                className={`rounded-full px-2.5 py-0.5 font-bold transition text-[10px] ${
                  compareMode
                    ? "bg-cyan-500/20 text-cyan-300 border border-cyan-400 shadow-[0_0_10px_rgba(6,182,212,0.3)]"
                    : "bg-slate-800 text-slate-400 border border-slate-700"
                }`}
              >
                {compareMode ? "COMPARE" : "NORMAL"}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* MIDDLE: Slow Motion Indicator */}
      {isSlowMotion && (
        <div className="pointer-events-none self-center rounded-full border border-cyan-400 bg-cyan-950/90 px-5 py-2 font-mono text-xs font-bold text-cyan-300 shadow-[0_0_25px_rgba(6,182,212,0.5)] backdrop-blur-md animate-pulse">
          ⚡ 0.25x SLOW MOTION ACTIVE (Press Spacebar to toggle)
        </div>
      )}

      {/* BOTTOM SECTION: Telemetry Grid, TTC Alert Bar, Tracking Pill */}
      <div className="flex flex-col gap-3">
        {/* Collision Alert Bar (TTC Hazard) */}
        {analytics.activeAlerts.length > 0 && (
          <div className="pointer-events-auto self-start flex items-center gap-3 rounded-2xl border border-rose-500/80 bg-rose-950/90 p-3.5 font-mono text-xs text-rose-200 shadow-[0_0_30px_rgba(244,63,94,0.4)] backdrop-blur-xl animate-bounce">
            <AlertTriangle className="size-5 shrink-0 text-rose-400 animate-ping" />
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-white">
                  {analytics.activeAlerts[0].label1} × {analytics.activeAlerts[0].label2}
                </span>
                <span className="rounded bg-rose-900 px-1.5 py-0.5 text-[10px] font-bold text-rose-100">
                  TTC {analytics.activeAlerts[0].ttcSec}s
                </span>
                <span className="text-[11px] text-rose-300">
                  closing at {analytics.activeAlerts[0].closingSpeedKmh} km/h
                </span>
              </div>
              <p className="text-[10px] text-rose-300/80 mt-0.5">{analytics.activeAlerts[0].detail}</p>
            </div>
          </div>
        )}

        <div className="flex items-end justify-between">
          {/* Bottom-Left: Monospace Telemetry Grid */}
          <div className="pointer-events-auto rounded-3xl border border-indigo-500/30 bg-slate-950/85 p-5 font-mono text-xs text-slate-200 shadow-[0_0_35px_-5px_rgba(99,102,241,0.35)] backdrop-blur-2xl dot-pattern-card min-w-[290px]">
            {/* Header Line */}
            <div className="flex items-center gap-2 text-rose-400 font-bold pb-2.5 border-b border-indigo-500/20 text-[11px]">
              <span className="size-2 rounded-full bg-rose-500 animate-pulse" />
              <span>
                {analytics.pedCount} PED · {analytics.carCount} CAR · {analytics.cycCount} CYC · {Math.round(zoneRadius * 2)}m ZONE
              </span>
            </div>

            {/* Monospace Key-Value Table */}
            <div className="mt-3 space-y-1.5 text-[11px]">
              <div className="flex justify-between gap-6">
                <span className="text-slate-400">tracked agents</span>
                <span className="font-bold text-cyan-400">{analytics.trackedCount}</span>
              </div>
              <div className="flex justify-between gap-6">
                <span className="text-slate-400">close calls</span>
                <span className="font-bold text-amber-400">{analytics.closeCallsCount}</span>
              </div>
              <div className="flex justify-between gap-6">
                <span className="text-slate-400">signals preempted</span>
                <span className="font-bold text-emerald-400">{analytics.signalsPreempted}</span>
              </div>
              <div className="flex justify-between gap-6">
                <span className="text-slate-400">time saved</span>
                <span className="font-bold text-emerald-400">+{analytics.corridorTimeSavedSec.toFixed(1)}s</span>
              </div>
              <div className="flex justify-between gap-6">
                <span className="text-slate-400">engine fps</span>
                <span className="font-medium text-emerald-400">{analytics.fps} fps</span>
              </div>
            </div>
          </div>

          {/* Bottom Center: Tracking / Navigation Pill */}
          <div className="pointer-events-auto flex flex-col items-center gap-2">
            {selectedAgentLabel ? (
              <div className="flex items-center gap-2 rounded-full border border-emerald-400/60 bg-slate-950/90 px-5 py-2 font-mono text-xs font-semibold text-white shadow-[0_0_25px_rgba(16,185,129,0.4)] backdrop-blur-xl">
                <span className="size-2 rounded-full bg-emerald-400 animate-ping" />
                <span>Tracking {selectedAgentLabel}</span>
                <span className="text-slate-400 font-normal">· click ground or Esc to release</span>
              </div>
            ) : null}

            <div className="rounded-full border border-indigo-500/30 bg-slate-950/85 px-5 py-1.5 font-mono text-[11px] text-indigo-200/90 shadow-[0_0_20px_-3px_rgba(99,102,241,0.3)] backdrop-blur-xl dot-pattern-card">
              Drag: rotate · Click: inspect agent · Space: slow motion · Scroll: zoom
            </div>
          </div>

          {/* Bottom-Right Spacer for balanced visual layout */}
          <div className="w-48 hidden lg:block" />
        </div>
      </div>
    </div>
  );
}
