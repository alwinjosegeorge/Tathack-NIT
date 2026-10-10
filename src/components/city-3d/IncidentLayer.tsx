import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { IncidentMarker, RecurrenceAlert } from '@/lib/city-sim/types';
import { statusColor, statusLabel } from '@/lib/city-sim/civicApi';

interface IncidentLayerProps {
  incidents: IncidentMarker[];
  recurrences: RecurrenceAlert[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

/** Pulsing ring for recurrence/active incidents */
function PulseRing({
  color,
  active,
}: {
  color: string;
  active: boolean;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const matRef = useRef<THREE.MeshStandardMaterial>(null);
  const tRef = useRef(0);

  useFrame((_, delta) => {
    if (!active) return;
    tRef.current += delta * 1.5;
    const s = 1 + Math.sin(tRef.current) * 0.35;
    if (meshRef.current) {
      meshRef.current.scale.set(s, 1, s);
    }
    if (matRef.current) {
      matRef.current.opacity = 0.5 - Math.sin(tRef.current) * 0.35;
    }
  });

  return (
    <mesh ref={meshRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.05, 0]}>
      <ringGeometry args={[1.2, 2.2, 24]} />
      <meshStandardMaterial
        ref={matRef}
        color={color}
        transparent
        opacity={0.4}
        side={THREE.DoubleSide}
        depthWrite={false}
      />
    </mesh>
  );
}

/** A single incident pin */
function IncidentPin({
  incident,
  selected,
  onSelect,
}: {
  incident: IncidentMarker;
  selected: boolean;
  onSelect: () => void;
}) {
  const color = statusColor(incident.status);
  const groupRef = useRef<THREE.Group>(null);
  const bobRef = useRef(0);

  useFrame((_, delta) => {
    bobRef.current += delta;
    if (groupRef.current) {
      groupRef.current.position.y = incident.position[1] + Math.sin(bobRef.current * 1.2) * 0.3;
    }
  });

  const isActive = incident.status === 'active' || incident.status === 'recurrence_detected';

  return (
    <group position={[incident.position[0], incident.position[1], incident.position[2]]}>
      {/* Pulse ring for active/recurrence */}
      {isActive && <PulseRing color={color} active={isActive} />}

      {/* Pin group with bobbing */}
      <group ref={groupRef} onClick={onSelect}>
        {/* Stem */}
        <mesh position={[0, -1.2, 0]} castShadow>
          <cylinderGeometry args={[0.08, 0.12, 2.4, 8]} />
          <meshStandardMaterial color={color} metalness={0.4} roughness={0.5} />
        </mesh>

        {/* Head sphere */}
        <mesh position={[0, 0, 0]} castShadow>
          <sphereGeometry args={[0.55, 16, 12]} />
          <meshStandardMaterial
            color={color}
            emissive={color}
            emissiveIntensity={selected ? 0.8 : 0.3}
            metalness={0.3}
            roughness={0.4}
            toneMapped={false}
          />
        </mesh>

        {/* Point light glow */}
        <pointLight color={color} intensity={selected ? 12 : 5} distance={12} decay={2} position={[0, 0, 0]} />

        {/* Selection ring */}
        {selected && (
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -2.5, 0]}>
            <ringGeometry args={[1.8, 2.2, 24]} />
            <meshStandardMaterial color="#ffffff" transparent opacity={0.7} side={THREE.DoubleSide} depthWrite={false} />
          </mesh>
        )}

        {/* 3D Beacon marker */}
        <mesh position={[0, 0.75, 0]} rotation={[Math.PI / 4, Math.PI / 4, 0]}>
          <octahedronGeometry args={[0.3, 0]} />
          <meshStandardMaterial
            color={color}
            emissive={color}
            emissiveIntensity={selected ? 1.6 : 0.7}
            metalness={0.3}
            roughness={0.3}
            toneMapped={false}
          />
        </mesh>
      </group>

      {/* Ground shadow circle */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
        <circleGeometry args={[0.8, 16]} />
        <meshStandardMaterial color={color} transparent opacity={0.2} depthWrite={false} />
      </mesh>
    </group>
  );
}

/** Recurrence alert visual — overlapping orange rings */
function RecurrenceMarker({ alert }: { alert: RecurrenceAlert }) {
  const tRef = useRef(0);
  const ring1 = useRef<THREE.Mesh>(null);
  const ring2 = useRef<THREE.Mesh>(null);

  useFrame((_, delta) => {
    tRef.current += delta;
    const s1 = 1 + (tRef.current % 2) * 0.8;
    const s2 = 1 + ((tRef.current + 1) % 2) * 0.8;
    const a1 = Math.max(0, 1 - (tRef.current % 2) * 0.5);
    const a2 = Math.max(0, 1 - ((tRef.current + 1) % 2) * 0.5);

    if (ring1.current) {
      ring1.current.scale.set(s1, 1, s1);
      (ring1.current.material as THREE.MeshStandardMaterial).opacity = a1 * 0.5;
    }
    if (ring2.current) {
      ring2.current.scale.set(s2, 1, s2);
      (ring2.current.material as THREE.MeshStandardMaterial).opacity = a2 * 0.5;
    }
  });

  return (
    <group position={[alert.position[0], 0.1, alert.position[2]]}>
      <mesh ref={ring1} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[2.5, 4, 24]} />
        <meshStandardMaterial color="#f97316" transparent opacity={0.4} side={THREE.DoubleSide} depthWrite={false} />
      </mesh>
      <mesh ref={ring2} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[2.5, 4, 24]} />
        <meshStandardMaterial color="#f97316" transparent opacity={0.4} side={THREE.DoubleSide} depthWrite={false} />
      </mesh>
    </group>
  );
}

