// Deterministic Multi-Sensor Perception, Intent Prediction & TTC Safety Engine
import { CorridorSimulation } from "./corridor-sim";
import { CORRIDOR_JUNCTION_NODES } from "./road-graph";
import { SimCar, EmergencyVehicle, Junction } from "./types";

export type SensorMode = "lidar" | "segments" | "depth";

export interface TurnIntent {
  straight: number; // 0..100
  left: number; // 0..100
  right: number; // 0..100
  yielding: number; // 0..100
}

export interface PerceptionAgent {
  id: string;
  type: "ambulance" | "car" | "cyclist" | "pedestrian";
  label: string;
  position: [number, number, number];
  velocity: [number, number, number];
  speedKmh: number;
  heading: number;
  roll: number;
  statusBadge: "SAFE" | "WAIT" | "ALERT";
  statusHeadline: string;
  distToZoneCenter: number;
  distToAmbulance: number;
  inZone: boolean;
  isYielding: boolean;
  stoppedAtSignal: boolean;
  followingGapMeters: number;
  nextJunctionName: string;
  distToNextJunctionM: number;
  signalCountdown: string;
  turnIntent: TurnIntent;
  dimensions: [number, number, number]; // [length, height, width]
  hasTtcWarning: boolean;
  ttcSec: number | null;
  color: string;
}

export interface TtcAlert {
  id: string;
  agentId1: string;
  agentId2: string;
  label1: string;
  label2: string;
  ttcSec: number;
  closingSpeedKmh: number;
  distanceMeters: number;
  severity: "critical" | "warning";
  detail: string;
}

export interface PerceptionAnalytics {
  trackedCount: number;
  pointsCount: number;
  closeCallsCount: number;
  activeAlerts: TtcAlert[];
  signalsPreempted: number;
  corridorTimeSavedSec: number;
  etaSec: number;
  fps: number;
}

// Compute deterministic turn intent from car lane, road topology, and yielding state
export function computeAgentIntent(car: SimCar, nextJunction?: Junction): TurnIntent {
  if (car.isYielding) {
    return {
      straight: 12,
      left: 3,
      right: 5,
      yielding: 80,
    };
  }

  if (car.stoppedAtSignal) {
    return {
      straight: 74,
      left: 18,
      right: 8,
      yielding: 0,
    };
  }

  // Derive intent from lane index (0: left slow, 1: left fast, 2: right fast, 3: right slow)
  const isTurn = car.isTurnVehicle;
  if (isTurn) {
    if (car.turnDirection === "left") {
      return { straight: 15, left: 80, right: 5, yielding: 0 };
    }
    if (car.turnDirection === "right") {
      return { straight: 10, left: 5, right: 85, yielding: 0 };
    }
  }

  if (car.laneIndex === 0 || car.laneIndex === 3) {
    return { straight: 68, left: 24, right: 8, yielding: 0 };
  } else {
    return { straight: 82, left: 12, right: 6, yielding: 0 };
  }
}

// Calculate pairwise Time-To-Collision (TTC) using relative Euclidean position and velocity vectors
export function computePairwiseTtc(
  pA: [number, number, number],
  vA: [number, number, number],
  radA: number,
  pB: [number, number, number],
  vB: [number, number, number],
  radB: number
): { isClosing: boolean; ttcSec: number | null; distance: number; closingSpeed: number } {
  // Horizontal 2D plane (X, Z)
  const dx = pB[0] - pA[0];
  const dz = pB[2] - pA[2];
  const dist = Math.sqrt(dx * dx + dz * dz);

  // Relative velocity vector (vB - vA)
  const dvx = vB[0] - vA[0];
  const dvz = vB[2] - vA[2];

  // Dot product of relative displacement (A -> B) and relative velocity of B relative to A
  // r . (vB - vA): if negative, distance is decreasing (closing)
  const dot = dx * dvx + dz * dvz;
  const isClosing = dot < -0.01;

  const relSpeedSq = dvx * dvx + dvz * dvz;
  const relSpeed = Math.sqrt(relSpeedSq);

  if (!isClosing || relSpeed < 0.2) {
    return { isClosing: false, ttcSec: null, distance: dist, closingSpeed: 0 };
  }

  // Closing speed component along displacement line
  const closingComponent = -dot / dist;
  const clearance = Math.max(0, dist - (radA + radB));
  const ttc = closingComponent > 0.1 ? clearance / closingComponent : null;

  return {
    isClosing: true,
    ttcSec: ttc !== null && ttc < 20 ? Math.round(ttc * 10) / 10 : null,
    distance: Math.round(dist * 10) / 10,
    closingSpeed: Math.round(closingComponent * 3.6),
  };
}

