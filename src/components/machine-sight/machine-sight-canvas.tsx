// Main R3F Canvas for Machine Sight: Full 1.5km City, Vision Zone Raycasting, Dynamic Radius, Camera Modes
import React, { useEffect, useState, useRef, useMemo } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { EffectComposer, Bloom } from "@react-three/postprocessing";
import * as THREE from "three";
import { CorridorSimulation } from "@/lib/sim/corridor-sim";
import { FullCityData, generateFullCity } from "@/lib/sim/full-city-generator";
import { FullCityTrafficEngine } from "@/lib/sim/full-city-traffic";
import { FullCityScene } from "./full-city-scene";
import { FullCityVehicles } from "./full-city-vehicles";
import { SensorCorridorRibbon } from "./sensor-corridor-ribbon";
import { VisionZoneRing } from "./vision-zone-ring";
import { LidarPoints } from "./lidar-points";
import { PerceptionAgent, extractPerceptionState } from "@/lib/sim/perception";

export type CameraViewMode = "overview" | "follow_ambulance" | "track_agent";

interface MachineSightCanvasProps {
  simRef: React.RefObject<CorridorSimulation>;
  isRunning: boolean;
  sensorMode: "lidar" | "segments" | "depth";
  greenCorridorActive: boolean;
  selectedAgentId: string | null;
  onSelectAgent: (id: string | null) => void;
  onAgentsUpdate: (agents: PerceptionAgent[], ambulance: PerceptionAgent, newCloseCalls: number) => void;
  onFpsUpdate: (fps: number) => void;
  lowQuality?: boolean;
  shiftHeld: boolean;
  isLockedToAmbulance: boolean;
  zoneRadius: number;
  onZoneRadiusChange: (r: number) => void;
  cameraMode: CameraViewMode;
}

