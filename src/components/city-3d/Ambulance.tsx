import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface AmbulanceProps {
  speedRef?: React.MutableRefObject<number>;
  brakeLightRef?: React.MutableRefObject<boolean>;
  emergencyActive?: boolean;
}

/** Detailed procedural ambulance with emergency light bar, imperatively updated */
export function Ambulance({ speedRef, brakeLightRef, emergencyActive = true }: AmbulanceProps) {
  const wheelGroupRefs = useRef<THREE.Group[]>([]);
  const redLightMat = useRef<THREE.MeshStandardMaterial>(null);
  const blueLightMat = useRef<THREE.MeshStandardMaterial>(null);
  const redGlow = useRef<THREE.PointLight>(null);
  const blueGlow = useRef<THREE.PointLight>(null);
  const brakeMats = useRef<THREE.MeshStandardMaterial[]>([]);
  const phaseRef = useRef(0);
  const emergRef = useRef(emergencyActive);
  emergRef.current = emergencyActive;
  const WR = 0.42;

  useFrame((_, delta) => {
    const speed = speedRef?.current ?? 0;
    const braking = brakeLightRef?.current ?? false;
    const spinAngle = (speed * delta) / WR;

    for (const wg of wheelGroupRefs.current) {
      if (wg) wg.rotation.x -= spinAngle;
    }

    // Emergency lights
    if (emergRef.current) {
      phaseRef.current += delta * 5; // faster flash
      const t = phaseRef.current % (Math.PI * 2);
      const redOn = t < Math.PI;

      if (redLightMat.current) {
        redLightMat.current.emissiveIntensity = redOn ? 3.0 : 0.05;
        redLightMat.current.emissive.setHex(redOn ? 0xff0000 : 0x200000);
        redLightMat.current.color.setHex(redOn ? 0xff1111 : 0x400000);
      }
      if (blueLightMat.current) {
        blueLightMat.current.emissiveIntensity = redOn ? 0.05 : 3.0;
        blueLightMat.current.emissive.setHex(redOn ? 0x000020 : 0x0000ff);
        blueLightMat.current.color.setHex(redOn ? 0x000040 : 0x1111ff);
      }
      if (redGlow.current) {
        redGlow.current.intensity = redOn ? 20 : 0;
      }
      if (blueGlow.current) {
        blueGlow.current.intensity = redOn ? 0 : 20;
      }
    } else {
      if (redLightMat.current) redLightMat.current.emissiveIntensity = 0.05;
      if (blueLightMat.current) blueLightMat.current.emissiveIntensity = 0.05;
      if (redGlow.current) redGlow.current.intensity = 0;
      if (blueGlow.current) blueGlow.current.intensity = 0;
    }

    // Brake lights
    const col = braking ? 0xff0000 : 0x660000;
    const emInt = braking ? 1.8 : 0.15;
    for (const mat of brakeMats.current) {
      if (mat) {
        mat.emissiveIntensity = emInt;
        mat.emissive.setHex(col);
        mat.color.setHex(col);
      }
    }
  });

  return (
    <group>
      {/* Lower body / chassis */}
      <mesh position={[0, WR + 0.35, 0]} castShadow receiveShadow>
        <boxGeometry args={[2.3, 0.7, 6.5]} />
        <meshStandardMaterial color="#f8f8f8" metalness={0.3} roughness={0.4} />
      </mesh>

      {/* Cab / driver compartment */}
      <mesh position={[0, WR + 0.8, 2.0]} castShadow receiveShadow>
        <boxGeometry args={[2.2, 1.0, 2.0]} />
        <meshStandardMaterial color="#f8f8f8" metalness={0.3} roughness={0.4} />
      </mesh>

      {/* Patient compartment (box body) */}
      <mesh position={[0, WR + 1.05, -0.8]} castShadow receiveShadow>
        <boxGeometry args={[2.3, 1.4, 3.5]} />
        <meshStandardMaterial color="#f8f8f8" metalness={0.3} roughness={0.4} />
      </mesh>

      {/* Roof */}
      <mesh position={[0, WR + 1.78, -0.8]} castShadow>
        <boxGeometry args={[2.2, 0.08, 3.3]} />
        <meshStandardMaterial color="#e8e8e8" metalness={0.2} roughness={0.5} />
      </mesh>

      {/* Red cross stripes */}
      <mesh position={[1.17, WR + 1.05, -0.8]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[0.55, 0.55]} />
        <meshStandardMaterial color="#cc0000" emissive="#cc0000" emissiveIntensity={0.4} side={THREE.DoubleSide} />
      </mesh>
      {/* Horizontal bar of cross */}
      <mesh position={[1.17, WR + 1.05, -0.8]} rotation={[0, Math.PI / 2, Math.PI / 2]}>
        <planeGeometry args={[0.15, 0.55]} />
        <meshStandardMaterial color="#ffffff" side={THREE.DoubleSide} />
      </mesh>

      {/* "AMBULANCE" stripe down the side */}
      <mesh position={[1.17, WR + 0.55, 0.5]}>
        <boxGeometry args={[0.02, 0.25, 4.0]} />
        <meshStandardMaterial color="#cc0000" emissive="#cc0000" emissiveIntensity={0.2} />
      </mesh>

      {/* Windshield */}
      <mesh position={[0, WR + 0.9, 3.02]}>
        <boxGeometry args={[1.9, 0.85, 0.05]} />
        <meshPhysicalMaterial color="#0a0a14" metalness={0.1} roughness={0.05} transmission={0.7} transparent opacity={0.6} />
      </mesh>

      {/* Cab side windows */}
      {[1.12, -1.12].map((x, i) => (
        <mesh key={i} position={[x, WR + 0.9, 2.0]}>
          <boxGeometry args={[0.05, 0.7, 1.6]} />
          <meshPhysicalMaterial color="#0a0a14" metalness={0.1} roughness={0.05} transmission={0.6} transparent opacity={0.55} />
        </mesh>
      ))}

      {/* Emergency light bar base */}
      <mesh position={[0, WR + 1.88, 0.5]}>
        <boxGeometry args={[1.6, 0.12, 0.4]} />
        <meshStandardMaterial color="#1a1a1a" roughness={0.5} />
      </mesh>

      {/* Red light */}
      <mesh position={[-0.4, WR + 1.88, 0.5]}>
        <boxGeometry args={[0.72, 0.1, 0.36]} />
        <meshStandardMaterial
          ref={redLightMat}
          color="#ff1111"
          emissive="#ff0000"
          emissiveIntensity={3}
          toneMapped={false}
        />
      </mesh>
      <pointLight ref={redGlow} position={[-0.4, WR + 2.1, 0.5]} color="#ff0000" intensity={20} distance={15} decay={2} />

      {/* Blue light */}
      <mesh position={[0.4, WR + 1.88, 0.5]}>
        <boxGeometry args={[0.72, 0.1, 0.36]} />
        <meshStandardMaterial
          ref={blueLightMat}
          color="#1111ff"
          emissive="#0000ff"
          emissiveIntensity={3}
          toneMapped={false}
        />
      </mesh>
      <pointLight ref={blueGlow} position={[0.4, WR + 2.1, 0.5]} color="#0000ff" intensity={0} distance={15} decay={2} />

      {/* Headlights */}
      {[0.7, -0.7].map((x, i) => (
        <mesh key={i} position={[x, WR + 0.5, 3.3]}>
          <boxGeometry args={[0.35, 0.2, 0.05]} />
          <meshStandardMaterial color="#fffbe6" emissive="#fffbe6" emissiveIntensity={1.0} toneMapped={false} />
        </mesh>
      ))}

      {/* Brake lights */}
      {[0.65, -0.65].map((x, i) => (
        <mesh key={i} position={[x, WR + 0.6, -3.28]}>
          <boxGeometry args={[0.35, 0.18, 0.05]} />
          <meshStandardMaterial
            ref={(m) => { if (m) brakeMats.current[i] = m; }}
            color="#660000"
            emissive="#220000"
            emissiveIntensity={0.15}
            toneMapped={false}
          />
        </mesh>
      ))}

      {/* Wheels */}
      {[
        [1.1, WR, 2.0], [-1.1, WR, 2.0],
        [1.1, WR, -2.0], [-1.1, WR, -2.0],
      ].map((pos, i) => (
        <group
          key={i}
          ref={(el) => { if (el) wheelGroupRefs.current[i] = el; }}
          position={pos as [number, number, number]}
          rotation={[0, 0, Math.PI / 2]}
        >
          <mesh>
            <cylinderGeometry args={[WR, WR, 0.25, 16]} />
            <meshStandardMaterial color="#1a1a1a" roughness={0.85} />
          </mesh>
          <mesh position={[0.13, 0, 0]}>
            <cylinderGeometry args={[WR * 0.43, WR * 0.43, 0.04, 12]} />
            <meshStandardMaterial color="#ccc" metalness={0.9} roughness={0.15} />
          </mesh>
        </group>
      ))}
    </group>
  );
}