// Extract full set of perception-tracked agents and run safety checks
export function extractPerceptionState(
  sim: CorridorSimulation,
  zoneCenter: [number, number],
  zoneRadius: number
): {
  agents: PerceptionAgent[];
  activeAlerts: TtcAlert[];
  ambulanceAgent: PerceptionAgent;
} {
  const v = sim.vehicle;
  const junctions = sim.junctions;

  // Velocity vectors
  const ambVx = Math.cos(v.heading) * v.speed;
  const ambVz = Math.sin(v.heading) * v.speed;
  const ambPos: [number, number, number] = [v.x, 0.8, v.z];

  const ambDistToCenter = Math.hypot(v.x - zoneCenter[0], v.z - zoneCenter[1]);

  // Next junction info for ambulance
  const nextJunctionNode = CORRIDOR_JUNCTION_NODES[v.currentJunctionIndex] || CORRIDOR_JUNCTION_NODES[0];
  const nextJunction = junctions[v.currentJunctionIndex] || junctions[0];
  const distToNextJunctionM = Math.max(0, Math.round((nextJunctionNode.routeDistance - v.distanceTraveled) * 4.5));

  let ambSignalCountdown = "CLEAR CORRIDOR";
  if (nextJunction.preemptionState === "EMERGENCY_GREEN") {
    ambSignalCountdown = "PREEMPTED (GREEN)";
  } else if (nextJunction.preemptionState === "ALL_RED_CLEARANCE") {
    ambSignalCountdown = "CLEARING INTRUDERS";
  } else {
    ambSignalCountdown = `HOLD (${nextJunction.signals.ambulanceApproach.toUpperCase()})`;
  }

  const ambulanceAgent: PerceptionAgent = {
    id: "ambulance-lead",
    type: "ambulance",
    label: "AMBULANCE 01 (EMERGENCY LEAD)",
    position: ambPos,
    velocity: [ambVx, 0, ambVz],
    speedKmh: Math.round(v.speed * 2.8),
    heading: v.heading,
    roll: v.roll,
    statusBadge: "SAFE",
    statusHeadline: v.status === "en_route" ? "Green Corridor Active" : "Arrived at Trauma Center",
    distToZoneCenter: ambDistToCenter,
    distToAmbulance: 0,
    inZone: ambDistToCenter <= zoneRadius,
    isYielding: false,
    stoppedAtSignal: false,
    followingGapMeters: 45,
    nextJunctionName: nextJunctionNode.name,
    distToNextJunctionM,
    signalCountdown: ambSignalCountdown,
    turnIntent: { straight: 95, left: 3, right: 2, yielding: 0 },
    dimensions: [5.2, 2.2, 2.2],
    hasTtcWarning: false,
    ttcSec: null,
    color: "#f97316",
  };

  const agents: PerceptionAgent[] = [ambulanceAgent];
  const activeAlerts: TtcAlert[] = [];

  // Process Traffic Cars
  sim.cars.forEach((car, idx) => {
    const carVx = Math.cos(car.heading) * car.speed;
    const carVz = Math.sin(car.heading) * car.speed;
    const carPos: [number, number, number] = [car.x, 0.6, car.z];

    const distToCenter = Math.hypot(car.x - zoneCenter[0], car.z - zoneCenter[1]);
    const inZone = distToCenter <= zoneRadius;
    const distToAmbulance = Math.hypot(car.x - v.x, car.z - v.z);

    // Find closest junction ahead
    let closestJunction = CORRIDOR_JUNCTION_NODES[0];
    let minJunctionDist = 9999;
    CORRIDOR_JUNCTION_NODES.forEach((jn) => {
      const d = Math.hypot(car.x - jn.x, car.z - jn.z);
      if (d < minJunctionDist) {
        minJunctionDist = d;
        closestJunction = jn;
      }
    });

    const junctionObj = junctions.find((j) => j.id === closestJunction.id);
    let signalCountdown = "NORMAL CYCLE";
    if (junctionObj) {
      if (junctionObj.preemptionState === "EMERGENCY_GREEN") {
        signalCountdown = "PREEMPTED";
      } else if (junctionObj.signals.ambulanceApproach === "red") {
        const remaining = Math.max(0, 14 - junctionObj.signals.normalTimer);
        signalCountdown = `Green in ${remaining.toFixed(1)}s`;
      } else {
        const remaining = Math.max(0, 11 - junctionObj.signals.normalTimer);
        signalCountdown = `Red in ${remaining.toFixed(1)}s`;
      }
    }

    const turnIntent = computeAgentIntent(car, junctionObj);

    let statusBadge: "SAFE" | "WAIT" | "ALERT" = "SAFE";
    let statusHeadline = "Free Flowing";

    if (car.isYielding) {
      statusBadge = "WAIT";
      statusHeadline = "Yielding to Emergency Corridor";
    } else if (car.stoppedAtSignal) {
      statusBadge = "WAIT";
      statusHeadline = "Holding at Red Signal";
    }

    // Pairwise TTC Check against Emergency Vehicle
    let hasTtcWarning = false;
    let ttcSec: number | null = null;

    if (inZone && distToAmbulance < 65) {
      const ttcRes = computePairwiseTtc(
        carPos,
        [carVx, 0, carVz],
        car.collisionRadius,
        ambPos,
        [ambVx, 0, ambVz],
        v.collisionRadius
      );

      if (ttcRes.isClosing && ttcRes.ttcSec !== null && ttcRes.ttcSec <= 2.5) {
        hasTtcWarning = true;
        ttcSec = ttcRes.ttcSec;
        statusBadge = "ALERT";
        statusHeadline = `TTC Alert: ${ttcRes.ttcSec}s to Ambulance`;

        const alert: TtcAlert = {
          id: `ttc-${car.id}-amb`,
          agentId1: car.id,
          agentId2: ambulanceAgent.id,
          label1: `CAR ${idx + 1}`,
          label2: "AMBULANCE 01",
          ttcSec: ttcRes.ttcSec,
          closingSpeedKmh: ttcRes.closingSpeed,
          distanceMeters: Math.round(ttcRes.distance * 4.5),
          severity: ttcRes.ttcSec < 1.6 ? "critical" : "warning",
          detail: car.isYielding ? "Yielding maneuver in progress" : "Obstruction detected ahead of corridor",
        };
        activeAlerts.push(alert);
      }
    }

    // Following gap calculation
    const followingGapMeters = Math.max(
      6,
      Math.round(
        Math.min(
          distToAmbulance * 4.5,
          (car.speed > 0.5 ? (car.speed * car.speed) / 12 + 8 : 4) * 1.5
        )
      )
    );

    agents.push({
      id: car.id,
      type: "car",
      label: `CAR ${String(idx + 1).padStart(2, "0")}`,
      position: carPos,
      velocity: [carVx, 0, carVz],
      speedKmh: Math.round(car.speed * 2.8),
      heading: car.heading,
      roll: car.roll,
      statusBadge,
      statusHeadline,
      distToZoneCenter: distToCenter,
      distToAmbulance,
      inZone,
      isYielding: car.isYielding,
      stoppedAtSignal: car.stoppedAtSignal,
      followingGapMeters,
      nextJunctionName: closestJunction.name,
      distToNextJunctionM: Math.round(minJunctionDist * 4.5),
      signalCountdown,
      turnIntent,
      dimensions: [4.2, 1.6, 1.9],
      hasTtcWarning,
      ttcSec,
      color: car.color,
    });
  });

  // If ambulance has any active TTC alert against it, set badge to ALERT
  if (activeAlerts.length > 0) {
    ambulanceAgent.statusBadge = "ALERT";
    ambulanceAgent.hasTtcWarning = true;
    ambulanceAgent.ttcSec = activeAlerts[0].ttcSec;
  }

  return {
    agents,
    activeAlerts,
    ambulanceAgent,
  };
}
