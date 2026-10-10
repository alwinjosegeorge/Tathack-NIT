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
        {/* Sunny Atmospheric Sky and Soft Blue Horizon */}
        <color attach="background" args={["#87ceeb"]} />
        <fog attach="fog" args={["#bfe3f7", 380, 1100]} />

        {/* Ambient, Hemisphere & Warm Directional Sunlight */}
        <ambientLight intensity={0.7} color="#e0f2fe" />
        <hemisphereLight args={['#87ceeb', '#15803d', 0.6]} />
        <directionalLight
          position={[140, 260, 100]}
          intensity={1.8}
          castShadow={!lowQuality}
          color="#fffbeb"
          shadow-mapSize-width={2048}
          shadow-mapSize-height={2048}
          shadow-camera-left={-300}
          shadow-camera-right={300}
          shadow-camera-top={300}
          shadow-camera-bottom={-300}
        />

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

    // 3. Compute target zone center (Centered dynamically on lead emergency vehicle)
    const amb = simRef.current.vehicle;
    const targetX = amb.x;
    const targetZ = amb.z;

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
// High-Detail Emergency Lead Ambulance with Vibrant Livery, Flashing Lightbar & Headlights
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
  const strobeRef = useRef<THREE.MeshBasicMaterial>(null);

  useFrame((state) => {
    if (!simRef.current || !groupRef.current) return;
    const v = simRef.current.vehicle;
    groupRef.current.position.set(v.x, 0.7, v.z);
    groupRef.current.rotation.y = -v.heading + Math.PI / 2;
    groupRef.current.rotation.z = v.roll;

    const t = state.clock.getElapsedTime() * 14;
    const isRed = Math.sin(t) > 0;
    const isStrobe = Math.sin(t * 2) > 0.5;
    if (redLightRef.current) redLightRef.current.opacity = isRed ? 1.0 : 0.2;
    if (blueLightRef.current) blueLightRef.current.opacity = isRed ? 0.2 : 1.0;
    if (strobeRef.current) strobeRef.current.opacity = isStrobe ? 1.0 : 0.15;
  });

  return (
    <group ref={groupRef} onClick={(e) => { e.stopPropagation(); onSelect(); }}>
      {/* 1. Main White Ambulance Body */}
      <mesh position={[0, 0.65, 0]} castShadow>
        <boxGeometry args={[4.8, 1.8, 2.0]} />
        <meshStandardMaterial color="#ffffff" roughness={0.15} metalness={0.1} />
      </mesh>

      {/* 2. Red Emergency Flank Stripes */}
      <mesh position={[-0.2, 0.65, 1.01]}>
        <planeGeometry args={[4.4, 0.4]} />
        <meshBasicMaterial color="#dc2626" />
      </mesh>
      <mesh position={[-0.2, 0.65, -1.01]} rotation={[0, Math.PI, 0]}>
        <planeGeometry args={[4.4, 0.4]} />
        <meshBasicMaterial color="#dc2626" />
      </mesh>

      {/* 3. Red Cross Livery On Sides */}
      <group position={[-0.6, 0.65, 1.02]}>
        <mesh>
          <planeGeometry args={[0.7, 0.22]} />
          <meshBasicMaterial color="#ef4444" />
        </mesh>
        <mesh>
          <planeGeometry args={[0.22, 0.7]} />
          <meshBasicMaterial color="#ef4444" />
        </mesh>
      </group>
      <group position={[-0.6, 0.65, -1.02]} rotation={[0, Math.PI, 0]}>
        <mesh>
          <planeGeometry args={[0.7, 0.22]} />
          <meshBasicMaterial color="#ef4444" />
        </mesh>
        <mesh>
          <planeGeometry args={[0.22, 0.7]} />
          <meshBasicMaterial color="#ef4444" />
        </mesh>
      </group>

      {/* 4. Cab Windshield & Windows */}
      <mesh position={[1.52, 0.75, 0]}>
        <boxGeometry args={[0.82, 0.85, 1.82]} />
        <meshStandardMaterial color="#0284c7" roughness={0.1} metalness={0.8} />
      </mesh>

      {/* 5. Emergency Lightbar on Roof */}
      <group position={[0.4, 1.68, 0]}>
        {/* Lightbar Mount */}
        <mesh position={[0, -0.06, 0]}>
          <boxGeometry args={[0.4, 0.08, 1.4]} />
          <meshStandardMaterial color="#334155" />
        </mesh>
        {/* Red Beacon */}
        <mesh position={[0, 0.04, -0.45]}>
          <boxGeometry args={[0.35, 0.22, 0.45]} />
          <meshBasicMaterial ref={redLightRef} color="#ef4444" transparent />
        </mesh>
        {/* White Strobe */}
        <mesh position={[0, 0.04, 0]}>
          <boxGeometry args={[0.35, 0.2, 0.3]} />
          <meshBasicMaterial ref={strobeRef} color="#ffffff" transparent />
        </mesh>
        {/* Blue Beacon */}
        <mesh position={[0, 0.04, 0.45]}>
          <boxGeometry args={[0.35, 0.22, 0.45]} />
          <meshBasicMaterial ref={blueLightRef} color="#3b82f6" transparent />
        </mesh>
      </group>

      {/* 6. High-Beam LED Headlights */}
      <mesh position={[2.42, 0.45, 0.65]}>
        <boxGeometry args={[0.08, 0.22, 0.35]} />
        <meshBasicMaterial color="#fef08a" />
      </mesh>
      <mesh position={[2.42, 0.45, -0.65]}>
        <boxGeometry args={[0.08, 0.22, 0.35]} />
        <meshBasicMaterial color="#fef08a" />
      </mesh>

      {/* 7. LED Taillights */}
      <mesh position={[-2.42, 0.5, 0.75]}>
        <boxGeometry args={[0.08, 0.25, 0.28]} />
        <meshBasicMaterial color="#ef4444" />
      </mesh>
      <mesh position={[-2.42, 0.5, -0.75]}>
        <boxGeometry args={[0.08, 0.25, 0.28]} />
        <meshBasicMaterial color="#ef4444" />
      </mesh>

      {/* 8. 4 Realistic Wheels */}
      {[
        [1.4, -0.25, 1.05],
        [1.4, -0.25, -1.05],
        [-1.4, -0.25, 1.05],
        [-1.4, -0.25, -1.05],
      ].map(([wx, wy, wz], wi) => (
        <group key={`w-${wi}`} position={[wx, wy, wz]} rotation={[Math.PI / 2, 0, 0]}>
          <mesh>
            <cylinderGeometry args={[0.42, 0.42, 0.3, 16]} />
            <meshStandardMaterial color="#1e293b" roughness={0.8} />
          </mesh>
          <mesh position={[0, wz > 0 ? 0.08 : -0.08, 0]}>
            <cylinderGeometry args={[0.22, 0.22, 0.16, 12]} />
            <meshStandardMaterial color="#cbd5e1" metalness={0.8} roughness={0.3} />
          </mesh>
        </group>
      ))}

      {/* 9. Glowing Selection Aura */}
      {isSelected && (
        <mesh position={[0, -0.38, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[2.8, 3.4, 36]} />
          <meshBasicMaterial color="#10b981" side={THREE.DoubleSide} />
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
