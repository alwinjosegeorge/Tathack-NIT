import { useRef, useMemo, useReducer, useCallback, Suspense } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, ContactShadows } from '@react-three/drei';
import * as THREE from 'three';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import { TrafficEngine } from '@/lib/city-sim/engine';
import type { Direction, SignalState, IncidentMarker, RecurrenceAlert } from '@/lib/city-sim/types';
import { ROAD_WIDTH, SIDEWALK_WIDTH, MAX_VEHICLES } from '@/lib/city-sim/constants';
import { RoadNetwork } from './RoadNetwork';
import { TrafficSignal } from './TrafficSignal';
import { Car, Motorcycle, Bus } from './Vehicles';
import { Ambulance } from './Ambulance';
import { IncidentLayer } from './IncidentLayer';

interface SceneProps {
  engine: TrafficEngine;
  onSnapshot: (snapshot: ReturnType<TrafficEngine['getSnapshot']>) => void;
  followAmbulance: boolean;
  selectedVehicleId: number | null;
  incidents: IncidentMarker[];
  recurrences: RecurrenceAlert[];
  selectedIncidentId: string | null;
  onSelectIncident: (id: string) => void;
}

// ---- Pooled vehicle slot ----
interface VehicleSlotData {
  groupRef: React.RefObject<THREE.Group>;
  speedRef: React.MutableRefObject<number>;
  brakeLightRef: React.MutableRefObject<boolean>;
  activeRef: React.MutableRefObject<boolean>;
  kindRef: React.MutableRefObject<string>;
  colorRef: React.MutableRefObject<THREE.ColorRepresentation>;
  idRef: React.MutableRefObject<number>;
}

