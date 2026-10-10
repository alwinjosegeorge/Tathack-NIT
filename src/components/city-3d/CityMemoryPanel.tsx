import { useState, useEffect } from 'react';
import { X, History, AlertTriangle, CheckCircle, Clock, RefreshCw, RotateCw } from 'lucide-react';
import type { IncidentMarker, InterventionRecord, RecurrenceAlert } from '@/lib/city-sim/types';
import {
  fetchInterventionHistory, fetchRecurrenceAlerts,
  statusColor, statusLabel, formatTimestamp, BACKEND_AVAILABLE,
} from '@/lib/city-sim/civicApi';

interface CityMemoryPanelProps {
  incident: IncidentMarker | null;
  onClose: () => void;
}

function StatusBadge({ status }: { status: IncidentMarker['status'] }) {
  const color = statusColor(status);
  const label = statusLabel(status);
  return (
    <span
      className="inline-flex items-center gap-1 text-[9px] font-semibold px-2 py-0.5 rounded-full border"
      style={{ borderColor: color + '60', color, backgroundColor: color + '18' }}
    >
      {status === 'active' && <AlertTriangle size={8} />}
      {status === 'verified_resolved' && <CheckCircle size={8} />}
      {status === 'recurrence_detected' && <RefreshCw size={8} />}
      {status === 'awaiting_verification' && <Clock size={8} />}
      {label}
    </span>
  );
}

function InterventionCard({ record }: { record: InterventionRecord }) {
  const improved = record.metrics.interventionTravelTime < record.metrics.baselineTravelTime;

  return (
    <div className="bg-slate-800/60 rounded-lg border border-slate-700/40 p-3">
      <div className="flex items-start justify-between gap-2 mb-2">
        <div>
          <p className="text-xs font-medium text-slate-200">{record.type}</p>
          <p className="text-[10px] text-slate-500 mt-0.5">Applied {formatTimestamp(record.appliedAt)}</p>
        </div>
        <StatusBadge status={record.status} />
      </div>

      {/* Mini metric display */}
      <div className="grid grid-cols-2 gap-2 mb-2">
        <div className="bg-slate-900/50 rounded p-1.5">
          <p className="text-[9px] text-slate-500 uppercase">Travel Time</p>
          <p className="text-xs text-slate-300">
            {record.metrics.baselineTravelTime}s →{' '}
            <span className={improved ? 'text-green-400 font-semibold' : 'text-red-400 font-semibold'}>
              {record.metrics.interventionTravelTime}s
            </span>
          </p>
        </div>
        <div className="bg-slate-900/50 rounded p-1.5">
          <p className="text-[9px] text-slate-500 uppercase">Queue</p>
          <p className="text-xs text-slate-300">
            {record.metrics.baselineQueueLength} →{' '}
            <span className={record.metrics.interventionQueueLength < record.metrics.baselineQueueLength ? 'text-green-400 font-semibold' : 'text-red-400 font-semibold'}>
              {record.metrics.interventionQueueLength} veh
            </span>
          </p>
        </div>
      </div>

      <p className="text-[10px] text-slate-400 italic leading-relaxed">{record.notes}</p>

      {record.verifiedAt && (
        <p className="text-[10px] text-green-400 mt-1.5 flex items-center gap-1">
          <CheckCircle size={9} /> Verified {formatTimestamp(record.verifiedAt)}
        </p>
      )}

      {record.status === 'recurrence_detected' && (
        <div className="mt-2 flex items-center gap-1.5 text-[10px] text-orange-400 bg-orange-900/20 px-2 py-1 rounded border border-orange-700/30">
          <RefreshCw size={9} />
          Recurrence detected — intervention was not permanent
        </div>
      )}
    </div>
  );
}

export function CityMemoryPanel({ incident, onClose }: CityMemoryPanelProps) {
  const [history, setHistory] = useState<InterventionRecord[]>([]);
  const [recurrences, setRecurrences] = useState<RecurrenceAlert[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!incident) return;
    setLoading(true);

    Promise.all([
      fetchInterventionHistory(incident.id),
      fetchRecurrenceAlerts(),
    ]).then(([histResult, recResult]) => {
      setHistory(histResult.data);
      // Filter recurrences relevant to this incident
      const incidentRecurrences = recResult.data.filter(r =>
        r.position[0] === incident.position[0] && r.position[2] === incident.position[2]
      );
      setRecurrences(incidentRecurrences);
      setLoading(false);
    });
  }, [incident?.id]);

  if (!incident) return null;

  return (
    <div className="absolute top-0 right-0 h-full w-80 z-20 pointer-events-auto flex flex-col">
      <div className="flex-1 overflow-y-auto bg-slate-900/95 backdrop-blur-md border-l border-indigo-400/35 shadow-[0_0_30px_-4px_rgba(139,92,246,0.3)] flex flex-col dot-pattern-card">
        {/* Header */}
        <div className="p-4 border-b border-slate-700/50 flex-shrink-0">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <History size={14} className="text-purple-400" />
              <h2 className="text-white font-bold text-sm">City Memory</h2>
            </div>
            <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700 transition-colors">
              <X size={16} />
            </button>
          </div>
          <p className="text-slate-400 text-xs truncate">{incident.type}</p>
          <div className="mt-2">
            <StatusBadge status={incident.status} />
          </div>
          {!BACKEND_AVAILABLE && (
            <div className="mt-2 flex items-center gap-1.5 text-amber-400 text-[10px] bg-amber-900/20 px-2 py-1.5 rounded border border-amber-700/30">
              <AlertTriangle size={10} />
              Simulation Only — historical data is illustrative
            </div>
          )}
        </div>

        {/* Recurrence alert */}
        {recurrences.length > 0 && (
          <div className="p-4 border-b border-slate-700/50">
            {recurrences.map(r => (
              <div key={r.segmentId} className="bg-orange-900/20 border border-orange-700/40 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-2">
                  <RefreshCw size={14} className="text-orange-400 animate-spin" style={{ animationDuration: '3s' }} />
                  <p className="text-orange-300 text-xs font-bold">Recurrence Detected</p>
                </div>
                <p className="text-orange-200/80 text-[11px] leading-relaxed">{r.description}</p>
                <div className="mt-2 flex items-center gap-3 text-[10px] text-orange-400">
                  <span>{r.occurrences}× occurrences</span>
                  <span>Last: {formatTimestamp(r.lastSeen)}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Legend */}
        <div className="px-4 pt-4 pb-2">
          <p className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">Status Legend</p>
          <div className="grid grid-cols-2 gap-1.5">
            {(['active', 'intervention_completed', 'awaiting_verification', 'verified_resolved', 'recurrence_detected'] as const).map(s => (
              <div key={s} className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: statusColor(s) }} />
                <span className="text-[9px] text-slate-400">{statusLabel(s)}</span>
              </div>
            ))}
          </div>
          <p className="text-[9px] text-slate-500 mt-2 italic">
            ⚠ Resolved ≠ verified. Only "Verified Resolved" confirms real-world improvement.
          </p>
        </div>

        {/* Intervention history */}
        <div className="p-4">
          <p className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-3">Intervention History</p>

          {loading && (
            <div className="flex items-center gap-2 text-slate-400 text-xs">
              <RotateCw size={12} className="animate-spin" />
              Loading...
            </div>
          )}

          {!loading && history.length === 0 && (
            <p className="text-slate-500 text-xs">No intervention history for this incident.</p>
          )}

          <div className="space-y-2">
            {history.map(r => <InterventionCard key={r.id} record={r} />)}
          </div>
        </div>
      </div>
    </div>
  );
}