/** Connection lines between related incidents */
function RelationLine({
  from,
  to,
}: {
  from: [number, number, number];
  to: [number, number, number];
}) {
  const lineObj = useMemo(() => {
    const points = [
      new THREE.Vector3(from[0], from[1] + 0.5, from[2]),
      new THREE.Vector3(to[0], to[1] + 0.5, to[2]),
    ];
    const geo = new THREE.BufferGeometry().setFromPoints(points);
    const mat = new THREE.LineBasicMaterial({ color: '#f59e0b', transparent: true, opacity: 0.5 });
    return new THREE.Line(geo, mat);
  }, [from, to]);

  return <primitive object={lineObj} />;
}

export function IncidentLayer({
  incidents,
  recurrences,
  selectedId,
  onSelect,
}: IncidentLayerProps) {
  // Build a position lookup map
  const posMap = new Map<string, [number, number, number]>();
  for (const inc of incidents) {
    posMap.set(inc.id, inc.position);
  }

  // Deduplicate relation lines (only draw each pair once)
  const drawnPairs = new Set<string>();
  const lines: { from: [number, number, number]; to: [number, number, number] }[] = [];
  const selectedInc = incidents.find(i => i.id === selectedId);

  if (selectedInc) {
    for (const relId of selectedInc.relatedIds) {
      const relPos = posMap.get(relId);
      if (relPos) {
        const key = [selectedInc.id, relId].sort().join('|');
        if (!drawnPairs.has(key)) {
          drawnPairs.add(key);
          lines.push({ from: selectedInc.position, to: relPos });
        }
      }
    }
  }

  return (
    <group>
      {/* Recurrence rings (underneath pins) */}
      {recurrences.map(r => (
        <RecurrenceMarker key={r.segmentId} alert={r} />
      ))}

      {/* Relation lines for selected incident */}
      {lines.map((l, i) => (
        <RelationLine key={i} from={l.from} to={l.to} />
      ))}

      {/* Incident pins */}
      {incidents.map(inc => (
        <IncidentPin
          key={inc.id}
          incident={inc}
          selected={inc.id === selectedId}
          onSelect={() => onSelect(inc.id)}
        />
      ))}
    </group>
  );
}