export function MachineSightCanvas({
  simRef,
  isRunning,
  sensorMode,
  greenCorridorActive,
  selectedAgentId,
  onSelectAgent,
  onAgentsUpdate,
  onFpsUpdate,
  lowQuality,
  shiftHeld,
  isLockedToAmbulance,
  zoneRadius,
  onZoneRadiusChange,
  cameraMode,
}: MachineSightCanvasProps) {
  // 1. Procedural 16x16 Full City Data
  const cityData = useMemo(() => generateFullCity(1337), []);

  // 2. Traffic Simulator Engine
  const trafficEngine = useMemo(() => new FullCityTrafficEngine(cityData, lowQuality), [cityData]);

  useEffect(() => {
    trafficEngine.setLowQuality(Boolean(lowQuality));
  }, [lowQuality, trafficEngine]);

  const [zoneCenter, setZoneCenter] = useState<[number, number]>([-100, -100]);
  const [agentsInZone, setAgentsInZone] = useState<PerceptionAgent[]>([]);
  const cursorWorldPos = useRef<[number, number]>([-100, -100]);

  // Mode index mapping
  const modeIdx: 0 | 1 | 2 = sensorMode === "lidar" ? 0 : sensorMode === "segments" ? 1 : 2;

  // Wheel listener for zone radius adjustment (40m to 120m)
  const handleWheel = (e: React.WheelEvent) => {
    if (e.shiftKey || e.ctrlKey) {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -5 : 5;
      const nextR = Math.max(40, Math.min(120, zoneRadius + delta));
      onZoneRadiusChange(nextR);
    }
  };

  return (
    <div
      className="relative h-full w-full min-h-[660px] overflow-hidden rounded-3xl bg-[#eceae6] dark:bg-[#070b14]"
      onWheel={handleWheel}
    >
      <Canvas
        camera={{ position: [-190, 75, -80], fov: 42, near: 0.5, far: 1600 }}
        dpr={[1, lowQuality ? 1 : 1.75]}
        gl={{ antialias: true, powerPreference: "high-performance" }}
        onPointerMissed={() => onSelectAgent(null)}
      >
        {/* Sky / Clay Fog */}
        <color attach="background" args={["#eceae6"]} />
        <fog attach="fog" args={["#eceae6", 350, 900]} />

        {/* Ambient & Directional Sun for Soft Clay Shadows */}
        <ambientLight intensity={0.75} />
        <directionalLight position={[120, 240, 90]} intensity={1.1} castShadow={!lowQuality} />

        {/* 60Hz Physics, Traffic, and Multi-Sensor Extraction */}
        <FullCityPhysicsEngine
          simRef={simRef}
          trafficEngine={trafficEngine}
          isRunning={isRunning}
          shiftHeld={shiftHeld}
          isLockedToAmbulance={isLockedToAmbulance}
          cursorWorldPos={cursorWorldPos}
          zoneRadius={zoneRadius}
          onZoneCenterChange={setZoneCenter}
          onAgentsCalculated={(agts, amb, closeCalls) => {
            setAgentsInZone(agts);
            onAgentsUpdate(agts, amb, closeCalls);
          }}
          onFps={onFpsUpdate}
        />

        {/* Ground Raycast Plane for Cursor Tracking */}
        <GroundRaycastPlane
          onCursorMove={(x, z) => {
            cursorWorldPos.current = [x, z];
          }}
        />

        {/* 1. Full 16x16 Procedural City Scene */}
        <FullCityScene
          cityData={cityData}
          zoneCenter={zoneCenter}
          zoneRadius={zoneRadius}
          sensorMode={modeIdx}
          lowQuality={lowQuality}
        />

        {/* 2. Full City Traffic Vehicles & Pedestrians */}
        <FullCityVehicles
          trafficEngine={trafficEngine}
          agentsInZone={agentsInZone}
          selectedAgentId={selectedAgentId}
          onSelectAgent={onSelectAgent}
          zoneCenter={zoneCenter}
          zoneRadius={zoneRadius}
          sensorMode={modeIdx}
          lowQuality={lowQuality}
        />

        {/* 3. Glowing Emerald Preemption Corridor Spline Ribbon */}
        <SensorCorridorRibbon simRef={simRef} greenCorridorActive={greenCorridorActive} />

        {/* 4. Emergency Lead Ambulance Mesh */}
        <EmergencyAmbulanceLeadMesh
          simRef={simRef}
          sensorMode={modeIdx}
          isSelected={selectedAgentId === "ambulance-lead"}
          onSelect={() => onSelectAgent("ambulance-lead")}
        />

        {/* 5. Vision Zone Perimeter Ring & Concentric Scan Waves */}
        <VisionZoneRing
          zoneCenter={zoneCenter}
          zoneRadius={zoneRadius}
          sensorMode={modeIdx}
          isLockedToAmbulance={isLockedToAmbulance || shiftHeld}
        />

        {/* 6. Dense LIDAR Instanced Points in Zone */}
        {modeIdx === 0 && (
          <LidarPoints
            simRef={simRef}
            zoneCenter={zoneCenter}
            zoneRadius={zoneRadius}
            sensorMode={modeIdx}
            lowQuality={lowQuality}
          />
        )}

        {/* 7. Camera Director (Overview / Follow Ambulance / Track Agent) */}
        <CameraDirector
          simRef={simRef}
          cameraMode={cameraMode}
          selectedAgentId={selectedAgentId}
          agents={agentsInZone}
        />

        {/* 8. Postprocessing Bloom */}
        {!lowQuality && (
          <EffectComposer>
            <Bloom luminanceThreshold={0.7} luminanceSmoothing={0.3} intensity={0.55} mipmapBlur />
          </EffectComposer>
        )}
      </Canvas>
    </div>
  );
}

