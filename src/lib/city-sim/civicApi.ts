/**
 * CivicPulse Intelligence API
 *
 * All functions first check for a configured Supabase URL.
 * If not configured (no env vars), they fall back to deterministic mock data
 * and set backendAvailable = false on every response.
 *
 * This ensures the UI always works in "Simulation Only" mode without any backend.
 */

import type {
  IncidentMarker,
  IncidentStatus,
  Hypothesis,
  InterventionRecord,
  RecurrenceAlert,
  Direction,
} from './types';

// Check if Supabase is configured
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;
const BACKEND_AVAILABLE = !!(SUPABASE_URL && SUPABASE_KEY);

export { BACKEND_AVAILABLE };

// ---- Mock data (Kochi-inspired incidents in simulation XZ space) ----

const MOCK_INCIDENTS: IncidentMarker[] = [
  {
    id: 'INC-001',
    type: 'Severe Congestion',
    status: 'active',
    position: [0, 0.5, -20],
    description: 'Heavy northbound queue at main intersection after signal fault',
    timestamp: new Date(Date.now() - 1000 * 60 * 12).toISOString(),
    relatedIds: ['INC-003'],
  },
  {
    id: 'INC-002',
    type: 'Road Closure',
    status: 'intervention_completed',
    position: [55, 0.5, 30],
    description: 'Water main burst — right lane blocked on East Block 1 road',
    timestamp: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
    relatedIds: [],
  },
  {
    id: 'INC-003',
    type: 'Signal Fault',
    status: 'awaiting_verification',
    position: [0, 0.5, 0],
    description: 'Traffic signal controller reset caused extended red phase on North approach',
    timestamp: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
    relatedIds: ['INC-001'],
  },
  {
    id: 'INC-004',
    type: 'Recurrence — Flooding',
    status: 'recurrence_detected',
    position: [-55, 0.5, 55],
    description: 'Monsoon flooding detected for third time this season at SW block junction',
    timestamp: new Date(Date.now() - 1000 * 60 * 3).toISOString(),
    relatedIds: ['INC-005'],
  },
  {
    id: 'INC-005',
    type: 'Flooding',
    status: 'verified_resolved',
    position: [-55, 0.5, 55],
    description: 'Previous flooding incident — drainage cleared by municipal team',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3).toISOString(),
    relatedIds: ['INC-004'],
  },
];

const MOCK_HYPOTHESES: Record<string, Hypothesis[]> = {
  'INC-001': [
    {
      id: 'HYP-001-A',
      incidentId: 'INC-001',
      description: 'Signal fault (INC-003) caused vehicles to queue past the secondary intersection, backing up the main arterial.',
      confidence: 0.87,
      evidence: ['Signal controller log: 14:32 — unexpected reset', 'Queue camera frame analysis shows backup origin at signal head', 'Historical data: same pattern observed 3× after signal resets'],
      isObserved: true,
    },
    {
      id: 'HYP-001-B',
      incidentId: 'INC-001',
      description: 'Adjacent road closure (INC-002) is diverting East traffic through the main intersection, compounding demand.',
      confidence: 0.61,
      evidence: ['Traffic count sensor: East approach +34% above baseline', 'Route diversion estimate from block closure perimeter'],
      isObserved: false,
    },
  ],
  'INC-003': [
    {
      id: 'HYP-003-A',
      incidentId: 'INC-003',
      description: 'Power surge from substation B3 tripped the controller UPS, causing an unexpected controller restart.',
      confidence: 0.74,
      evidence: ['Substation B3 voltage spike log: 14:31:58', 'Controller self-diagnostic log: restart event at 14:32:04'],
      isObserved: true,
    },
  ],
  'INC-004': [
    {
      id: 'HYP-004-A',
      incidentId: 'INC-004',
      description: 'Blocked stormwater drain at SW block is the root cause of recurring flooding at this junction.',
      confidence: 0.92,
      evidence: ['Drain inspection report: 60% blockage', 'Rain gauge vs flood sensor correlation r=0.96', '3 prior flooding incidents at same coordinates'],
      isObserved: true,
    },
  ],
};

