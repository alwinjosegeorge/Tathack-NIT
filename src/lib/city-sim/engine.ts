import * as THREE from 'three';
import type { VehicleState, VehicleKind, LanePath, SignalGroup, Direction, TurnType, SignalState } from './types';
import {
  DIR_VECTORS, RIGHT_OF, LEFT_OF, VEHICLE_SPECS, randomCarColor,
  createSignalGroups, buildLanePath, MAX_VEHICLES, SPAWN_INTERVAL_MIN,
  SPAWN_INTERVAL_MAX, FIXED_DT, STOP_LINE_OFFSET, ROAD_LENGTH,
  GREEN_DURATION, YELLOW_DURATION, ALL_RED_BUFFER,
} from './constants';

const APPROACHES: Direction[] = ['north', 'south', 'east', 'west'];
const TURNS: TurnType[] = ['straight', 'left', 'right'];

let nextVehicleId = 1;

function randomTurn(): TurnType {
  const r = Math.random();
  if (r < 0.55) return 'straight';
  if (r < 0.78) return 'right';
  return 'left';
}

function randomApproach(): Direction {
  return APPROACHES[Math.floor(Math.random() * APPROACHES.length)];
}

function randomKind(): VehicleKind {
  const r = Math.random();
  if (r < 0.68) return 'car';
  if (r < 0.83) return 'motorcycle';
  return 'bus';
}

// ---- Turn speed reduction factor ----
const TURN_SPEED_FACTOR: Record<TurnType, number> = {
  straight: 1.0,
  right: 0.55,
  left: 0.45,
};

export class TrafficEngine {
  vehicles: VehicleState[] = [];
  signalGroups: SignalGroup[] = createSignalGroups();
  emergencyActive = false;
  emergencyPhase = 0; // 0=inactive, 1=pre-clear, 2=corridor green, 3=ambulance passing, 4=return to normal
  emergencyTimer = 0;
  emergencyApproach: Direction | null = null;
  private spawnTimer = 0;
  private simTime = 0;
  private nextSpawnIn = 2;
  private ambulanceSpawned = false;
  ambulanceId: number | null = null;

  // Simulation control
  paused = false;
  simSpeed = 1.0;

  // Pre-built path cache
  private pathCache: Map<string, LanePath> = new Map();

  constructor() {
    this.buildPathCache();
  }

  private buildPathCache() {
    for (const a of APPROACHES) {
      for (const t of TURNS) {
        const key = `${a}-${t}`;
        this.pathCache.set(key, buildLanePath(a, t));
      }
    }
  }

  private getPath(approach: Direction, turn: TurnType): LanePath {
    return this.pathCache.get(`${approach}-${turn}`)!;
  }

  // ---- Simulation controls ----

  pause() { this.paused = true; }
  resume() { this.paused = false; }

  setSpeed(factor: number) {
    this.simSpeed = Math.max(0.25, Math.min(3.0, factor));
  }

  reset() {
    this.vehicles = [];
    this.signalGroups = createSignalGroups();
    this.emergencyActive = false;
    this.emergencyPhase = 0;
    this.emergencyTimer = 0;
    this.emergencyApproach = null;
    this.ambulanceSpawned = false;
    this.ambulanceId = null;
    this.spawnTimer = 0;
    this.simTime = 0;
    this.nextSpawnIn = 2;
    nextVehicleId = 1;
  }

  // ---- Signal queries ----

  getSignalState(approach: Direction): SignalState {
    for (const g of this.signalGroups) {
      if (g.approaches.includes(approach)) return g.state;
    }
    return 'red';
  }

  getSignalTimer(approach: Direction): number {
    for (const g of this.signalGroups) {
      if (g.approaches.includes(approach)) return g.phaseRemaining;
    }
    return 0;
  }

  private isSignalGreen(approach: Direction): boolean {
    return this.getSignalState(approach) === 'green';
  }

  private shouldStopAtSignal(vehicle: VehicleState): boolean {
    if (vehicle.isEmergency) return false;

    // Emergency mode: stop all non-emergency traffic
    if (this.emergencyActive && this.emergencyPhase >= 2 && !vehicle.isEmergency) {
      return true;
    }

    const signal = this.getSignalState(vehicle.path.approach);
    if (signal === 'green') return false;

    // Amber: stop if far enough back, pass through if already committed
    if (signal === 'amber') {
      const distToStopLine = this.stopLineDistance(vehicle) - vehicle.distance;
      return distToStopLine > 3;
    }

    // Red: stop if before stop line
    return vehicle.distance < this.stopLineDistance(vehicle);
  }

