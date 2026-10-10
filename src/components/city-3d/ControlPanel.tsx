import { useState, useCallback } from 'react';
import {
  Activity, Siren, Volume2, VolumeX, Car, Eye, EyeOff,
  Pause, Play, RotateCw, Ambulance,
  Gauge, MapPin, Navigation, Maximize2, X, Zap,
} from 'lucide-react';
import type { Direction } from '@/lib/city-sim/types';
import type { TrafficEngine } from '@/lib/city-sim/engine';
import { BACKEND_AVAILABLE } from '@/lib/city-sim/civicApi';

export interface SnapshotData {
  vehicles: Array<{
    id: number;
    kind: string;
    position: [number, number, number];
    heading: number;
    brakeLight: boolean;
    isEmergency: boolean;
    speed: number;
    phase: string;
  }>;
  signals: Record<Direction, 'red' | 'amber' | 'green'>;
  signalTimers: Record<Direction, number>;
  emergencyActive: boolean;
  emergencyPhase: number;
  emergencyApproach: Direction | null;
  vehicleCount: number;
  paused: boolean;
  simSpeed: number;
  ambulanceId: number | null;
}

interface ControlPanelProps {
  snapshot: SnapshotData | null;
  engine: TrafficEngine;
  onActivateEmergency: () => void;
  onDeactivateEmergency: () => void;
  onToggleSiren: () => void;
  sirenEnabled: boolean;
  followAmbulance: boolean;
  onToggleFollowAmbulance: () => void;
  selectedVehicleId: number | null;
  onSelectVehicle: (id: number | null) => void;
}

const SIGNAL_COLOR: Record<string, string> = {
  green: '#22c55e',
  amber: '#f59e0b',
  red: '#ef4444',
};

const SIGNAL_SHADOW: Record<string, string> = {
  green: '0 0 10px rgba(34,197,94,0.7)',
  amber: '0 0 10px rgba(245,158,11,0.7)',
  red: '0 0 10px rgba(239,68,68,0.7)',
};