const MOCK_INTERVENTIONS: Record<string, InterventionRecord[]> = {
  'INC-001': [
    {
      id: 'INT-001',
      incidentId: 'INC-001',
      segmentId: 'SEG-MAIN-NS',
      type: 'Signal Priority Override',
      status: 'active',
      appliedAt: new Date(Date.now() - 1000 * 60 * 8).toISOString(),
      verifiedAt: null,
      metrics: {
        baselineTravelTime: 142,
        interventionTravelTime: 98,
        baselineQueueLength: 18,
        interventionQueueLength: 9,
      },
      notes: 'Extended NS green phase by +6s. Queue clearing observed.',
    },
  ],
  'INC-002': [
    {
      id: 'INT-002',
      incidentId: 'INC-002',
      segmentId: 'SEG-EAST-B1',
      type: 'Road Closure + Diversion',
      status: 'intervention_completed',
      appliedAt: new Date(Date.now() - 1000 * 60 * 40).toISOString(),
      verifiedAt: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
      metrics: {
        baselineTravelTime: 85,
        interventionTravelTime: 110,
        baselineQueueLength: 4,
        interventionQueueLength: 7,
      },
      notes: 'Closure accepted. Diversion adds ~25s avg travel time. Pipe repair underway.',
    },
  ],
  'INC-004': [
    {
      id: 'INT-004A',
      incidentId: 'INC-004',
      segmentId: 'SEG-SW-B1',
      type: 'Emergency Drain Clearance',
      status: 'recurrence_detected',
      appliedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3).toISOString(),
      verifiedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2).toISOString(),
      metrics: {
        baselineTravelTime: 200,
        interventionTravelTime: 70,
        baselineQueueLength: 22,
        interventionQueueLength: 3,
      },
      notes: 'Drain cleared. Road re-opened. Recurrence 3 days later indicates permanent drain repair required.',
    },
  ],
};

const MOCK_RECURRENCE: RecurrenceAlert[] = [
  {
    segmentId: 'SEG-SW-B1',
    position: [-55, 0.5, 55],
    occurrences: 3,
    lastSeen: new Date(Date.now() - 1000 * 60 * 3).toISOString(),
    description: 'SW block junction has flooded 3 times in current season. Permanent drain repair recommended.',
  },
];

// ---- Emergency request state (simulated backend workflow) ----

interface EmergencyRequest {
  requestId: string;
  approach: Direction;
  status: 'pending' | 'approved' | 'rejected';
  submittedAt: string;
}

const pendingRequests: Map<string, EmergencyRequest> = new Map();
let reqCounter = 1;

// ---- API Functions ----

export interface ApiResult<T> {
  data: T;
  backendAvailable: boolean;
  error?: string;
}

export async function fetchIncidents(): Promise<ApiResult<IncidentMarker[]>> {
  if (BACKEND_AVAILABLE) {
    try {
      const { createClient } = await import('@supabase/supabase-js');
      const supabase = createClient(SUPABASE_URL!, SUPABASE_KEY!);
      const { data, error } = await supabase
        .from('incidents')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      return { data: data ?? [], backendAvailable: true };
    } catch (e) {
      console.warn('[CivicAPI] Backend error, falling back to mock:', e);
    }
  }

  return { data: MOCK_INCIDENTS, backendAvailable: false };
}

export async function fetchHypotheses(incidentId: string): Promise<ApiResult<Hypothesis[]>> {
  if (BACKEND_AVAILABLE) {
    try {
      const { createClient } = await import('@supabase/supabase-js');
      const supabase = createClient(SUPABASE_URL!, SUPABASE_KEY!);
      const { data, error } = await supabase
        .from('hypotheses')
        .select('*')
        .eq('incident_id', incidentId);

      if (error) throw error;
      return { data: data ?? [], backendAvailable: true };
    } catch (e) {
      console.warn('[CivicAPI] Backend error, falling back to mock:', e);
    }
  }

  return { data: MOCK_HYPOTHESES[incidentId] ?? [], backendAvailable: false };
}

