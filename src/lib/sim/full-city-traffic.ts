// High-Performance 60FPS Full-City Traffic & Pedestrian Simulator across 16x16 Grid
import { FullCityData, CityRoadSegment, CityJunction } from "./full-city-generator";
import { PerceptionAgent, TurnIntent } from "./perception";
import { sharedCorridorSpline } from "./spline-path";

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
    const targetCount = this.lowQuality ? 120 : 280;
    const roads = this.cityData.roads;

    const colors = ["#f8fafc", "#e2e8f0", "#cbd5e1", "#94a3b8", "#64748b", "#38bdf8", "#0284c7"];
    const types: CityVehicle["type"][] = ["car", "car", "car", "auto", "bus", "bike"];

    for (let i = 0; i < targetCount; i++) {
      const roadIdx = i % roads.length;
      const road = roads[roadIdx];
      const prog = (i * 0.37 + 0.1) % 1.0;
      const vType = types[i % types.length];

      // Lane offsets (-3.5, 3.5 for 2-lane, -5.5, -2.0, 2.0, 5.5 for 4-lane)
      const isEastOrSouth = i % 2 === 0;
      const laneOffset = isEastOrSouth ? (road.laneCount === 4 ? 2.5 : 2.5) : (road.laneCount === 4 ? -2.5 : -2.5);

      const vx = road.start[0] + (road.end[0] - road.start[0]) * prog;
      const vz = road.start[1] + (road.end[1] - road.start[1]) * prog;
      const heading = isEastOrSouth ? road.heading : road.heading + Math.PI;

      let dims: [number, number, number] = [3.8, 1.3, 1.7];
      let maxSpd = 12.0;
      if (vType === "bus") {
        dims = [8.5, 2.8, 2.4];
        maxSpd = 9.0;
      } else if (vType === "auto") {
        dims = [2.6, 1.6, 1.3];
        maxSpd = 10.5;
      } else if (vType === "bike") {
        dims = [1.8, 1.4, 0.7];
        maxSpd = 14.0;
      }

      this.vehicles.push({
        id: `cveh-${i}`,
        type: vType,
        label: `${vType.toUpperCase()} ${String(i + 1).padStart(2, "0")}`,
        roadId: road.id,
        roadIndex: roadIdx,
        progress: prog,
        speed: maxSpd * 0.8,
        maxSpeed: maxSpd,
        targetSpeed: maxSpd,
        laneOffset,
        x: vx,
        y: dims[1] / 2,
        z: vz,
        heading,
        roll: 0,
        stoppedAtRed: false,
        isYielding: false,
        yieldTimer: 0,
        dimensions: dims,
        color: colors[i % colors.length],
      });
    }
  }

  private initPedestrians() {
    this.pedestrians = [];
    const count = this.lowQuality ? 40 : 110;
    const junctions = this.cityData.junctions;

    for (let i = 0; i < count; i++) {
      const jn = junctions[i % junctions.length];
      const offsetX = ((i * 13) % 40) - 20;
      const offsetZ = ((i * 17) % 40) - 20;

      this.pedestrians.push({
        id: `cped-${i}`,
        label: `PED ${String(i + 1).padStart(2, "0")}`,
        x: jn.x + offsetX,
        y: 0.4,
        z: jn.z + offsetZ,
        targetX: jn.x + offsetX + (i % 2 === 0 ? 30 : -30),
        targetZ: jn.z + offsetZ + (i % 3 === 0 ? 30 : -30),
        speed: 3.5 + (i % 3) * 0.5, // km/h
        heading: 0,
        state: i % 4 === 0 ? "crossing" : "walking_sidewalk",
        walkTimer: (i * 7) % 20,
      });
    }
  }

  // 60Hz Step Routine for all city agents
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

      // Yielding logic near ambulance
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

      // Check signal stop near junction (at end of road)
      let signalStop = false;
      if (veh.progress > 0.88) {
        // Approaching junction
        const jn = this.cityData.junctions.find(
          (j) => Math.hypot(j.x - road.end[0], j.z - road.end[1]) < 18
        );
        if (jn) {
          const isEW = road.heading === 0;
          const isRed = (isEW && jn.currentPhase === "NS_GREEN") || (!isEW && jn.currentPhase === "EW_GREEN");
          if (isRed) signalStop = true;
        }
      }

      veh.stoppedAtRed = signalStop;

      // Speed control
      let targetSpd = veh.maxSpeed;
      if (signalStop) {
        targetSpd = 0;
      } else if (veh.isYielding) {
        targetSpd = Math.min(6.0, veh.maxSpeed * 0.4);
      }

      const accel = targetSpd < veh.speed ? -18.0 : 6.0;
      veh.speed = Math.max(0, veh.speed + accel * dt);
      if (targetSpd === 0 && veh.speed < 0.2) veh.speed = 0;

      // Advance along road
      const advanceProg = (veh.speed * dt) / road.length;
      veh.progress += advanceProg;

      if (veh.progress >= 1.0) {
        veh.progress = 0;
        // Optionally switch to adjacent road or wrap
        veh.roadIndex = (veh.roadIndex + 1) % roads.length;
      }

      // Compute 3D position
      const curRoad = roads[veh.roadIndex];
      const curProg = veh.progress;

      const px = curRoad.start[0] + (curRoad.end[0] - curRoad.start[0]) * curProg;
      const pz = curRoad.start[1] + (curRoad.end[1] - curRoad.start[1]) * curProg;

      // Lateral shift for shoulder yielding
      const perpAngle = curRoad.heading + Math.PI / 2;
      const lateralShift = veh.isYielding ? veh.laneOffset + 3.2 : veh.laneOffset;

      veh.x = px + Math.cos(perpAngle) * lateralShift;
      veh.z = pz + Math.sin(perpAngle) * lateralShift;
      veh.heading = curRoad.heading;
    });

    // 3. Step Pedestrians
    this.pedestrians.forEach((ped) => {
      ped.walkTimer += dt;
      const dx = ped.targetX - ped.x;
      const dz = ped.targetZ - ped.z;
      const dist = Math.hypot(dx, dz);

      if (dist < 1.5) {
        // Swap target
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

  // Extract candidate perception agents for inspection & zone tagging
  public getPerceptionAgents(zoneCenter: [number, number], zoneRadius: number, ambulancePos: [number, number]): PerceptionAgent[] {
    const list: PerceptionAgent[] = [];

    // 1. Vehicles in or near zone
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
        explanation = `Shifted to shoulder lane. Clear of corridor center.`;
      } else if (veh.stoppedAtRed) {
        statusBadge = "WAIT";
        headline = "Holding at red signal";
        explanation = `Stopped at junction line waiting for green cycle.`;
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
        followingText: "free flow",
        followingGapMeters: 16,
        nextJunctionName: "City Grid Node",
        distToNextJunctionM: Math.round((1.0 - veh.progress) * 70),
        signalCountdown: veh.stoppedAtRed ? "red · green in 8.4 s" : "green · 12.0 s",
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

    // 2. Pedestrians in or near zone
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
        headline: ped.state === "crossing" ? "Crossing at crosswalk" : "On the sidewalk",
        explanation: ped.state === "crossing"
          ? "Crossing crosswalk, clear of traffic flow."
          : `Walking at ${Math.round(ped.speed)} km/h along sidewalk.`,
        distToZoneCenter: distToCenter,
        distToAmbulance: distToAmb,
        inZone,
        isYielding: false,
        stoppedAtSignal: ped.state === "waiting_signal",
        followingText: "none (pedestrian walk)",
        followingGapMeters: 8,
        nextJunctionName: "Crosswalk Node",
        distToNextJunctionM: 12,
        signalCountdown: ped.state === "crossing" ? "walk · 6.2 s" : "don't walk · 8.0 s",
        approachName: "sidewalk",
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