  private stopLineDistance(_vehicle: VehicleState): number {
    return ROAD_LENGTH - STOP_LINE_OFFSET;
  }

  private intersectionEntryDistance(_vehicle: VehicleState): number {
    return ROAD_LENGTH - STOP_LINE_OFFSET + 2;
  }

  private intersectionExitDistance(vehicle: VehicleState): number {
    return this.intersectionEntryDistance(vehicle) + 20;
  }

  // ---- Vehicle spawning ----

  private spawnVehicle() {
    if (this.vehicles.length >= MAX_VEHICLES) return;

    const approach = randomApproach();
    const turn = randomTurn();
    const kind = randomKind();
    const path = this.getPath(approach, turn);

    if (!this.isSpawnAreaClear(path)) return;

    const specBase = VEHICLE_SPECS[kind];
    const spec = {
      ...specBase,
      color: randomCarColor(),
    };

    const pos = new THREE.Vector3();
    path.curve.getPointAt(0, pos);
    pos.y = spec.wheelRadius; // sit on road surface
    const tangent = path.curve.getTangentAt(0).normalize();
    const heading = Math.atan2(tangent.x, tangent.z);

    const vehicle: VehicleState = {
      id: nextVehicleId++,
      kind,
      spec,
      path,
      distance: 0,
      speed: spec.maxSpeed * 0.5,
      isEmergency: false,
      position: pos,
      heading,
      targetHeading: heading,
      phase: 'approach',
      brakeLight: false,
      spawnedAt: this.simTime,
    };

    this.vehicles.push(vehicle);
  }

  private isSpawnAreaClear(path: LanePath): boolean {
    const spawnPos = new THREE.Vector3();
    path.curve.getPointAt(0, spawnPos);
    const minGap = 10;

    for (const v of this.vehicles) {
      if (v.path.approach === path.approach && v.path.turn === path.turn) {
        if (v.distance < minGap) return false;
      }
      // Also check 3D proximity at spawn location
      const d = v.position.distanceTo(spawnPos);
      if (d < minGap) return false;
    }
    return true;
  }

  private spawnAmbulance() {
    if (this.ambulanceSpawned) return;

    const approach = this.emergencyApproach ?? randomApproach();
    const turn: TurnType = 'straight';
    const path = this.getPath(approach, turn);

    const specBase = VEHICLE_SPECS['ambulance'];
    const spec = {
      ...specBase,
      color: '#ffffff',
    };

    const pos = new THREE.Vector3();
    path.curve.getPointAt(0, pos);
    pos.y = spec.wheelRadius;
    const tangent = path.curve.getTangentAt(0).normalize();
    const heading = Math.atan2(tangent.x, tangent.z);

    const ambulance: VehicleState = {
      id: nextVehicleId++,
      kind: 'ambulance',
      spec,
      path,
      distance: 0,
      speed: spec.maxSpeed,
      isEmergency: true,
      position: pos,
      heading,
      targetHeading: heading,
      phase: 'approach',
      brakeLight: false,
      spawnedAt: this.simTime,
    };

    this.vehicles.push(ambulance);
    this.ambulanceSpawned = true;
    this.ambulanceId = ambulance.id;
  }

  // ---- Emergency corridor ----

  activateEmergency(approach?: Direction) {
    if (this.emergencyActive) return;
    this.emergencyActive = true;
    this.emergencyPhase = 1;
    this.emergencyTimer = 0;
    this.emergencyApproach = approach ?? randomApproach();
    this.ambulanceSpawned = false;
    this.ambulanceId = null;
  }

  deactivateEmergency() {
    this.emergencyActive = false;
    this.emergencyPhase = 0;
    this.emergencyTimer = 0;
    this.emergencyApproach = null;
    if (this.ambulanceId !== null) {
      this.vehicles = this.vehicles.filter(v => v.id !== this.ambulanceId);
      this.ambulanceId = null;
      this.ambulanceSpawned = false;
    }
  }

  // ---- Signal updates ----

