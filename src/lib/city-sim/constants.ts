import type { Direction, TurnType, LanePath, VehicleSpec, VehicleKind, SignalGroup } from './types';
import * as THREE from 'three';

// ---- Road geometry constants ----
export const ROAD_WIDTH = 16;
export const LANE_WIDTH = 4;
export const LANE_COUNT = 2;
export const INTERSECTION_SIZE = ROAD_WIDTH;
export const ROAD_LENGTH = 400;       // much longer roads
export const SIDEWALK_WIDTH = 5;
export const CURB_HEIGHT = 0.2;

// ---- Vehicle ground clearance ----
export const VEHICLE_Y_OFFSET = 0.02; // sit just above road surface (wheels handle the rest)

// ---- City block layout (Kochi-inspired) ----
export const BLOCK_SIZE = 55;         // distance between parallel road centerlines
export const CITY_BLOCKS_X = 5;       // number of blocks east-west (grid columns)
export const CITY_BLOCKS_Z = 5;       // number of blocks north-south (grid rows)
// Total city extent
export const CITY_EXTENT = BLOCK_SIZE * Math.max(CITY_BLOCKS_X, CITY_BLOCKS_Z) + ROAD_LENGTH;

// ---- Traffic signal timing ----
export const GREEN_DURATION = 12;
export const YELLOW_DURATION = 3;
export const ALL_RED_BUFFER = 1;

// ---- Vehicle spawning ----
export const MAX_VEHICLES = 55;
export const SPAWN_INTERVAL_MIN = 1.0;
export const SPAWN_INTERVAL_MAX = 2.8;

// ---- Simulation ----
export const FIXED_DT = 1 / 60;
export const STOP_LINE_OFFSET = ROAD_WIDTH / 2 + 2.0;

// ---- Direction helpers ----
export const DIRECTIONS: Direction[] = ['north', 'south', 'east', 'west'];

export const DIR_VECTORS: Record<Direction, THREE.Vector3> = {
  north: new THREE.Vector3(0, 0, -1),
  south: new THREE.Vector3(0, 0, 1),
  east:  new THREE.Vector3(1, 0, 0),
  west:  new THREE.Vector3(-1, 0, 0),
};

export const OPPOSITE: Record<Direction, Direction> = {
  north: 'south', south: 'north', east: 'west', west: 'east',
};

export const LEFT_OF: Record<Direction, Direction> = {
  north: 'west', south: 'east', east: 'north', west: 'south',
};

export const RIGHT_OF: Record<Direction, Direction> = {
  north: 'east', south: 'west', east: 'south', west: 'north',
};

// ---- Vehicle specifications ----
const CAR_COLORS = [
  '#c0392b', '#2980b9', '#27ae60', '#f39c12', '#8e44ad',
  '#16a085', '#2c3e50', '#e67e22', '#1abc9c', '#d35400',
  '#34495e', '#7f8c8d', '#bdc3c7', '#2c3e50', '#0984e3',
  '#00b894', '#fd79a8', '#6c5ce7', '#e17055', '#00cec9',
];

export const VEHICLE_SPECS: Record<VehicleKind, Omit<VehicleSpec, 'color'>> = {
  car: {
    kind: 'car', length: 4.3, width: 1.85, height: 1.45,
    wheelRadius: 0.36, maxSpeed: 14, acceleration: 6,
  },
  motorcycle: {
    kind: 'motorcycle', length: 2.0, width: 0.8, height: 1.2,
    wheelRadius: 0.28, maxSpeed: 16, acceleration: 8,
  },
  bus: {
    kind: 'bus', length: 10.5, width: 2.5, height: 3.2,
    wheelRadius: 0.5, maxSpeed: 10, acceleration: 3.5,
  },
  ambulance: {
    kind: 'ambulance', length: 6.5, width: 2.3, height: 2.6,
    wheelRadius: 0.42, maxSpeed: 18, acceleration: 8,
  },
};

export function randomCarColor(): THREE.ColorRepresentation {
  return CAR_COLORS[Math.floor(Math.random() * CAR_COLORS.length)];
}

export function laneOffsetFor(_approach: Direction): number {
  return LANE_WIDTH / 2;
}

