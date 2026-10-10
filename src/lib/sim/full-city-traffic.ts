// High-Density Bumper-to-Bumper Traffic & Pedestrian Simulator across 16x16 Grid
import { FullCityData, CityRoadSegment, CityJunction } from "./full-city-generator";
import { PerceptionAgent, TurnIntent } from "./perception";

export interface CityVehicle {
  id: string;
  type: "car" | "bus" | "auto" | "bike";
  label: string;
  roadId: string;
  roadIndex: number;
  progress: number; // 0 to 1 along road segment
  speed: number;
  maxSpeed: number;
  targetSpeed: number;
  laneOffset: number; // Lateral offset from road centerline
  x: number;
  y: number;
  z: number;
  heading: number;
  roll: number;
  stoppedAtRed: boolean;
  isYielding: boolean;
  yieldTimer: number;
  dimensions: [number, number, number];
  color: string;
  isParked?: boolean;
}

export interface CityPedestrian {
  id: string;
  label: string;
  x: number;
  y: number;
  z: number;
  targetX: number;
  targetZ: number;
  speed: number;
  heading: number;
  state: "walking_sidewalk" | "crossing" | "waiting_signal";
  walkTimer: number;
}

export class FullCityTrafficEngine {
  public vehicles: CityVehicle[] = [];
  public pedestrians: CityPedestrian[] = [];
  public cityData: FullCityData;
  private lowQuality: boolean;
  private time: number = 0;

  constructor(cityData: FullCityData, lowQuality = false) {
    this.cityData = cityData;
    this.lowQuality = lowQuality;
    this.initTraffic();
    this.initPedestrians();
  }

  public setLowQuality(lq: boolean) {
    if (this.lowQuality !== lq) {
      this.lowQuality = lq;
      this.initTraffic();
      this.initPedestrians();
    }
  }

  private initTraffic() {
    this.vehicles = [];
    const roads = this.cityData.roads;
    const colors = ["#ffffff", "#f1f5f9", "#e2e8f0", "#cbd5e1", "#94a3b8", "#64748b", "#38bdf8", "#0284c7"];
    const types: CityVehicle["type"][] = ["car", "car", "car", "auto", "bus", "bike", "car", "car"];

    let vehicleIdCounter = 1;

    // Distribute dense traffic queues across every single road in the city
    roads.forEach((road, roadIdx) => {
      // Determine how many cars per road based on quality mode
      const carsOnThisRoad = this.lowQuality ? (roadIdx % 2 === 0 ? 2 : 1) : (road.isMainCorridor ? 5 : 3);
      const laneOffsets = road.laneCount === 4 ? [-4.8, -1.8, 1.8, 4.8] : [-2.6, 2.6];

      for (let c = 0; c < carsOnThisRoad; c++) {
        const laneOffset = laneOffsets[c % laneOffsets.length];
        const isForward = laneOffset > 0;
        const heading = isForward ? road.heading : road.heading + Math.PI;

        // Space cars along the road segment to form realistic queues (bumper to bumper)
        const prog = Math.min(0.95, Math.max(0.05, (c + 0.5) / carsOnThisRoad));
        const vType = types[vehicleIdCounter % types.length];

        let dims: [number, number, number] = [3.8, 1.25, 1.7];
        let maxSpd = 12.5;
        if (vType === "bus") {
          dims = [8.2, 2.7, 2.4];
          maxSpd = 9.0;
        } else if (vType === "auto") {
          dims = [2.6, 1.55, 1.3];
          maxSpd = 10.5;
        } else if (vType === "bike") {
          dims = [1.8, 1.35, 0.7];
          maxSpd = 14.0;
        }

        const vx = road.start[0] + (road.end[0] - road.start[0]) * prog;
        const vz = road.start[1] + (road.end[1] - road.start[1]) * prog;

        const perpAngle = road.heading + Math.PI / 2;
        const posX = vx + Math.cos(perpAngle) * laneOffset;
        const posZ = vz + Math.sin(perpAngle) * laneOffset;

        this.vehicles.push({
          id: `cveh-${vehicleIdCounter}`,
          type: vType,
          label: `CAR ${String(vehicleIdCounter).padStart(2, "0")}`,
          roadId: road.id,
          roadIndex: roadIdx,
          progress: prog,
          speed: maxSpd * 0.75,
          maxSpeed: maxSpd,
          targetSpeed: maxSpd,
          laneOffset,
          x: posX,
          y: dims[1] / 2,
          z: posZ,
          heading,
          roll: 0,
          stoppedAtRed: false,
          isYielding: false,
          yieldTimer: 0,
          dimensions: dims,
          color: colors[vehicleIdCounter % colors.length],
        });

        vehicleIdCounter++;
      }
    });
  }

