// Renders 250-400 City Vehicles and 80-150 Pedestrians across the 16x16 Grid with MultiSensorShader
import React, { useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import { FullCityTrafficEngine } from "@/lib/sim/full-city-traffic";
import { PerceptionAgent } from "@/lib/sim/perception";
import { MultiSensorShader } from "./shaders";

interface FullCityVehiclesProps {
  trafficEngine: FullCityTrafficEngine;
  agentsInZone: PerceptionAgent[];
  selectedAgentId: string | null;
  onSelectAgent: (agentId: string) => void;
  zoneCenter: [number, number];
  zoneRadius: number;
  sensorMode: 0 | 1 | 2;
  lowQuality?: boolean;
}

export function FullCityVehicles({
  trafficEngine,
  agentsInZone,
  selectedAgentId,
  onSelectAgent,
  zoneCenter,
  zoneRadius,
  sensorMode,
  lowQuality,
}: FullCityVehiclesProps) {
  // Shared vehicle shader material
  const vehicleShaderMat = useMemo(() => {
    const uniforms = THREE.UniformsUtils.clone(MultiSensorShader.uniforms);
    uniforms.uSemanticType.value = 4; // Car
    uniforms.uClayBaseColor.value = new THREE.Color("#f1f5f9");
    uniforms.uSegmentColor.value = new THREE.Color("#0284c7");
    uniforms.uZoneRadius.value = zoneRadius;
    uniforms.uSensorMode.value = sensorMode;

    return new THREE.ShaderMaterial({
      uniforms,
      vertexShader: MultiSensorShader.vertexShader,
      fragmentShader: MultiSensorShader.fragmentShader,
      side: THREE.DoubleSide,
    });
  }, [zoneRadius, sensorMode]);

  const pedestrianShaderMat = useMemo(() => {
    const uniforms = THREE.UniformsUtils.clone(MultiSensorShader.uniforms);
    uniforms.uSemanticType.value = 4;
    uniforms.uClayBaseColor.value = new THREE.Color("#e2e8f0");
    uniforms.uSegmentColor.value = new THREE.Color("#a855f7");
    uniforms.uZoneRadius.value = zoneRadius;
    uniforms.uSensorMode.value = sensorMode;

    return new THREE.ShaderMaterial({
      uniforms,
      vertexShader: MultiSensorShader.vertexShader,
      fragmentShader: MultiSensorShader.fragmentShader,
      side: THREE.DoubleSide,
    });
  }, [zoneRadius, sensorMode]);

  useFrame((state) => {
    const time = state.clock.getElapsedTime();
    vehicleShaderMat.uniforms.uZoneCenter.value.set(zoneCenter[0], zoneCenter[1]);
    vehicleShaderMat.uniforms.uZoneRadius.value = zoneRadius;
    vehicleShaderMat.uniforms.uSensorMode.value = sensorMode;
    vehicleShaderMat.uniforms.uTime.value = time;

    pedestrianShaderMat.uniforms.uZoneCenter.value.set(zoneCenter[0], zoneCenter[1]);
    pedestrianShaderMat.uniforms.uZoneRadius.value = zoneRadius;
    pedestrianShaderMat.uniforms.uSensorMode.value = sensorMode;
    pedestrianShaderMat.uniforms.uTime.value = time;
  });

  // Prioritize and cull tags to max 25 inside the zone
  const culledTags = useMemo(() => {
    // Sort: ambulance first, then TTC alerts, then closest to zone center
    return [...agentsInZone]
      .filter((a) => a.inZone)
      .sort((a, b) => {
        if (a.type === "ambulance") return -1;
        if (b.type === "ambulance") return 1;
        if (a.hasTtcWarning && !b.hasTtcWarning) return -1;
        if (!a.hasTtcWarning && b.hasTtcWarning) return 1;
        return a.distToZoneCenter - b.distToZoneCenter;
      })
      .slice(0, 25);
  }, [agentsInZone]);

  return (
    <group>
      {/* 1. Traffic Vehicles */}
      {trafficEngine.vehicles.map((veh) => {
        const isSelected = selectedAgentId === veh.id;
        const distToCenter = Math.hypot(veh.x - zoneCenter[0], veh.z - zoneCenter[1]);
        const inZone = distToCenter <= zoneRadius;

        return (
          <group
            key={veh.id}
            position={[veh.x, veh.y, veh.z]}
            rotation={[0, -veh.heading + Math.PI / 2, 0]}
            onClick={(e) => {
              e.stopPropagation();
              onSelectAgent(veh.id);
            }}
          >
            {/* 3D Model */}
            <mesh material={vehicleShaderMat} castShadow={!lowQuality}>
              <boxGeometry args={veh.dimensions} />
            </mesh>

            {/* Bounding Box when inside Vision Zone */}
            {inZone && (
              <mesh position={[0, 0, 0]}>
                <boxGeometry args={[veh.dimensions[0] + 0.3, veh.dimensions[1] + 0.3, veh.dimensions[2] + 0.3]} />
                <meshBasicMaterial
                  color={isSelected ? "#38bdf8" : sensorMode === 0 ? "#00f0ff" : "#2dd4bf"}
                  wireframe
                  transparent
                  opacity={isSelected ? 0.95 : 0.45}
                />
              </mesh>
            )}

            {/* Selection Ring */}
            {isSelected && (
              <mesh position={[0, -veh.dimensions[1] / 2 + 0.05, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                <ringGeometry args={[2.5, 2.8, 32]} />
                <meshBasicMaterial color="#38bdf8" side={THREE.DoubleSide} />
              </mesh>
            )}
          </group>
        );
      })}

      {/* 2. Pedestrians */}
      {!lowQuality &&
        trafficEngine.pedestrians.map((ped) => {
          const isSelected = selectedAgentId === ped.id;
          const distToCenter = Math.hypot(ped.x - zoneCenter[0], ped.z - zoneCenter[1]);
          const inZone = distToCenter <= zoneRadius;

          return (
            <group
              key={ped.id}
              position={[ped.x, ped.y, ped.z]}
              rotation={[0, -ped.heading, 0]}
              onClick={(e) => {
                e.stopPropagation();
                onSelectAgent(ped.id);
              }}
            >
              {/* Torso */}
              <mesh position={[0, 0.4, 0]} material={pedestrianShaderMat}>
                <cylinderGeometry args={[0.2, 0.2, 0.8, 6]} />
              </mesh>
              {/* Head */}
              <mesh position={[0, 1.0, 0]} material={pedestrianShaderMat}>
                <sphereGeometry args={[0.18, 6, 6]} />
              </mesh>

              {inZone && (
                <mesh position={[0, 0.5, 0]}>
                  <boxGeometry args={[0.7, 1.4, 0.7]} />
                  <meshBasicMaterial
                    color={isSelected ? "#38bdf8" : "#a855f7"}
                    wireframe
                    transparent
                    opacity={isSelected ? 0.9 : 0.4}
                  />
                </mesh>
              )}
            </group>
          );
        })}

      {/* 3. Screen Tags inside Zone */}
      {culledTags.map((agent) => (
        <ScreenAgentTag
          key={`tag-${agent.id}`}
          agent={agent}
          isSelected={selectedAgentId === agent.id}
          onSelect={() => onSelectAgent(agent.id)}
        />
      ))}
    </group>
  );
}

function ScreenAgentTag({
  agent,
  isSelected,
  onSelect,
}: {
  agent: PerceptionAgent;
  isSelected: boolean;
  onSelect: () => void;
}) {
  const isAlert = agent.statusBadge === "ALERT" || agent.hasTtcWarning;
  const isWait = agent.statusBadge === "WAIT";

  return (
    <Html
      position={[
        agent.position[0],
        agent.position[1] + (agent.type === "ambulance" ? 3.0 : agent.type === "pedestrian" ? 2.0 : 2.2),
        agent.position[2],
      ]}
      center
      distanceFactor={100}
      zIndexRange={[80, 0]}
    >
      <button
        onClick={(e) => {
          e.stopPropagation();
          onSelect();
        }}
        className={`pointer-events-auto cursor-pointer select-none rounded-md border px-2 py-0.5 font-mono text-[10px] font-bold tracking-tight shadow-md backdrop-blur-md transition-all ${
          isAlert
            ? "border-red-500 bg-red-950/90 text-red-200 animate-pulse"
            : isSelected
            ? "border-cyan-400 bg-cyan-950/95 text-cyan-200 ring-2 ring-cyan-400/60 scale-105"
            : agent.type === "ambulance"
            ? "border-orange-500/80 bg-orange-950/90 text-orange-200"
            : "border-slate-800/80 bg-slate-950/85 text-slate-200 hover:border-slate-600 hover:bg-slate-900"
        }`}
      >
        <span className="flex items-center gap-1.5 whitespace-nowrap">
          <span
            className={`size-1.5 rounded-full ${
              isAlert ? "bg-red-500 animate-ping" : isWait ? "bg-sky-400" : "bg-emerald-400"
            }`}
          />
          <span>{agent.label}</span>
          <span className="text-slate-500 font-normal">·</span>
          <span className="font-medium text-slate-300">{agent.speedKmh} km/h</span>
        </span>
      </button>
    </Html>
  );
}