export async function fetchInterventionHistory(incidentId: string): Promise<ApiResult<InterventionRecord[]>> {
  if (BACKEND_AVAILABLE) {
    try {
      const { createClient } = await import('@supabase/supabase-js');
      const supabase = createClient(SUPABASE_URL!, SUPABASE_KEY!);
      const { data, error } = await supabase
        .from('interventions')
        .select('*')
        .eq('incident_id', incidentId)
        .order('applied_at', { ascending: false });

      if (error) throw error;
      return { data: data ?? [], backendAvailable: true };
    } catch (e) {
      console.warn('[CivicAPI] Backend error, falling back to mock:', e);
    }
  }

  return { data: MOCK_INTERVENTIONS[incidentId] ?? [], backendAvailable: false };
}

export async function fetchRecurrenceAlerts(): Promise<ApiResult<RecurrenceAlert[]>> {
  if (BACKEND_AVAILABLE) {
    try {
      const { createClient } = await import('@supabase/supabase-js');
      const supabase = createClient(SUPABASE_URL!, SUPABASE_KEY!);
      const { data, error } = await supabase
        .from('recurrence_alerts')
        .select('*');

      if (error) throw error;
      return { data: data ?? [], backendAvailable: true };
    } catch (e) {
      console.warn('[CivicAPI] Backend error, falling back to mock:', e);
    }
  }

  return { data: MOCK_RECURRENCE, backendAvailable: false };
}

/**
 * Submit an emergency request.
 * In simulation-only mode: auto-approves after 2 seconds (simulating operator review).
 * With backend: creates a record and waits for operator approval.
 */
export async function submitEmergencyRequest(
  approach: Direction,
  simulationOnly: boolean,
): Promise<ApiResult<{ requestId: string }>> {
  const requestId = `REQ-${Date.now()}-${reqCounter++}`;

  const req: EmergencyRequest = {
    requestId,
    approach,
    status: 'pending',
    submittedAt: new Date().toISOString(),
  };
  pendingRequests.set(requestId, req);

  if (!simulationOnly && BACKEND_AVAILABLE) {
    try {
      const { createClient } = await import('@supabase/supabase-js');
      const supabase = createClient(SUPABASE_URL!, SUPABASE_KEY!);
      const { error } = await supabase
        .from('emergency_requests')
        .insert({
          request_id: requestId,
          approach,
          status: 'pending',
        });

      if (error) throw error;
      return { data: { requestId }, backendAvailable: true };
    } catch (e) {
      console.warn('[CivicAPI] Backend error:', e);
    }
  }

  // Simulation-only: auto-approve after 2 seconds
  setTimeout(() => {
    const r = pendingRequests.get(requestId);
    if (r) r.status = 'approved';
  }, 2000);

  return { data: { requestId }, backendAvailable: false };
}

/**
 * Check approval status of an emergency request.
 */
export async function getApprovalStatus(
  requestId: string,
): Promise<ApiResult<{ status: 'pending' | 'approved' | 'rejected' }>> {
  if (BACKEND_AVAILABLE) {
    try {
      const { createClient } = await import('@supabase/supabase-js');
      const supabase = createClient(SUPABASE_URL!, SUPABASE_KEY!);
      const { data, error } = await supabase
        .from('emergency_requests')
        .select('status')
        .eq('request_id', requestId)
        .single();

      if (error) throw error;
      return { data: { status: data?.status ?? 'pending' }, backendAvailable: true };
    } catch (e) {
      console.warn('[CivicAPI] Backend error:', e);
    }
  }

  const req = pendingRequests.get(requestId);
  return {
    data: { status: req?.status ?? 'rejected' },
    backendAvailable: false,
  };
}

export function formatTimestamp(iso: string): string {
  const d = new Date(iso);
  const now = Date.now();
  const diff = now - d.getTime();
  if (diff < 60000) return 'just now';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return `${Math.floor(diff / 86400000)}d ago`;
}

export function statusColor(status: IncidentStatus): string {
  switch (status) {
    case 'active': return '#ef4444';
    case 'intervention_completed': return '#3b82f6';
    case 'awaiting_verification': return '#f59e0b';
    case 'verified_resolved': return '#22c55e';
    case 'recurrence_detected': return '#f97316';
  }
}

export function statusLabel(status: IncidentStatus): string {
  switch (status) {
    case 'active': return 'Active';
    case 'intervention_completed': return 'Intervention Done';
    case 'awaiting_verification': return 'Awaiting Verification';
    case 'verified_resolved': return 'Verified Resolved';
    case 'recurrence_detected': return 'Recurrence Detected';
  }
}