  private initPedestrians() {
    this.pedestrians = [];
    const count = this.lowQuality ? 45 : 120;
    const junctions = this.cityData.junctions;

    for (let i = 0; i < count; i++) {
      const jn = junctions[i % junctions.length];
      const offsetX = ((i * 13) % 40) - 20;
      const offsetZ = ((i * 17) % 40) - 20;

      this.pedestrians.push({
        id: `cped-${i + 1}`,
        label: `PED ${String(i + 1).padStart(2, "0")}`,
        x: jn.x + offsetX,
        y: 0.4,
        z: jn.z + offsetZ,
        targetX: jn.x + offsetX + (i % 2 === 0 ? 25 : -25),
        targetZ: jn.z + offsetZ + (i % 3 === 0 ? 25 : -25),
        speed: 3.6 + (i % 3) * 0.6,
        heading: 0,
        state: i % 3 === 0 ? "crossing" : "walking_sidewalk",
        walkTimer: (i * 7) % 20,
      });
    }
  }

  // 60Hz Step Routine
  public step(dt: number, zoneCenter: [number, number], zoneRadius: number, ambulancePos?: [number, number]) {
    this.time += dt;

    // 1. Update City Signal Cycles
    this.cityData.junctions.forEach((jn) => {
      jn.cycleTimer = (jn.cycleTimer + dt) % jn.cycleDuration;
      jn.currentPhase = jn.cycleTimer < 14 ? "NS_GREEN" : "EW_GREEN";
    });

    // 2. Step Vehicles
    const roads = this.cityData.roads;
    this.vehicles.forEach((veh) => {
      const road = roads[veh.roadIndex];
      const distToZone = Math.hypot(veh.x - zoneCenter[0], veh.z - zoneCenter[1]);
      const nearZone = distToZone <= zoneRadius + 35;

      // Yielding logic when near emergency ambulance
      if (ambulancePos && nearZone) {
        const distToAmb = Math.hypot(veh.x - ambulancePos[0], veh.z - ambulancePos[1]);
        if (distToAmb < 55) {
          veh.isYielding = true;
          veh.yieldTimer = 3.0;
        }
      }

      if (veh.yieldTimer > 0) {
        veh.yieldTimer -= dt;
        if (veh.yieldTimer <= 0) veh.isYielding = false;
      }

      // Check signal stop near junction
      let signalStop = false;
      if (veh.progress > 0.82) {
        const isForward = veh.laneOffset > 0;
        const checkPoint = isForward ? road.end : road.start;
        const jn = this.cityData.junctions.find(
          (j) => Math.hypot(j.x - checkPoint[0], j.z - checkPoint[1]) < 18
        );
        if (jn) {
          const isEW = road.heading === 0;
          const isRed = (isEW && jn.currentPhase === "NS_GREEN") || (!isEW && jn.currentPhase === "EW_GREEN");
          if (isRed) signalStop = true;
        }
      }

      veh.stoppedAtRed = signalStop;

      // Target speed calculation
      let targetSpd = veh.maxSpeed;
      if (signalStop) {
        targetSpd = 0;
      } else if (veh.isYielding) {
        targetSpd = Math.min(5.0, veh.maxSpeed * 0.35);
      }

      const accel = targetSpd < veh.speed ? -18.0 : 6.5;
      veh.speed = Math.max(0, veh.speed + accel * dt);
      if (targetSpd === 0 && veh.speed < 0.2) veh.speed = 0;

      // Advance along road
      const advanceProg = (veh.speed * dt) / road.length;
      veh.progress += advanceProg;

      if (veh.progress >= 1.0) {
        veh.progress = 0;
      }

      // Compute 3D position
      const curRoad = roads[veh.roadIndex];
      const curProg = veh.progress;

      const px = curRoad.start[0] + (curRoad.end[0] - curRoad.start[0]) * curProg;
      const pz = curRoad.start[1] + (curRoad.end[1] - curRoad.start[1]) * curProg;

      const perpAngle = curRoad.heading + Math.PI / 2;
      const lateralShift = veh.isYielding ? veh.laneOffset + 2.8 : veh.laneOffset;

      veh.x = px + Math.cos(perpAngle) * lateralShift;
      veh.z = pz + Math.sin(perpAngle) * lateralShift;
    });

    // 3. Step Pedestrians
    this.pedestrians.forEach((ped) => {
      ped.walkTimer += dt;
      const dx = ped.targetX - ped.x;
      const dz = ped.targetZ - ped.z;
      const dist = Math.hypot(dx, dz);

      if (dist < 1.5) {
        const tempX = ped.targetX;
        const tempZ = ped.targetZ;
        ped.targetX = ped.x - dx * 2;
        ped.targetZ = ped.z - dz * 2;
      } else {
        const moveDist = (ped.speed / 3.6) * dt;
        ped.x += (dx / dist) * moveDist;
        ped.z += (dz / dist) * moveDist;
        ped.heading = Math.atan2(dz, dx);
      }
    });
  }

