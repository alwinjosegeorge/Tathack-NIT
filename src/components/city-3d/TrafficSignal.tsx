import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { SignalState } from '@/lib/city-sim/types';

interface TrafficSignalProps {
  position: [number, number, number];
  rotationY: number;
  state: SignalState;
  phaseRemaining?: number;
}

/** A 3D traffic signal pole with 3 lights (red, amber, green) */
export function TrafficSignal({ position, rotationY, state, phaseRemaining = 0 }: TrafficSignalProps) {
  const redRef = useRef<THREE.MeshStandardMaterial>(null);
  const amberRef = useRef<THREE.MeshStandardMaterial>(null);
  const greenRef = useRef<THREE.MeshStandardMaterial>(null);
  const redLightRef = useRef<THREE.PointLight>(null);
  const greenLightRef = useRef<THREE.PointLight>(null);
  const amberLightRef = useRef<THREE.PointLight>(null);
  const phaseRef = useRef(0);
  const stateRef = useRef<SignalState>(state);

  stateRef.current = state;

  useFrame((_, delta) => {
    phaseRef.current += delta;
    const s = stateRef.current;

    // Amber pulsing
    const amberPulse = s === 'amber' ? (Math.sin(phaseRef.current * 6) * 0.5 + 0.5) : 0;

    if (redRef.current) {
      const on = s === 'red';
      redRef.current.emissiveIntensity = on ? 2.0 : 0.08;
      redRef.current.color.setHex(on ? 0xff2222 : 0x330000);
      redRef.current.emissive.setHex(on ? 0xff2222 : 0x110000);
    }
    if (amberRef.current) {
      amberRef.current.emissiveIntensity = amberPulse * 2.2;
      amberRef.current.color.setHex(s === 'amber' ? 0xff8800 : 0x221100);
      amberRef.current.emissive.setHex(s === 'amber' ? 0xff8800 : 0x110800);
    }
    if (greenRef.current) {
      const on = s === 'green';
      greenRef.current.emissiveIntensity = on ? 2.0 : 0.08;
      greenRef.current.color.setHex(on ? 0x00ff44 : 0x003300);
      greenRef.current.emissive.setHex(on ? 0x00ff44 : 0x001100);
    }

    // Point lights for signal glow
    if (redLightRef.current) {
      redLightRef.current.intensity = s === 'red' ? 8 : 0;
    }
    if (greenLightRef.current) {
      greenLightRef.current.intensity = s === 'green' ? 8 : 0;
    }
    if (amberLightRef.current) {
      amberLightRef.current.intensity = s === 'amber' ? amberPulse * 10 : 0;
    }
  });

  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      {/* Pole base */}
      <mesh position={[0, 0.1, 0]} castShadow>
        <cylinderGeometry args={[0.3, 0.35, 0.2, 12]} />
        <meshStandardMaterial color="#333" roughness={0.7} metalness={0.3} />
      </mesh>

      {/* Pole */}
      <mesh position={[0, 2.5, 0]} castShadow>
        <cylinderGeometry args={[0.1, 0.12, 4.8, 10]} />
        <meshStandardMaterial color="#2a2a2a" roughness={0.6} metalness={0.4} />
      </mesh>

      {/* Horizontal arm */}
      <mesh position={[0.7, 4.7, 0]} castShadow>
        <boxGeometry args={[1.4, 0.12, 0.12]} />
        <meshStandardMaterial color="#2a2a2a" roughness={0.6} />
      </mesh>

      {/* Signal head housing */}
      <mesh position={[1.3, 3.6, 0]} castShadow>
        <boxGeometry args={[0.35, 1.25, 0.35]} />
        <meshStandardMaterial color="#1a1a1a" roughness={0.5} metalness={0.3} />
      </mesh>

      {/* Red light */}
      <mesh position={[1.3, 4.05, 0.18]}>
        <circleGeometry args={[0.12, 16]} />
        <meshStandardMaterial
          ref={redRef}
          color="#ff2222"
          emissive="#ff2222"
          emissiveIntensity={2}
          toneMapped={false}
        />
      </mesh>
      <pointLight ref={redLightRef} position={[1.3, 4.05, 0.4]} color="#ff2222" intensity={8} distance={8} decay={2} />

      {/* Amber light */}
      <mesh position={[1.3, 3.6, 0.18]}>
        <circleGeometry args={[0.12, 16]} />
        <meshStandardMaterial
          ref={amberRef}
          color="#221100"
          emissive="#110800"
          emissiveIntensity={0.1}
          toneMapped={false}
        />
      </mesh>
      <pointLight ref={amberLightRef} position={[1.3, 3.6, 0.4]} color="#ff8800" intensity={0} distance={8} decay={2} />

      {/* Green light */}
      <mesh position={[1.3, 3.15, 0.18]}>
        <circleGeometry args={[0.12, 16]} />
        <meshStandardMaterial
          ref={greenRef}
          color="#00ff44"
          emissive="#00ff44"
          emissiveIntensity={2}
          toneMapped={false}
        />
      </mesh>
      <pointLight ref={greenLightRef} position={[1.3, 3.15, 0.4]} color="#00ff44" intensity={8} distance={8} decay={2} />

      {/* Visors / hoods over each light */}
      {[4.05, 3.6, 3.15].map((y, i) => (
        <mesh key={i} position={[1.3, y, 0.22]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.14, 0.14, 0.1, 12, 1, true]} />
          <meshStandardMaterial color="#1a1a1a" roughness={0.5} side={THREE.DoubleSide} />
        </mesh>
      ))}

      {/* Phase countdown — thin progress bar on pole */}
      {phaseRemaining > 0 && phaseRemaining < 15 && (
        <mesh position={[0, 1.5, 0.07]}>
          <boxGeometry args={[0.06, Math.min(2, phaseRemaining / 8), 0.04]} />
          <meshStandardMaterial
            color={state === 'green' ? '#00ff44' : state === 'amber' ? '#ff8800' : '#ff2222'}
            emissive={state === 'green' ? '#00ff44' : state === 'amber' ? '#ff8800' : '#ff2222'}
            emissiveIntensity={0.8}
          />
        </mesh>
      )}
    </group>
  );
}
