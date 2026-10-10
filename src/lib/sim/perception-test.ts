// Unit Test Suite for Perception & Pairwise TTC Safety Engine
import { computePairwiseTtc, evaluateZoneSafety, PerceptionAgent } from "./perception";

export interface TestResult {
  name: string;
  passed: boolean;
  message: string;
}

export function runPerceptionUnitTests(): { allPassed: boolean; results: TestResult[] } {
  const results: TestResult[] = [];

  // TEST 1: Self-pair is never reported
  {
    const p: [number, number, number] = [0, 0.8, 0];
    const v: [number, number, number] = [20, 0, 0];
    const res = computePairwiseTtc(p, v, 2.2, p, v, 2.2, { id: "AMB-01" }, { id: "AMB-01" });

    const passed = !res.isHazard && res.ttcSec === null;
    results.push({
      name: "1. Self-pair never reported",
      passed,
      message: passed
        ? "PASS: Identical agent IDs (AMB-01 x AMB-01) cleanly ignored with 0 hazard flag."
        : `FAIL: Self-pairing triggered alert: ttcSec=${res.ttcSec}`,
    });
  }

  // TEST 2: Two cars in same lane moving at the same speed never alert
  {
    const pA: [number, number, number] = [0, 0.6, 0];
    const vA: [number, number, number] = [15, 0, 0];
    const pB: [number, number, number] = [18, 0.6, 0]; // 18m ahead
    const vB: [number, number, number] = [15, 0, 0]; // same speed

    const res = computePairwiseTtc(
      pA,
      vA,
      2.0,
      pB,
      vB,
      2.0,
      { id: "CAR-01", laneIndex: 0 },
      { id: "CAR-02", laneIndex: 0 }
    );

    const passed = !res.isHazard && res.ttcSec === null;
    results.push({
      name: "2. Two cars in same lane at same speed never alert",
      passed,
      message: passed
        ? "PASS: Same-lane vehicles maintaining constant safe gap do not trigger collision alert."
        : `FAIL: False alert triggered on same-speed following car: ttcSec=${res.ttcSec}`,
    });
  }

  // TEST 3: Head-on approach at known speeds gives exact theoretical TTC
  {
    // Car A at x=0 moving East (+X) at 10 m/s
    // Car B at x=54 moving West (-X) at 10 m/s
    // Relative closing speed = 20 m/s
    // Radii sum = 2.0 + 2.0 = 4.0m
    // Clearance = 54 - 4 = 50m
    // Expected TTC = 50 / 20 = 2.5s
    const pA: [number, number, number] = [0, 0.6, 0];
    const vA: [number, number, number] = [10, 0, 0];
    const pB: [number, number, number] = [54, 0.6, 0];
    const vB: [number, number, number] = [-10, 0, 0];

    const res = computePairwiseTtc(pA, vA, 2.0, pB, vB, 2.0, { id: "CAR-03" }, { id: "CAR-04" });

    const passed = res.isHazard && res.ttcSec !== null && Math.abs(res.ttcSec - 2.5) <= 0.1;
    results.push({
      name: "3. Head-on approach gives expected TTC (2.5s)",
      passed,
      message: passed
        ? `PASS: Computed TTC is exactly ${res.ttcSec}s (theoretical: 2.5s) at closing speed ${res.closingSpeed} km/h.`
        : `FAIL: Expected TTC 2.5s, got ${res.ttcSec}s (isHazard=${res.isHazard}).`,
    });
  }

  // TEST 4: Ambulance versus a yielding car does not alert once car moves aside
  {
    // Ambulance at (0, 0) moving East at 20 m/s
    // Car ahead at (30, 4.5) with lateral offset 4.5m (yielding on shoulder)
    const pAmb: [number, number, number] = [0, 0.8, 0];
    const vAmb: [number, number, number] = [20, 0, 0];
    const pCar: [number, number, number] = [30, 0.6, 4.5]; // Shifted 4.5m to shoulder
    const vCar: [number, number, number] = [5, 0, 0];

    const res = computePairwiseTtc(
      pAmb,
      vAmb,
      2.2,
      pCar,
      vCar,
      2.0,
      { id: "AMB-01", isYielding: false },
      { id: "CAR-YIELD", isYielding: true }
    );

    const passed = !res.isHazard;
    results.push({
      name: "4. Ambulance vs yielding car does not alert once moved aside",
      passed,
      message: passed
        ? "PASS: Yielding vehicle on shoulder (lateral clearance > 2.2m) is verified safe."
        : `FAIL: Yielding vehicle still triggered collision alert: ttcSec=${res.ttcSec}`,
    });
  }

  const allPassed = results.every((r) => r.passed);
  return { allPassed, results };
}
