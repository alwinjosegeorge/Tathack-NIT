import * as THREE from 'three';

export type Direction = 'north' | 'south' | 'east' | 'west';
export type TurnType = 'straight' | 'left' | 'right';
export type SignalState = 'red' | 'amber' | 'green';
export type VehicleKind = 'car' | 'motorcycle' | 'bus' | 'ambulance';

export interface VehicleSpec {
  kind: VehicleKind;
  length: number;
  width: number;
  height: number;
  wheelRadius: number;
  maxSpeed: number;
  acceleration: number;
  color: THREE.ColorRepresentation;
}

export interface LanePath {
  /** Direction vehicles travel on this path */
  approach: Direction;
  /** Turn direction */
  turn: TurnType;
  /** Curve the vehicle follows (centered, points in local road-network space) */
  curve: THREE.CatmullRomCurve3;
  /** Total arc length */
  length: number;
  /** Offset (perpendicular distance from road centerline) of this lane */
  laneOffset: number;
}

export interface VehicleState {
  id: number;
  kind: VehicleKind;
  spec: VehicleSpec;
  path: LanePath;
  distance: number;       // distance travelled along the path
  speed: number;          // units / second
  isEmergency: boolean;
  // cached
  position: THREE.Vector3;
  heading: number;        // radians
  targetHeading: number;
  phase: 'approach' | 'intersection' | 'exit';
  brakeLight: boolean;
  spawnedAt: number;
}

export interface SignalGroup {
  id: string;
  approaches: Direction[];
  state: SignalState;
  timer: number;
  greenDuration: number;
  yellowDuration: number;
  redDuration: number;
  /** Time remaining in current phase (seconds) */
  phaseRemaining: number;
}

export interface SimSnapshot {
  vehicles: Array<{
    id: number;
    kind: VehicleKind;
    position: [number, number, number];
    heading: number;
    brakeLight: boolean;
    isEmergency: boolean;
    speed: number;
    phase: 'approach' | 'intersection' | 'exit';
  }>;
  signals: Record<Direction, SignalState>;
  signalTimers: Record<Direction, number>; // seconds remaining in current phase
  emergencyActive: boolean;
  emergencyPhase: number;
  emergencyApproach: Direction | null;
  vehicleCount: number;
  paused: boolean;
  simSpeed: number;
  ambulanceId: number | null;
}

export interface SimConfig {
  paused: boolean;
  simSpeed: number; // 0.25 to 3.0
}

// ---- CivicPulse Intelligence types ----

export type IncidentStatus =
  | 'active'
  | 'intervention_completed'
  | 'awaiting_verification'
  | 'verified_resolved'
  | 'recurrence_detected';

export interface IncidentMarker {
  id: string;
  type: string;        // e.g. "congestion", "accident", "flooding"
  status: IncidentStatus;
  position: [number, number, number]; // world-space XZ (Y ignored)
  description: string;
  timestamp: string;
  relatedIds: string[];
}

export interface Hypothesis {
  id: string;
  incidentId: string;
  description: string;
  confidence: number;  // 0–1
  evidence: string[];
  isObserved: boolean; // true = observed fact, false = hypothesized
}

export interface InterventionRecord {
  id: string;
  incidentId: string;
  segmentId: string;
  type: string;           // e.g. "signal_priority", "road_closure"
  status: IncidentStatus;
  appliedAt: string;
  verifiedAt: string | null;
  metrics: {
    baselineTravelTime: number;
    interventionTravelTime: number;
    baselineQueueLength: number;
    interventionQueueLength: number;
  };
  notes: string;
}

export interface RecurrenceAlert {
  segmentId: string;
  position: [number, number, number];
  occurrences: number;
  lastSeen: string;
  description: string;
}
