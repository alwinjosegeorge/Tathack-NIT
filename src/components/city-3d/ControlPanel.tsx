import { useState, useCallback } from 'react';
import {
  Activity, Siren, Volume2, VolumeX, Car, Eye, EyeOff,
  Pause, Play, RotateCw, ChevronsRight, Ambulance,
  Gauge, MapPin, Clock,
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
  const [showStats, setShowStats] = useState(true);
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

  const emergencyPhaseLabel = (() => {
    if (!snapshot?.emergencyActive) return 'Inactive';
    switch (Math.floor(snapshot.emergencyPhase)) {
      case 1: return 'Pre-clearing corridor';
      case 1.5: return 'Amber transition';
      case 2: return 'Ambulance en route';
      case 3: return 'Returning to normal';
      default: return 'Active';
    }
  })();

  const selectedVehicle = snapshot?.vehicles.find(v => v.id === selectedVehicleId);

  return (
    <>
      {/* Top bar */}
      <div className="absolute top-0 left-0 right-0 z-10 pointer-events-none">
        <div className="flex items-start justify-between p-4 gap-3">
          {/* Logo */}
          <div className="pointer-events-auto bg-slate-900/90 backdrop-blur-md rounded-2xl px-5 py-3 border border-indigo-400/30 shadow-[0_0_20px_-3px_rgba(139,92,246,0.3)] flex-shrink-0 dot-pattern-card">
            <div className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-cyan-400" />
              <span className="text-white font-bold text-lg tracking-wide">CivicPulse</span>
              <span className="text-cyan-400/70 text-sm font-medium ml-1">Traffic Sim</span>
              {!BACKEND_AVAILABLE && (
                <span className="text-[9px] px-1.5 py-0.5 bg-amber-900/50 text-amber-400 rounded border border-amber-700/40 ml-1">
                  SIM ONLY
                </span>
              )}
            </div>
          </div>

          {/* Signal indicators */}
          <div className="pointer-events-auto bg-slate-900/90 backdrop-blur-md rounded-2xl px-4 py-3 border border-indigo-400/30 shadow-[0_0_20px_-3px_rgba(139,92,246,0.3)] dot-pattern-card">
            <div className="flex items-center gap-3">
              <span className="text-slate-400 text-xs font-medium uppercase tracking-wider">Signals</span>
              <div className="flex gap-3">
                {(['north', 'south', 'east', 'west'] as Direction[]).map(dir => {
                  const state = snapshot?.signals[dir] ?? 'red';
                  const timer = snapshot?.signalTimers[dir];
                  return (
                    <div key={dir} className="flex flex-col items-center gap-1">
                      <div
                        className="w-3.5 h-3.5 rounded-full transition-colors duration-300"
                        style={{
                          backgroundColor: SIGNAL_COLOR[state],
                          boxShadow: SIGNAL_SHADOW[state],
                        }}
                      />
                      <span className="text-slate-400 text-[9px] uppercase">{dir[0]}</span>
                      {timer !== undefined && timer < 8 && (
                        <span className="text-[8px] font-mono" style={{ color: SIGNAL_COLOR[state] }}>
                          {Math.ceil(timer)}s
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Sim control mini */}
          <div className="pointer-events-auto bg-slate-900/90 backdrop-blur-md rounded-2xl px-4 py-3 border border-indigo-400/30 shadow-[0_0_20px_-3px_rgba(139,92,246,0.3)] flex-shrink-0 dot-pattern-card">
            <div className="flex items-center gap-2">
              <button
                onClick={handlePauseResume}
                className={`p-1.5 rounded-lg transition-colors ${paused ? 'bg-cyan-600 text-white' : 'text-slate-300 hover:bg-slate-700'}`}
                title={paused ? 'Resume' : 'Pause'}
              >
                {paused ? <Play size={14} /> : <Pause size={14} />}
              </button>
              <button
                onClick={handleReset}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
                title="Reset simulation"
              >
                <RotateCw size={14} />
              </button>
              <div className="flex items-center gap-1.5 ml-1">
                <Gauge size={12} className="text-slate-400" />
                <input
                  type="range"
                  min={0.25}
                  max={3}
                  step={0.25}
                  value={localSpeed}
                  onChange={e => handleSpeedChange(Number(e.target.value))}
                  className="w-20 h-1 accent-cyan-400"
                  title={`Sim speed: ${localSpeed}×`}
                />
                <span className="text-[10px] text-slate-300 w-6 text-right">{localSpeed}×</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom control panel */}
      <div className="absolute bottom-0 left-0 right-0 z-10 pointer-events-none">
        <div className="flex items-end justify-center p-4">
          <div className="pointer-events-auto bg-slate-900/90 backdrop-blur-md rounded-3xl border border-indigo-400/35 shadow-[0_0_35px_-4px_rgba(139,92,246,0.35)] p-4 w-full max-w-3xl dot-pattern-card">
            {/* Main controls row */}
            <div className="flex items-center gap-3 flex-wrap justify-between">

              {/* Emergency toggle */}
              <button
                onClick={snapshot?.emergencyActive ? onDeactivateEmergency : onActivateEmergency}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold transition-all duration-300 text-sm ${
                  snapshot?.emergencyActive
                    ? 'bg-red-600 hover:bg-red-500 text-white shadow-[0_0_20px_rgba(239,68,68,0.4)]'
                    : 'bg-slate-700 hover:bg-slate-600 text-white'
                }`}
              >
                {snapshot?.emergencyActive ? (
                  <Siren className="w-4 h-4 animate-pulse" />
                ) : (
                  <Siren className="w-4 h-4" />
                )}
                <span>{snapshot?.emergencyActive ? 'Emergency Active' : 'Activate Emergency'}</span>
              </button>

              {/* Follow ambulance */}
              <button
                onClick={onToggleFollowAmbulance}
                disabled={!snapshot?.emergencyActive}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium transition-all duration-300 text-sm ${
                  followAmbulance && snapshot?.emergencyActive
                    ? 'bg-amber-600 hover:bg-amber-500 text-white'
                    : 'bg-slate-700 hover:bg-slate-600 text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed'
                }`}
                title="Follow ambulance camera"
              >
                <Ambulance size={16} />
                <span>{followAmbulance ? 'Following' : 'Follow Ambulance'}</span>
              </button>

              {/* Siren toggle */}
              <button
                onClick={onToggleSiren}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium transition-all duration-300 text-sm ${
                  sirenEnabled
                    ? 'bg-blue-600 hover:bg-blue-500 text-white'
                    : 'bg-slate-700 hover:bg-slate-600 text-slate-300'
                }`}
              >
                {sirenEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
                <span>{sirenEnabled ? 'Siren On' : 'Siren Muted'}</span>
              </button>

              {/* Vehicle selector */}
              <button
                onClick={() => setShowVehicleList(v => !v)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium transition-all duration-300 text-sm ${
                  showVehicleList
                    ? 'bg-slate-600 text-white'
                    : 'bg-slate-700 hover:bg-slate-600 text-slate-300'
                }`}
              >
                <Car size={16} />
                <span>{selectedVehicleId ? `#${selectedVehicleId}` : 'Select Vehicle'}</span>
              </button>

              {/* Stats toggle */}
              <button
                onClick={() => setShowStats(s => !s)}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium bg-slate-700 hover:bg-slate-600 text-slate-300 transition-all duration-300 text-sm"
              >
                {showStats ? <EyeOff size={16} /> : <Eye size={16} />}
                <span>{showStats ? 'Hide Stats' : 'Show Stats'}</span>
              </button>
            </div>

            {/* Vehicle list dropdown */}
            {showVehicleList && (
              <div className="mt-3 pt-3 border-t border-slate-700/50">
                <div className="flex items-center gap-2 mb-2">
                  <MapPin size={12} className="text-cyan-400" />
                  <span className="text-xs text-slate-300 font-medium uppercase tracking-wider">Active Vehicles ({snapshot?.vehicleCount ?? 0})</span>
                  {selectedVehicleId && (
                    <button
                      onClick={() => { onSelectVehicle(null); onToggleFollowAmbulance(); }}
                      className="ml-auto text-[10px] text-slate-400 hover:text-white px-2 py-0.5 bg-slate-700 rounded"
                    >
                      Clear
                    </button>
                  )}
                </div>
                <div className="max-h-28 overflow-y-auto flex flex-wrap gap-1.5">
                  {snapshot?.vehicles.map(v => (
                    <button
                      key={v.id}
                      onClick={() => { onSelectVehicle(v.id === selectedVehicleId ? null : v.id); setShowVehicleList(false); }}
                      className={`text-[10px] px-2 py-1 rounded-lg border transition-colors ${
                        v.id === selectedVehicleId
                          ? 'border-cyan-500/70 bg-cyan-900/30 text-cyan-300'
                          : v.isEmergency
                            ? 'border-red-500/50 bg-red-900/20 text-red-300 hover:bg-red-900/30'
                            : 'border-slate-600/50 bg-slate-800/50 text-slate-300 hover:bg-slate-700/60'
                      }`}
                    >
                      {v.isEmergency ? '🚑' : v.kind === 'bus' ? '🚌' : v.kind === 'motorcycle' ? '🏍' : '🚗'} #{v.id}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Vehicle inspector */}
            {selectedVehicle && (
              <div className="mt-3 pt-3 border-t border-slate-700/50">
                <div className="flex items-center gap-2 mb-2">
                  <Car size={12} className="text-cyan-400" />
                  <span className="text-xs text-slate-300 font-medium uppercase tracking-wider">
                    Inspector — #{selectedVehicle.id} ({selectedVehicle.kind})
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div className="bg-slate-800/60 rounded-lg p-2 text-center">
                    <div className="text-lg font-bold text-white">{selectedVehicle.speed.toFixed(1)}</div>
                    <div className="text-slate-400 text-[9px] uppercase tracking-wider">m/s</div>
                  </div>
                  <div className="bg-slate-800/60 rounded-lg p-2 text-center">
                    <div className={`text-sm font-bold ${
                      selectedVehicle.phase === 'approach' ? 'text-blue-400'
                      : selectedVehicle.phase === 'intersection' ? 'text-amber-400'
                      : 'text-green-400'
                    }`}>{selectedVehicle.phase}</div>
                    <div className="text-slate-400 text-[9px] uppercase tracking-wider">Phase</div>
                  </div>
                  <div className="bg-slate-800/60 rounded-lg p-2 text-center">
                    <div className={`text-sm font-bold ${selectedVehicle.brakeLight ? 'text-red-400' : 'text-slate-400'}`}>
                      {selectedVehicle.brakeLight ? 'ON' : 'OFF'}
                    </div>
                    <div className="text-slate-400 text-[9px] uppercase tracking-wider">Brake</div>
                  </div>
                </div>
              </div>
            )}

            {/* Stats row */}
            {showStats && (
              <div className="mt-3 pt-3 border-t border-slate-700/50 grid grid-cols-4 gap-3">
                <div className="text-center">
                  <div className="text-2xl font-bold text-white">{snapshot?.vehicleCount ?? 0}</div>
                  <div className="text-slate-400 text-[9px] uppercase tracking-wider mt-0.5">Vehicles</div>
                </div>
                <div className="text-center">
                  <div className={`text-2xl font-bold ${snapshot?.emergencyActive ? 'text-red-400' : 'text-slate-500'}`}>
                    {snapshot?.emergencyActive ? 'ON' : 'OFF'}
                  </div>
                  <div className="text-slate-400 text-[9px] uppercase tracking-wider mt-0.5">Emergency</div>
                </div>
                <div className="text-center">
                  <div className="text-sm font-semibold text-slate-300 truncate">
                    {emergencyPhaseLabel}
                  </div>
                  <div className="text-slate-400 text-[9px] uppercase tracking-wider mt-0.5">Phase</div>
                </div>
                <div className="text-center">
                  <div className={`text-2xl font-bold ${paused ? 'text-amber-400' : 'text-green-400'}`}>
                    {paused ? '⏸' : `${(snapshot?.simSpeed ?? 1).toFixed(2)}×`}
                  </div>
                  <div className="text-slate-400 text-[9px] uppercase tracking-wider mt-0.5">
                    {paused ? 'Paused' : 'Speed'}
                  </div>
                </div>
              </div>
            )}

            {/* Emergency active message */}
            {snapshot?.emergencyActive && (
              <div className="mt-2 flex items-center gap-2 text-red-400 text-xs">
                <div className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
                <span>Emergency corridor active — ambulance en route
                  {snapshot.emergencyApproach && ` (${snapshot.emergencyApproach})`}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Side hint */}
      <div className="absolute left-4 top-1/2 -translate-y-1/2 z-10 pointer-events-none">
        <div className="bg-slate-900/60 backdrop-blur-sm rounded-lg px-3 py-2 border border-slate-700/30">
          <p className="text-slate-400 text-[11px]">Drag to orbit · Scroll to zoom</p>
          {followAmbulance && (
            <p className="text-amber-400 text-[10px] mt-0.5">📷 Following ambulance</p>
          )}
          {selectedVehicleId && !followAmbulance && (
            <p className="text-cyan-400 text-[10px] mt-0.5">📷 Following #{ selectedVehicleId}</p>
          )}
        </div>
      </div>
    </>
  );
}
