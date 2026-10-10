// Procedural 16x16 Grid Full City Generator: Arterials, Diagonals, Parks, River Canal & 300+ Buildings
import * as THREE from "three";
import { CORRIDOR_JUNCTION_NODES } from "./road-graph";

export interface CityBuilding {
  id: string;
  pos: [number, number, number];
  size: [number, number, number];
  type: "tower" | "midrise" | "lowblock" | "hospital" | "commercial";
  color: string;
}

export interface CityRoadSegment {
  id: string;
  start: [number, number];
  end: [number, number];
  length: number;
  width: number;
  heading: number;
  isMainCorridor: boolean;
  laneCount: number;
}

export interface CityJunction {
  id: string;
  name: string;
  x: number;
  z: number;
  isCorridorNode: boolean;
  cycleTimer: number;
  cycleDuration: number;
  currentPhase: "NS_GREEN" | "EW_GREEN" | "PREEMPTED";
}

export interface CityPark {
  id: string;
  center: [number, number];
  size: [number, number];
}

export interface FullCityData {
  buildings: CityBuilding[];
  roads: CityRoadSegment[];
  junctions: CityJunction[];
  parks: CityPark[];
  trees: [number, number, number][];
  riverBounds: { xMin: number; xMax: number; zMin: number; zMax: number };
}

