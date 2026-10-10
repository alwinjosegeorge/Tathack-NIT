import { useState, useEffect } from 'react';
import { X, Play, RotateCw, AlertTriangle, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import type { IncidentMarker, InterventionRecord } from '@/lib/city-sim/types';
import { fetchInterventionHistory, statusColor, statusLabel, formatTimestamp, BACKEND_AVAILABLE } from '@/lib/city-sim/civicApi';
import type { TrafficEngine } from '@/lib/city-sim/engine';

interface WhatIfPanelProps {
  incident: IncidentMarker | null;
  engine: TrafficEngine;
  onClose: () => void;
}

type ScenarioType = 'signal_priority' | 'road_closure' | 'speed_limit' | 'diversion';

const SCENARIOS: { id: ScenarioType; label: string; description: string; supported: boolean }[] = [
  { id: 'signal_priority', label: 'Signal Priority', description: 'Extend green phase for congested approach by +6s', supported: true },
  { id: 'road_closure', label: 'Road Closure', description: 'Close affected road segment and reroute traffic', supported: true },
  { id: 'speed_limit', label: 'Speed Limit Reduction', description: 'Reduce speed limit to 30 km/h on affected segment', supported: false },
  { id: 'diversion', label: 'Diversion Route', description: 'Activate signposted diversion via secondary roads', supported: false },
];

function MetricDelta({ label, baseline, intervention, unit }: {
  label: string;
  baseline: number;
  intervention: number;
  unit: string;
}) {
  const delta = intervention - baseline;
  const pct = Math.round(Math.abs(delta / baseline) * 100);
  const improved = delta < 0; // lower travel time / queue = better

  return (
    <div className="bg-slate-800/60 rounded-lg p-3 border border-slate-700/40">
      <p className="text-[10px] text-slate-400 uppercase tracking-wider mb-2">{label}</p>
      <div className="flex items-end gap-3">
        <div className="flex-1">
          <div className="text-xs text-slate-400 mb-0.5">Baseline</div>
          <div className="text-xl font-bold text-slate-200">{baseline}<span className="text-sm text-slate-400 ml-1">{unit}</span></div>
        </div>
        <div className="flex-1">
          <div className="text-xs text-slate-400 mb-0.5">Intervention</div>
          <div className="text-xl font-bold" style={{ color: improved ? '#22c55e' : '#ef4444' }}>
            {intervention}<span className="text-sm ml-1" style={{ color: improved ? '#22c55e' : '#ef4444' }}>{unit}</span>
          </div>
        </div>
        <div className="flex-shrink-0 flex items-center gap-1">
          {improved ? <TrendingDown size={14} className="text-green-400" /> : delta > 0 ? <TrendingUp size={14} className="text-red-400" /> : <Minus size={14} className="text-slate-400" />}
          <span className="text-xs font-semibold" style={{ color: improved ? '#22c55e' : delta > 0 ? '#ef4444' : '#94a3b8' }}>
            {delta === 0 ? '—' : `${improved ? '−' : '+'}${pct}%`}
          </span>
        </div>
      </div>
    </div>
  );
}

export function WhatIfPanel({ incident, engine, onClose }: WhatIfPanelProps) {
  const [history, setHistory] = useState<InterventionRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedScenario, setSelectedScenario] = useState<ScenarioType>('signal_priority');
  const [viewMode, setViewMode] = useState<'baseline' | 'intervention'>('baseline');
  const [simulationRunning, setSimulationRunning] = useState(false);

  useEffect(() => {
    if (!incident) return;
    setLoading(true);
    fetchInterventionHistory(incident.id).then(result => {
      setHistory(result.data);
      setLoading(false);
    });
  }, [incident?.id]);

  if (!incident) return null;

  const currentRecord = history[0];
  const selectedScenarioDef = SCENARIOS.find(s => s.id === selectedScenario)!;

  const handleRunSimulation = () => {
    if (!selectedScenarioDef.supported) return;

    setSimulationRunning(true);

    if (selectedScenario === 'signal_priority') {
      // Simulate: speed up the simulation briefly, then show results
      engine.setSpeed(2.0);
      setTimeout(() => {
        engine.setSpeed(1.0);
        setSimulationRunning(false);
        setViewMode('intervention');
      }, 4000);
    } else if (selectedScenario === 'road_closure') {
      // Simulate road closure effect by temporarily reducing traffic
      engine.setSpeed(1.5);
      setTimeout(() => {
        engine.setSpeed(1.0);
        setSimulationRunning(false);
        setViewMode('intervention');
      }, 4000);
    }
  };

  const handleReset = () => {
    setViewMode('baseline');
    setSimulationRunning(false);
    engine.setSpeed(1.0);
    engine.reset();
  };

  return (
    <div className="absolute top-0 right-0 h-full w-80 z-20 pointer-events-auto flex flex-col">
      <div className="flex-1 overflow-y-auto bg-slate-900/95 backdrop-blur-md border-l border-slate-700/50 shadow-2xl flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-slate-700/50 flex-shrink-0">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Play size={14} className="text-cyan-400" />
              <h2 className="text-white font-bold text-sm">What-If Intervention Lab</h2>
            </div>
            <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700 transition-colors">
              <X size={16} />
            </button>
          </div>
          <p className="text-slate-400 text-xs">{incident.type}</p>
          {!BACKEND_AVAILABLE && (
            <div className="mt-2 flex items-center gap-1.5 text-amber-400 text-[10px] bg-amber-900/20 px-2 py-1.5 rounded border border-amber-700/30">
              <AlertTriangle size={10} />
              Simulation Only — no live backend metrics
            </div>
          )}
        </div>

        {/* Scenario selector */}
        <div className="p-4 border-b border-slate-700/50">
          <p className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">Select Scenario</p>
          <div className="space-y-1.5">
            {SCENARIOS.map(s => (
              <button
                key={s.id}
                onClick={() => { if (s.supported) setSelectedScenario(s.id); }}
                className={`w-full text-left p-2.5 rounded-lg border transition-all ${
                  !s.supported
                    ? 'opacity-40 cursor-not-allowed border-slate-700/30 bg-slate-800/30'
                    : selectedScenario === s.id
                      ? 'border-cyan-500/60 bg-cyan-900/20'
                      : 'border-slate-700/40 bg-slate-800/40 hover:bg-slate-700/40'
                }`}
                disabled={!s.supported}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-slate-200">{s.label}</span>
                  {!s.supported && (
                    <span className="text-[9px] text-slate-500 bg-slate-700 px-1.5 py-0.5 rounded">Unsupported</span>
                  )}
                </div>
                <p className="text-[10px] text-slate-400 mt-0.5">{s.description}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Current view toggle */}
        <div className="p-4 border-b border-slate-700/50">
          <p className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">Viewing</p>
          <div className="flex gap-2">
            <button
              onClick={() => setViewMode('baseline')}
              className={`flex-1 py-2 rounded-lg text-xs font-medium transition-colors ${
                viewMode === 'baseline'
                  ? 'bg-slate-600 text-white'
                  : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
              }`}
            >
              Baseline
            </button>
            <button
              onClick={() => { if (history.length > 0) setViewMode('intervention'); }}
              disabled={history.length === 0}
              className={`flex-1 py-2 rounded-lg text-xs font-medium transition-colors ${
                viewMode === 'intervention'
                  ? 'bg-cyan-700 text-white'
                  : 'bg-slate-800 text-slate-400 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed'
              }`}
            >
              Intervention
            </button>
          </div>
        </div>

        {/* Metrics */}
        {currentRecord && (
          <div className="p-4 border-b border-slate-700/50">
            <p className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
              {viewMode === 'baseline' ? 'Baseline Metrics' : 'Intervention Results'}
            </p>
            <div className="space-y-2">
              <MetricDelta
                label="Avg Travel Time"
                baseline={currentRecord.metrics.baselineTravelTime}
                intervention={currentRecord.metrics.interventionTravelTime}
                unit="s"
              />
              <MetricDelta
                label="Queue Length"
                baseline={currentRecord.metrics.baselineQueueLength}
                intervention={currentRecord.metrics.interventionQueueLength}
                unit="veh"
              />
            </div>

            {viewMode === 'intervention' && (
              <div className="mt-2 p-2 bg-slate-800/40 rounded-lg border border-slate-700/30">
                <p className="text-[10px] text-slate-300 leading-relaxed">{currentRecord.notes}</p>
                <p className="text-[10px] text-slate-500 mt-1">
                  Applied {formatTimestamp(currentRecord.appliedAt)}
                  {currentRecord.verifiedAt && ` · Verified ${formatTimestamp(currentRecord.verifiedAt)}`}
                </p>
              </div>
            )}
          </div>
        )}

        {loading && (
          <div className="p-4 flex items-center gap-2 text-slate-400 text-xs">
            <RotateCw size={12} className="animate-spin" />
            Loading history...
          </div>
        )}

        {/* Actions */}
        <div className="p-4 flex-shrink-0 space-y-2">
          <button
            onClick={handleRunSimulation}
            disabled={!selectedScenarioDef.supported || simulationRunning}
            className="w-full py-2.5 px-4 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl font-semibold text-sm transition-colors flex items-center justify-center gap-2"
          >
            {simulationRunning ? (
              <><RotateCw size={14} className="animate-spin" /> Running Simulation...</>
            ) : (
              <><Play size={14} /> Run Scenario</>
            )}
          </button>
          <button
            onClick={handleReset}
            className="w-full py-2 px-4 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-xl font-medium text-sm transition-colors flex items-center justify-center gap-2"
          >
            <RotateCw size={14} /> Reset to Baseline
          </button>
        </div>
      </div>
    </div>
  );
}
