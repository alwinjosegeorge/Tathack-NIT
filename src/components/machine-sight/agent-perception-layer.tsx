// Oriented 3D Bounding Boxes, Projected Monospace Screen Tags, and Dynamic Vehicle Meshes
import React, { useRef, useMemo } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import { PerceptionAgent } from "@/lib/sim/perception";

interface AgentPerceptionLayerProps {
  agents: PerceptionAgent[];
  selectedAgentId: string | null;
  onSelectAgent: (agentId: string) => void;
  sensorMode: 0 | 1 | 2;
  zoneCenter: [number, number];
  zoneRadius: number;
}

export function AgentPerceptionLayer({
  agents,
  selectedAgentId,
  onSelectAgent,
  sensorMode,
  zoneCenter,
  zoneRadius,
}: AgentPerceptionLayerProps) {
  // Cull screen tags so that only agents inside zone (and max 25) render tags
  const culledAgents = useMemo(() => {
    return agents.filter((a) => a.inZone).slice(0, 25);
  }, [agents]);

  return (
    <group>
      {agents.map((agent) => (
        <SingleAgentMesh
          key={agent.id}
          agent={agent}
          isSelected={selectedAgentId === agent.id}
          onSelect={() => onSelectAgent(agent.id)}
          sensorMode={sensorMode}
        />
      ))}

      {/* Screen-space Monospace Tags */}
      {culledAgents.map((agent) => (
        <AgentScreenTag
          key={`tag-${agent.id}`}
          agent={agent}
          isSelected={selectedAgentId === agent.id}
          onSelect={() => onSelectAgent(agent.id)}
        />
      ))}
    </group>
  );
}

function SingleAgentMesh({
  agent,
  isSelected,
  onSelect,
  sensorMode,
}: {
  agent: PerceptionAgent;
  isSelected: boolean;
  onSelect: () => void;
  sensorMode: 0 | 1 | 2;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const isAmbulance = agent.type === "ambulance";

  useFrame(() => {
    if (groupRef.current) {
      groupRef.current.position.set(agent.position[0], agent.position[1], agent.position[2]);
      groupRef.current.rotation.y = -agent.heading + Math.PI / 2;
      groupRef.current.rotation.z = agent.roll;
    }
  });

  // Bounding box wireframe color
  const bboxColor = useMemo(() => {
    if (agent.hasTtcWarning) return "#ef4444"; // Red flashing alert
    if (isSelected) return "#38bdf8"; // Cyan selected
    if (isAmbulance) return "#ea580c"; // Electric orange lead
    if (sensorMode === 0) return "#00f0ff"; // LIDAR Cyan
    if (sensorMode === 1) return "#38bdf8"; // Segment Sky
    return "#2dd4bf"; // Depth Teal
  }, [agent.hasTtcWarning, isSelected, isAmbulance, sensorMode]);

  return (
    <group ref={groupRef} onClick={(e) => { e.stopPropagation(); onSelect(); }}>
      {/* 1. Oriented 3D Bounding Box (Sensor Perception) */}
      <mesh position={[0, agent.dimensions[1] / 2 - 0.4, 0]}>
        <boxGeometry args={agent.dimensions} />
        <meshBasicMaterial
          color={bboxColor}
          wireframe
          transparent
          opacity={agent.hasTtcWarning ? 0.95 : (isSelected ? 0.9 : 0.45)}
        />
      </mesh>

      {/* 2. Vehicle Body Geometry */}
      {isAmbulance ? (
        <group position={[0, 0, 0]}>
          {/* Main Cabin */}
          <mesh position={[0, 0.6, 0]} castShadow>
            <boxGeometry args={[4.6, 1.8, 1.9]} />
            <meshStandardMaterial
              color={sensorMode === 1 ? "#ea580c" : (sensorMode === 0 ? "#111827" : "#0d9488")}
              roughness={0.2}
            />
          </mesh>

          {/* Windshield */}
          <mesh position={[1.4, 0.7, 0]}>
            <boxGeometry args={[0.8, 0.9, 1.7]} />
            <meshStandardMaterial color="#0284c7" roughness={0.1} />
          </mesh>

          {/* Flashing Emergency Lightbar (Red/Blue alternating) */}
          <EmergencyLightbar />
        </group>
      ) : (
        <group position={[0, 0, 0]}>
          {/* Car Chassis */}
          <mesh position={[0, 0.35, 0]} castShadow>
            <boxGeometry args={[3.8, 1.0, 1.7]} />
            <meshStandardMaterial
              color={sensorMode === 1 ? "#0284c7" : (sensorMode === 0 ? "#1e293b" : "#14b8a6")}
              roughness={0.4}
            />
          </mesh>

          {/* Cabin Glass */}
          <mesh position={[-0.2, 0.95, 0]}>
            <boxGeometry args={[2.0, 0.7, 1.4]} />
            <meshStandardMaterial
              color={sensorMode === 1 ? "#0f172a" : "#0284c7"}
              roughness={0.2}
              transparent
              opacity={0.8}
            />
          </mesh>
        </group>
      )}

      {/* Target Marker Ring when Selected */}
      {isSelected && (
        <mesh position={[0, -0.4, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[2.6, 2.9, 32]} />
          <meshBasicMaterial color="#38bdf8" side={THREE.DoubleSide} />
        </mesh>
      )}
    </group>
  );
}

// Emergency Red & Blue Lightbar with fast oscillation
function EmergencyLightbar() {
  const redLightRef = useRef<THREE.MeshBasicMaterial>(null);
  const blueLightRef = useRef<THREE.MeshBasicMaterial>(null);

  useFrame((state) => {
    const t = state.clock.getElapsedTime() * 12;
    const isRed = Math.sin(t) > 0;
    if (redLightRef.current) redLightRef.current.opacity = isRed ? 1.0 : 0.2;
    if (blueLightRef.current) blueLightRef.current.opacity = isRed ? 0.2 : 1.0;
  });

  return (
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
  );
}

// Projected Screen Monospace Tag
function AgentScreenTag({
  agent,
  isSelected,
  onSelect,
}: {
  agent: PerceptionAgent;
  isSelected: boolean;
  onSelect: () => void;
}) {
  return (
    <Html
      position={[agent.position[0], agent.position[1] + (agent.type === "ambulance" ? 2.6 : 2.0), agent.position[2]]}
      center
      distanceFactor={100}
      zIndexRange={[80, 0]}
    >
      <button
        onClick={(e) => {
          e.stopPropagation();
          onSelect();
        }}
        className={`pointer-events-auto cursor-pointer select-none rounded border px-1.5 py-0.5 font-mono text-[9px] font-bold tracking-tight shadow-md backdrop-blur-md transition-all ${
          agent.hasTtcWarning
            ? "border-red-500 bg-red-950/90 text-red-300 animate-pulse"
            : isSelected
            ? "border-cyan-400 bg-cyan-950/90 text-cyan-200 ring-2 ring-cyan-400/50"
            : agent.type === "ambulance"
            ? "border-orange-500 bg-orange-950/90 text-orange-200"
            : "border-slate-700/80 bg-slate-950/80 text-slate-300 hover:border-slate-500"
        }`}
      >
        <span className="flex items-center gap-1">
          <span
            className={`size-1 rounded-full ${
              agent.hasTtcWarning
                ? "bg-red-500 animate-ping"
                : agent.statusBadge === "WAIT"
                ? "bg-amber-400"
                : "bg-emerald-400"
            }`}
          />
          <span>{agent.label}</span>
          <span className="text-slate-400">·</span>
          <span>{agent.speedKmh} km/h</span>
        </span>
      </button>
    </Html>
  );
}