// 60Hz Stepper, Traffic Engine & Safety Analytics Loop
function FullCityPhysicsEngine({
  simRef,
  trafficEngine,
  isRunning,
  shiftHeld,
  isLockedToAmbulance,
  cursorWorldPos,
  zoneRadius,
  onZoneCenterChange,
  onAgentsCalculated,
  onFps,
}: {
  simRef: React.RefObject<CorridorSimulation>;
  trafficEngine: FullCityTrafficEngine;
  isRunning: boolean;
  shiftHeld: boolean;
  isLockedToAmbulance: boolean;
  cursorWorldPos: React.RefObject<[number, number]>;
  zoneRadius: number;
  onZoneCenterChange: (center: [number, number]) => void;
  onAgentsCalculated: (agents: PerceptionAgent[], amb: PerceptionAgent, newCloseCalls: number) => void;
  onFps: (fps: number) => void;
}) {
  const frameCount = useRef(0);
  const lastTime = useRef(performance.now());
  const updateTick = useRef(0);
  const smoothedZoneCenter = useRef(new THREE.Vector2(-100, -100));

  useFrame((state, delta) => {
    // 1. Live FPS calculation
    frameCount.current++;
    const now = performance.now();
    if (now - lastTime.current >= 500) {
      const currentFps = Math.round((frameCount.current * 1000) / (now - lastTime.current));
      onFps(currentFps);
      frameCount.current = 0;
      lastTime.current = now;
    }

    if (!simRef.current) return;

    // 2. Step physics
    if (isRunning) {
      const dt = Math.min(delta, 0.05);
      simRef.current.step(dt);

      const amb = simRef.current.vehicle;
      trafficEngine.step(dt, [smoothedZoneCenter.current.x, smoothedZoneCenter.current.y], zoneRadius, [amb.x, amb.z]);
    }

    // 3. Compute target zone center (Cursor by default, or Ambulance on Shift/Lock)
    const amb = simRef.current.vehicle;
    let targetX = cursorWorldPos.current ? cursorWorldPos.current[0] : amb.x;
    let targetZ = cursorWorldPos.current ? cursorWorldPos.current[1] : amb.z;

    if (shiftHeld || isLockedToAmbulance) {
      targetX = amb.x;
      targetZ = amb.z;
    }

    // Smooth lerp on zone movement
    smoothedZoneCenter.current.lerp(new THREE.Vector2(targetX, targetZ), delta * 6.0);
    const centerTuple: [number, number] = [smoothedZoneCenter.current.x, smoothedZoneCenter.current.y];
    onZoneCenterChange(centerTuple);

    // 4. Extract candidates & run safety evaluation
    updateTick.current++;
    if (updateTick.current % 2 === 0) {
      const cityAgents = trafficEngine.getPerceptionAgents(centerTuple, zoneRadius, [amb.x, amb.z]);
      const { agents, ambulanceAgent, newCloseCalls } = extractPerceptionState(
        simRef.current,
        centerTuple,
        zoneRadius,
        cityAgents
      );
      onAgentsCalculated(agents, ambulanceAgent, newCloseCalls);
    }
  });

  return null;
}

// Raycast ground plane to get mouse world coordinates
function GroundRaycastPlane({ onCursorMove }: { onCursorMove: (x: number, z: number) => void }) {
  return (
    <mesh
      rotation={[-Math.PI / 2, 0, 0]}
      position={[0, 0, 0]}
      visible={false}
      onPointerMove={(e) => {
        onCursorMove(e.point.x, e.point.z);
      }}
    >
      <planeGeometry args={[2000, 2000]} />
      <meshBasicMaterial />
    </mesh>
  );
}

