// Deterministic Multi-Sensor Perception, Intent Prediction & Robust Pairwise TTC Safety Engine
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
  typeLabel: string; // "vehicle" | "pedestrian" | "bicycle" | "emergency"
  position: [number, number, number];
  velocity: [number, number, number];
  speedKmh: number;
  heading: number;
  roll: number;
  statusBadge: "SAFE" | "WAIT" | "ALERT";
  headline: string;
  explanation: string;
  distToZoneCenter: number;
  distToAmbulance: number;
  inZone: boolean;
  isYielding: boolean;
  stoppedAtSignal: boolean;
  followingText: string;
  followingGapMeters: number;
  nextJunctionName: string;
  distToNextJunctionM: number;
  signalCountdown: string;
  approachName: string;
  turnIntent: TurnIntent;
  dimensions: [number, number, number]; // [length, height, width]
  collisionRadius: number;
  hasTtcWarning: boolean;
  ttcSec: number | null;
  color: string;
  laneIndex?: number;
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
  pedCount: number;
  carCount: number;
  cycCount: number;
  zoneRadiusM: number;
  trackedCount: number;
  pointsCount: number;
  closeCallsCount: number;
  activeAlerts: TtcAlert[];
  signalsPreempted: number;
  corridorTimeSavedSec: number;
  etaSec: number;
  fps: number;
}

// Global deduplication registry for close-call events (5-second cooldown per unique pair)
const recentCloseCallEvents = new Map<string, number>();

export function resetCloseCallDeduplication() {
  recentCloseCallEvents.clear();
}

// Compute deterministic turn intent from car lane, road topology, and yielding state
export function computeAgentIntent(car: SimCar, nextJunction?: Junction): TurnIntent {
  if (car.isYielding) {
    return {
      straight: 10,
      left: 2,
      right: 8,
      yielding: 80,
    };
  }

  if (car.stoppedAtSignal) {
    return {
      straight: 76,
      left: 16,
      right: 8,
      yielding: 0,
    };
  }

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
    return { straight: 72, left: 20, right: 8, yielding: 0 };
  } else {
    return { straight: 84, left: 10, right: 6, yielding: 0 };
  }
}

/**
 * Robust pairwise Time-To-Collision (TTC) calculation along line-of-sight.
 * Prevents self-pair checks, ignores same-lane safe followings, and checks genuine closing vectors.
 */
export function computePairwiseTtc(
  pA: [number, number, number],
  vA: [number, number, number],
  radA: number,
  pB: [number, number, number],
  vB: [number, number, number],
  radB: number,
  agentAInfo?: { id: string; laneIndex?: number; isYielding?: boolean },
  agentBInfo?: { id: string; laneIndex?: number; isYielding?: boolean }
): { isClosing: boolean; ttcSec: number | null; distance: number; closingSpeed: number; isHazard: boolean } {
  // 1. Guard against self-pairing
  if (agentAInfo && agentBInfo && agentAInfo.id === agentBInfo.id) {
    return { isClosing: false, ttcSec: null, distance: 0, closingSpeed: 0, isHazard: false };
  }

  // 2. Relative displacement in 2D horizontal plane (X, Z)
  const dx = pB[0] - pA[0];
  const dz = pB[2] - pA[2];
  const dist = Math.hypot(dx, dz);

  if (dist < 0.001) {
    return { isClosing: false, ttcSec: null, distance: 0, closingSpeed: 0, isHazard: false };
  }

  // 3. Normalized line-of-sight direction vector from A to B
  const losX = dx / dist;
  const losZ = dz / dist;

  // 4. Relative velocity vector (vB - vA)
  const dvx = vB[0] - vA[0];
  const dvz = vB[2] - vA[2];

  // 5. Closing speed along line of sight: - ( (pB - pA)/dist . (vB - vA) )
  // If positive, distance is decreasing (they are approaching each other)
  const closingSpeed = -(losX * dvx + losZ * dvz);

  // 6. Ignore pairs with closing speed < 1.0 m/s (~3.6 km/h) or opening distances
  if (closingSpeed < 1.0) {
    return { isClosing: false, ttcSec: null, distance: Math.round(dist * 10) / 10, closingSpeed: 0, isHazard: false };
  }

  // 7. Check if vehicles are safely separated laterally (e.g. yielding car on shoulder)
  if (agentAInfo?.isYielding || agentBInfo?.isYielding) {
    const speedA = Math.hypot(vA[0], vA[2]);
    const headingNormX = speedA > 0.1 ? vA[0] / speedA : 1.0;
    const headingNormZ = speedA > 0.1 ? vA[2] / speedA : 0.0;
    // Perpendicular distance relative to vehicle heading trajectory
    const latSeparation = Math.abs(dx * (-headingNormZ) + dz * headingNormX);
    if (latSeparation > 2.2) {
      return {
        isClosing: true,
        ttcSec: null,
        distance: Math.round(dist * 10) / 10,
        closingSpeed: Math.round(closingSpeed * 3.6),
        isHazard: false,
      };
    }
  }

  // 8. Safe car-following in same lane moving in same direction
  if (
    agentAInfo?.laneIndex !== undefined &&
    agentBInfo?.laneIndex !== undefined &&
    agentAInfo.laneIndex === agentBInfo.laneIndex
  ) {
    const speedA = Math.hypot(vA[0], vA[2]);
    const speedB = Math.hypot(vB[0], vB[2]);
    // If speeds are similar (< 2.5 m/s difference) and distance is safe (> 8m), ignore
    if (Math.abs(speedA - speedB) < 2.5 && dist > 8.0) {
      return {
        isClosing: true,
        ttcSec: null,
        distance: Math.round(dist * 10) / 10,
        closingSpeed: Math.round(closingSpeed * 3.6),
        isHazard: false,
      };
    }
  }

  // 9. Bounding radii clearance
  const clearance = Math.max(0, dist - (radA + radB));
  const rawTtc = clearance / closingSpeed;

  // Clamp absurd values: valid TTC between 0.0s and 10.0s
  const ttcSec = rawTtc >= 0 && rawTtc <= 10.0 ? Math.round(rawTtc * 10) / 10 : null;
  const isHazard = ttcSec !== null && ttcSec <= 2.5;

  return {
    isClosing: true,
    ttcSec,
    distance: Math.round(dist * 10) / 10,
    closingSpeed: Math.round(closingSpeed * 3.6),
    isHazard,
  };
}

