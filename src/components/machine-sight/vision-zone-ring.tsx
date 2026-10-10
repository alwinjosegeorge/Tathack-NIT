// 3D Vision Zone Perimeter Ring, Concentric LIDAR Scan Waves & Floating Radius Metric Badge
import React, { useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";

interface VisionZoneRingProps {
  zoneCenter: [number, number];
  zoneRadius: number;
  sensorMode: 0 | 1 | 2;
  isLockedToAmbulance: boolean;
}

export function VisionZoneRing({
  zoneCenter,
  zoneRadius,
  sensorMode,
  isLockedToAmbulance,
}: VisionZoneRingProps) {
  const groupRef = useRef<THREE.Group>(null);
  const ringRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    const time = state.clock.getElapsedTime();
    if (groupRef.current) {
      groupRef.current.position.set(zoneCenter[0], 0.25, zoneCenter[1]);
    }
    if (ringRef.current) {
      ringRef.current.rotation.z = time * 0.4;
    }
  });

  const ringColor = sensorMode === 0 ? "#00f0ff" : sensorMode === 1 ? "#ea580c" : "#2dd4bf";

  return (
    <group ref={groupRef}>
      {/* Outer Border Ring */}
      <mesh ref={ringRef} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[zoneRadius - 0.4, zoneRadius + 0.4, 80]} />
        <meshBasicMaterial
          color={ringColor}
          transparent
          opacity={0.65}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Concentric LIDAR Scan Waves */}
      {sensorMode === 0 && (
        <>
          {[0.25, 0.5, 0.75].map((frac, idx) => (
            <mesh key={`inner-ring-${idx}`} rotation={[-Math.PI / 2, 0, 0]}>
              <ringGeometry args={[zoneRadius * frac - 0.2, zoneRadius * frac + 0.2, 64]} />
              <meshBasicMaterial
                color="#00f0ff"
                transparent
                opacity={0.25 - idx * 0.05}
                side={THREE.DoubleSide}
              />
            </mesh>
          ))}
        </>
      )}

      {/* 3D Floating Radius Badge on Perimeter Ring */}
      <Html
        position={[0, 1.8, zoneRadius]}
        center
        distanceFactor={110}
        zIndexRange={[90, 0]}
      >
        <div className="pointer-events-none select-none rounded-full border border-slate-700/80 bg-slate-950/85 px-2.5 py-0.5 font-mono text-[9px] font-bold tracking-wider text-cyan-300 shadow-xl backdrop-blur-md">
          <span className="flex items-center gap-1.5 whitespace-nowrap">
            <span className="size-1.5 rounded-full bg-cyan-400 animate-ping" />
            <span>RADIUS: {Math.round(zoneRadius)}m</span>
            {isLockedToAmbulance && (
              <span className="text-orange-400 font-semibold">[LOCKED TO AMB]</span>
            )}
          </span>
        </div>
      </Html>
    </group>
  );
}
