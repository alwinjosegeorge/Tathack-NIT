// Procedural 16x16 Full City Scene: 300+ Buildings, Arterial Roads, Bridges, Parks, River Canal & Signal Poles
import React, { useMemo } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { FullCityData } from "@/lib/sim/full-city-generator";
import { MultiSensorShader } from "./shaders";

interface FullCitySceneProps {
  cityData: FullCityData;
  zoneCenter: [number, number];
  zoneRadius: number;
  sensorMode: 0 | 1 | 2;
  lowQuality?: boolean;
}

export function FullCityScene({
  cityData,
  zoneCenter,
  zoneRadius,
  sensorMode,
  lowQuality,
}: FullCitySceneProps) {
  // Shared MultiSensorShader materials
  const shaderMaterials = useMemo(() => {
    const createMat = (semanticType: number, clayHex: string, segHex: string) => {
      const uniforms = THREE.UniformsUtils.clone(MultiSensorShader.uniforms);
      uniforms.uSemanticType.value = semanticType;
      uniforms.uClayBaseColor.value = new THREE.Color(clayHex);
      uniforms.uSegmentColor.value = new THREE.Color(segHex);
      uniforms.uZoneRadius.value = zoneRadius;
      uniforms.uSensorMode.value = sensorMode;

      return new THREE.ShaderMaterial({
        uniforms,
        vertexShader: MultiSensorShader.vertexShader,
        fragmentShader: MultiSensorShader.fragmentShader,
        side: THREE.DoubleSide,
      });
    };

    return {
      ground: createMat(0, "#2d5a27", "#09101d"),
      road: createMat(1, "#1e222a", "#1e293b"),
      sidewalk: createMat(2, "#94a3b8", "#334155"),
      building: createMat(3, "#d97706", "#273549"),
      buildingGlass: createMat(3, "#0284c7", "#0284c7"),
      buildingTerracotta: createMat(3, "#c2410c", "#c2410c"),
      buildingSandstone: createMat(3, "#d4a373", "#d4a373"),
      buildingSlate: createMat(3, "#475569", "#475569"),
      park: createMat(0, "#16a34a", "#064e3b"),
      water: createMat(0, "#0284c7", "#0284c7"),
      tree: createMat(7, "#15803d", "#10b981"),
      hospital: createMat(3, "#f8fafc", "#dc2626"),
    };
  }, [zoneRadius, sensorMode]);

  // Update uniforms every frame
  useFrame((state) => {
    const time = state.clock.getElapsedTime();
    Object.values(shaderMaterials).forEach((mat) => {
      mat.uniforms.uZoneCenter.value.set(zoneCenter[0], zoneCenter[1]);
      mat.uniforms.uZoneRadius.value = zoneRadius;
      mat.uniforms.uSensorMode.value = sensorMode;
      mat.uniforms.uTime.value = time;
    });
  });

  return (
    <group>
      {/* 1. Ground Skirt (Huge 1800m square plane fading seamlessly into distance fog) */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.05, 0]} material={shaderMaterials.ground}>
        <planeGeometry args={[1800, 1800]} />
      </mesh>

      {/* 2. River Canal Plane */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[
          (cityData.riverBounds.xMin + cityData.riverBounds.xMax) / 2,
          -0.02,
          0,
        ]}
        material={shaderMaterials.water}
      >
        <planeGeometry
          args={[
            cityData.riverBounds.xMax - cityData.riverBounds.xMin,
            cityData.riverBounds.zMax - cityData.riverBounds.zMin,
          ]}
        />
      </mesh>

      {/* 3. Parks / Green Plazas */}
      {cityData.parks.map((park) => (
        <mesh
          key={park.id}
          rotation={[-Math.PI / 2, 0, 0]}
          position={[park.center[0], 0.01, park.center[1]]}
          material={shaderMaterials.park}
        >
          <planeGeometry args={park.size} />
        </mesh>
      ))}

      {/* 4. Full City Road Network Segments */}
      {cityData.roads.map((road) => {
        const midX = (road.start[0] + road.end[0]) / 2;
        const midZ = (road.start[1] + road.end[1]) / 2;

        return (
          <group key={road.id} position={[midX, 0.02, midZ]} rotation={[0, -road.heading, 0]}>
            {/* Road Asphalt */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} material={shaderMaterials.road}>
              <planeGeometry args={[road.length, road.width]} />
            </mesh>

            {/* Sidewalk Curbs */}
            {!lowQuality && (
              <>
                <mesh position={[0, 0.08, road.width / 2 + 0.7]} material={shaderMaterials.sidewalk}>
                  <boxGeometry args={[road.length, 0.2, 1.4]} />
                </mesh>
                <mesh position={[0, 0.08, -road.width / 2 - 0.7]} material={shaderMaterials.sidewalk}>
                  <boxGeometry args={[road.length, 0.2, 1.4]} />
                </mesh>
              </>
            )}
          </group>
        );
      })}

      {/* 5. City Junction Boxes & Zebra Crossings */}
      {cityData.junctions.map((jn) => (
        <group key={`cjn-${jn.id}`} position={[jn.x, 0.03, jn.z]}>
          <mesh rotation={[-Math.PI / 2, 0, 0]} material={shaderMaterials.road}>
            <planeGeometry args={[16, 16]} />
          </mesh>
          <mesh position={[0, 0.06, 0]} rotation={[-Math.PI / 2, 0, 0]} material={shaderMaterials.sidewalk}>
            <planeGeometry args={[18, 18]} />
          </mesh>
        </group>
      ))}

      {/* 6. Procedural Buildings (Towers, Mid-Rise, Low Blocks, Hospital) */}
      {cityData.buildings.map((b, idx) => {
        let bMat = shaderMaterials.building;
        if (b.type === "hospital") {
          bMat = shaderMaterials.hospital;
        } else if (idx % 4 === 0) {
          bMat = shaderMaterials.buildingGlass;
        } else if (idx % 4 === 1) {
          bMat = shaderMaterials.buildingTerracotta;
        } else if (idx % 4 === 2) {
          bMat = shaderMaterials.buildingSandstone;
        } else {
          bMat = shaderMaterials.buildingSlate;
        }

        return (
          <mesh
            key={b.id}
            position={b.pos}
            material={bMat}
            castShadow={!lowQuality}
            receiveShadow={!lowQuality}
          >
            <boxGeometry args={b.size} />
          </mesh>
        );
      })}

      {/* 7. Lush Tropical Trees */}
      {!lowQuality &&
        cityData.trees.slice(0, 160).map((tPos, i) => (
          <group key={`tree-${i}`} position={tPos}>
            {/* Trunk */}
            <mesh position={[0, 0.5, 0]}>
              <cylinderGeometry args={[0.2, 0.25, 1.2, 6]} />
              <meshStandardMaterial color="#78350f" roughness={0.9} />
            </mesh>
            {/* Foliage */}
            <mesh position={[0, 1.8, 0]} material={shaderMaterials.tree}>
              <sphereGeometry args={[1.5, 8, 8]} />
            </mesh>
          </group>
        ))}

      {/* 8. Aster Medcity Helipad at Destination */}
      <group position={[230, 36.1, 60]}>
        <mesh rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[8, 24]} />
          <meshBasicMaterial color="#ef4444" />
        </mesh>
      </group>
    </group>
  );
}