  private updateSignals(dt: number) {
    if (this.emergencyActive) {
      this.updateEmergencySignals(dt);
      return;
    }

    // Normal signal cycling: green → amber → red → green
    // Two groups alternate. Active cycle:
    // greenGroup: green(GREEN_DURATION) → amber(YELLOW_DURATION) → red
    // redGroup: red → (waits for greenGroup amber to expire + ALL_RED_BUFFER) → green

    const greenGroup = this.signalGroups.find(g => g.state === 'green');
    const amberGroup = this.signalGroups.find(g => g.state === 'amber');
    const redGroup = this.signalGroups.find(g => g.state === 'red');

    // Advance all timers
    for (const g of this.signalGroups) {
      g.timer += dt;
      g.phaseRemaining = Math.max(0, g.phaseRemaining - dt);
    }

    if (greenGroup) {
      if (greenGroup.timer >= GREEN_DURATION) {
        // Transition green → amber
        greenGroup.state = 'amber';
        greenGroup.timer = 0;
        greenGroup.phaseRemaining = YELLOW_DURATION;
      }
    }

    if (amberGroup) {
      if (amberGroup.timer >= YELLOW_DURATION) {
        // Transition amber → red, and flip the other group to green
        amberGroup.state = 'red';
        amberGroup.timer = 0;
        amberGroup.phaseRemaining = GREEN_DURATION + YELLOW_DURATION + ALL_RED_BUFFER;

        if (redGroup) {
          redGroup.state = 'green';
          redGroup.timer = 0;
          redGroup.phaseRemaining = GREEN_DURATION;
        }
      }
    }
  }

  private updateEmergencySignals(dt: number) {
    this.emergencyTimer += dt;
    const approach = this.emergencyApproach;
    if (!approach) return;

    const approachGroup = this.signalGroups.find(g => g.approaches.includes(approach));
    const otherGroup = this.signalGroups.find(g => !g.approaches.includes(approach));

    switch (this.emergencyPhase) {
      case 1: // Pre-clear: turn cross-traffic red, approach amber then green
        if (otherGroup) {
          otherGroup.state = 'red';
          otherGroup.timer = 0;
          otherGroup.phaseRemaining = 99;
        }
        if (approachGroup) {
          approachGroup.state = 'amber';
          approachGroup.timer = 0;
          approachGroup.phaseRemaining = YELLOW_DURATION;
        }
        this.emergencyPhase = 1.5 as unknown as number; // amber transition
        this.emergencyTimer = 0;
        break;

      case 1.5 as unknown as number: // Amber transition for approach
        if (this.emergencyTimer >= YELLOW_DURATION) {
          if (approachGroup) {
            approachGroup.state = 'green';
            approachGroup.timer = 0;
            approachGroup.phaseRemaining = 60; // hold green until ambulance passes
          }
          this.emergencyPhase = 2;
          this.emergencyTimer = 0;
        }
        break;

      case 2: // Corridor green, spawn ambulance
        if (!this.ambulanceSpawned) {
          this.spawnAmbulance();
        }
        // Keep corridor green until ambulance clears intersection
        if (this.ambulanceId !== null) {
          const ambulance = this.vehicles.find(v => v.id === this.ambulanceId);
          if (ambulance && ambulance.phase === 'exit' &&
              ambulance.distance > this.intersectionExitDistance(ambulance) + 10) {
            this.emergencyPhase = 3;
            this.emergencyTimer = 0;
          }
        }
        // If ambulance was removed externally
        if (this.ambulanceSpawned && this.ambulanceId === null) {
          this.emergencyPhase = 3;
          this.emergencyTimer = 0;
        }
        break;

      case 3: // Ambulance has passed, return to normal after 3s
        if (this.emergencyTimer > 3) {
          this.emergencyActive = false;
          this.emergencyPhase = 0;
          this.signalGroups = createSignalGroups();
        }
        break;
    }
  }

  // ---- Collision avoidance ----