/**
 * Evaluates all unique pairs of agents in the vision zone, computes true TTC, and dedupes close calls.
 */
export function evaluateZoneSafety(
  agents: PerceptionAgent[],
  currentTimeSec: number
): {
  activeAlerts: TtcAlert[];
  newCloseCallsCount: number;
} {
  const activeAlerts: TtcAlert[] = [];
  let newCloseCallsCount = 0;

  // Cleanup old cooldown entries (> 15s old)
  for (const [key, timestamp] of recentCloseCallEvents.entries()) {
    if (currentTimeSec - timestamp > 15.0) {
      recentCloseCallEvents.delete(key);
    }
  }

  // Only evaluate pairs where at least one is in the zone and both are within active distance
  const candidateAgents = agents.filter((a) => a.inZone || a.type === "ambulance");

  for (let i = 0; i < candidateAgents.length; i++) {
    for (let j = i + 1; j < candidateAgents.length; j++) {
      const aA = candidateAgents[i];
      const aB = candidateAgents[j];

      // Skip identical agent ID
      if (aA.id === aB.id) continue;

      // Skip if neither is the ambulance and neither has high closing speed
      const hasEmergency = aA.type === "ambulance" || aB.type === "ambulance";
      const interDist = Math.hypot(aA.position[0] - aB.position[0], aA.position[2] - aB.position[2]);

      // Broad-phase distance cull (must be within 65m)
      if (interDist > 65.0) continue;

      const ttcRes = computePairwiseTtc(
        aA.position,
        aA.velocity,
        aA.collisionRadius,
        aB.position,
        aB.velocity,
        aB.collisionRadius,
        { id: aA.id, laneIndex: aA.laneIndex, isYielding: aA.isYielding },
        { id: aB.id, laneIndex: aB.laneIndex, isYielding: aB.isYielding }
      );

      if (ttcRes.isHazard && ttcRes.ttcSec !== null) {
        // Mark warning flags on both agents
        aA.hasTtcWarning = true;
        aB.hasTtcWarning = true;
        aA.ttcSec = aA.ttcSec !== null ? Math.min(aA.ttcSec, ttcRes.ttcSec) : ttcRes.ttcSec;
        aB.ttcSec = aB.ttcSec !== null ? Math.min(aB.ttcSec, ttcRes.ttcSec) : ttcRes.ttcSec;

        if (aA.statusBadge !== "ALERT") {
          aA.statusBadge = "ALERT";
          aA.headline = `TTC Alert: ${ttcRes.ttcSec}s to ${aB.label}`;
        }
        if (aB.statusBadge !== "ALERT") {
          aB.statusBadge = "ALERT";
          aB.headline = `TTC Alert: ${ttcRes.ttcSec}s to ${aA.label}`;
        }

        const pairKey = [aA.id, aB.id].sort().join("<->");
        const lastRecorded = recentCloseCallEvents.get(pairKey);

        // Deduplicate close calls: 5-second cooldown per unique pair
        if (lastRecorded === undefined || currentTimeSec - lastRecorded > 5.0) {
          recentCloseCallEvents.set(pairKey, currentTimeSec);
          newCloseCallsCount++;
        }

        activeAlerts.push({
          id: `ttc-${pairKey}`,
          agentId1: aA.id,
          agentId2: aB.id,
          label1: aA.label,
          label2: aB.label,
          ttcSec: ttcRes.ttcSec,
          closingSpeedKmh: ttcRes.closingSpeed,
          distanceMeters: Math.round(ttcRes.distance * 4.5),
          severity: ttcRes.ttcSec < 1.6 ? "critical" : "warning",
          detail: hasEmergency
            ? aA.isYielding || aB.isYielding
              ? "Emergency vehicle approaching · Yielding in progress"
              : "Obstruction in emergency preemption path"
            : "Intersection trajectory conflict",
        });
      }
    }
  }

  return {
    activeAlerts,
    newCloseCallsCount,
  };
}