// ---- Signal groups ----
export function createSignalGroups(): SignalGroup[] {
  return [
    {
      id: 'NS', approaches: ['north', 'south'],
      state: 'green', timer: 0,
      greenDuration: GREEN_DURATION,
      yellowDuration: YELLOW_DURATION,
      redDuration: GREEN_DURATION + 2 * (YELLOW_DURATION + ALL_RED_BUFFER),
      phaseRemaining: GREEN_DURATION,
    },
    {
      id: 'EW', approaches: ['east', 'west'],
      state: 'red', timer: 0,
      greenDuration: GREEN_DURATION,
      yellowDuration: YELLOW_DURATION,
      redDuration: GREEN_DURATION + 2 * (YELLOW_DURATION + ALL_RED_BUFFER),
      phaseRemaining: GREEN_DURATION + 2 * (YELLOW_DURATION + ALL_RED_BUFFER),
    },
  ];
}

// ---- Path building (FIXED: correct right-turn midpoint) ----
export function buildLanePath(approach: Direction, turn: TurnType): LanePath {
  const travelDir = DIR_VECTORS[approach];
  const rightDir = DIR_VECTORS[RIGHT_OF[approach]];

  const offset = LANE_WIDTH / 2;
  const perpOffset = rightDir.clone().multiplyScalar(offset);

  const startDist = ROAD_LENGTH;
  const startPos = travelDir.clone().multiplyScalar(startDist).add(perpOffset);

  const stopPos = travelDir.clone().multiplyScalar(STOP_LINE_OFFSET).add(perpOffset);

  let exitDir: THREE.Vector3;
  if (turn === 'straight') {
    exitDir = travelDir.clone();
  } else if (turn === 'left') {
    exitDir = DIR_VECTORS[LEFT_OF[approach]].clone();
  } else {
    exitDir = DIR_VECTORS[RIGHT_OF[approach]].clone();
  }

  const exitRightDir = DIR_VECTORS[RIGHT_OF[
    turn === 'straight' ? approach :
    turn === 'left' ? LEFT_OF[approach] : RIGHT_OF[approach]
  ]];
  const exitOffset = exitRightDir.clone().multiplyScalar(LANE_WIDTH / 2);

  const enterPoint = travelDir.clone().multiplyScalar(INTERSECTION_SIZE / 2 - 0.5).add(perpOffset);

  const points: THREE.Vector3[] = [];

  if (turn === 'straight') {
    const exitStart = travelDir.clone().multiplyScalar(-(INTERSECTION_SIZE / 2 - 0.5)).add(perpOffset);
    const endPos = travelDir.clone().multiplyScalar(-startDist).add(perpOffset);
    points.push(startPos, stopPos, enterPoint, exitStart, endPos);
  } else {
    const exitEnter = exitDir.clone().multiplyScalar(INTERSECTION_SIZE / 2 - 0.5).add(exitOffset);
    const exitStop = exitDir.clone().multiplyScalar(STOP_LINE_OFFSET).add(exitOffset);
    const endPos = exitDir.clone().multiplyScalar(startDist).add(exitOffset);

    if (turn === 'right') {
      // FIX: compute midpoint correctly without extra multiplyScalar(0.5)
      // The right turn is a tight quarter-circle: interpolate between enterPoint and exitEnter
      const midPoint = new THREE.Vector3().addVectors(enterPoint, exitEnter).multiplyScalar(0.5);
      // Push midpoint slightly outward toward the corner to create a proper arc
      const cornerDir = new THREE.Vector3().addVectors(travelDir, exitDir).normalize();
      midPoint.addScaledVector(cornerDir, INTERSECTION_SIZE * 0.18);
      points.push(startPos, stopPos, enterPoint, midPoint, exitEnter, exitStop, endPos);
    } else {
      // Left turn — wider arc through the intersection center
      const mid1 = new THREE.Vector3().lerpVectors(enterPoint, exitEnter, 0.33);
      const mid2 = new THREE.Vector3().lerpVectors(enterPoint, exitEnter, 0.67);
      points.push(startPos, stopPos, enterPoint, mid1, mid2, exitEnter, exitStop, endPos);
    }
  }

  const curve = new THREE.CatmullRomCurve3(points, false, 'catmullrom', 0.4);
  return { approach, turn, curve, length: curve.getLength(), laneOffset: offset };
}
