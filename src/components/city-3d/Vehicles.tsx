import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface CarProps {
  color?: THREE.ColorRepresentation;
  speedRef?: React.MutableRefObject<number>;
  brakeLightRef?: React.MutableRefObject<boolean>;
}

/** Shared wheel geometry and materials for reuse */
const _wheelGeo = new THREE.CylinderGeometry(1, 1, 1, 16);
const _hubGeo = new THREE.CylinderGeometry(1, 1, 1, 12);
const _tireMat = new THREE.MeshStandardMaterial({ color: '#1a1a1a', roughness: 0.85, metalness: 0.2 });

/** Procedural car model with body, cabin, windows, wheels, headlights, brake lights.
 *  Vehicle position/heading are updated externally via group ref.
 *  Wheel spin and brake lights are updated imperatively via refs to avoid re-renders.
 */
export function Car({ color = '#2980b9', speedRef, brakeLightRef }: CarProps) {
  const wheelGroupRefs = useRef<THREE.Group[]>([]);
  const brakeMats = useRef<THREE.MeshStandardMaterial[]>([]);
  const bodyColor = useMemo(() => new THREE.Color(color), [color]);

  // Wheel radius for car
  const WR = 0.36;

  useFrame((_, delta) => {
    const speed = speedRef?.current ?? 0;
    const braking = brakeLightRef?.current ?? false;
    const spinAngle = (speed * delta) / WR;

    for (const wg of wheelGroupRefs.current) {
      if (wg) wg.rotation.x -= spinAngle;
    }

    const emissive = braking ? 1.8 : 0.15;
    const col = braking ? 0xff0000 : 0x660000;
    for (const mat of brakeMats.current) {
      if (mat) {
        mat.emissiveIntensity = emissive;
        mat.emissive.setHex(col);
        mat.color.setHex(col);
      }
    }
  });

  return (
    <group>
      {/* Lower body — sits at wheelRadius height */}
      <mesh position={[0, WR + 0.25, 0]} castShadow receiveShadow>
        <boxGeometry args={[1.85, 0.5, 4.3]} />
        <meshStandardMaterial color={bodyColor} metalness={0.6} roughness={0.35} />
      </mesh>

      {/* Upper cabin */}
      <mesh position={[0, WR + 0.7, -0.15]} castShadow receiveShadow>
        <boxGeometry args={[1.6, 0.6, 2.2]} />
        <meshStandardMaterial color={bodyColor} metalness={0.6} roughness={0.35} />
      </mesh>

      {/* Roof */}
      <mesh position={[0, WR + 1.05, -0.15]} castShadow>
        <boxGeometry args={[1.45, 0.08, 1.8]} />
        <meshStandardMaterial color={bodyColor} metalness={0.7} roughness={0.3} />
      </mesh>

      {/* Windshield front */}
      <mesh position={[0, WR + 0.73, 0.95]}>
        <boxGeometry args={[1.45, 0.52, 0.05]} />
        <meshPhysicalMaterial color="#0a0a14" metalness={0.1} roughness={0.05} transmission={0.7} transparent opacity={0.65} />
      </mesh>

      {/* Rear window */}
      <mesh position={[0, WR + 0.73, -1.25]}>
        <boxGeometry args={[1.45, 0.46, 0.05]} />
        <meshPhysicalMaterial color="#0a0a14" metalness={0.1} roughness={0.05} transmission={0.7} transparent opacity={0.65} />
      </mesh>

      {/* Side windows */}
      {[0.83, -0.83].map((x, i) => (
        <mesh key={i} position={[x, WR + 0.73, -0.15]}>
          <boxGeometry args={[0.05, 0.42, 1.8]} />
          <meshPhysicalMaterial color="#0a0a14" metalness={0.1} roughness={0.05} transmission={0.7} transparent opacity={0.6} />
        </mesh>
      ))}

      {/* Headlights */}
      {[0.6, -0.6].map((x, i) => (
        <mesh key={i} position={[x, WR + 0.38, 2.16]}>
          <boxGeometry args={[0.35, 0.15, 0.05]} />
          <meshStandardMaterial color="#fffbe6" emissive="#fffbe6" emissiveIntensity={0.6} toneMapped={false} />
        </mesh>
      ))}

      {/* Brake lights — imperatively updated */}
      {[0.55, -0.55].map((x, i) => (
        <mesh key={i} position={[x, WR + 0.38, -2.16]}>
          <boxGeometry args={[0.3, 0.13, 0.05]} />
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
        [0.95, WR, 1.35], [-0.95, WR, 1.35],
        [0.95, WR, -1.35], [-0.95, WR, -1.35],
      ].map((pos, i) => (
        <group key={i}
          ref={(el) => { if (el) wheelGroupRefs.current[i] = el; }}
          position={pos as [number, number, number]}
          rotation={[0, 0, Math.PI / 2]}
        >
          <mesh geometry={_wheelGeo} scale={[WR, 0.22, WR]} castShadow material={_tireMat} />
          <mesh geometry={_hubGeo} scale={[WR * 0.44, 0.04, WR * 0.44]} position={[0.12, 0, 0]}>
            <meshStandardMaterial color="#ccc" metalness={0.9} roughness={0.15} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

/** Procedural motorcycle */
export function Motorcycle({ color = '#c0392b', speedRef, brakeLightRef }: CarProps) {
  const wheelGroupRefs = useRef<THREE.Group[]>([]);
  const brakeMat = useRef<THREE.MeshStandardMaterial>(null);
  const WR = 0.28;

  useFrame((_, delta) => {
    const speed = speedRef?.current ?? 0;
    const braking = brakeLightRef?.current ?? false;
    const spinAngle = (speed * delta) / WR;
    for (const wg of wheelGroupRefs.current) {
      if (wg) wg.rotation.x -= spinAngle;
    }
    if (brakeMat.current) {
      brakeMat.current.emissiveIntensity = braking ? 1.2 : 0.15;
      brakeMat.current.emissive.setHex(braking ? 0xff0000 : 0x220000);
      brakeMat.current.color.setHex(braking ? 0xff0000 : 0x660000);
    }
  });

  return (
    <group>
      <mesh position={[0, WR + 0.22, 0]} castShadow>
        <boxGeometry args={[0.4, 0.35, 1.4]} />
        <meshStandardMaterial color={color} metalness={0.5} roughness={0.3} />
      </mesh>
      <mesh position={[0, WR + 0.44, -0.3]} castShadow>
        <boxGeometry args={[0.35, 0.15, 0.6]} />
        <meshStandardMaterial color="#1a1a1a" roughness={0.8} />
      </mesh>
      <mesh position={[0, WR + 0.44, 0.3]} castShadow>
        <boxGeometry args={[0.35, 0.2, 0.5]} />
        <meshStandardMaterial color={color} metalness={0.6} roughness={0.25} />
      </mesh>
      <mesh position={[0, WR + 0.58, 0.75]} castShadow>
        <boxGeometry args={[0.6, 0.06, 0.06]} />
        <meshStandardMaterial color="#333" metalness={0.7} roughness={0.3} />
      </mesh>
      <mesh position={[0, WR + 0.52, 0.96]}>
        <sphereGeometry args={[0.1, 8, 8]} />
        <meshStandardMaterial color="#fffbe6" emissive="#fffbe6" emissiveIntensity={0.8} toneMapped={false} />
      </mesh>
      <mesh position={[0, WR + 0.32, -0.76]}>
        <boxGeometry args={[0.12, 0.08, 0.05]} />
        <meshStandardMaterial
          ref={brakeMat}
          color="#660000"
          emissive="#220000"
          emissiveIntensity={0.15}
          toneMapped={false}
        />
      </mesh>
      {[[0, WR, 0.85], [0, WR, -0.85]].map((pos, i) => (
        <group
          key={i}
          ref={(el) => { if (el) wheelGroupRefs.current[i] = el; }}
          position={pos as [number, number, number]}
          rotation={[0, 0, Math.PI / 2]}
        >
          <mesh geometry={_wheelGeo} scale={[WR, 0.15, WR]} castShadow material={_tireMat} />
        </group>
      ))}
    </group>
  );
}

/** Procedural bus */
export function Bus({ color = '#27ae60', speedRef, brakeLightRef }: CarProps) {
  const wheelGroupRefs = useRef<THREE.Group[]>([]);
  const brakeMats = useRef<THREE.MeshStandardMaterial[]>([]);
  const WR = 0.5;

  useFrame((_, delta) => {
    const speed = speedRef?.current ?? 0;
    const braking = brakeLightRef?.current ?? false;
    const spinAngle = (speed * delta) / WR;
    for (const wg of wheelGroupRefs.current) {
      if (wg) wg.rotation.x -= spinAngle;
    }
    const emissive = braking ? 1.8 : 0.15;
    const col = braking ? 0xff0000 : 0x660000;
    for (const mat of brakeMats.current) {
      if (mat) {
        mat.emissiveIntensity = emissive;
        mat.emissive.setHex(col);
        mat.color.setHex(col);
      }
    }
  });

  return (
    <group>
      {/* Main body */}
      <mesh position={[0, WR + 0.9, 0]} castShadow receiveShadow>
        <boxGeometry args={[2.5, 1.8, 10.5]} />
        <meshStandardMaterial color={color} metalness={0.4} roughness={0.4} />
      </mesh>
      <mesh position={[0, WR + 1.85, 0]} castShadow>
        <boxGeometry args={[2.3, 0.1, 10.3]} />
        <meshStandardMaterial color="#e0e0e0" metalness={0.3} roughness={0.5} />
      </mesh>
      {/* Front windshield */}
      <mesh position={[0, WR + 1.1, 5.28]}>
        <boxGeometry args={[2.2, 1.2, 0.05]} />
        <meshPhysicalMaterial color="#0a0a14" metalness={0.1} roughness={0.05} transmission={0.7} transparent opacity={0.6} />
      </mesh>
      {/* Side windows */}
      {[-3.5, -2, -0.5, 1, 2.5, 4].map((z, i) => (
        [1.28, -1.28].map((x, j) => (
          <mesh key={`${i}-${j}`} position={[x, WR + 1.1, z]}>
            <boxGeometry args={[0.05, 0.7, 1.0]} />
            <meshPhysicalMaterial color="#0a0a14" metalness={0.1} roughness={0.05} transmission={0.6} transparent opacity={0.55} />
          </mesh>
        ))
      ))}
      {/* Headlights */}
      {[0.8, -0.8].map((x, i) => (
        <mesh key={i} position={[x, WR + 0.5, 5.28]}>
          <boxGeometry args={[0.35, 0.2, 0.05]} />
          <meshStandardMaterial color="#fffbe6" emissive="#fffbe6" emissiveIntensity={0.6} toneMapped={false} />
        </mesh>
      ))}
      {/* Brake lights */}
      {[0.7, -0.7].map((x, i) => (
        <mesh key={i} position={[x, WR + 0.7, -5.28]}>
          <boxGeometry args={[0.4, 0.18, 0.05]} />
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
        [1.15, WR, 3.2], [-1.15, WR, 3.2],
        [1.15, WR, -3.2], [-1.15, WR, -3.2],
      ].map((pos, i) => (
        <group
          key={i}
          ref={(el) => { if (el) wheelGroupRefs.current[i] = el; }}
          position={pos as [number, number, number]}
          rotation={[0, 0, Math.PI / 2]}
        >
          <mesh geometry={_wheelGeo} scale={[WR, 0.3, WR]} castShadow material={_tireMat} />
          <mesh geometry={_hubGeo} scale={[WR * 0.4, 0.04, WR * 0.4]} position={[0.16, 0, 0]}>
            <meshStandardMaterial color="#aaa" metalness={0.9} roughness={0.15} />
          </mesh>
        </group>
      ))}
    </group>
  );
}