// Emergency Lead Ambulance Mesh
function EmergencyAmbulanceLeadMesh({
  simRef,
  sensorMode,
  isSelected,
  onSelect,
}: {
  simRef: React.RefObject<CorridorSimulation>;
  sensorMode: 0 | 1 | 2;
  isSelected: boolean;
  onSelect: () => void;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const redLightRef = useRef<THREE.MeshBasicMaterial>(null);
  const blueLightRef = useRef<THREE.MeshBasicMaterial>(null);

  useFrame((state) => {
    if (!simRef.current || !groupRef.current) return;
    const v = simRef.current.vehicle;
    groupRef.current.position.set(v.x, 0.8, v.z);
    groupRef.current.rotation.y = -v.heading + Math.PI / 2;
    groupRef.current.rotation.z = v.roll;

    const t = state.clock.getElapsedTime() * 12;
    const isRed = Math.sin(t) > 0;
    if (redLightRef.current) redLightRef.current.opacity = isRed ? 1.0 : 0.2;
    if (blueLightRef.current) blueLightRef.current.opacity = isRed ? 0.2 : 1.0;
  });

  return (
    <group ref={groupRef} onClick={(e) => { e.stopPropagation(); onSelect(); }}>
      {/* Ambulance Body */}
      <mesh position={[0, 0.6, 0]} castShadow>
        <boxGeometry args={[4.8, 1.8, 2.0]} />
        <meshStandardMaterial
          color={sensorMode === 1 ? "#ea580c" : sensorMode === 0 ? "#0f172a" : "#0d9488"}
          roughness={0.2}
        />
      </mesh>

      {/* Windshield */}
      <mesh position={[1.5, 0.7, 0]}>
        <boxGeometry args={[0.8, 0.9, 1.8]} />
        <meshStandardMaterial color="#0284c7" roughness={0.1} />
      </mesh>

      {/* Lightbar */}
      <group position={[0.4, 1.65, 0]}>
        <mesh position={[0, 0, -0.4]}>
          <boxGeometry args={[0.3, 0.2, 0.4]} />
          <meshBasicMaterial ref={redLightRef} color="#ef4444" transparent />
        </mesh>
        <mesh position={[0, 0, 0.4]}>
          <boxGeometry args={[0.3, 0.2, 0.4]} />
          <meshBasicMaterial ref={blueLightRef} color="#3b82f6" transparent />
        </mesh>
      </group>

      {/* Selection Ring */}
      {isSelected && (
        <mesh position={[0, -0.4, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[2.8, 3.2, 32]} />
          <meshBasicMaterial color="#38bdf8" side={THREE.DoubleSide} />
        </mesh>
      )}
    </group>
  );
}

// Camera Director with smooth transitions for Overview, Follow Ambulance, and Track Agent
function CameraDirector({
  simRef,
  cameraMode,
  selectedAgentId,
  agents,
}: {
  simRef: React.RefObject<CorridorSimulation>;
  cameraMode: CameraViewMode;
  selectedAgentId: string | null;
  agents: PerceptionAgent[];
}) {
  const { camera } = useThree();
  const controlsRef = useRef<any>(null);
  const targetLook = useRef(new THREE.Vector3(-100, 0, -100));

  useFrame((state, delta) => {
    if (!simRef.current) return;
    const v = simRef.current.vehicle;

    let focusX = -100;
    let focusZ = -100;

    if (cameraMode === "follow_ambulance" || (!selectedAgentId && cameraMode !== "overview")) {
      focusX = v.x;
      focusZ = v.z;
    } else if (cameraMode === "overview") {
      focusX = 0;
      focusZ = 0;
    }

    if (selectedAgentId) {
      const found = agents.find((a) => a.id === selectedAgentId);
      if (found) {
        focusX = found.position[0];
        focusZ = found.position[2];
      }
    }

    // Smoothly lerp lookAt target
    targetLook.current.lerp(new THREE.Vector3(focusX, 0, focusZ), delta * 4.0);

    if (controlsRef.current) {
      controlsRef.current.target.copy(targetLook.current);
      controlsRef.current.update();
    }
  });

  return (
    <OrbitControls
      ref={controlsRef}
      enableDamping
      dampingFactor={0.08}
      maxPolarAngle={Math.PI / 2 - 0.12}
      minDistance={20}
      maxDistance={500}
    />
  );
}