function useVehiclePool(size: number): VehicleSlotData[] {
  return useMemo(() => {
    return Array.from({ length: size }, () => ({
      groupRef: { current: null } as unknown as React.RefObject<THREE.Group>,
      speedRef: { current: 0 } as React.MutableRefObject<number>,
      brakeLightRef: { current: false } as React.MutableRefObject<boolean>,
      activeRef: { current: false } as React.MutableRefObject<boolean>,
      kindRef: { current: 'car' } as React.MutableRefObject<string>,
      colorRef: { current: '#2980b9' } as React.MutableRefObject<THREE.ColorRepresentation>,
      idRef: { current: -1 } as React.MutableRefObject<number>,
    }));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}

function CarSlot({ slot }: { slot: VehicleSlotData }) {
  return (
    <group ref={slot.groupRef} visible={false}>
      <Car color={slot.colorRef.current} speedRef={slot.speedRef} brakeLightRef={slot.brakeLightRef} />
    </group>
  );
}
function MotoSlot({ slot }: { slot: VehicleSlotData }) {
  return (
    <group ref={slot.groupRef} visible={false}>
      <Motorcycle color={slot.colorRef.current} speedRef={slot.speedRef} brakeLightRef={slot.brakeLightRef} />
    </group>
  );
}
function BusSlot({ slot }: { slot: VehicleSlotData }) {
  return (
    <group ref={slot.groupRef} visible={false}>
      <Bus color={slot.colorRef.current} speedRef={slot.speedRef} brakeLightRef={slot.brakeLightRef} />
    </group>
  );
}
function AmbulanceSlot({ slot }: { slot: VehicleSlotData }) {
  const emergRef = useRef(true);
  return (
    <group ref={slot.groupRef} visible={false}>
      <Ambulance speedRef={slot.speedRef} brakeLightRef={slot.brakeLightRef} emergencyActive={emergRef.current} />
    </group>
  );
}

const KIND_COLORS: Record<string, string[]> = {
  car: [
    '#c0392b', '#2980b9', '#27ae60', '#f39c12', '#8e44ad',
    '#16a085', '#2c3e50', '#e67e22', '#1abc9c', '#d35400',
    '#34495e', '#7f8c8d', '#fd79a8', '#6c5ce7', '#e17055',
  ],
  motorcycle: ['#c0392b', '#2c3e50', '#8e44ad', '#e67e22', '#16a085'],
  bus: ['#27ae60', '#2980b9', '#f39c12', '#c0392b', '#8e44ad'],
  ambulance: ['#ffffff'],
};

function pickColor(kind: string, slotIdx: number): THREE.ColorRepresentation {
  const arr = KIND_COLORS[kind] ?? KIND_COLORS['car'];
  return arr[slotIdx % arr.length];
}

/**
 * Vehicle renderer using a fixed pool of pre-allocated slot components.
 */
function VehicleRenderer({
  engine,
  followAmbulance,
  selectedVehicleId,
}: {
  engine: TrafficEngine;
  followAmbulance: boolean;
  selectedVehicleId: number | null;
}) {
  const POOL = MAX_VEHICLES + 5;
  const HALF = Math.floor(POOL / 4);

  const carSlots = useVehiclePool(HALF);
  const motoSlots = useVehiclePool(HALF);
  const busSlots = useVehiclePool(HALF);
  const ambSlots = useVehiclePool(4);

  // Map: vehicleId -> slot descriptor
  const assignedMap = useRef<Map<number, { pool: VehicleSlotData[]; idx: number }>>(new Map());

  const { camera } = useThree();
  const cameraTargetPos = useRef(new THREE.Vector3(0, 30, 0));
  const cameraTargetLookAt = useRef(new THREE.Vector3(0, 0, 0));

  useFrame(() => {
    const vehicles = engine.vehicles;
    const activeIds = new Set(vehicles.map(v => v.id));

    // Release slots for removed vehicles
    for (const [id, { pool, idx }] of assignedMap.current) {
      if (!activeIds.has(id)) {
        const slot = pool[idx];
        if (slot.groupRef.current) {
          slot.groupRef.current.visible = false;
        }
        slot.activeRef.current = false;
        slot.idRef.current = -1;
        assignedMap.current.delete(id);
      }
    }

    // Assign/update slots for active vehicles
    for (const v of vehicles) {
      let assignment = assignedMap.current.get(v.id);

      if (!assignment) {
        let pool: VehicleSlotData[];
        if (v.kind === 'car') pool = carSlots;
        else if (v.kind === 'motorcycle') pool = motoSlots;
        else if (v.kind === 'bus') pool = busSlots;
        else pool = ambSlots;

        const freeIdx = pool.findIndex(s => s.idRef.current === -1);
        if (freeIdx === -1) continue;

        const slot = pool[freeIdx];
        slot.idRef.current = v.id;
        slot.colorRef.current = pickColor(v.kind, freeIdx);
        slot.activeRef.current = true;

        assignment = { pool, idx: freeIdx };
        assignedMap.current.set(v.id, assignment);
      }

      const slot = assignment.pool[assignment.idx];

      if (slot.groupRef.current) {
        slot.groupRef.current.visible = true;
        slot.groupRef.current.position.set(v.position.x, v.position.y, v.position.z);
        slot.groupRef.current.rotation.y = v.heading;
      }

      slot.speedRef.current = v.speed;
      slot.brakeLightRef.current = v.brakeLight;
    }

    // Camera follow
    let followTarget: THREE.Vector3 | null = null;

    if (followAmbulance && engine.ambulanceId !== null) {
      const amb = engine.vehicles.find(v => v.id === engine.ambulanceId);
      if (amb) followTarget = amb.position.clone().setY(0);
    } else if (selectedVehicleId !== null) {
      const sel = engine.vehicles.find(v => v.id === selectedVehicleId);
      if (sel) followTarget = sel.position.clone().setY(0);
    }

    if (followTarget) {
      const targetCamPos = followTarget.clone().add(new THREE.Vector3(0, 25, 30));
      cameraTargetPos.current.lerp(targetCamPos, 0.04);
      cameraTargetLookAt.current.lerp(followTarget, 0.04);

      camera.position.lerp(cameraTargetPos.current, 0.05);
      camera.lookAt(cameraTargetLookAt.current);
    }
  });

  return (
    <>
      <group>{carSlots.map((s, i) => <CarSlot key={`car-${i}`} slot={s} />)}</group>
      <group>{motoSlots.map((s, i) => <MotoSlot key={`moto-${i}`} slot={s} />)}</group>
      <group>{busSlots.map((s, i) => <BusSlot key={`bus-${i}`} slot={s} />)}</group>
      <group>{ambSlots.map((s, i) => <AmbulanceSlot key={`amb-${i}`} slot={s} />)}</group>
    </>
  );
}

/** Traffic signals at the four intersection approaches */
function SignalRenderer({ engine }: { engine: TrafficEngine }) {
  const offset = ROAD_WIDTH / 2 + SIDEWALK_WIDTH + 1;
  const [, forceUpdate] = useReducer((x: number) => x + 1, 0);
  const statesRef = useRef<Record<string, SignalState>>({});

  const signals = useMemo(() => [
    { pos: [offset, 0, ROAD_WIDTH / 2 + 1] as [number, number, number], rotY: 0, approach: 'south' as Direction },
    { pos: [-offset, 0, -ROAD_WIDTH / 2 - 1] as [number, number, number], rotY: Math.PI, approach: 'north' as Direction },
    { pos: [ROAD_WIDTH / 2 + 1, 0, -offset] as [number, number, number], rotY: -Math.PI / 2, approach: 'east' as Direction },
    { pos: [-ROAD_WIDTH / 2 - 1, 0, offset] as [number, number, number], rotY: Math.PI / 2, approach: 'west' as Direction },
  ], [offset]);

  useFrame(() => {
    let changed = false;
    for (const s of signals) {
      const newState = engine.getSignalState(s.approach);
      if (statesRef.current[s.approach] !== newState) {
        statesRef.current[s.approach] = newState;
        changed = true;
      }
    }
    if (changed) forceUpdate();
  });

  return (
    <group>
      {signals.map((s, i) => (
        <TrafficSignal
          key={i}
          position={s.pos}
          rotationY={s.rotY}
          state={engine.getSignalState(s.approach)}
          phaseRemaining={engine.getSignalTimer(s.approach)}
        />
      ))}
    </group>
  );
}

/** Main scene content */
function SceneContent({
  engine,
  onSnapshot,
  followAmbulance,
  selectedVehicleId,
  incidents,
  recurrences,
  selectedIncidentId,
  onSelectIncident,
}: SceneProps) {
  const tickRef = useRef(0);

  useFrame((_, delta) => {
    const clampedDelta = Math.min(delta, 0.1);
    engine.update(clampedDelta);

    tickRef.current += delta;
    if (tickRef.current >= 0.1) {
      tickRef.current = 0;
      onSnapshot(engine.getSnapshot());
    }
  });

  return (
    <>
      {/* Standalone ambient & hemisphere lighting (no external network dependencies) */}
      <ambientLight intensity={0.7} color="#dbeafe" />
      <directionalLight
        position={[80, 100, 40]}
        intensity={1.8}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-left={-300}
        shadow-camera-right={300}
        shadow-camera-top={300}
        shadow-camera-bottom={-300}
        shadow-camera-near={0.5}
        shadow-camera-far={700}
        shadow-bias={-0.0002}
        color="#fff4e0"
      />
      <hemisphereLight args={['#93c5fd', '#334155', 0.6]} />

      {/* Road network */}
      <RoadNetwork />

      {/* Incident & Recurrence Layer */}
      <IncidentLayer
        incidents={incidents}
        recurrences={recurrences}
        selectedId={selectedIncidentId}
        onSelect={onSelectIncident}
      />

      {/* Traffic signals */}
      <SignalRenderer engine={engine} />

      {/* Vehicles (pooled) */}
      <VehicleRenderer
        engine={engine}
        followAmbulance={followAmbulance}
        selectedVehicleId={selectedVehicleId}
      />

      {/* Contact shadows */}
      <ContactShadows
        position={[0, 0.03, 0]}
        opacity={0.25}
        scale={600}
        blur={3}
        far={50}
      />
    </>
  );
}

interface TrafficSimulationProps {
  engine: TrafficEngine;
  onSnapshot: (snapshot: ReturnType<TrafficEngine['getSnapshot']>) => void;
  followAmbulance?: boolean;
  selectedVehicleId?: number | null;
  incidents?: IncidentMarker[];
  recurrences?: RecurrenceAlert[];
  selectedIncidentId?: string | null;
  onSelectIncident?: (id: string) => void;
}

/** Full 3D traffic simulation canvas */
export function TrafficSimulation({
  engine,
  onSnapshot,
  followAmbulance = false,
  selectedVehicleId = null,
  incidents = [],
  recurrences = [],
  selectedIncidentId = null,
  onSelectIncident = () => {},
}: TrafficSimulationProps) {
  return (
    <Canvas
      shadows
      camera={{ position: [100, 80, 100], fov: 50, near: 0.1, far: 1200 }}
      gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.1 }}
      dpr={[1, 2]}
    >
      <fog attach="fog" args={['#a0b8c8', 220, 650]} />
      <Suspense fallback={null}>
        <SceneContent
          engine={engine}
          onSnapshot={onSnapshot}
          followAmbulance={followAmbulance}
          selectedVehicleId={selectedVehicleId}
          incidents={incidents}
          recurrences={recurrences}
          selectedIncidentId={selectedIncidentId}
          onSelectIncident={onSelectIncident}
        />
      </Suspense>
      <OrbitControls
        enablePan
        enableZoom
        enableRotate
        minDistance={20}
        maxDistance={500}
        maxPolarAngle={Math.PI / 2.05}
        target={[0, 0, 0]}
        makeDefault
      />
    </Canvas>
  );
}
