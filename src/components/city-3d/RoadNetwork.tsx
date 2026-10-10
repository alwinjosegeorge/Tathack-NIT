import { useMemo } from 'react';
import * as THREE from 'three';
import {
  ROAD_WIDTH, ROAD_LENGTH, LANE_WIDTH, SIDEWALK_WIDTH, CURB_HEIGHT,
  BLOCK_SIZE, CITY_BLOCKS_X, CITY_BLOCKS_Z,
} from '@/lib/city-sim/constants';

/* ============================================================
   GROUND & TERRAIN
   ============================================================ */

function Ground() {
  return (
    <mesh position={[0, -0.05, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
      <planeGeometry args={[1200, 1200]} />
      <meshStandardMaterial color="#2d3a22" roughness={1} />
    </mesh>
  );
}

/** Kochi backwater canal — runs along the south edge of the city */
function Backwater() {
  const canalZ = BLOCK_SIZE * CITY_BLOCKS_Z + ROAD_WIDTH + 15;
  return (
    <group position={[0, 0, canalZ]}>
      <mesh position={[0, -0.3, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[1000, 60]} />
        <meshStandardMaterial color="#1a4a5a" roughness={0.15} metalness={0.4} transparent opacity={0.85} />
      </mesh>
      <mesh position={[0, 0.1, 33]} receiveShadow>
        <boxGeometry args={[1000, 0.4, 10]} />
        <meshStandardMaterial color="#3a4a30" roughness={0.9} />
      </mesh>
      <mesh position={[0, 0.3, -30]} receiveShadow castShadow>
        <boxGeometry args={[1000, 0.8, 4]} />
        <meshStandardMaterial color="#6a6a5a" roughness={0.8} />
      </mesh>
    </group>
  );
}

/** A secondary canal / waterway cutting through the west side */
function WestCanal() {
  const canalX = -(BLOCK_SIZE * CITY_BLOCKS_X + ROAD_WIDTH + 15);
  return (
    <group position={[canalX, 0, 0]}>
      <mesh position={[0, -0.3, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[50, 800]} />
        <meshStandardMaterial color="#1a4a5a" roughness={0.15} metalness={0.4} transparent opacity={0.85} />
      </mesh>
      <mesh position={[-30, 0.3, 0]} receiveShadow castShadow>
        <boxGeometry args={[4, 0.8, 800]} />
        <meshStandardMaterial color="#6a6a5a" roughness={0.8} />
      </mesh>
      <mesh position={[33, 0.1, 0]} receiveShadow>
        <boxGeometry args={[10, 0.4, 800]} />
        <meshStandardMaterial color="#3a4a30" roughness={0.9} />
      </mesh>
    </group>
  );
}

/** Bridge over the backwater */
function Bridge() {
  const bridgeZ = BLOCK_SIZE * CITY_BLOCKS_Z + ROAD_WIDTH + 15;
  return (
    <group position={[0, 0, bridgeZ]}>
      <mesh position={[0, 0.5, 0]} castShadow receiveShadow>
        <boxGeometry args={[ROAD_WIDTH + 2, 1, 65]} />
        <meshStandardMaterial color="#4a4a44" roughness={0.7} metalness={0.2} />
      </mesh>
      <mesh position={[ROAD_WIDTH / 2, 1.4, 0]} castShadow>
        <boxGeometry args={[0.3, 1.2, 65]} />
        <meshStandardMaterial color="#2a2a2a" roughness={0.6} metalness={0.4} />
      </mesh>
      <mesh position={[-ROAD_WIDTH / 2, 1.4, 0]} castShadow>
        <boxGeometry args={[0.3, 1.2, 65]} />
        <meshStandardMaterial color="#2a2a2a" roughness={0.6} metalness={0.4} />
      </mesh>
      {[-25, -8, 10, 28].map((z, i) => (
        <mesh key={i} position={[0, -2, z]} castShadow>
          <cylinderGeometry args={[0.8, 1.0, 6, 8]} />
          <meshStandardMaterial color="#5a5a50" roughness={0.8} />
        </mesh>
      ))}
    </group>
  );
}

/* ============================================================
   ROADS & MARKINGS
   ============================================================ */

function RoadSegment({ axis, x, z, length }: { axis: 'ns' | 'ew'; x: number; z: number; length: number }) {
  if (axis === 'ns') {
    return (
      <mesh position={[x, 0.01, z]} receiveShadow>
        <planeGeometry args={[ROAD_WIDTH, length]} />
        <meshStandardMaterial color="#2a2a2e" roughness={0.95} metalness={0.05} />
      </mesh>
    );
  }
  return (
    <mesh position={[x, 0.01, z]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
      <planeGeometry args={[length, ROAD_WIDTH]} />
      <meshStandardMaterial color="#2a2a2e" roughness={0.95} metalness={0.05} />
    </mesh>
  );
}

function CenterLineSegment({ axis, x, z, length }: { axis: 'ns' | 'ew'; x: number; z: number; length: number }) {
  const dashes = useMemo(() => {
    const arr: { pos: [number, number, number] }[] = [];
    const dashLen = 2.5, gap = 2.5, total = dashLen + gap;
    const half = length / 2;
    const count = Math.floor(length / total);
    for (let i = 0; i < count; i++) {
      const d = -half + i * total + dashLen / 2;
      if (axis === 'ns') arr.push({ pos: [x, 0.02, z + d] });
      else arr.push({ pos: [x + d, 0.02, z] });
    }
    return arr;
  }, [axis, x, z, length]);

  return (
    <group>
      {dashes.map((d, i) => (
        <mesh key={i} position={d.pos} rotation={[-Math.PI / 2, 0, axis === 'ns' ? 0 : Math.PI / 2]}>
          <planeGeometry args={[0.15, 2.5]} />
          <meshStandardMaterial color="#f5e642" roughness={0.6} />
        </mesh>
      ))}
    </group>
  );
}

function SidewalkSegment({ axis, x, z, length }: { axis: 'ns' | 'ew'; x: number; z: number; length: number }) {
  const sw = SIDEWALK_WIDTH;
  const halfRoad = ROAD_WIDTH / 2;
  if (axis === 'ns') {
    return (
      <group>
        <mesh position={[x + halfRoad + sw / 2, CURB_HEIGHT / 2, z]} receiveShadow castShadow>
          <boxGeometry args={[sw, CURB_HEIGHT, length]} />
          <meshStandardMaterial color="#9a9a8a" roughness={0.8} />
        </mesh>
        <mesh position={[x - halfRoad - sw / 2, CURB_HEIGHT / 2, z]} receiveShadow castShadow>
          <boxGeometry args={[sw, CURB_HEIGHT, length]} />
          <meshStandardMaterial color="#9a9a8a" roughness={0.8} />
        </mesh>
      </group>
    );
  }
  return (
    <group>
      <mesh position={[x, CURB_HEIGHT / 2, z + halfRoad + sw / 2]} receiveShadow castShadow>
        <boxGeometry args={[length, CURB_HEIGHT, sw]} />
        <meshStandardMaterial color="#9a9a8a" roughness={0.8} />
      </mesh>
      <mesh position={[x, CURB_HEIGHT / 2, z - halfRoad - sw / 2]} receiveShadow castShadow>
        <boxGeometry args={[length, CURB_HEIGHT, sw]} />
        <meshStandardMaterial color="#9a9a8a" roughness={0.8} />
      </mesh>
    </group>
  );
}

function StopLines() {
  const offset = ROAD_WIDTH / 2 + 0.3;
  return (
    <group>
      <mesh position={[LANE_WIDTH / 2, 0.02, offset]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[LANE_WIDTH, 0.3]} />
        <meshStandardMaterial color="#ffffff" roughness={0.5} />
      </mesh>
      <mesh position={[-LANE_WIDTH / 2, 0.02, -offset]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[LANE_WIDTH, 0.3]} />
        <meshStandardMaterial color="#ffffff" roughness={0.5} />
      </mesh>
      <mesh position={[-offset, 0.02, LANE_WIDTH / 2]} rotation={[-Math.PI / 2, 0, Math.PI / 2]}>
        <planeGeometry args={[LANE_WIDTH, 0.3]} />
        <meshStandardMaterial color="#ffffff" roughness={0.5} />
      </mesh>
      <mesh position={[offset, 0.02, -LANE_WIDTH / 2]} rotation={[-Math.PI / 2, 0, Math.PI / 2]}>
        <planeGeometry args={[LANE_WIDTH, 0.3]} />
        <meshStandardMaterial color="#ffffff" roughness={0.5} />
      </mesh>
    </group>
  );
}

function PedestrianCrossings() {
  const stripes: { pos: [number, number, number]; rot: number; w: number; h: number }[] = [];
  const sw = 0.4, gap = 0.3, depth = 3.5;
  const offset = ROAD_WIDTH / 2 + depth / 2 + 0.5;
  for (let i = 0; i < 9; i++) {
    const x = -ROAD_WIDTH / 2 + 0.5 + i * (sw + gap);
    stripes.push({ pos: [x, 0.02, -offset], rot: 0, w: sw, h: depth });
    stripes.push({ pos: [x, 0.02, offset], rot: 0, w: sw, h: depth });
  }
  for (let i = 0; i < 9; i++) {
    const z = -ROAD_WIDTH / 2 + 0.5 + i * (sw + gap);
    stripes.push({ pos: [offset, 0.02, z], rot: Math.PI / 2, w: sw, h: depth });
    stripes.push({ pos: [-offset, 0.02, z], rot: Math.PI / 2, w: sw, h: depth });
  }
  return (
    <group>
      {stripes.map((s, i) => (
        <mesh key={i} position={s.pos} rotation={[-Math.PI / 2, 0, s.rot]}>
          <planeGeometry args={[s.w, s.h]} />
          <meshStandardMaterial color="#e0e0e0" roughness={0.6} />
        </mesh>
      ))}
    </group>
  );
}

/* ============================================================
   BUILDINGS
   ============================================================ */

const BUILDING_COLORS = [
  '#c4956a', '#b8a88a', '#a09080', '#c4a070', '#b0a090',
  '#d4c0a0', '#a89878', '#c0b098', '#9a8870', '#d0c4a8',
  '#8a7860', '#bca888', '#c8b898', '#a09880',
];
const COLONIAL_COLORS = ['#e8dcc8', '#d8c8b0', '#c8b8a0', '#f0e8d8', '#d0c0a8'];
const GLASS_COLORS = ['#4a8aaa', '#3a7a9a', '#5a9ab0', '#4a90a8', '#3a6a8a'];

function BuildingWindows({ w, d, h }: { w: number; d: number; h: number }) {
  const floors = Math.floor(h / 3);
  const windowsX = Math.floor(w / 2.5);
  const windowsZ = Math.floor(d / 2.5);
  const emissive = Math.random() > 0.6 ? 0.3 : 0.12;
  return (
    <group>
      {Array.from({ length: floors }, (_, floor) => {
        const y = 2 + floor * 3;
        return (
          <group key={floor}>
            {Array.from({ length: windowsX }, (_, wi) => {
              const x = -w / 2 + 1.5 + wi * 2.5;
              return [
                <mesh key={`f${wi}`} position={[x, y, d / 2 + 0.02]}>
                  <planeGeometry args={[1.2, 1.6]} />
                  <meshStandardMaterial color="#4a6a8a" emissive="#3a5a7a" emissiveIntensity={emissive} roughness={0.3} />
                </mesh>,
                <mesh key={`b${wi}`} position={[x, y, -d / 2 - 0.02]} rotation={[0, Math.PI, 0]}>
                  <planeGeometry args={[1.2, 1.6]} />
                  <meshStandardMaterial color="#4a6a8a" emissive="#3a5a7a" emissiveIntensity={emissive} roughness={0.3} />
                </mesh>,
              ];
            })}
            {Array.from({ length: windowsZ }, (_, wi) => {
              const z = -d / 2 + 1.5 + wi * 2.5;
              return [
                <mesh key={`r${wi}`} position={[w / 2 + 0.02, y, z]} rotation={[0, Math.PI / 2, 0]}>
                  <planeGeometry args={[1.2, 1.6]} />
                  <meshStandardMaterial color="#4a6a8a" emissive="#3a5a7a" emissiveIntensity={emissive} roughness={0.3} />
                </mesh>,
                <mesh key={`l${wi}`} position={[-w / 2 - 0.02, y, z]} rotation={[0, -Math.PI / 2, 0]}>
                  <planeGeometry args={[1.2, 1.6]} />
                  <meshStandardMaterial color="#4a6a8a" emissive="#3a5a7a" emissiveIntensity={emissive} roughness={0.3} />
                </mesh>,
              ];
            })}
          </group>
        );
      })}
    </group>
  );
}

type BuildingType = 'normal' | 'colonial' | 'glass' | 'godown';

function SingleBuilding({ pos, w, d, h, color, type }: {
  pos: [number, number, number]; w: number; d: number; h: number; color: string; type: BuildingType;
}) {
  return (
    <group position={pos}>
      <mesh position={[0, h / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[w, h, d]} />
        <meshStandardMaterial
          color={color}
          roughness={type === 'glass' ? 0.15 : 0.85}
          metalness={type === 'glass' ? 0.7 : 0.05}
        />
      </mesh>
      {type === 'colonial' && (
        <mesh position={[0, h + 0.5, 0]} castShadow>
          <boxGeometry args={[w + 0.8, 1.0, d + 0.8]} />
          <meshStandardMaterial color="#7a3a2a" roughness={0.8} />
        </mesh>
      )}
      {type === 'normal' && (
        <mesh position={[0, h + 0.15, 0]} castShadow>
          <boxGeometry args={[w + 0.3, 0.4, d + 0.3]} />
          <meshStandardMaterial color="#5a4a3a" roughness={0.8} />
        </mesh>
      )}
      {type === 'godown' && (
        <mesh position={[0, h + 0.4, 0]} castShadow rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[w * 0.55, w * 0.6, 1.2, 8, 1, false, 0, Math.PI]} />
          <meshStandardMaterial color="#5a4a3a" roughness={0.85} />
        </mesh>
      )}
      <mesh position={[0, 1.2, d / 2 + 0.03]}>
        <planeGeometry args={[w * 0.8, 1.8]} />
        <meshStandardMaterial color="#d8c8a0" emissive="#c8a868" emissiveIntensity={0.1} roughness={0.4} />
      </mesh>
      <BuildingWindows w={w} d={d} h={h} />
    </group>
  );
}

function pickType(): BuildingType {
  const r = Math.random();
  if (r < 0.55) return 'normal';
  if (r < 0.70) return 'colonial';
  if (r < 0.88) return 'glass';
  return 'godown';
}

function pickColor(type: BuildingType): string {
  if (type === 'colonial') return COLONIAL_COLORS[Math.floor(Math.random() * COLONIAL_COLORS.length)];
  if (type === 'glass') return GLASS_COLORS[Math.floor(Math.random() * GLASS_COLORS.length)];
  return BUILDING_COLORS[Math.floor(Math.random() * BUILDING_COLORS.length)];
}

function CityBuildings() {
  const buildings = useMemo(() => {
    const list: { pos: [number, number, number]; w: number; d: number; h: number; color: string; type: BuildingType }[] = [];
    const halfRoad = ROAD_WIDTH / 2 + SIDEWALK_WIDTH + 3;

    // Main intersection corners — 4 large towers
    const corners = [
      { x: halfRoad, z: -halfRoad, w: 16, d: 18, h: 30, type: 'glass' as BuildingType },
      { x: -halfRoad, z: -halfRoad, w: 14, d: 16, h: 22, type: 'colonial' as BuildingType },
      { x: halfRoad, z: halfRoad, w: 15, d: 17, h: 34, type: 'glass' as BuildingType },
      { x: -halfRoad, z: halfRoad, w: 17, d: 15, h: 20, type: 'colonial' as BuildingType },
    ];
    for (const c of corners) {
      list.push({ pos: [c.x, 0, c.z], w: c.w, d: c.d, h: c.h, color: pickColor(c.type), type: c.type });
    }

    // Grid block buildings — fill every block in the 5x5 grid
    for (let bx = 0; bx < CITY_BLOCKS_X; bx++) {
      for (let bz = 0; bz < CITY_BLOCKS_Z; bz++) {
        const blockCenterX = (bx - (CITY_BLOCKS_X - 1) / 2) * BLOCK_SIZE;
        const blockCenterZ = (bz - (CITY_BLOCKS_Z - 1) / 2) * BLOCK_SIZE;
        // Skip the central block (main intersection)
        if (Math.abs(blockCenterX) < 5 && Math.abs(blockCenterZ) < 5) continue;

        const blockSizeInner = BLOCK_SIZE - ROAD_WIDTH - SIDEWALK_WIDTH * 2 - 6;
        const count = 3 + Math.floor(Math.random() * 3); // 3-5 buildings per block
        for (let i = 0; i < count; i++) {
          const offsetX = (Math.random() - 0.5) * blockSizeInner * 0.65;
          const offsetZ = (Math.random() - 0.5) * blockSizeInner * 0.65;
          const type = pickType();
          const w = 6 + Math.random() * 10;
          const dep = 6 + Math.random() * 10;
          // Glass towers in some blocks get taller
          const h = type === 'glass' ? 14 + Math.random() * 28 : 7 + Math.random() * 18;
          list.push({ pos: [blockCenterX + offsetX, 0, blockCenterZ + offsetZ], w, d: dep, h, color: pickColor(type), type });
        }
      }
    }

    // Outlier buildings lining the extended roads
    for (let dist = BLOCK_SIZE * 3; dist < ROAD_LENGTH - 10; dist += 20) {
      const sides: [number, number][] = [
        [ROAD_WIDTH / 2 + SIDEWALK_WIDTH + 5, dist],
        [-(ROAD_WIDTH / 2 + SIDEWALK_WIDTH + 5), dist],
        [ROAD_WIDTH / 2 + SIDEWALK_WIDTH + 5, -dist],
        [-(ROAD_WIDTH / 2 + SIDEWALK_WIDTH + 5), -dist],
        [dist, ROAD_WIDTH / 2 + SIDEWALK_WIDTH + 5],
        [-dist, ROAD_WIDTH / 2 + SIDEWALK_WIDTH + 5],
        [dist, -(ROAD_WIDTH / 2 + SIDEWALK_WIDTH + 5)],
        [-dist, -(ROAD_WIDTH / 2 + SIDEWALK_WIDTH + 5)],
      ];
      for (const [x, z] of sides) {
        if (Math.abs(x) < BLOCK_SIZE * 3 && Math.abs(z) < BLOCK_SIZE * 3) continue;
        const type = pickType();
        const w = 5 + Math.random() * 8;
        const dep = 5 + Math.random() * 8;
        const h = type === 'glass' ? 10 + Math.random() * 22 : 6 + Math.random() * 14;
        list.push({ pos: [x, 0, z], w, d: dep, h, color: pickColor(type), type });
      }
    }

    // Buildings along grid cross-streets
    for (let bx = 1; bx <= CITY_BLOCKS_X; bx++) {
      const x = bx * BLOCK_SIZE;
      if (x >= ROAD_LENGTH) break;
      for (let dist = 20; dist < ROAD_LENGTH - 10; dist += 25) {
        for (const [px, pz] of [[x + ROAD_WIDTH / 2 + SIDEWALK_WIDTH + 4, dist], [x - ROAD_WIDTH / 2 - SIDEWALK_WIDTH - 4, dist], [x + ROAD_WIDTH / 2 + SIDEWALK_WIDTH + 4, -dist], [x - ROAD_WIDTH / 2 - SIDEWALK_WIDTH - 4, -dist]] as [number, number][]) {
          if (Math.abs(px) < BLOCK_SIZE * 2.5 && Math.abs(pz) < BLOCK_SIZE * 2.5) continue;
          const type = pickType();
          list.push({ pos: [px, 0, pz], w: 5 + Math.random() * 7, d: 5 + Math.random() * 7, h: 7 + Math.random() * 15, color: pickColor(type), type });
        }
      }
      // Also for negative x
      const nx = -x;
      for (let dist = 20; dist < ROAD_LENGTH - 10; dist += 25) {
        for (const [px, pz] of [[nx + ROAD_WIDTH / 2 + SIDEWALK_WIDTH + 4, dist], [nx - ROAD_WIDTH / 2 - SIDEWALK_WIDTH - 4, dist], [nx + ROAD_WIDTH / 2 + SIDEWALK_WIDTH + 4, -dist], [nx - ROAD_WIDTH / 2 - SIDEWALK_WIDTH - 4, -dist]] as [number, number][]) {
          if (Math.abs(px) < BLOCK_SIZE * 2.5 && Math.abs(pz) < BLOCK_SIZE * 2.5) continue;
          const type = pickType();
          list.push({ pos: [px, 0, pz], w: 5 + Math.random() * 7, d: 5 + Math.random() * 7, h: 7 + Math.random() * 15, color: pickColor(type), type });
        }
      }
    }

    return list;
  }, []);

  return (
    <group>
      {buildings.map((b, i) => (
        <SingleBuilding key={i} pos={b.pos} w={b.w} d={b.d} h={b.h} color={b.color} type={b.type} />
      ))}
    </group>
  );
}

/* ============================================================
   STREETLIGHTS
   ============================================================ */

function Streetlights() {
  const positions = useMemo(() => {
    const arr: [number, number, number][] = [];
    const offset = ROAD_WIDTH / 2 + SIDEWALK_WIDTH / 2;
    for (let d = 20; d < ROAD_LENGTH; d += 35) {
      arr.push([offset, 0, d], [-offset, 0, d], [offset, 0, -d], [-offset, 0, -d]);
      arr.push([d, 0, offset], [-d, 0, offset], [d, 0, -offset], [-d, 0, -offset]);
    }
    for (let bx = 1; bx <= CITY_BLOCKS_X; bx++) {
      const x = bx * BLOCK_SIZE;
      if (x >= ROAD_LENGTH) break;
      for (let d = 20; d < ROAD_LENGTH; d += 35) {
        arr.push([x + offset, 0, d], [x - offset, 0, d], [x + offset, 0, -d], [x - offset, 0, -d]);
        arr.push([-x + offset, 0, d], [-x - offset, 0, d], [-x + offset, 0, -d], [-x - offset, 0, -d]);
      }
    }
    for (let bz = 1; bz <= CITY_BLOCKS_Z; bz++) {
      const z = bz * BLOCK_SIZE;
      if (z >= ROAD_LENGTH) break;
      for (let d = 20; d < ROAD_LENGTH; d += 35) {
        arr.push([d, 0, z + offset], [d, 0, z - offset], [-d, 0, z + offset], [-d, 0, z - offset]);
        arr.push([d, 0, -z + offset], [d, 0, -z - offset], [-d, 0, -z + offset], [-d, 0, -z - offset]);
      }
    }
    arr.push([offset, 0, -offset], [-offset, 0, -offset], [offset, 0, offset], [-offset, 0, offset]);
    return arr;
  }, []);

  return (
    <group>
      {positions.map((p, i) => (
        <group key={i} position={p}>
          <mesh position={[0, 3.5, 0]} castShadow>
            <cylinderGeometry args={[0.08, 0.1, 7, 8]} />
            <meshStandardMaterial color="#2a2a2a" metalness={0.6} roughness={0.4} />
          </mesh>
          <mesh position={[0.6, 7, 0]} castShadow>
            <boxGeometry args={[1.2, 0.08, 0.08]} />
            <meshStandardMaterial color="#2a2a2a" metalness={0.6} roughness={0.4} />
          </mesh>
          <mesh position={[1.1, 6.9, 0]}>
            <boxGeometry args={[0.4, 0.15, 0.25]} />
            <meshStandardMaterial color="#fff8e0" emissive="#fff8e0" emissiveIntensity={0.25} />
          </mesh>
          {i < 12 && (
            <pointLight position={[1.1, 6.8, 0]} color="#fff8e0" intensity={12} distance={22} decay={2} />
          )}
        </group>
      ))}
    </group>
  );
}

/* ============================================================
   PALM TREES & VEGETATION
   ============================================================ */

function PalmTree({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh position={[0, 1.5, 0]} castShadow rotation={[0.05, 0, 0.03]}>
        <cylinderGeometry args={[0.18, 0.25, 3, 8]} />
        <meshStandardMaterial color="#6a4a2a" roughness={0.9} />
      </mesh>
      <mesh position={[0.12, 3.2, 0]} castShadow rotation={[0.12, 0, 0.06]}>
        <cylinderGeometry args={[0.14, 0.18, 1.8, 8]} />
        <meshStandardMaterial color="#6a4a2a" roughness={0.9} />
      </mesh>
      {Array.from({ length: 7 }, (_, i) => {
        const angle = (i / 7) * Math.PI * 2;
        const tilt = 0.3 + Math.random() * 0.15;
        return (
          <mesh key={i} position={[0.2 + Math.cos(angle) * 0.3, 4.0, Math.sin(angle) * 0.3]} rotation={[tilt, angle, 0]} castShadow>
            <coneGeometry args={[0.4, 3, 4, 1, true]} />
            <meshStandardMaterial color="#2d6a2d" roughness={0.9} side={THREE.DoubleSide} />
          </mesh>
        );
      })}
      <mesh position={[0.15, 3.9, 0]}>
        <sphereGeometry args={[0.18, 6, 5]} />
        <meshStandardMaterial color="#5a3a1a" roughness={0.8} />
      </mesh>
    </group>
  );
}

function BroadleafTree({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh position={[0, 1.5, 0]} castShadow>
        <cylinderGeometry args={[0.2, 0.28, 3, 6]} />
        <meshStandardMaterial color="#5a3a20" roughness={0.9} />
      </mesh>
      <mesh position={[0, 3.5, 0]} castShadow>
        <sphereGeometry args={[1.5, 8, 6]} />
        <meshStandardMaterial color="#2d5a2d" roughness={0.9} />
      </mesh>
      <mesh position={[0.6, 4, 0.3]} castShadow>
        <sphereGeometry args={[1.0, 6, 5]} />
        <meshStandardMaterial color="#3a6a3a" roughness={0.9} />
      </mesh>
    </group>
  );
}

function Vegetation() {
  const items = useMemo(() => {
    const arr: { pos: [number, number, number]; palm: boolean }[] = [];
    const offset = ROAD_WIDTH / 2 + SIDEWALK_WIDTH + 1.5;
    for (let d = 18; d < ROAD_LENGTH - 10; d += 18) {
      arr.push({ pos: [offset, 0, d], palm: Math.random() > 0.4 });
      arr.push({ pos: [-offset, 0, d], palm: Math.random() > 0.4 });
      arr.push({ pos: [offset, 0, -d], palm: Math.random() > 0.4 });
      arr.push({ pos: [-offset, 0, -d], palm: Math.random() > 0.4 });
      arr.push({ pos: [d, 0, offset], palm: Math.random() > 0.4 });
      arr.push({ pos: [-d, 0, offset], palm: Math.random() > 0.4 });
      arr.push({ pos: [d, 0, -offset], palm: Math.random() > 0.4 });
      arr.push({ pos: [-d, 0, -offset], palm: Math.random() > 0.4 });
    }
    for (let bx = 1; bx <= CITY_BLOCKS_X; bx++) {
      const x = bx * BLOCK_SIZE;
      if (x >= ROAD_LENGTH) break;
      for (let d = 18; d < ROAD_LENGTH - 10; d += 20) {
        arr.push({ pos: [x + offset, 0, d], palm: Math.random() > 0.4 });
        arr.push({ pos: [x - offset, 0, -d], palm: Math.random() > 0.4 });
        arr.push({ pos: [-x + offset, 0, d], palm: Math.random() > 0.4 });
        arr.push({ pos: [-x - offset, 0, -d], palm: Math.random() > 0.4 });
      }
    }
    for (let bz = 1; bz <= CITY_BLOCKS_Z; bz++) {
      const z = bz * BLOCK_SIZE;
      if (z >= ROAD_LENGTH) break;
      for (let d = 18; d < ROAD_LENGTH - 10; d += 20) {
        arr.push({ pos: [d, 0, z + offset], palm: Math.random() > 0.4 });
        arr.push({ pos: [-d, 0, z - offset], palm: Math.random() > 0.4 });
        arr.push({ pos: [d, 0, -z + offset], palm: Math.random() > 0.4 });
        arr.push({ pos: [-d, 0, -z - offset], palm: Math.random() > 0.4 });
      }
    }
    return arr;
  }, []);

  return (
    <group>
      {items.map((t, i) =>
        t.palm ? <PalmTree key={i} position={t.pos} /> : <BroadleafTree key={i} position={t.pos} />
      )}
    </group>
  );
}

/* ============================================================
   KOCHI LANDMARKS & MONUMENTS
   ============================================================ */

/** Chinese fishing nets (Cheena vala) */
function ChineseFishingNet({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh position={[0, 3, 0]} castShadow rotation={[0, 0, 0.08]}>
        <cylinderGeometry args={[0.1, 0.12, 7, 6]} />
        <meshStandardMaterial color="#5a3a1a" roughness={0.9} />
      </mesh>
      <mesh position={[2, 3, 0]} castShadow rotation={[0, 0, -0.06]}>
        <cylinderGeometry args={[0.1, 0.12, 7, 6]} />
        <meshStandardMaterial color="#5a3a1a" roughness={0.9} />
      </mesh>
      <mesh position={[-2, 3, 0]} castShadow rotation={[0, 0, 0.06]}>
        <cylinderGeometry args={[0.1, 0.12, 7, 6]} />
        <meshStandardMaterial color="#5a3a1a" roughness={0.9} />
      </mesh>
      <mesh position={[0, 6, 0]} castShadow>
        <boxGeometry args={[5, 0.15, 0.15]} />
        <meshStandardMaterial color="#5a3a1a" roughness={0.9} />
      </mesh>
      <mesh position={[0, 3.5, 1.5]} castShadow rotation={[0.4, 0, 0]}>
        <coneGeometry args={[3, 4, 8, 1, true]} />
        <meshStandardMaterial color="#8a7a5a" roughness={0.95} transparent opacity={0.4} side={THREE.DoubleSide} wireframe />
      </mesh>
      <mesh position={[0, 1, -2.5]}>
        <boxGeometry args={[1.5, 0.8, 0.6]} />
        <meshStandardMaterial color="#5a5a4a" roughness={0.9} />
      </mesh>
    </group>
  );
}

/** Santa Cruz Cathedral */
function ChurchSpire({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh position={[0, 6, 0]} castShadow receiveShadow>
        <boxGeometry args={[5, 12, 5]} />
        <meshStandardMaterial color="#e8e0d0" roughness={0.8} />
      </mesh>
      <mesh position={[0, 13, 0]} castShadow>
        <boxGeometry args={[4, 3, 4]} />
        <meshStandardMaterial color="#e0d8c8" roughness={0.8} />
      </mesh>
      <mesh position={[0, 17, 0]} castShadow>
        <coneGeometry args={[2.5, 5, 4]} />
        <meshStandardMaterial color="#a8382a" roughness={0.7} />
      </mesh>
      <mesh position={[0, 20.2, 0]}>
        <boxGeometry args={[0.12, 1.2, 0.12]} />
        <meshStandardMaterial color="#d4a838" metalness={0.7} roughness={0.3} />
      </mesh>
      <mesh position={[0, 20.0, 0]}>
        <boxGeometry args={[0.6, 0.12, 0.12]} />
        <meshStandardMaterial color="#d4a838" metalness={0.7} roughness={0.3} />
      </mesh>
      {[4, 7, 10].map((y, i) => (
        <mesh key={i} position={[0, y, 2.52]}>
          <planeGeometry args={[1.2, 2]} />
          <meshStandardMaterial color="#3a5a7a" emissive="#2a4a6a" emissiveIntensity={0.1} roughness={0.3} />
        </mesh>
      ))}
    </group>
  );
}

/** Kerala temple gopuram */
function TempleTower({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh position={[0, 5, 0]} castShadow receiveShadow>
        <boxGeometry args={[6, 10, 6]} />
        <meshStandardMaterial color="#c4884a" roughness={0.85} />
      </mesh>
      {[10, 12.5, 14.5].map((y, i) => (
        <mesh key={i} position={[0, y, 0]} castShadow>
          <boxGeometry args={[6 - i * 1.2, 1.2, 6 - i * 1.2]} />
          <meshStandardMaterial color="#a8683a" roughness={0.8} />
        </mesh>
      ))}
      <mesh position={[0, 16.5, 0]} castShadow>
        <coneGeometry args={[1.5, 2.5, 4]} />
        <meshStandardMaterial color="#8a4828" roughness={0.7} />
      </mesh>
    </group>
  );
}

/** Water tower */
function WaterTower({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      {[[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([x, z], i) => (
        <mesh key={i} position={[x, 3, z]} castShadow rotation={[0, 0, x > 0 ? -0.1 : 0.1]}>
          <cylinderGeometry args={[0.1, 0.12, 6, 6]} />
          <meshStandardMaterial color="#4a4a3a" metalness={0.4} roughness={0.6} />
        </mesh>
      ))}
      <mesh position={[0, 7, 0]} castShadow>
        <cylinderGeometry args={[2, 2, 2.5, 12]} />
        <meshStandardMaterial color="#6a8a9a" metalness={0.3} roughness={0.5} />
      </mesh>
      <mesh position={[0, 8.3, 0]}>
        <coneGeometry args={[2, 0.8, 12]} />
        <meshStandardMaterial color="#5a7a8a" metalness={0.3} roughness={0.5} />
      </mesh>
    </group>
  );
}

/** Bolgatty Palace — colonial mansion with arches */
function BolgattyPalace({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      {/* Main building */}
      <mesh position={[0, 4, 0]} castShadow receiveShadow>
        <boxGeometry args={[18, 8, 12]} />
        <meshStandardMaterial color="#e8d8b8" roughness={0.8} />
      </mesh>
      {/* Upper level */}
      <mesh position={[0, 9, 0]} castShadow receiveShadow>
        <boxGeometry args={[14, 4, 10]} />
        <meshStandardMaterial color="#f0e0c8" roughness={0.8} />
      </mesh>
      {/* Central tower */}
      <mesh position={[0, 12, 0]} castShadow>
        <boxGeometry args={[5, 6, 5]} />
        <meshStandardMaterial color="#e8d8b8" roughness={0.8} />
      </mesh>
      {/* Dome on tower */}
      <mesh position={[0, 16, 0]} castShadow>
        <sphereGeometry args={[2.5, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color="#4a7a5a" metalness={0.3} roughness={0.5} />
      </mesh>
      {/* Finial */}
      <mesh position={[0, 17.5, 0]}>
        <cylinderGeometry args={[0.08, 0.08, 1, 6]} />
        <meshStandardMaterial color="#c4a838" metalness={0.8} roughness={0.2} />
      </mesh>
      {/* Side wings */}
      <mesh position={[-11, 3, 0]} castShadow receiveShadow>
        <boxGeometry args={[5, 6, 10]} />
        <meshStandardMaterial color="#e0d0b0" roughness={0.8} />
      </mesh>
      <mesh position={[11, 3, 0]} castShadow receiveShadow>
        <boxGeometry args={[5, 6, 10]} />
        <meshStandardMaterial color="#e0d0b0" roughness={0.8} />
      </mesh>
      {/* Arched colonnade front */}
      {Array.from({ length: 6 }, (_, i) => (
        <mesh key={i} position={[-7 + i * 2.8, 1.5, 6.1]} castShadow>
          <cylinderGeometry args={[0.2, 0.2, 3, 8]} />
          <meshStandardMaterial color="#d8c8a8" roughness={0.7} />
        </mesh>
      ))}
      {/* Windows */}
      {Array.from({ length: 5 }, (_, i) => (
        <mesh key={`w${i}`} position={[-6 + i * 3, 5, 6.02]}>
          <planeGeometry args={[1.5, 2.2]} />
          <meshStandardMaterial color="#3a5a7a" emissive="#2a4a6a" emissiveIntensity={0.12} roughness={0.3} />
        </mesh>
      ))}
    </group>
  );
}

/** Marine Drive promenade — walkway with railing along the waterfront */
function MarineDrive({ position, length }: { position: [number, number, number]; length: number }) {
  return (
    <group position={position}>
      {/* Promenade deck */}
      <mesh position={[0, 0.3, 0]} receiveShadow castShadow>
        <boxGeometry args={[length, 0.6, 8]} />
        <meshStandardMaterial color="#a0a0a0" roughness={0.7} />
      </mesh>
      {/* Railings */}
      <mesh position={[0, 1.0, 3.8]} castShadow>
        <boxGeometry args={[length, 1.0, 0.15]} />
        <meshStandardMaterial color="#3a4a5a" metalness={0.5} roughness={0.4} />
      </mesh>
      <mesh position={[0, 1.0, -3.8]} castShadow>
        <boxGeometry args={[length, 1.0, 0.15]} />
        <meshStandardMaterial color="#3a4a5a" metalness={0.5} roughness={0.4} />
      </mesh>
      {/* Railing posts */}
      {Array.from({ length: Math.floor(length / 3) }, (_, i) => (
        <group key={i}>
          <mesh position={[-length / 2 + 1.5 + i * 3, 0.7, 3.8]}>
            <boxGeometry args={[0.1, 0.8, 0.1]} />
            <meshStandardMaterial color="#2a3a4a" metalness={0.5} roughness={0.4} />
          </mesh>
          <mesh position={[-length / 2 + 1.5 + i * 3, 0.7, -3.8]}>
            <boxGeometry args={[0.1, 0.8, 0.1]} />
            <meshStandardMaterial color="#2a3a4a" metalness={0.5} roughness={0.4} />
          </mesh>
        </group>
      ))}
      {/* Decorative lamp posts */}
      {Array.from({ length: Math.floor(length / 12) }, (_, i) => (
        <group key={`l${i}`} position={[-length / 2 + 6 + i * 12, 0, 0]}>
          <mesh position={[0, 2.5, 0]} castShadow>
            <cylinderGeometry args={[0.06, 0.08, 5, 6]} />
            <meshStandardMaterial color="#2a2a2a" metalness={0.6} roughness={0.4} />
          </mesh>
          <mesh position={[0, 5.2, 0]}>
            <sphereGeometry args={[0.25, 8, 6]} />
            <meshStandardMaterial color="#fff8e0" emissive="#fff8e0" emissiveIntensity={0.4} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

/** Port container cranes — Kochi port landmark */
function PortCrane({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      {/* Base legs */}
      {[[-3, -2], [3, -2], [-3, 2], [3, 2]].map(([x, z], i) => (
        <mesh key={i} position={[x, 7, z]} castShadow>
          <boxGeometry args={[0.6, 14, 0.6]} />
          <meshStandardMaterial color="#cc8822" metalness={0.4} roughness={0.5} />
        </mesh>
      ))}
      {/* Horizontal gantry beam */}
      <mesh position={[0, 14, 0]} castShadow>
        <boxGeometry args={[7, 0.8, 5]} />
        <meshStandardMaterial color="#cc8822" metalness={0.4} roughness={0.5} />
      </mesh>
      {/* Boom arm extending out */}
      <mesh position={[10, 14, 0]} castShadow>
        <boxGeometry args={[16, 0.6, 1.5]} />
        <meshStandardMaterial color="#dd9933" metalness={0.4} roughness={0.5} />
      </mesh>
      {/* Boom support cables (thin boxes) */}
      <mesh position={[5, 17, 0]} castShadow rotation={[0, 0, -0.35]}>
        <boxGeometry args={[6, 0.15, 0.15]} />
        <meshStandardMaterial color="#aa7722" metalness={0.4} roughness={0.5} />
      </mesh>
      {/* Container spreader */}
      <mesh position={[10, 11, 0]} castShadow>
        <boxGeometry args={[3, 0.5, 2]} />
        <meshStandardMaterial color="#4a4a3a" metalness={0.5} roughness={0.5} />
      </mesh>
      {/* Operator cab */}
      <mesh position={[3, 14.5, 0]} castShadow>
        <boxGeometry args={[1.5, 1.2, 1.5]} />
        <meshStandardMaterial color="#2a4a6a" metalness={0.3} roughness={0.5} />
      </mesh>
    </group>
  );
}

/** Mosque with dome and minarets */
function Mosque({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      {/* Main prayer hall */}
      <mesh position={[0, 4, 0]} castShadow receiveShadow>
        <boxGeometry args={[10, 8, 8]} />
        <meshStandardMaterial color="#e8e4d0" roughness={0.8} />
      </mesh>
      {/* Central dome */}
      <mesh position={[0, 9, 0]} castShadow>
        <sphereGeometry args={[3.5, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color="#c4a050" metalness={0.3} roughness={0.5} />
      </mesh>
      {/* Crescent finial */}
      <mesh position={[0, 11, 0]}>
        <cylinderGeometry args={[0.06, 0.06, 1.5, 6]} />
        <meshStandardMaterial color="#d4a838" metalness={0.8} roughness={0.2} />
      </mesh>
      {/* Two minarets */}
      {[-6, 6].map((x, i) => (
        <group key={i} position={[x, 0, 0]}>
          <mesh position={[0, 6, 0]} castShadow>
            <cylinderGeometry args={[0.6, 0.7, 12, 10]} />
            <meshStandardMaterial color="#e0dcb8" roughness={0.8} />
          </mesh>
          <mesh position={[0, 13, 0]} castShadow>
            <cylinderGeometry args={[0.5, 0.5, 2, 10]} />
            <meshStandardMaterial color="#d0cca4" roughness={0.8} />
          </mesh>
          <mesh position={[0, 15, 0]} castShadow>
            <coneGeometry args={[0.8, 2, 10]} />
            <meshStandardMaterial color="#c4a050" roughness={0.6} />
          </mesh>
          <mesh position={[0, 16.2, 0]}>
            <cylinderGeometry args={[0.05, 0.05, 0.8, 6]} />
            <meshStandardMaterial color="#d4a838" metalness={0.8} roughness={0.2} />
          </mesh>
          {/* Balcony */}
          <mesh position={[0, 8, 0]} castShadow>
            <cylinderGeometry args={[0.9, 0.9, 0.4, 10]} />
            <meshStandardMaterial color="#d0cca4" roughness={0.7} />
          </mesh>
        </group>
      ))}
      {/* Arched entrance */}
      <mesh position={[0, 3, 4.02]}>
        <planeGeometry args={[2.5, 3]} />
        <meshStandardMaterial color="#3a5a7a" emissive="#2a4a6a" emissiveIntensity={0.08} roughness={0.3} />
      </mesh>
    </group>
  );
}

/** Clock tower — inspired by Kochi's David Hall area */
function ClockTower({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      {/* Tower shaft */}
      <mesh position={[0, 8, 0]} castShadow receiveShadow>
        <boxGeometry args={[4, 16, 4]} />
        <meshStandardMaterial color="#c4a888" roughness={0.85} />
      </mesh>
      {/* Clock chamber */}
      <mesh position={[0, 17, 0]} castShadow>
        <cylinderGeometry args={[2.2, 2.2, 3, 8]} />
        <meshStandardMaterial color="#d4b898" roughness={0.8} />
      </mesh>
      {/* Clock faces on 4 sides */}
      {[
        { rot: 0, pos: [0, 17, 2.21] as [number, number, number] },
        { rot: Math.PI, pos: [0, 17, -2.21] as [number, number, number] },
        { rot: Math.PI / 2, pos: [2.21, 17, 0] as [number, number, number] },
        { rot: -Math.PI / 2, pos: [-2.21, 17, 0] as [number, number, number] },
      ].map((f, i) => (
        <mesh key={i} position={f.pos} rotation={[0, f.rot, 0]}>
          <circleGeometry args={[1.2, 16]} />
          <meshStandardMaterial color="#f8f0e0" emissive="#e8c868" emissiveIntensity={0.15} roughness={0.3} />
        </mesh>
      ))}
      {/* Roof */}
      <mesh position={[0, 19.5, 0]} castShadow>
        <coneGeometry args={[2.5, 3, 8]} />
        <meshStandardMaterial color="#7a4a2a" roughness={0.7} />
      </mesh>
      {/* Finial */}
      <mesh position={[0, 21.5, 0]}>
        <cylinderGeometry args={[0.06, 0.06, 1, 6]} />
        <meshStandardMaterial color="#c4a838" metalness={0.7} roughness={0.2} />
      </mesh>
    </group>
  );
}

/** Jawaharlal Nehru Stadium-like structure */
function Stadium({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      {/* Outer ring wall */}
      <mesh position={[0, 5, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[28, 30, 10, 24, 1, true]} />
        <meshStandardMaterial color="#c4b8a0" roughness={0.8} side={THREE.DoubleSide} />
      </mesh>
      {/* Roof ring — cantilevered */}
      <mesh position={[0, 11, 0]} castShadow>
        <cylinderGeometry args={[32, 30, 1.5, 24, 1, true]} />
        <meshStandardMaterial color="#4a6a8a" metalness={0.3} roughness={0.4} side={THREE.DoubleSide} />
      </mesh>
      {/* Interior field */}
      <mesh position={[0, 0.1, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <circleGeometry args={[26, 24]} />
        <meshStandardMaterial color="#2d6a2d" roughness={0.9} />
      </mesh>
      {/* Floodlight towers at 4 corners */}
      {[[-32, -32], [32, -32], [-32, 32], [32, 32]].map(([x, z], i) => (
        <group key={i} position={[x, 0, z]}>
          <mesh position={[0, 10, 0]} castShadow>
            <cylinderGeometry args={[0.4, 0.5, 20, 8]} />
            <meshStandardMaterial color="#3a3a3a" metalness={0.5} roughness={0.4} />
          </mesh>
          <mesh position={[0, 20.5, 0]}>
            <boxGeometry args={[2.5, 1.2, 0.8]} />
            <meshStandardMaterial color="#fff8e0" emissive="#fff8e0" emissiveIntensity={0.2} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

/** Lighthouse — inspired by Fort Kochi's cantonment lighthouse */
function Lighthouse({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      {/* Tapered tower — red and white bands */}
      <mesh position={[0, 7, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[1.5, 2.2, 14, 12]} />
        <meshStandardMaterial color="#e8e0d8" roughness={0.7} />
      </mesh>
      {/* Red band */}
      <mesh position={[0, 5, 0]} castShadow>
        <cylinderGeometry args={[1.7, 1.9, 3, 12]} />
        <meshStandardMaterial color="#c43828" roughness={0.7} />
      </mesh>
      <mesh position={[0, 10, 0]} castShadow>
        <cylinderGeometry args={[1.55, 1.65, 2, 12]} />
        <meshStandardMaterial color="#c43828" roughness={0.7} />
      </mesh>
      {/* Lantern room */}
      <mesh position={[0, 15.5, 0]} castShadow>
        <cylinderGeometry args={[1.5, 1.5, 2.5, 12]} />
        <meshStandardMaterial color="#4a6a8a" metalness={0.3} roughness={0.3} transparent opacity={0.6} />
      </mesh>
      {/* Light source */}
      <mesh position={[0, 15.5, 0]}>
        <sphereGeometry args={[0.6, 8, 6]} />
        <meshStandardMaterial color="#fff8e0" emissive="#fff8e0" emissiveIntensity={1.5} />
      </mesh>
      {/* Dome cap */}
      <mesh position={[0, 17.2, 0]} castShadow>
        <coneGeometry args={[1.6, 1.5, 12]} />
        <meshStandardMaterial color="#3a3a3a" metalness={0.5} roughness={0.4} />
      </mesh>
      {/* Gallery railing */}
      <mesh position={[0, 14.5, 0]} castShadow>
        <cylinderGeometry args={[1.8, 1.8, 0.3, 12]} />
        <meshStandardMaterial color="#3a3a3a" metalness={0.4} roughness={0.5} />
      </mesh>
    </group>
  );
}

/** Hill Palace-style heritage building */
function HillPalace({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      {/* Main hall */}
      <mesh position={[0, 4, 0]} castShadow receiveShadow>
        <boxGeometry args={[16, 8, 10]} />
        <meshStandardMaterial color="#d4c8a8" roughness={0.8} />
      </mesh>
      {/* Central pediment */}
      <mesh position={[0, 8.5, 0]} castShadow>
        <boxGeometry args={[8, 2.5, 10]} />
        <meshStandardMaterial color="#e0d4b8" roughness={0.8} />
      </mesh>
      {/* Triangular pediment */}
      <mesh position={[0, 10.5, 0]} castShadow rotation={[Math.PI / 2, 0, Math.PI / 6]}>
        <cylinderGeometry args={[4, 4, 0.5, 3, 1, false, 0, Math.PI]} />
        <meshStandardMaterial color="#c43828" roughness={0.7} />
      </mesh>
      {/* Side wings */}
      <mesh position={[-10, 3, 0]} castShadow receiveShadow>
        <boxGeometry args={[5, 6, 10]} />
        <meshStandardMaterial color="#d0c4a4" roughness={0.8} />
      </mesh>
      <mesh position={[10, 3, 0]} castShadow receiveShadow>
        <boxGeometry args={[5, 6, 10]} />
        <meshStandardMaterial color="#d0c4a4" roughness={0.8} />
      </mesh>
      {/* Columns */}
      {[-5, -2, 2, 5].map((x, i) => (
        <mesh key={i} position={[x, 3, 5.1]} castShadow>
          <cylinderGeometry args={[0.35, 0.4, 6, 10]} />
          <meshStandardMaterial color="#e8d8b8" roughness={0.7} />
        </mesh>
      ))}
      {/* Windows */}
      {[-5, 0, 5].map((x, i) => (
        <mesh key={`w${i}`} position={[x, 4, 5.02]}>
          <planeGeometry args={[1.4, 2.2]} />
          <meshStandardMaterial color="#3a5a7a" emissive="#2a4a6a" emissiveIntensity={0.1} roughness={0.3} />
        </mesh>
      ))}
    </group>
  );
}

/* ============================================================
   GRID STREETS
   ============================================================ */

function GridStreets() {
  const segments = useMemo(() => {
    const arr: { axis: 'ns' | 'ew'; x: number; z: number; length: number }[] = [];
    const halfExtent = ROAD_LENGTH;
    for (let bx = 1; bx <= CITY_BLOCKS_X; bx++) {
      const x = bx * BLOCK_SIZE;
      if (x >= ROAD_LENGTH) break;
      arr.push({ axis: 'ns', x, z: 0, length: halfExtent * 2 });
      arr.push({ axis: 'ns', x: -x, z: 0, length: halfExtent * 2 });
    }
    for (let bz = 1; bz <= CITY_BLOCKS_Z; bz++) {
      const z = bz * BLOCK_SIZE;
      if (z >= ROAD_LENGTH) break;
      arr.push({ axis: 'ew', x: 0, z, length: halfExtent * 2 });
      arr.push({ axis: 'ew', x: 0, z: -z, length: halfExtent * 2 });
    }
    return arr;
  }, []);

  return (
    <group>
      {segments.map((s, i) => (
        <group key={i}>
          <RoadSegment axis={s.axis} x={s.x} z={s.z} length={s.length} />
          <CenterLineSegment axis={s.axis} x={s.x} z={s.z} length={s.length} />
          <SidewalkSegment axis={s.axis} x={s.x} z={s.z} length={s.length} />
        </group>
      ))}
    </group>
  );
}

/* ============================================================
   MAIN EXPORT
   ============================================================ */

export function RoadNetwork() {
  const canalZ = BLOCK_SIZE * CITY_BLOCKS_Z + ROAD_WIDTH + 15;
  const netPositions = useMemo(() => {
    const arr: [number, number, number][] = [];
    for (let x = -180; x <= 180; x += 25) {
      arr.push([x, 0, canalZ + 8]);
    }
    return arr;
  }, [canalZ]);

  return (
    <group>
      <Ground />
      <Backwater />
      <WestCanal />
      <Bridge />

      {/* Main intersection roads */}
      <RoadSegment axis="ns" x={0} z={0} length={ROAD_LENGTH * 2} />
      <RoadSegment axis="ew" x={0} z={0} length={ROAD_LENGTH * 2} />
      <CenterLineSegment axis="ns" x={0} z={0} length={ROAD_LENGTH * 2} />
      <CenterLineSegment axis="ew" x={0} z={0} length={ROAD_LENGTH * 2} />
      <SidewalkSegment axis="ns" x={0} z={0} length={ROAD_LENGTH * 2} />
      <SidewalkSegment axis="ew" x={0} z={0} length={ROAD_LENGTH * 2} />

      <GridStreets />
      <StopLines />
      <PedestrianCrossings />

      <CityBuildings />
      <Streetlights />
      <Vegetation />

      {/* Kochi landmarks scattered across the city */}
      <ChurchSpire position={[-(ROAD_WIDTH / 2 + SIDEWALK_WIDTH + 10), 0, -(BLOCK_SIZE * 1.5)]} />
      <TempleTower position={[BLOCK_SIZE * 1.5, 0, ROAD_WIDTH / 2 + SIDEWALK_WIDTH + 12]} />
      <WaterTower position={[BLOCK_SIZE * 2, 0, -BLOCK_SIZE]} />
      <WaterTower position={[-BLOCK_SIZE * 2, 0, BLOCK_SIZE * 0.5]} />

      {/* Bolgatty Palace — near the backwater */}
      <BolgattyPalace position={[BLOCK_SIZE * 2.5, 0, canalZ - 15]} />

      {/* Marine Drive promenade along the backwater */}
      <MarineDrive position={[-60, 0, canalZ - 8]} length={120} />

      {/* Port cranes near the water */}
      <PortCrane position={[120, 0, canalZ - 12]} />
      <PortCrane position={[145, 0, canalZ - 12]} />
      <PortCrane position={[170, 0, canalZ - 12]} />

      {/* Mosque */}
      <Mosque position={[-BLOCK_SIZE * 2.5, 0, -BLOCK_SIZE * 1.5]} />

      {/* Clock tower */}
      <ClockTower position={[BLOCK_SIZE * 2.5, 0, -BLOCK_SIZE * 2]} />

      {/* Stadium — far corner */}
      <Stadium position={[-BLOCK_SIZE * 3.5, 0, BLOCK_SIZE * 3]} />

      {/* Lighthouse near the backwater */}
      <Lighthouse position={[-130, 0, canalZ - 10]} />

      {/* Hill Palace — heritage building */}
      <HillPalace position={[BLOCK_SIZE * 3.5, 0, BLOCK_SIZE * 2]} />

      {/* Chinese fishing nets along the backwater */}
      {netPositions.map((pos, i) => (
        <ChineseFishingNet key={i} position={pos} />
      ))}
    </group>
  );
}