export function ControlPanel({
  snapshot,
  engine,
  onActivateEmergency,
  onDeactivateEmergency,
  onToggleSiren,
  sirenEnabled,
  followAmbulance,
  onToggleFollowAmbulance,
  selectedVehicleId,
  onSelectVehicle,
}: ControlPanelProps) {
  const [showStats, setShowStats] = useState(false);
  const [showVehicleList, setShowVehicleList] = useState(false);
  const [localSpeed, setLocalSpeed] = useState(1.0);

  const paused = snapshot?.paused ?? false;

  const handlePauseResume = useCallback(() => {
    if (paused) engine.resume();
    else engine.pause();
  }, [paused, engine]);

  const handleReset = useCallback(() => {
    engine.reset();
    onSelectVehicle(null);
  }, [engine, onSelectVehicle]);

  const handleSpeedChange = useCallback((val: number) => {
    setLocalSpeed(val);
    engine.setSpeed(val);
  }, [engine]);

  const handleFollowAmbulanceClick = useCallback(() => {
    if (!snapshot?.emergencyActive) {
      onActivateEmergency();
    } else {
      onToggleFollowAmbulance();
    }
  }, [snapshot?.emergencyActive, onActivateEmergency, onToggleFollowAmbulance]);

  const selectedVehicle = snapshot?.vehicles.find(v => v.id === selectedVehicleId);

  return (
    <>
      {/* Top Floating Bar */}
      <div className="absolute top-0 left-0 right-0 z-10 pointer-events-none">
        <div className="flex items-start justify-between p-3 sm:p-4 gap-2 sm:gap-3">
          {/* Logo Badge */}
          <div className="pointer-events-auto bg-slate-950/85 backdrop-blur-xl rounded-2xl px-4 py-2 border border-indigo-400/30 shadow-[0_0_20px_-3px_rgba(139,92,246,0.3)] flex-shrink-0 dot-pattern-card">
            <div className="flex items-center gap-2">
              <span className="size-2 rounded-full bg-emerald-400 animate-ping" />
              <span className="text-white font-bold text-sm sm:text-base tracking-wide">CivicPulse 3D</span>
              <span className="text-cyan-400 font-mono text-[11px] font-semibold hidden sm:inline">KOCHI TWIN</span>
            </div>
          </div>

          {/* Real-time Signals Status */}
          <div className="pointer-events-auto bg-slate-950/85 backdrop-blur-xl rounded-2xl px-3 sm:px-4 py-2 border border-indigo-400/30 shadow-[0_0_20px_-3px_rgba(139,92,246,0.3)] dot-pattern-card">
            <div className="flex items-center gap-2.5 sm:gap-3">
              <span className="text-slate-400 text-[10px] font-mono font-medium uppercase tracking-wider hidden sm:inline">Signals</span>
              <div className="flex gap-2.5">
                {(['north', 'south', 'east', 'west'] as Direction[]).map(dir => {
                  const state = snapshot?.signals[dir] ?? 'red';
                  const timer = snapshot?.signalTimers[dir];
                  return (
                    <div key={dir} className="flex flex-col items-center gap-0.5">
                      <div
                        className="w-3 h-3 rounded-full transition-colors duration-300"
                        style={{
                          backgroundColor: SIGNAL_COLOR[state],
                          boxShadow: SIGNAL_SHADOW[state],
                        }}
                      />
                      <span className="text-slate-400 text-[8px] font-mono uppercase">{dir[0]}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Simulation Speed & Pause Controls */}
          <div className="pointer-events-auto bg-slate-950/85 backdrop-blur-xl rounded-2xl px-3 py-2 border border-indigo-400/30 shadow-[0_0_20px_-3px_rgba(139,92,246,0.3)] flex-shrink-0 dot-pattern-card">
            <div className="flex items-center gap-1.5 sm:gap-2">
              <button
                onClick={handlePauseResume}
                className={`p-1.5 rounded-lg transition-colors ${paused ? 'bg-cyan-500 text-slate-950 font-bold' : 'text-slate-300 hover:bg-slate-800'}`}
                title={paused ? 'Resume simulation' : 'Pause simulation'}
              >
                {paused ? <Play size={13} /> : <Pause size={13} />}
              </button>
              <button
                onClick={handleReset}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                title="Reset simulation traffic"
              >
                <RotateCw size={13} />
              </button>
              <div className="hidden sm:flex items-center gap-1 ml-1 border-l border-indigo-500/20 pl-2">
                {[1.0, 2.0].map(sp => (
                  <button
                    key={sp}
                    onClick={() => handleSpeedChange(sp)}
                    className={`px-2 py-0.5 rounded-md font-mono text-[10px] font-bold transition ${
                      localSpeed === sp && !paused
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {sp}x
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Floating Vehicle Inspector Badge (When a car is selected or clicked) */}
      {selectedVehicle && (
        <div className="absolute top-16 left-4 z-20 pointer-events-auto animate-in fade-in slide-in-from-left duration-200">
          <div className="bg-slate-950/90 backdrop-blur-xl rounded-2xl border border-cyan-400/40 p-3 shadow-[0_0_25px_-5px_rgba(6,182,212,0.4)] text-white font-mono text-xs dot-pattern-card w-64">
            <div className="flex items-center justify-between pb-2 border-b border-indigo-500/20">
              <div className="flex items-center gap-1.5">
                <Car size={13} className="text-cyan-400" />
                <span className="font-bold text-cyan-300">#{selectedVehicle.id} ({selectedVehicle.kind})</span>
              </div>
              <button
                onClick={() => onSelectVehicle(null)}
                className="text-slate-400 hover:text-white p-0.5"
                title="Deselect"
              >
                <X size={13} />
              </button>
            </div>
            <div className="grid grid-cols-3 gap-2 pt-2 text-center text-[11px]">
              <div className="bg-slate-900/80 rounded-lg p-1.5">
                <div className="font-bold text-white">{(selectedVehicle.speed * 3.6).toFixed(0)}</div>
                <div className="text-[9px] text-slate-400">km/h</div>
              </div>
              <div className="bg-slate-900/80 rounded-lg p-1.5">
                <div className="font-bold text-amber-400 capitalize">{selectedVehicle.phase}</div>
                <div className="text-[9px] text-slate-400">Phase</div>
              </div>
              <div className="bg-slate-900/80 rounded-lg p-1.5">
                <div className={`font-bold ${selectedVehicle.brakeLight ? 'text-rose-400' : 'text-slate-400'}`}>
                  {selectedVehicle.brakeLight ? 'BRAKE' : 'FLOW'}
                </div>
                <div className="text-[9px] text-slate-400">Status</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bottom Compact Cyber Dock */}
      <div className="absolute bottom-0 left-0 right-0 z-10 pointer-events-none">
        <div className="flex items-end justify-center p-3 sm:p-5">
          <div className="pointer-events-auto bg-slate-950/85 backdrop-blur-xl rounded-3xl border border-indigo-400/35 shadow-[0_0_35px_-4px_rgba(139,92,246,0.35)] p-3 sm:p-4 w-full max-w-2xl dot-pattern-card">
            
            {/* Primary Action Row */}
            <div className="flex items-center gap-2 sm:gap-3 flex-wrap justify-between">
              
              {/* Emergency Corridor Toggle Button */}
              <button
                onClick={snapshot?.emergencyActive ? onDeactivateEmergency : onActivateEmergency}
                className={`flex items-center gap-2 px-4 sm:px-5 py-2 sm:py-2.5 rounded-2xl font-bold transition-all duration-200 text-xs sm:text-sm cursor-pointer ${
                  snapshot?.emergencyActive
                    ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-[0_0_25px_rgba(244,63,94,0.6)] border border-rose-400 animate-pulse'
                    : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-[0_0_20px_rgba(99,102,241,0.4)] border border-indigo-400/50'
                }`}
              >
                <Siren className="w-4 h-4 shrink-0" />
                <span>{snapshot?.emergencyActive ? 'Emergency Active (Preempted)' : 'Instant Emergency Corridor'}</span>
              </button>

              {/* Follow Ambulance Camera */}
              <button
                onClick={handleFollowAmbulanceClick}
                className={`flex items-center gap-1.5 px-3 sm:px-4 py-2 sm:py-2.5 rounded-2xl font-semibold transition-all duration-200 text-xs sm:text-sm cursor-pointer ${
                  followAmbulance && snapshot?.emergencyActive
                    ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-[0_0_20px_rgba(245,158,11,0.5)] border border-amber-300'
                    : 'bg-slate-900/90 hover:bg-slate-800 text-slate-200 border border-slate-700/60 hover:border-amber-400/50'
                }`}
                title="Follow ambulance camera with smooth tracking"
              >
                <Ambulance size={15} />
                <span>{followAmbulance && snapshot?.emergencyActive ? 'Tracking AMB' : 'Follow Ambulance'}</span>
              </button>

              {/* Siren Toggle Button */}
              <button
                onClick={onToggleSiren}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-2xl font-medium transition-all text-xs cursor-pointer ${
                  sirenEnabled
                    ? 'bg-cyan-500/25 text-cyan-300 border border-cyan-400 shadow-[0_0_12px_rgba(6,182,212,0.4)]'
                    : 'bg-slate-900/80 text-slate-400 border border-slate-700/60 hover:text-white'
                }`}
                title="Toggle Emergency Siren Audio"
              >
                {sirenEnabled ? <Volume2 size={14} /> : <VolumeX size={14} />}
                <span className="hidden sm:inline">{sirenEnabled ? 'Siren On' : 'Muted'}</span>
              </button>

              {/* Quick Vehicle Selector */}
              <button
                onClick={() => setShowVehicleList(v => !v)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-2xl font-medium transition-all text-xs cursor-pointer ${
                  showVehicleList || selectedVehicleId
                    ? 'bg-indigo-500/25 text-indigo-300 border border-indigo-400'
                    : 'bg-slate-900/80 text-slate-400 border border-slate-700/60 hover:text-white'
                }`}
              >
                <Car size={14} />
                <span>{selectedVehicleId ? `#${selectedVehicleId}` : 'Vehicles'}</span>
              </button>

              {/* Stats Ribbon Toggle */}
              <button
                onClick={() => setShowStats(s => !s)}
                className="flex items-center gap-1 px-2.5 py-2 rounded-2xl text-xs text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
                title="Toggle metrics summary"
              >
                {showStats ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>

            {/* Vehicle Chip List Dropdown */}
            {showVehicleList && (
              <div className="mt-3 pt-2.5 border-t border-indigo-500/20">
                <div className="flex items-center justify-between gap-2 mb-2 font-mono text-[11px] text-slate-400">
                  <div className="flex items-center gap-1.5">
                    <MapPin size={12} className="text-cyan-400" />
                    <span>Active Vehicles ({snapshot?.vehicleCount ?? 0})</span>
                  </div>
                  {selectedVehicleId && (
                    <button
                      onClick={() => { onSelectVehicle(null); }}
                      className="text-[10px] text-slate-400 hover:text-white px-2 py-0.5 bg-slate-800 rounded-md"
                    >
                      Clear Target
                    </button>
                  )}
                </div>
                <div className="max-h-24 overflow-y-auto flex flex-wrap gap-1.5">
                  {snapshot?.vehicles.map(v => (
                    <button
                      key={v.id}
                      onClick={() => {
                        onSelectVehicle(v.id === selectedVehicleId ? null : v.id);
                        setShowVehicleList(false);
                      }}
                      className={`text-[10px] font-mono px-2 py-1 rounded-lg border transition ${
                        v.id === selectedVehicleId
                          ? 'border-cyan-400 bg-cyan-950 text-cyan-300 font-bold'
                          : v.isEmergency
                          ? 'border-rose-400 bg-rose-950 text-rose-300'
                          : 'border-slate-800 bg-slate-900 text-slate-300 hover:border-slate-700'
                      }`}
                    >
                      {v.isEmergency ? '🚑' : v.kind === 'bus' ? '🚌' : v.kind === 'motorcycle' ? '🏍' : '🚗'} #{v.id}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Compact Live Telemetry Bar */}
            <div className={`mt-2.5 pt-2 border-t border-indigo-500/20 flex items-center justify-between font-mono text-[11px] text-slate-300 flex-wrap gap-2 ${showStats ? "block" : "flex"}`}>
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1.5">
                  <Car size={13} className="text-indigo-400" />
                  <span className="font-bold text-white">{snapshot?.vehicleCount ?? 0}</span>
                  <span className="text-slate-400">Active</span>
                </span>
                <span className="text-slate-600">·</span>
                <span className="flex items-center gap-1.5">
                  <span className={`size-2 rounded-full ${snapshot?.emergencyActive ? 'bg-rose-500 animate-ping' : 'bg-emerald-400'}`} />
                  <span className={snapshot?.emergencyActive ? 'text-rose-400 font-bold' : 'text-slate-300'}>
                    {snapshot?.emergencyActive ? 'Corridor Preempted' : 'Normal Flow'}
                  </span>
                </span>
              </div>

              <div className="flex items-center gap-2 text-slate-400 text-[10px]">
                <span>Speed: <strong className="text-emerald-400">{(snapshot?.simSpeed ?? 1).toFixed(1)}x</strong></span>
                <span>·</span>
                <span>Click car to track</span>
              </div>
            </div>

            {/* Extended Stats when toggled on */}
            {showStats && (
              <div className="mt-2 pt-2 border-t border-indigo-500/20 grid grid-cols-4 gap-2 text-center font-mono">
                <div className="bg-slate-900/60 rounded-xl p-2">
                  <div className="text-lg font-bold text-white">{snapshot?.vehicleCount ?? 0}</div>
                  <div className="text-[9px] text-slate-400 uppercase">Vehicles</div>
                </div>
                <div className="bg-slate-900/60 rounded-xl p-2">
                  <div className={`text-lg font-bold ${snapshot?.emergencyActive ? 'text-rose-400' : 'text-slate-500'}`}>
                    {snapshot?.emergencyActive ? 'ACTIVE' : 'OFF'}
                  </div>
                  <div className="text-[9px] text-slate-400 uppercase">Corridor</div>
                </div>
                <div className="bg-slate-900/60 rounded-xl p-2">
                  <div className="text-sm font-semibold text-slate-200 truncate mt-0.5">
                    {snapshot?.emergencyActive ? 'Ambulance En Route' : 'Dynamic Signals'}
                  </div>
                  <div className="text-[9px] text-slate-400 uppercase">Phase</div>
                </div>
                <div className="bg-slate-900/60 rounded-xl p-2">
                  <div className="text-lg font-bold text-emerald-400">
                    {paused ? 'PAUSED' : `${(snapshot?.simSpeed ?? 1).toFixed(1)}x`}
                  </div>
                  <div className="text-[9px] text-slate-400 uppercase">Rate</div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Floating Interaction Hint */}
      <div className="absolute left-4 top-1/2 -translate-y-1/2 z-10 pointer-events-none hidden sm:block">
        <div className="bg-slate-950/70 backdrop-blur-md rounded-xl px-3 py-2 border border-indigo-500/25 shadow-lg dot-pattern-card">
          <p className="text-slate-300 font-mono text-[10px]">Drag to orbit · Scroll to zoom</p>
          <p className="text-indigo-300/80 font-mono text-[10px] mt-0.5">Click any vehicle to inspect</p>
          {followAmbulance && snapshot?.emergencyActive && (
            <p className="text-amber-400 font-mono text-[10px] mt-1 font-bold animate-pulse">📷 Tracking Ambulance</p>
          )}
        </div>
      </div>
    </>
  );
}
