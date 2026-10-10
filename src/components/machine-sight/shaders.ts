// Custom GLSL Shaders for Machine Sight: Clay City, Multi-Tone LIDAR Scan, Semantic Segments & Depth
import * as THREE from "three";

export const MultiSensorShader = {
  uniforms: {
    uZoneCenter: { value: new THREE.Vector2(0, 0) },
    uZoneRadius: { value: 65.0 },
    uSensorMode: { value: 0 }, // 0: LIDAR, 1: SEGMENTS, 2: DEPTH
    uTime: { value: 0.0 },
    uSemanticType: { value: 0 }, // 0: Ground, 1: Road, 2: Sidewalk, 3: Building, 4: Car, 5: Ambulance, 6: Pedestrian, 7: Tree
    uClayBaseColor: { value: new THREE.Color("#eceae6") },
    uSegmentColor: { value: new THREE.Color("#334155") },
    uLightDir: { value: new THREE.Vector3(0.4, 0.9, 0.35).normalize() },
  },

  vertexShader: `
    varying vec3 vWorldPosition;
    varying vec3 vNormal;
    varying vec2 vUv;
    varying float vCameraDistance;

    void main() {
      vUv = uv;
      vNormal = normalize(normalMatrix * normal);
      vec4 worldPos = modelMatrix * vec4(position, 1.0);
      vWorldPosition = worldPos.xyz;
      vec4 viewPos = viewMatrix * worldPos;
      vCameraDistance = -viewPos.z;
      gl_Position = projectionMatrix * viewPos;
    }
  `,

  fragmentShader: `
    uniform vec2 uZoneCenter;
    uniform float uZoneRadius;
    uniform int uSensorMode; // 0: LIDAR, 1: SEGMENTS, 2: DEPTH
    uniform float uTime;
    uniform int uSemanticType;
    uniform vec3 uClayBaseColor;
    uniform vec3 uSegmentColor;
    uniform vec3 uLightDir;

    varying vec3 vWorldPosition;
    varying vec3 vNormal;
    varying vec2 vUv;
    varying float vCameraDistance;

    // 4x4 Bayer Matrix for authentic pixelated / voxelated dithered square boundary
    float bayerDither(vec2 pos) {
      vec2 gridPos = floor(pos / 2.0);
      float x = mod(gridPos.x, 4.0);
      float y = mod(gridPos.y, 4.0);
      
      float m = 0.0;
      if (y == 0.0) {
        if (x == 0.0) m = 0.0; else if (x == 1.0) m = 8.0; else if (x == 2.0) m = 2.0; else m = 10.0;
      } else if (y == 1.0) {
        if (x == 0.0) m = 12.0; else if (x == 1.0) m = 4.0; else if (x == 2.0) m = 14.0; else m = 6.0;
      } else if (y == 2.0) {
        if (x == 0.0) m = 3.0; else if (x == 1.0) m = 11.0; else if (x == 2.0) m = 1.0; else m = 9.0;
      } else {
        if (x == 0.0) m = 15.0; else if (x == 1.0) m = 7.0; else if (x == 2.0) m = 13.0; else m = 5.0;
      }
      return m / 16.0;
    }

    void main() {
      // Distance from AI Vision Zone Center
      float distToCenter = length(vWorldPosition.xz - uZoneCenter);

      // --- 1. VIBRANT COLORFUL CITY SHADING ---
      float NdotL = max(0.28, dot(vNormal, uLightDir));
      float topLight = max(0.0, vNormal.y) * 0.22;
      vec3 surfaceColor = uClayBaseColor * (NdotL * 0.75 + topLight + 0.3);

      if (uSemanticType == 0) {
        // Natural Grassy Terrain / Parkland Ground
        vec3 grassGreen = vec3(0.22, 0.42, 0.18);
        surfaceColor = grassGreen * (NdotL * 0.7 + topLight + 0.35);
      } else if (uSemanticType == 1) {
        // Dark Asphalt Road
        vec3 asphalt = vec3(0.16, 0.17, 0.20);
        surfaceColor = asphalt * (NdotL * 0.6 + 0.4);
      } else if (uSemanticType == 2) {
        // Clean Stone Sidewalks & Curbs
        vec3 sidewalk = vec3(0.68, 0.70, 0.72);
        surfaceColor = sidewalk * (NdotL * 0.7 + 0.35);
      } else if (uSemanticType == 3) {
        // Colorful Architectural Buildings with Illuminated Windows
        float winY = mod(vWorldPosition.y, 3.2);
        float isWinBand = step(1.0, winY) * step(winY, 2.4);
        float winX = mod(vWorldPosition.x * 0.8 + vWorldPosition.z * 0.8, 2.2);
        float isWin = isWinBand * step(0.6, winX);
        vec3 winGlow = vec3(0.95, 0.90, 0.75) * 0.45;

        surfaceColor = uClayBaseColor * (NdotL * 0.7 + 0.35);
        if (vNormal.y < 0.2) {
          surfaceColor = mix(surfaceColor, winGlow, isWin * 0.6);
        }
      } else if (uSemanticType == 4) {
        // Colorful Traffic Cars
        surfaceColor = uClayBaseColor * (NdotL * 0.75 + 0.35);
      } else if (uSemanticType == 5) {
        // Emergency Ambulance: High-viz white + red emergency livery
        surfaceColor = vec3(0.98, 0.98, 0.98) * (NdotL * 0.75 + 0.35);
      } else if (uSemanticType == 6) {
        // Pedestrians
        surfaceColor = vec3(0.25, 0.45, 0.85) * (NdotL * 0.75 + 0.35);
      } else if (uSemanticType == 7) {
        // Lush Kerala Trees
        vec3 leafGreen = vec3(0.12, 0.52, 0.20);
        surfaceColor = leafGreen * (NdotL * 0.8 + topLight + 0.3);
      }

      // Output vibrant colorful city directly (no mouse blueprint overlay)
      gl_FragColor = vec4(surfaceColor, 1.0);
    }
  `,
};
