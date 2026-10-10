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

      // --- 1. CLAY SHADING (Outside Zone) ---
      float NdotL = max(0.25, dot(vNormal, uLightDir));
      float topLight = max(0.0, vNormal.y) * 0.25;
      vec3 clayColor = uClayBaseColor * (NdotL * 0.7 + topLight + 0.35);

      if (uSemanticType == 0) {
        clayColor = vec3(0.91, 0.90, 0.88); // Pale ground
      } else if (uSemanticType == 1) {
        clayColor = vec3(0.83, 0.82, 0.80); // Road asphalt
      } else if (uSemanticType == 2) {
        clayColor = vec3(0.88, 0.87, 0.85); // Sidewalk
      } else if (uSemanticType == 3) {
        clayColor = vec3(0.98, 0.97, 0.96) * (NdotL * 0.6 + 0.4); // White clay buildings
      } else if (uSemanticType == 4) {
        // Clay Traffic Cars: Clean crisp off-white/light-grey vehicles
        float carLight = NdotL * 0.7 + 0.35;
        clayColor = vec3(0.96, 0.95, 0.94) * carLight;
      } else if (uSemanticType == 5) {
        clayColor = vec3(0.98, 0.96, 0.95); // Emergency Ambulance
      } else if (uSemanticType == 6) {
        clayColor = vec3(0.85, 0.85, 0.85); // Pedestrian
      } else if (uSemanticType == 7) {
        clayColor = vec3(0.86, 0.90, 0.87); // Tree
      }

      // --- 2. INSIDE VISION ZONE (Sensor Views) ---
      vec3 sensorColor = vec3(0.0);

      if (uSensorMode == 0) {
        // --- 1. LIDAR VIEW (Matches Reference Screenshot) ---
        // Dark navy / black base
        vec3 lidarBase = vec3(0.02, 0.04, 0.08);

        // Multi-color concentric scan rings radiating outward
        float waveDist = distToCenter * 0.5 - uTime * 4.5;
        float scanWave1 = sin(waveDist);
        float scanWave2 = sin(waveDist + 2.094);
        float scanWave3 = sin(waveDist + 4.188);

        float ring1 = smoothstep(0.85, 0.98, scanWave1) * 0.9; // Cyan
        float ring2 = smoothstep(0.85, 0.98, scanWave2) * 0.85; // Purple
        float ring3 = smoothstep(0.85, 0.98, scanWave3) * 0.75; // Amber

        vec3 ringColor = vec3(0.0, 0.9, 1.0) * ring1 + vec3(0.8, 0.2, 0.9) * ring2 + vec3(1.0, 0.5, 0.1) * ring3;

        // Structural dot grid on ground & roads
        vec2 uvGrid = fract(vWorldPosition.xz * 0.5);
        float dotGrid = (step(0.92, uvGrid.x) * step(0.92, uvGrid.y)) * 0.4;

        sensorColor = lidarBase + ringColor * 0.8 + vec3(0.0, 0.8, 0.9) * dotGrid;

        if (uSemanticType == 1) {
          // Road: Dark asphalt with glowing cyan/green lane divider dots
          sensorColor += vec3(0.02, 0.25, 0.35) * 0.5;
        } else if (uSemanticType == 3) {
          // Building Facades: Golden / Orange vertical scan stripes (as seen in screenshot)
          float vertStripe = mod(vWorldPosition.x * 2.0 + vWorldPosition.z * 2.0, 1.0);
          float stripeGlow = step(0.55, vertStripe);
          float heightFactor = clamp(vWorldPosition.y / 35.0, 0.0, 1.0);
          
          vec3 amberWall = vec3(1.0, 0.55, 0.1) * (stripeGlow * 0.8 + 0.2);
          vec3 navyWall = vec3(0.02, 0.06, 0.12);
          sensorColor = mix(navyWall, amberWall, heightFactor * 0.7 + 0.3);

        } else if (uSemanticType == 4) {
          // Vehicles: Dense glowing cyan/green point cloud pattern on roof & body
          vec2 carDot = fract(vWorldPosition.xz * 3.0);
          float isDot = (step(0.7, carDot.x) * step(0.7, carDot.y));
          vec3 pointCloudGreen = vec3(0.2, 0.95, 0.6);
          vec3 wireframeCyan = vec3(0.0, 0.85, 1.0);
          sensorColor = vec3(0.03, 0.08, 0.15) + pointCloudGreen * (isDot * 0.9 + 0.2) + wireframeCyan * 0.4;

        } else if (uSemanticType == 5) {
          // Emergency Ambulance: Bright Electric Orange with cyan beacons
          sensorColor = vec3(1.0, 0.4, 0.05) * 0.9 + vec3(0.0, 0.8, 1.0) * 0.3;

        } else if (uSemanticType == 6) {
          // Pedestrians: Glowing Pink / Magenta wireframe figures
          vec2 pedDot = fract(vWorldPosition.xz * 4.0);
          float isPedDot = step(0.6, pedDot.x) * step(0.6, pedDot.y);
          sensorColor = vec3(1.0, 0.2, 0.6) * (isPedDot * 0.8 + 0.4);

        } else if (uSemanticType == 7) {
          // Trees: Yellow-Green dotted canopy
          vec2 treeDot = fract(vWorldPosition.xz * 2.0);
          float isTreeDot = step(0.65, treeDot.x) * step(0.65, treeDot.y);
          sensorColor = vec3(0.6, 0.95, 0.1) * (isTreeDot * 0.8 + 0.3);
        }

      } else if (uSensorMode == 1) {
        // --- 2. SEMANTIC SEGMENTS VIEW ---
        vec3 segBase = uSegmentColor;

        if (uSemanticType == 0) segBase = vec3(0.08, 0.12, 0.18); // Ground
        else if (uSemanticType == 1) segBase = vec3(0.14, 0.18, 0.26); // Road
        else if (uSemanticType == 2) segBase = vec3(0.25, 0.32, 0.42); // Sidewalk
        else if (uSemanticType == 3) {
          float floorBand = mod(vWorldPosition.y, 3.2) < 0.35 ? 0.85 : 1.0;
          segBase = vec3(0.20, 0.26, 0.38) * floorBand;
        } else if (uSemanticType == 4) {
          segBase = vec3(0.05, 0.65, 0.95); // Traffic Cars
        } else if (uSemanticType == 5) {
          segBase = vec3(0.95, 0.35, 0.05); // Emergency Ambulance
        } else if (uSemanticType == 6) {
          segBase = vec3(0.9, 0.2, 0.6); // Pedestrian
        } else if (uSemanticType == 7) {
          segBase = vec3(0.1, 0.8, 0.4); // Tree
        }

        sensorColor = segBase * (NdotL * 0.45 + 0.65);

      } else {
        // --- 3. DEPTH CONTOUR GRADIENT VIEW ---
        float depthVal = clamp(vCameraDistance / 260.0, 0.0, 1.0);
        float heightVal = clamp(vWorldPosition.y / 45.0, 0.0, 1.0);

        vec3 deepTeal = vec3(0.01, 0.12, 0.18);
        vec3 midCyan = vec3(0.04, 0.55, 0.62);
        vec3 brightTeal = vec3(0.35, 0.95, 0.85);

        vec3 depthGradient = mix(deepTeal, midCyan, 1.0 - depthVal);
        depthGradient = mix(depthGradient, brightTeal, heightVal * 0.65);

        float contourDist = distToCenter * 0.4 - uTime * 0.5;
        float contourWave = sin(vWorldPosition.y * 3.0 + contourDist * 3.14159);
        float contourLine = smoothstep(0.82, 0.96, contourWave) * 0.75;

        sensorColor = depthGradient + vec3(contourLine * 0.4, contourLine * 0.85, contourLine);
      }

      // --- 3. PIXELATED / VOXELATED BAYER DISSOLVE BORDER ---
      float dither = bayerDither(vWorldPosition.xz);
      float edgeRange = 9.0;
      float transition = clamp((distToCenter - (uZoneRadius - edgeRange)) / edgeRange, 0.0, 1.0);
      
      float mask = step(transition, dither);

      float borderDist = abs(distToCenter - uZoneRadius);
      vec3 borderGlowColor = uSensorMode == 0 ? vec3(0.0, 0.9, 1.0) : (uSensorMode == 1 ? vec3(0.9, 0.4, 0.1) : vec3(0.2, 0.95, 0.8));
      float borderGlow = smoothstep(3.5, 0.0, borderDist) * 0.45;

      vec3 finalColor = mix(clayColor, sensorColor, mask);
      if (mask > 0.5) {
        finalColor += borderGlowColor * borderGlow;
      }

      gl_FragColor = vec4(finalColor, 1.0);
    }
  `,
};