// Seeded pseudorandom generator for deterministic city generation
function createSeededRng(seed = 98765) {
  let s = seed;
  return function () {
    s |= 0;
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function generateFullCity(seed = 42): FullCityData {
  const rng = createSeededRng(seed);

  const GRID_COUNT = 16;
  const BLOCK_SIZE = 70; // 70 sim units per block -> ~1.2 km grid (-560 to +560)
  const HALF_EXTENT = (GRID_COUNT * BLOCK_SIZE) / 2; // 560

  const buildings: CityBuilding[] = [];
  const roads: CityRoadSegment[] = [];
  const junctions: CityJunction[] = [];
  const parks: CityPark[] = [];
  const trees: [number, number, number][] = [];

  // 1. River Canal on East Side (x between 340 and 420)
  const riverBounds = {
    xMin: 340,
    xMax: 420,
    zMin: -HALF_EXTENT - 100,
    zMax: HALF_EXTENT + 100,
  };

  // 2. Parks / Green Plazas
  parks.push(
    { id: "park-kaloor-north", center: [-175, -245], size: [110, 110] },
    { id: "park-central-plaza", center: [-35, 105], size: [110, 110] },
    { id: "park-waterfront", center: [280, -140], size: [90, 180] }
  );

  // 3. Generate City Grid Junctions & Roads
  const gridCoords: number[] = [];
  for (let i = 0; i <= GRID_COUNT; i++) {
    gridCoords.push(-HALF_EXTENT + i * BLOCK_SIZE);
  }

  // Create Grid Junctions
  gridCoords.forEach((x, xi) => {
    gridCoords.forEach((z, zi) => {
      // Don't place normal junctions inside river canal
      if (x > riverBounds.xMin + 10 && x < riverBounds.xMax - 10) return;

      const isCorridor = CORRIDOR_JUNCTION_NODES.some(
        (cn) => Math.hypot(cn.x - x, cn.z - z) < 30
      );

      junctions.push({
        id: `jn-grid-${xi}-${zi}`,
        name: isCorridor ? `Corridor Node (${x}, ${z})` : `Junction ${xi}-${zi}`,
        x,
        z,
        isCorridorNode: isCorridor,
        cycleTimer: (xi * 5 + zi * 7) % 28,
        cycleDuration: 28,
        currentPhase: (xi + zi) % 2 === 0 ? "NS_GREEN" : "EW_GREEN",
      });
    });
  });

  // Create Horizontal (East-West) Road Segments
  gridCoords.forEach((z, zi) => {
    for (let xi = 0; xi < gridCoords.length - 1; xi++) {
      const x1 = gridCoords[xi];
      const x2 = gridCoords[xi + 1];

      // If road crosses river, it's a bridge segment
      const isBridge = (x1 < riverBounds.xMin && x2 > riverBounds.xMin) || (x1 >= riverBounds.xMin && x2 <= riverBounds.xMax);
      const isMainCorr = z === -100 || z === -20 || z === 80;

      const len = x2 - x1;
      roads.push({
        id: `road-ew-${xi}-${zi}`,
        start: [x1, z],
        end: [x2, z],
        length: len,
        width: isMainCorr ? 15 : 12,
        heading: 0,
        isMainCorridor: isMainCorr,
        laneCount: isMainCorr ? 4 : 2,
      });
    }
  });

  // Create Vertical (North-South) Road Segments
  gridCoords.forEach((x, xi) => {
    if (x > riverBounds.xMin + 15 && x < riverBounds.xMax - 15) return;

    for (let zi = 0; zi < gridCoords.length - 1; zi++) {
      const z1 = gridCoords[zi];
      const z2 = gridCoords[zi + 1];

      const isMainCorr = x === -100 || x === 20 || x === 230;
      const len = z2 - z1;
      roads.push({
        id: `road-ns-${xi}-${zi}`,
        start: [x, z1],
        end: [x, z2],
        length: len,
        width: isMainCorr ? 15 : 12,
        heading: Math.PI / 2,
        isMainCorridor: isMainCorr,
        laneCount: isMainCorr ? 4 : 2,
      });
    }
  });

  // Diagonal Avenues (Connecting City Quadrants)
  roads.push(
    {
      id: "road-diag-sw-ne",
      start: [-420, -420],
      end: [-100, -100],
      length: Math.hypot(320, 320),
      width: 14,
      heading: Math.PI / 4,
      isMainCorridor: false,
      laneCount: 2,
    },
    {
      id: "road-diag-nw-se",
      start: [-420, 280],
      end: [20, -160],
      length: Math.hypot(440, 440),
      width: 14,
      heading: -Math.PI / 4,
      isMainCorridor: false,
      laneCount: 2,
    }
  );

  // 4. Procedural Buildings in 16x16 Blocks
  for (let xi = 0; xi < GRID_COUNT; xi++) {
    for (let zi = 0; zi < GRID_COUNT; zi++) {
      const bx = -HALF_EXTENT + xi * BLOCK_SIZE + BLOCK_SIZE / 2;
      const bz = -HALF_EXTENT + zi * BLOCK_SIZE + BLOCK_SIZE / 2;

      // Skip blocks overlapping the River Canal
      if (bx > riverBounds.xMin - 20 && bx < riverBounds.xMax + 20) continue;

      // Skip blocks designated as Parks
      const inPark = parks.some((p) => Math.hypot(p.center[0] - bx, p.center[1] - bz) < 55);
      if (inPark) {
        // Place park trees instead
        for (let tIdx = 0; tIdx < 8; tIdx++) {
          trees.push([
            bx + (rng() - 0.5) * 45,
            1.8,
            bz + (rng() - 0.5) * 45,
          ]);
        }
        continue;
      }

      // Distance from city center
      const distFromCenter = Math.hypot(bx, bz);

      // Subdivide block into 2 to 4 distinct buildings
      const subCount = rng() > 0.4 ? 4 : 2;

      for (let s = 0; s < subCount; s++) {
        const offX = subCount === 4 ? (s % 2 === 0 ? -16 : 16) : (s === 0 ? -15 : 15);
        const offZ = subCount === 4 ? (s < 2 ? -16 : 16) : 0;
        const width = subCount === 4 ? 24 : 28;
        const depth = subCount === 4 ? 24 : 48;

        const posX = bx + offX;
        const posZ = bz + offZ;

        // Determine height based on district density
        let height: number;
        let type: CityBuilding["type"] = "midrise";

        if (distFromCenter < 220) {
          // Central Business District / High-Rise Towers
          height = 42 + rng() * 45; // 42m - 87m
          type = "tower";
        } else if (distFromCenter < 420) {
          // Mid-Rise Commercial & Residential
          height = 20 + rng() * 26; // 20m - 46m
          type = "midrise";
        } else {
          // Low-Rise Outer Blocks
          height = 9 + rng() * 14; // 9m - 23m
          type = "lowblock";
        }

        buildings.push({
          id: `bldg-${xi}-${zi}-${s}`,
          pos: [posX, height / 2, posZ],
          size: [width, height, depth],
          type,
          color: "#ffffff",
        });

        // Add tree in courtyard/sidewalk
        if (s === 0 && rng() > 0.3) {
          trees.push([posX + width / 2 + 4, 1.8, posZ + depth / 2 + 4]);
        }
      }
    }
  }

  // 5. Place Aster Medcity Trauma Center Complex at destination
  buildings.push({
    id: "bldg-aster-main",
    pos: [230, 18, 60],
    size: [48, 36, 36],
    type: "hospital",
    color: "#ffffff",
  });
  buildings.push({
    id: "bldg-aster-trauma-wing",
    pos: [205, 6, 60],
    size: [18, 12, 28],
    type: "hospital",
    color: "#ffffff",
  });

  return {
    buildings,
    roads,
    junctions,
    parks,
    trees,
    riverBounds,
  };
}