  private getVehicleAhead(
    vehicle: VehicleState,
    allVehicles: VehicleState[],
  ): { distance: number; speed: number } | null {
    let closestDist = Infinity;
    let closestSpeed = 0;

    for (const other of allVehicles) {
      if (other.id === vehicle.id) continue;

      // Same path — use path distance
      if (other.path.approach === vehicle.path.approach &&
          other.path.turn === vehicle.path.turn) {
        if (other.distance > vehicle.distance) {
          const gap = other.distance - vehicle.distance
            - vehicle.spec.length / 2 - other.spec.length / 2;
          if (gap < closestDist) {
            closestDist = gap;
            closestSpeed = other.speed;
          }
        }
      }

      // Cross-path: use 3D proximity for vehicles near intersection
      if (other.path.approach !== vehicle.path.approach) {
        const dist3D = other.position.distanceTo(vehicle.position);
        if (dist3D < 12) {
          const myDistToIntersection = this.stopLineDistance(vehicle) - vehicle.distance;
          const otherDistToIntersection = this.stopLineDistance(other) - other.distance;
          // Only yield if both are approaching intersection and other is ahead
          if (myDistToIntersection > -5 && otherDistToIntersection < myDistToIntersection) {
            const gap = dist3D - vehicle.spec.length / 2 - other.spec.length / 2;
            if (gap > 0 && gap < closestDist) {
              closestDist = gap;
              closestSpeed = other.speed;
            }
          }
        }
      }
    }

    return closestDist === Infinity ? null : { distance: closestDist, speed: closestSpeed };
  }

  // ---- Vehicle update ----

  private updateVehicle(vehicle: VehicleState, dt: number) {
    const stopDist = this.stopLineDistance(vehicle);
    const entryDist = this.intersectionEntryDistance(vehicle);
    const exitDist = this.intersectionExitDistance(vehicle);

    // Update phase
    if (vehicle.distance < stopDist) {
      vehicle.phase = 'approach';
    } else if (vehicle.distance < exitDist) {
      vehicle.phase = 'intersection';
    } else {
      vehicle.phase = 'exit';
    }

    // --- Target speed calculation ---
    const turnFactor = vehicle.phase === 'intersection'
      ? TURN_SPEED_FACTOR[vehicle.path.turn]
      : 1.0;

    let targetSpeed = vehicle.spec.maxSpeed * turnFactor;

    // Slow down when approaching intersection for turns
    if (vehicle.phase === 'approach' && vehicle.path.turn !== 'straight') {
      const distToEntry = entryDist - vehicle.distance;
      if (distToEntry < 20) {
        targetSpeed = Math.min(targetSpeed, vehicle.spec.maxSpeed * turnFactor * (0.4 + 0.6 * (distToEntry / 20)));
      }
    }

    // Signal stopping
    if (vehicle.phase === 'approach') {
      const distToStopLine = stopDist - vehicle.distance;
      if (this.shouldStopAtSignal(vehicle) && distToStopLine < 35) {
        if (distToStopLine <= 0.5) {
          targetSpeed = 0;
        } else {
          // Smooth braking curve: decelerate proportionally to distance
          const brakeDist = Math.max(2, (vehicle.speed * vehicle.speed) / (2 * vehicle.spec.acceleration * 1.2));
          if (distToStopLine < brakeDist + 2) {
            targetSpeed = Math.max(0, vehicle.spec.maxSpeed * (distToStopLine / (brakeDist + 2)));
          }
        }
      }
    }

    // Emergency: non-emergency vehicles yield to ambulance
    if (this.emergencyActive && !vehicle.isEmergency) {
      const ambulance = this.ambulanceId !== null
        ? this.vehicles.find(v => v.id === this.ambulanceId)
        : null;
      if (ambulance) {
        const dist3D = ambulance.position.distanceTo(vehicle.position);
        if (dist3D < 20) {
          targetSpeed = Math.min(targetSpeed, 0);
        } else if (dist3D < 40) {
          targetSpeed = Math.min(targetSpeed, 2.5);
        }
      }
      // Respect signal stop during emergency (cross traffic should be red)
      if (vehicle.phase === 'approach') {
        const distToStopLine = stopDist - vehicle.distance;
        if (this.shouldStopAtSignal(vehicle) && distToStopLine < 35) {
          if (distToStopLine <= 0.5) {
            targetSpeed = 0;
          } else {
            const brakeDist = Math.max(2, (vehicle.speed * vehicle.speed) / (2 * vehicle.spec.acceleration * 1.2));
            if (distToStopLine < brakeDist + 2) {
              targetSpeed = Math.max(0, vehicle.speed * (distToStopLine / (brakeDist + 2)));
            }
          }
        }
      }
    }

    // Vehicle ahead — follow / maintain gap
    const ahead = this.getVehicleAhead(vehicle, this.vehicles);
    if (ahead) {
      const safeGap = vehicle.isEmergency ? 3 : 4.5;
      if (ahead.distance < 1.5) {
        targetSpeed = 0;
      } else if (ahead.distance < safeGap) {
        targetSpeed = Math.min(targetSpeed, Math.max(0, ahead.speed * 0.85));
      } else if (ahead.distance < safeGap * 3) {
        // Gentle following
        const t = (ahead.distance - safeGap) / (safeGap * 2);
        targetSpeed = Math.min(targetSpeed, ahead.speed + t * (vehicle.spec.maxSpeed - ahead.speed) * 0.5);
      }
    }

    // --- Apply acceleration / deceleration ---
    const accel = vehicle.spec.acceleration;
    if (vehicle.speed < targetSpeed) {
      vehicle.speed = Math.min(targetSpeed, vehicle.speed + accel * dt);
    } else if (vehicle.speed > targetSpeed) {
      // Brake harder than accelerate (1.8x factor)
      vehicle.speed = Math.max(targetSpeed, vehicle.speed - accel * 1.8 * dt);
    }

    // Brake light: on when decelerating meaningfully
    vehicle.brakeLight = vehicle.speed < targetSpeed - 0.8 && targetSpeed < vehicle.spec.maxSpeed * 0.85;

    // --- Move along path ---
    vehicle.distance += vehicle.speed * dt;

    const pathLength = vehicle.path.length;
    if (vehicle.distance >= pathLength) {
      vehicle.distance = pathLength;
      return; // will be removed by filter
    }

    const t = Math.min(0.9999, vehicle.distance / pathLength);
    const newPos = vehicle.path.curve.getPointAt(t);
    newPos.y = vehicle.spec.wheelRadius; // maintain ground contact
    vehicle.position.copy(newPos);

    const tangent = vehicle.path.curve.getTangentAt(t).normalize();
    vehicle.targetHeading = Math.atan2(tangent.x, tangent.z);

    // Smooth heading interpolation — faster when moving fast
    let diff = vehicle.targetHeading - vehicle.heading;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    const turnRate = vehicle.speed > 0.5 ? 6 : 12; // snap faster when slow
    vehicle.heading += diff * Math.min(1, dt * turnRate);
  }

