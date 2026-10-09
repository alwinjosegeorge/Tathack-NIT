// Custom GLSL Shaders for Machine Sight: Clay City, LIDAR, Semantic Segments, Teal Depth & Dissolve
import * as THREE from "three";

export const MultiSensorShader = {
  uniforms: {
    uZoneCenter: { value: new THREE.Vector2(0, 0) },
    uZoneRadius: { value: 60.0 },
    uSensorMode: { value: 0 }, // 0: LIDAR, 1: SEGMENTS, 2: DEPTH
    uTime: { value: 0.0 },
    uSemanticType: { value: 0 }, // 0: Ground, 1: Road, 2: Sidewalk, 3: Building, 4: Car, 5: Ambulance, 6: Signal
    uClayBaseColor: { value: new THREE.Color("#e5e7eb") },
    uSegmentColor: { value: new THREE.Color("#334155") },
    uLightDir: { value: new THREE.Vector3(0.5, 0.8, 0.3).normalize() },
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

    // Pseudo-random screen dither
    float ditherGrid(vec2 pos) {
      vec2 grid = floor(pos * 1.5);
      return mod(grid.x + grid.y, 2.0);
    }

    void main() {
      // Distance from AI Vision Zone Center
      float distToCenter = length(vWorldPosition.xz - uZoneCenter);

      // Clay Shading outside zone
      float NdotL = max(0.2, dot(vNormal, uLightDir));
      float topLight = max(0.0, vNormal.y) * 0.25;
      vec3 clayColor = uClayBaseColor * (NdotL * 0.75 + topLight + 0.35);

      // Soft ambient contact shadow simulation on clay ground
      if (uSemanticType == 0) {
        clayColor = vec3(0.92, 0.93, 0.94);
      } else if (uSemanticType == 1) {
        clayColor = vec3(0.82, 0.83, 0.86);
      } else if (uSemanticType == 2) {
        clayColor = vec3(0.88, 0.89, 0.91);
      }

      // Inside Vision Zone: Compute Sensor View Color
      vec3 sensorColor = vec3(0.0);

      if (uSensorMode == 0) {
        // --- 1. LIDAR VIEW ---
        // Dark navy base
        vec3 lidarBase = vec3(0.02, 0.04, 0.09);

        // Concentric scan rings radiating outward
        float ringDist = distToCenter;
        float scanWave = sin(ringDist * 0.6 - uTime * 6.0);
        float ringIntensity = smoothstep(0.7, 0.98, scanWave) * 0.85;

        // Subtle wireframe / grid on surfaces
        vec2 uvGrid = fract(vWorldPosition.xz * 0.5);
        float gridLine = (step(0.95, uvGrid.x) + step(0.95, uvGrid.y)) * 0.25;

        // Semantic edge highlight
        vec3 lidarEdge = vec3(0.0, 0.85, 1.0);
        if (uSemanticType == 4) lidarEdge = vec3(0.2, 0.9, 0.6); // Traffic
        if (uSemanticType == 5) lidarEdge = vec3(1.0, 0.35, 0.1); // Emergency
        if (uSemanticType == 6) lidarEdge = vec3(1.0, 0.9, 0.0); // Signals

        sensorColor = lidarBase + lidarEdge * (ringIntensity * 0.8 + gridLine + 0.1);

        // Building height gradient
        if (uSemanticType == 3) {
          float heightFactor = clamp(vWorldPosition.y / 40.0, 0.0, 1.0);
          sensorColor += mix(vec3(0.01, 0.03, 0.08), vec3(0.05, 0.3, 0.5), heightFactor);
        }

      } else if (uSensorMode == 1) {
        // --- 2. SEMANTIC SEGMENTS VIEW ---
        vec3 segBase = uSegmentColor;

        if (uSemanticType == 0) segBase = vec3(0.08, 0.12, 0.18); // Ground
        else if (uSemanticType == 1) segBase = vec3(0.12, 0.16, 0.23); // Road
        else if (uSemanticType == 2) segBase = vec3(0.24, 0.30, 0.38); // Sidewalk
        else if (uSemanticType == 3) {
          // Buildings: deep indigo with subtle floor banding
          float floorBand = mod(vWorldPosition.y, 3.5) < 0.4 ? 0.85 : 1.0;
          segBase = vec3(0.18, 0.22, 0.32) * floorBand;
        } else if (uSemanticType == 4) {
          segBase = vec3(0.05, 0.65, 0.95); // Traffic Cars
        } else if (uSemanticType == 5) {
          segBase = vec3(0.95, 0.35, 0.05); // Emergency Ambulance
        } else if (uSemanticType == 6) {
          segBase = vec3(0.1, 0.9, 0.4); // Signal
        }

        // Soft direct shading on segments
        sensorColor = segBase * (NdotL * 0.4 + 0.7);

      } else {
        // --- 3. DEPTH CONTOUR GRADIENT VIEW ---
        // Teal / Cyan contour gradient based on world distance & height
        float depthVal = clamp(vCameraDistance / 250.0, 0.0, 1.0);
        float heightVal = clamp(vWorldPosition.y / 50.0, 0.0, 1.0);

        // Vibrant teal to dark ocean depth gradient
        vec3 deepTeal = vec3(0.02, 0.15, 0.2);
        vec3 midCyan = vec3(0.05, 0.65, 0.68);
        vec3 brightTeal = vec3(0.4, 0.95, 0.85);

        vec3 depthGradient = mix(deepTeal, midCyan, 1.0 - depthVal);
        depthGradient = mix(depthGradient, brightTeal, heightVal * 0.7);

        // Animated / static contour lines
        float contour = sin(vWorldPosition.y * 2.5 + distToCenter * 0.2);
        float contourLine = smoothstep(0.85, 0.95, contour) * 0.6;

        sensorColor = depthGradient + vec3(contourLine);
      }

      // Zone Boundary Dissolve & Pulsing Ring
      float edgeDist = abs(distToCenter - uZoneRadius);
      float pulseWave = sin(uTime * 4.0) * 0.5 + 0.5;

      // Glowing border ring
      vec3 borderRingColor = uSensorMode == 0 ? vec3(0.0, 0.9, 1.0) : (uSensorMode == 1 ? vec3(0.9, 0.4, 0.1) : vec3(0.2, 0.95, 0.8));
      float ringGlow = smoothstep(2.5, 0.0, edgeDist) * (0.8 + pulseWave * 0.4);

      // Pixelated / Dithered dissolve transition at boundary
      float dither = ditherGrid(vWorldPosition.xz);
      float transition = smoothstep(uZoneRadius - 3.0, uZoneRadius + 3.0, distToCenter);
      float ditheredMask = step(dither * 0.6 + 0.2, 1.0 - transition);

      // Blend Clay vs Sensor
      vec3 finalColor = mix(clayColor, sensorColor, ditheredMask);

      // Add border glowing ring
      finalColor += borderRingColor * ringGlow;

      gl_FragColor = vec4(finalColor, 1.0);
    }
  `,
};