/**
 * Extracts perception state for the full city simulation.
 */
export function extractPerceptionState(
  sim: CorridorSimulation,
  zoneCenter: [number, number],
  zoneRadius: number,
  allCityAgents?: PerceptionAgent[]
): {
  agents: PerceptionAgent[];
  activeAlerts: TtcAlert[];
  ambulanceAgent: PerceptionAgent;
  newCloseCalls: number;
} {
  const v = sim.vehicle;
  const junctions = sim.junctions;
  const t = sim.elapsedTime;

  // Emergency Lead Ambulance
  const ambVx = Math.cos(v.heading) * v.speed;
  const ambVz = Math.sin(v.heading) * v.speed;
  const ambPos: [number, number, number] = [v.x, 0.8, v.z];
  const ambDistToCenter = Math.hypot(v.x - zoneCenter[0], v.z - zoneCenter[1]);

  const nextJNode = CORRIDOR_JUNCTION_NODES[v.currentJunctionIndex] || CORRIDOR_JUNCTION_NODES[0];
  const nextJunction = junctions[v.currentJunctionIndex] || junctions[0];
  const distToNextJM = Math.max(0, Math.round((nextJNode.routeDistance - v.distanceTraveled) * 4.5));

  let ambSignalCountdown = "CLEAR CORRIDOR";
  if (nextJunction.preemptionState === "EMERGENCY_GREEN") {
    ambSignalCountdown = "preempted · green for emergency";
  } else if (nextJunction.preemptionState === "ALL_RED_CLEARANCE") {
    ambSignalCountdown = "all-red · clearing corridor";
  } else {
    ambSignalCountdown = `hold · ${nextJunction.signals.ambulanceApproach.toLowerCase()} phase`;
  }

  const ambulanceAgent: PerceptionAgent = {
    id: "ambulance-lead",
    type: "ambulance",
    label: "AMB 01",
    typeLabel: "emergency",
    position: ambPos,
    velocity: [ambVx, 0, ambVz],
    speedKmh: Math.round(v.speed * 2.8),
    heading: v.heading,
    roll: v.roll,
    statusBadge: "SAFE",
    headline: "Leading emergency corridor",
    explanation: `Active preemption engaged. Approaching ${nextJNode.name} (${distToNextJM} m).`,
    distToZoneCenter: ambDistToCenter,
    distToAmbulance: 0,
    inZone: ambDistToCenter <= zoneRadius,
    isYielding: false,
    stoppedAtSignal: false,
    followingText: "none (lead vehicle)",
    followingGapMeters: 0,
    nextJunctionName: nextJNode.name,
    distToNextJunctionM: distToNextJM,
    signalCountdown: ambSignalCountdown,
    approachName: "corridor mainline",
    turnIntent: { straight: 95, left: 3, right: 2, yielding: 0 },
    dimensions: [5.2, 2.2, 2.2],
    collisionRadius: 2.2,
    hasTtcWarning: false,
    ttcSec: null,
    color: "#ea580c",
    laneIndex: 1,
  };

  const agents: PerceptionAgent[] = [ambulanceAgent];

  // If external city agents are provided, use them; otherwise extract from corridor sim cars
  if (allCityAgents && allCityAgents.length > 0) {
    for (const ca of allCityAgents) {
      if (ca.id === ambulanceAgent.id) continue;
      ca.distToZoneCenter = Math.hypot(ca.position[0] - zoneCenter[0], ca.position[2] - zoneCenter[1]);
      ca.distToAmbulance = Math.hypot(ca.position[0] - v.x, ca.position[2] - v.z);
      ca.inZone = ca.distToZoneCenter <= zoneRadius;
      agents.push(ca);
    }
  } else {
    // Process corridor simulation traffic cars
    sim.cars.forEach((car, idx) => {
      const carVx = Math.cos(car.heading) * car.speed;
      const carVz = Math.sin(car.heading) * car.speed;
      const carPos: [number, number, number] = [car.x, 0.6, car.z];

      const distToCenter = Math.hypot(car.x - zoneCenter[0], car.z - zoneCenter[1]);
      const inZone = distToCenter <= zoneRadius;
      const distToAmb = Math.hypot(car.x - v.x, car.z - v.z);

      let closestJn = CORRIDOR_JUNCTION_NODES[0];
      let minJnDist = 9999;
      CORRIDOR_JUNCTION_NODES.forEach((jn) => {
        const d = Math.hypot(car.x - jn.x, car.z - jn.z);
        if (d < minJnDist) {
          minJnDist = d;
          closestJn = jn;
        }
      });

      const jObj = junctions.find((j) => j.id === closestJn.id);
      let signalCountdown = "green · free flow";
      if (jObj) {
        if (jObj.preemptionState === "EMERGENCY_GREEN") {
          signalCountdown = "preempted · green in 0.0 s";
        } else if (jObj.signals.ambulanceApproach === "red") {
          const rem = Math.max(0, 14 - jObj.signals.normalTimer);
          signalCountdown = `red · green in ${rem.toFixed(1)} s`;
        } else {
          const rem = Math.max(0, 11 - jObj.signals.normalTimer);
          signalCountdown = `green · red in ${rem.toFixed(1)} s`;
        }
      }

      const turnIntent = computeAgentIntent(car, jObj);
      let statusBadge: "SAFE" | "WAIT" | "ALERT" = "SAFE";
      let headline = "Moving in corridor";
      let explanation = `Cruising at ${Math.round(car.speed * 2.8)} km/h. Clear of conflicts.`;

      const carAheadId = idx > 0 ? `CAR ${String(idx).padStart(2, "0")}` : "lead";
      const gapM = Math.round(10 + (idx % 4) * 4);

      if (car.isYielding) {
        statusBadge = "WAIT";
        headline = "Yielding to corridor";
        explanation = `Shifted to shoulder lane (${gapM} m clear). Yielding to approaching AMB 01.`;
      } else if (car.stoppedAtSignal) {
        statusBadge = "WAIT";
        headline = "Holding at red";
        explanation = `Stopped before the line. ${signalCountdown}, then it will go straight.`;
      } else if (minJnDist < 8) {
        statusBadge = "SAFE";
        headline = "Crossing the junction";
        explanation = `Inside the junction at ${Math.round(car.speed * 2.8)} km/h, clear.`;
      } else if (minJnDist < 18 && car.speed > 8) {
        statusBadge = "SAFE";
        headline = "Leaving the junction";
        explanation = `Clear of the intersection, eastbound at ${Math.round(car.speed * 2.8)} km/h.`;
      }

      agents.push({
        id: car.id,
        type: "car",
        label: `CAR ${String(idx + 1).padStart(2, "0")}`,
        typeLabel: "vehicle",
        position: carPos,
        velocity: [carVx, 0, carVz],
        speedKmh: Math.round(car.speed * 2.8),
        heading: car.heading,
        roll: car.roll,
        statusBadge,
        headline,
        explanation,
        distToZoneCenter: distToCenter,
        distToAmbulance: distToAmb,
        inZone,
        isYielding: car.isYielding,
        stoppedAtSignal: car.stoppedAtSignal,
        followingText: `${carAheadId} (${gapM} m)`,
        followingGapMeters: gapM,
        nextJunctionName: closestJn.name,
        distToNextJunctionM: Math.round(minJnDist * 4.5),
        signalCountdown,
        approachName: car.heading < Math.PI / 2 ? "west approach" : "east approach",
        turnIntent,
        dimensions: [4.2, 1.6, 1.9],
        collisionRadius: 2.0,
        hasTtcWarning: false,
        ttcSec: null,
        color: car.color,
        laneIndex: car.laneIndex,
      });
    });
  }

  // 10. Run Safety Engine & TTC evaluation across candidate pairs
  const { activeAlerts, newCloseCallsCount } = evaluateZoneSafety(agents, t);

  return {
    agents,
    activeAlerts,
    ambulanceAgent,
    newCloseCalls: newCloseCallsCount,
  };
}