  // ---- Main update loop ----

  update(rawDt: number) {
    if (this.paused) return;

    const dt = rawDt * this.simSpeed;
    const steps = Math.max(1, Math.round(dt / FIXED_DT));
    const stepDt = dt / steps;

    for (let s = 0; s < steps; s++) {
      this.simTime += stepDt;

      this.updateSignals(stepDt);

      for (const vehicle of this.vehicles) {
        this.updateVehicle(vehicle, stepDt);
      }

      // Remove exited vehicles
      this.vehicles = this.vehicles.filter(v => {
        if (v.distance >= v.path.length - 1) {
          if (v.isEmergency && v.id === this.ambulanceId) {
            this.emergencyPhase = 3;
            this.emergencyTimer = 0;
            this.ambulanceId = null;
          }
          return false;
        }
        return true;
      });

      // Spawn new vehicles
      this.spawnTimer += stepDt;
      if (this.spawnTimer >= this.nextSpawnIn) {
        this.spawnTimer = 0;
        this.nextSpawnIn = SPAWN_INTERVAL_MIN + Math.random() * (SPAWN_INTERVAL_MAX - SPAWN_INTERVAL_MIN);
        this.spawnVehicle();
      }
    }
  }

  // ---- Snapshot for UI ----

  getSnapshot() {
    const signals: Record<Direction, SignalState> = {
      north: this.getSignalState('north'),
      south: this.getSignalState('south'),
      east: this.getSignalState('east'),
      west: this.getSignalState('west'),
    };
    const signalTimers: Record<Direction, number> = {
      north: this.getSignalTimer('north'),
      south: this.getSignalTimer('south'),
      east: this.getSignalTimer('east'),
      west: this.getSignalTimer('west'),
    };

    return {
      vehicles: this.vehicles.map(v => ({
        id: v.id,
        kind: v.kind,
        position: [v.position.x, v.position.y, v.position.z] as [number, number, number],
        heading: v.heading,
        brakeLight: v.brakeLight,
        isEmergency: v.isEmergency,
        speed: v.speed,
        phase: v.phase,
      })),
      signals,
      signalTimers,
      emergencyActive: this.emergencyActive,
      emergencyPhase: this.emergencyPhase,
      emergencyApproach: this.emergencyApproach,
      vehicleCount: this.vehicles.length,
      paused: this.paused,
      simSpeed: this.simSpeed,
      ambulanceId: this.ambulanceId,
    };
  }
}
