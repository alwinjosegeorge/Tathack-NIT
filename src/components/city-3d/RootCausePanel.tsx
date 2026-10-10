import { useState, useEffect } from 'react';
import { X, AlertTriangle, CheckCircle, Clock, RotateCw, TrendingUp, ChevronRight } from 'lucide-react';
import type { IncidentMarker, Hypothesis } from '@/lib/city-sim/types';
import { fetchHypotheses, statusColor, statusLabel, formatTimestamp, BACKEND_AVAILABLE } from '@/lib/city-sim/civicApi';

interface RootCausePanelProps {
  incident: IncidentMarker | null;
  allIncidents: IncidentMarker[];
  onClose: () => void;
  onSelectIncident: (id: string) => void;
  onOpenWhatIf: (incidentId: string) => void;
}

export function RootCausePanel({
  incident,
  allIncidents,
  onClose,
  onSelectIncident,
  onOpenWhatIf,
}: RootCausePanelProps) {
  const [hypotheses, setHypotheses] = useState<Hypothesis[]>([]);
  const [loading, setLoading] = useState(false);
  const [expandedHyp, setExpandedHyp] = useState<string | null>(null);

  useEffect(() => {
    if (!incident) {
      setHypotheses([]);
      return;
    }
    setLoading(true);
    fetchHypotheses(incident.id).then(result => {
      setHypotheses(result.data);
      setLoading(false);
    });
  }, [incident?.id]);

  if (!incident) return null;

  const color = statusColor(incident.status);
  const relatedIncidents = allIncidents.filter(i => incident.relatedIds.includes(i.id));

  return (
    <div className="absolute top-0 right-0 h-full w-80 z-20 pointer-events-auto flex flex-col">
      <div className="flex-1 overflow-y-auto bg-slate-900/95 backdrop-blur-md border-l border-indigo-400/35 shadow-[0_0_30px_-4px_rgba(139,92,246,0.3)] flex flex-col dot-pattern-card">
        {/* Header */}
        <div className="p-4 border-b border-slate-700/50 flex-shrink-0">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
                <span className="text-xs font-medium uppercase tracking-wider" style={{ color }}>
                  {statusLabel(incident.status)}
                </span>
                {!BACKEND_AVAILABLE && (
                  <span className="text-[9px] px-1.5 py-0.5 bg-amber-900/50 text-amber-400 rounded border border-amber-700/40">
                    SIM ONLY
                  </span>
                )}
              </div>
              <h2 className="text-white font-bold text-sm leading-tight">{incident.type}</h2>
              <p className="text-slate-400 text-xs mt-1 leading-relaxed">{incident.description}</p>
              <p className="text-slate-500 text-[10px] mt-1">{formatTimestamp(incident.timestamp)}</p>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700 transition-colors flex-shrink-0"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Root Cause Hypotheses */}
        <div className="p-4 border-b border-slate-700/50">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp size={14} className="text-cyan-400" />
            <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider">Root Cause Hypotheses</span>
          </div>

          {loading && (
            <div className="flex items-center gap-2 text-slate-400 text-xs">
              <RotateCw size={12} className="animate-spin" />
              <span>Loading analysis...</span>
            </div>
          )}

          {!loading && hypotheses.length === 0 && (
            <p className="text-slate-500 text-xs">No hypotheses available for this incident.</p>
          )}

          <div className="space-y-2">
            {hypotheses.map(h => (
              <div
                key={h.id}
                className="bg-slate-800/60 rounded-lg border border-slate-700/40 overflow-hidden"
              >
                <button
                  className="w-full text-left p-3"
                  onClick={() => setExpandedHyp(expandedHyp === h.id ? null : h.id)}
                >
                  <div className="flex items-start gap-2">
                    <div className="flex-shrink-0 mt-0.5">
                      {h.isObserved ? (
                        <CheckCircle size={12} className="text-green-400" />
                      ) : (
                        <AlertTriangle size={12} className="text-amber-400" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-slate-200 text-xs leading-relaxed">{h.description}</p>
                      <div className="mt-2">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[10px] text-slate-400">
                            Confidence
                          </span>
                          <span className="text-[10px] font-semibold text-white">
                            {Math.round(h.confidence * 100)}%
                          </span>
                        </div>
                        <div className="h-1 bg-slate-700 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{
                              width: `${h.confidence * 100}%`,
                              backgroundColor: h.confidence > 0.75 ? '#22c55e' : h.confidence > 0.5 ? '#f59e0b' : '#ef4444',
                            }}
                          />
                        </div>
                      </div>
                      {!h.isObserved && (
                        <span className="inline-block text-[9px] text-amber-400 bg-amber-900/30 px-1.5 py-0.5 rounded mt-1.5 border border-amber-700/30">
                          Hypothesized — not yet confirmed
                        </span>
                      )}
                    </div>
                    <ChevronRight
                      size={12}
                      className={`text-slate-500 flex-shrink-0 transition-transform ${expandedHyp === h.id ? 'rotate-90' : ''}`}
                    />
                  </div>
                </button>

                {expandedHyp === h.id && (
                  <div className="px-3 pb-3 border-t border-slate-700/40">
                    <p className="text-[10px] text-slate-400 font-medium mt-2 mb-1.5 uppercase tracking-wider">Supporting Evidence</p>
                    <ul className="space-y-1">
                      {h.evidence.map((e, i) => (
                        <li key={i} className="text-[11px] text-slate-300 flex items-start gap-1.5">
                          <span className="text-cyan-400 flex-shrink-0 mt-0.5">•</span>
                          <span>{e}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Related Incidents */}
        {relatedIncidents.length > 0 && (
          <div className="p-4 border-b border-slate-700/50">
            <p className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">Related Incidents</p>
            <div className="space-y-1.5">
              {relatedIncidents.map(rel => (
                <button
                  key={rel.id}
                  onClick={() => onSelectIncident(rel.id)}
                  className="w-full flex items-center gap-2 p-2 bg-slate-800/50 hover:bg-slate-700/60 rounded-lg transition-colors text-left"
                >
                  <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: statusColor(rel.status) }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-slate-200 truncate">{rel.type}</p>
                    <p className="text-[10px] text-slate-500">{statusLabel(rel.status)}</p>
                  </div>
                  <ChevronRight size={12} className="text-slate-500" />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="p-4 flex-shrink-0">
          <button
            onClick={() => onOpenWhatIf(incident.id)}
            className="w-full py-2.5 px-4 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl font-semibold text-sm transition-colors flex items-center justify-center gap-2"
          >
            <TrendingUp size={14} />
            Open What-If Lab
          </button>
          <p className="text-center text-slate-500 text-[10px] mt-2">
            Compare baseline vs intervention outcomes
          </p>
        </div>
      </div>
    </div>
  );
}