  // Extract perception agents for the active zone
  public getPerceptionAgents(zoneCenter: [number, number], zoneRadius: number, ambulancePos: [number, number]): PerceptionAgent[] {
    const list: PerceptionAgent[] = [];

    // 1. Vehicles
    this.vehicles.forEach((veh) => {
      const distToCenter = Math.hypot(veh.x - zoneCenter[0], veh.z - zoneCenter[1]);
      const distToAmb = Math.hypot(veh.x - ambulancePos[0], veh.z - ambulancePos[1]);
      const inZone = distToCenter <= zoneRadius;

      const vx = Math.cos(veh.heading) * veh.speed;
      const vz = Math.sin(veh.heading) * veh.speed;

      let statusBadge: PerceptionAgent["statusBadge"] = "SAFE";
      let headline = "Moving in lane";
      let explanation = `Cruising along arterial at ${Math.round(veh.speed * 2.8)} km/h.`;

      if (veh.isYielding) {
        statusBadge = "WAIT";
        headline = "Yielding to shoulder";
        explanation = `Shifted to shoulder lane. Corridor clearance verified.`;
      } else if (veh.stoppedAtRed) {
        statusBadge = "WAIT";
        headline = "Holding at red signal";
        explanation = `Stopped at junction stop line waiting for green cycle.`;
      }

      list.push({
        id: veh.id,
        type: "car",
        label: veh.label,
        typeLabel: veh.type === "bus" ? "transit bus" : veh.type === "auto" ? "auto rickshaw" : "vehicle",
        position: [veh.x, veh.y, veh.z],
        velocity: [vx, 0, vz],
        speedKmh: Math.round(veh.speed * 2.8),
        heading: veh.heading,
        roll: veh.roll,
        statusBadge,
        headline,
        explanation,
        distToZoneCenter: distToCenter,
        distToAmbulance: distToAmb,
        inZone,
        isYielding: veh.isYielding,
        stoppedAtSignal: veh.stoppedAtRed,
        followingText: "traffic queue",
        followingGapMeters: 10,
        nextJunctionName: "Kochi City Node",
        distToNextJunctionM: Math.round((1.0 - veh.progress) * 70),
        signalCountdown: veh.stoppedAtRed ? "red · green in 6.4 s" : "green · 10.0 s",
        approachName: veh.heading === 0 ? "west approach" : "north approach",
        turnIntent: { straight: 82, left: 12, right: 6, yielding: veh.isYielding ? 80 : 0 },
        dimensions: veh.dimensions,
        collisionRadius: Math.max(veh.dimensions[0], veh.dimensions[2]) / 2,
        hasTtcWarning: false,
        ttcSec: null,
        color: veh.color,
        laneIndex: veh.laneOffset > 0 ? 0 : 1,
      });
    });

    // 2. Pedestrians
    this.pedestrians.forEach((ped) => {
      const distToCenter = Math.hypot(ped.x - zoneCenter[0], ped.z - zoneCenter[1]);
      const distToAmb = Math.hypot(ped.x - ambulancePos[0], ped.z - ambulancePos[1]);
      const inZone = distToCenter <= zoneRadius;

      list.push({
        id: ped.id,
        type: "pedestrian",
        label: ped.label,
        typeLabel: "pedestrian",
        position: [ped.x, ped.y, ped.z],
        velocity: [Math.cos(ped.heading) * (ped.speed / 3.6), 0, Math.sin(ped.heading) * (ped.speed / 3.6)],
        speedKmh: Math.round(ped.speed),
        heading: ped.heading,
        roll: 0,
        statusBadge: ped.state === "crossing" ? "WAIT" : "SAFE",
        headline: ped.state === "crossing" ? "Crossing on walk" : "On the sidewalk",
        explanation: ped.state === "crossing"
          ? "12 m to the far curb, about 7.4 s."
          : `Walking at ${Math.round(ped.speed)} km/h along sidewalk.`,
        distToZoneCenter: distToCenter,
        distToAmbulance: distToAmb,
        inZone,
        isYielding: false,
        stoppedAtSignal: ped.state === "waiting_signal",
        followingText: "none (pedestrian path)",
        followingGapMeters: 8,
        nextJunctionName: "Crosswalk Node",
        distToNextJunctionM: 11,
        signalCountdown: ped.state === "crossing" ? "walk · 8.9 s" : "don't walk · 6.0 s",
        approachName: "crosswalk",
        turnIntent: { straight: 94, left: 3, right: 3, yielding: 0 },
        dimensions: [0.6, 1.8, 0.6],
        collisionRadius: 0.6,
        hasTtcWarning: false,
        ttcSec: null,
        color: "#38bdf8",
      });
    });

    return list;
  }
}
