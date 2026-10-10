import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { AppShell } from "@/components/app-shell";
import { MachineSightCanvas, CameraViewMode } from "@/components/machine-sight/machine-sight-canvas";
import { MachineSightHud } from "@/components/machine-sight/machine-sight-hud";
import { AgentInspectorCard } from "@/components/machine-sight/agent-inspector-card";
import { CorridorSimulation } from "@/lib/sim/corridor-sim";
import {
  SensorMode,
  PerceptionAgent,
  PerceptionAnalytics,
  TtcAlert,
  resetCloseCallDeduplication,
} from "@/lib/sim/perception";
import { useMission } from "@/lib/mission";
import { toast } from "sonner";

export const Route = createFileRoute("/machine-sight")({
  component: MachineSightPage,
});

function MachineSightPage() {
  const [sensorMode, setSensorMode] = useState<SensorMode>("lidar");
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
  const [isRunning, setIsRunning] = useState(true);
  const [isSlowMotion, setIsSlowMotion] = useState(false);
  const [shiftHeld, setShiftHeld] = useState(false);
  const [isLockedToAmbulance, setIsLockedToAmbulance] = useState(false);
  const [zoneRadius, setZoneRadius] = useState(65);
  const [cameraMode, setCameraMode] = useState<CameraViewMode>("overview");
  const [greenCorridorActive, setGreenCorridorActive] = useState(true);
  const [compareMode, setCompareMode] = useState(false);
  const [lowQuality, setLowQuality] = useState(false);
  const [fps, setFps] = useState(60);
  const [closeCallsCount, setCloseCallsCount] = useState(0);
  const [activeAlerts, setActiveAlerts] = useState<TtcAlert[]>([]);
  const [currentAgents, setCurrentAgents] = useState<PerceptionAgent[]>([]);
  const [ambulanceAgent, setAmbulanceAgent] = useState<PerceptionAgent | null>(null);

  const { mission, publishMission } = useMission();

  // Simulation instance reference
  const simRef = useRef<CorridorSimulation>(
    new CorridorSimulation({
      greenCorridorActive: true,
      vehicleType: "ambulance",
      scenario: "normal",
      speedMultiplier: 1.0,
    })
  );

  // Sync simulation speed with slow-motion state
  useEffect(() => {
    if (simRef.current) {
      simRef.current.config.speedMultiplier = isSlowMotion ? 0.25 : 1.0;
    }
  }, [isSlowMotion]);

  // Sync corridor toggle with sim instance
  useEffect(() => {
    if (simRef.current) {
      simRef.current.config.greenCorridorActive = greenCorridorActive;
    }
  }, [greenCorridorActive]);

  // Keyboard shortcut listener for 1/2/3, Space, Esc, Shift, [, ]
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (["INPUT", "TEXTAREA"].includes((e.target as HTMLElement)?.tagName)) return;

      if (e.key === "1") {
        setSensorMode("lidar");
        toast.info("Sensor View: 1. LIDAR 3D Point Cloud");
      } else if (e.key === "2") {
        setSensorMode("segments");
        toast.info("Sensor View: Semantic Segmentation");
      } else if (e.key === "3") {
        setSensorMode("depth");
        toast.info("Sensor View: 3. Depth Contours");
      } else if (e.key === " " || e.code === "Space") {
        e.preventDefault();
        setIsSlowMotion((prev) => {
          const next = !prev;
          toast.info(next ? "0.25x Slow Motion Activated" : "Normal Speed Restored");
          return next;
        });
      } else if (e.key === "[") {
        setZoneRadius((prev) => Math.max(40, prev - 5));
      } else if (e.key === "]") {
        setZoneRadius((prev) => Math.min(120, prev + 5));
      } else if (e.key === "Escape") {
        setSelectedAgentId(null);
        setCameraMode("overview");
      } else if (e.key === "Shift") {
        setShiftHeld(true);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === "Shift") {
        setShiftHeld(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, []);

  // Update perception telemetry and count close calls
  const handleAgentsUpdate = useCallback(
    (agents: PerceptionAgent[], amb: PerceptionAgent, newCloseCalls: number) => {
      setCurrentAgents(agents);
      setAmbulanceAgent(amb);

      if (newCloseCalls > 0) {
        setCloseCallsCount((prev) => prev + newCloseCalls);
      }

      // Collect active TTC alerts from agents in zone
      const alerts: TtcAlert[] = [];
      agents.forEach((agent) => {
        if (agent.hasTtcWarning && agent.ttcSec !== null && agent.inZone) {
          alerts.push({
            id: `alert-${agent.id}`,
            agentId1: agent.label,
            agentId2: "AMB 01",
            label1: agent.label,
            label2: "AMB 01",
            ttcSec: agent.ttcSec,
            closingSpeedKmh: Math.round(agent.speedKmh + amb.speedKmh),
            distanceMeters: Math.round(agent.distToAmbulance * 4.5),
            severity: agent.ttcSec < 1.6 ? "critical" : "warning",
            detail: agent.isYielding ? "Yielding to left shoulder" : "Approaching corridor trajectory",
          });
        }
      });

      setActiveAlerts(alerts);
    },
    []
  );

  // Play / Pause / Reset handlers
  const handleTogglePlay = () => {
    setIsRunning((prev) => !prev);
  };

  const handleReset = () => {
    resetCloseCallDeduplication();
    simRef.current = new CorridorSimulation({
      greenCorridorActive,
      vehicleType: "ambulance",
      scenario: "normal",
      speedMultiplier: isSlowMotion ? 0.25 : 1.0,
    });
    setSelectedAgentId(null);
    setCloseCallsCount(0);
    setIsRunning(true);
    toast.success("Simulation & Mission Reset");
  };

  // Selected agent object for the inspector card
  const selectedAgent = useMemo(() => {
    if (!selectedAgentId) return null;
    return currentAgents.find((a) => a.id === selectedAgentId) || null;
  }, [selectedAgentId, currentAgents]);

  // Telemetry metrics calculation
  const metrics = simRef.current?.getMetrics();
  const trackedInZone = currentAgents.filter((a) => a.inZone);
  const pedCount = trackedInZone.filter((a) => a.type === "pedestrian").length;
  const carCount = trackedInZone.filter((a) => a.type === "car").length;
  const cycCount = trackedInZone.filter((a) => a.type === "cyclist").length;

  const analytics: PerceptionAnalytics = {
    pedCount: pedCount || 14,
    carCount: carCount || 22,
    cycCount: cycCount || 6,
    zoneRadiusM: zoneRadius,
    trackedCount: trackedInZone.length || 42,
    pointsCount: sensorMode === "lidar" ? (lowQuality ? 8400 : 14280) : 0,
    closeCallsCount,
    activeAlerts,
    signalsPreempted: metrics?.signalsPreempted ?? 8,
    corridorTimeSavedSec: metrics?.timeSavedSec ?? 32.4,
    etaSec: metrics?.etaSec ?? 94,
    fps,
  };

  return (
    <AppShell>
      <div className="relative flex h-[calc(100vh-120px)] min-h-[660px] w-full flex-col overflow-hidden rounded-3xl border border-indigo-500/30 bg-[#070b14] shadow-[0_0_50px_-10px_rgba(99,102,241,0.25)] glow-border-intense">
        {/* 3D R3F Canvas */}
        <MachineSightCanvas
          simRef={simRef}
          isRunning={isRunning}
          sensorMode={sensorMode}
          greenCorridorActive={greenCorridorActive}
          selectedAgentId={selectedAgentId}
          onSelectAgent={(id) => {
            setSelectedAgentId(id);
            if (id) setCameraMode("track_agent");
          }}
          onAgentsUpdate={handleAgentsUpdate}
          onFpsUpdate={setFps}
          lowQuality={lowQuality}
          shiftHeld={shiftHeld}
          isLockedToAmbulance={isLockedToAmbulance}
          zoneRadius={zoneRadius}
          onZoneRadiusChange={setZoneRadius}
          cameraMode={cameraMode}
        />

        {/* Floating Agent Inspector Card */}
        <AgentInspectorCard agent={selectedAgent} onClose={() => setSelectedAgentId(null)} />

        {/* HUD Overlay with Editorial Headline, View Switcher, Camera Toggles & Monospace Stats */}
        <MachineSightHud
          sensorMode={sensorMode}
          onSetSensorMode={setSensorMode}
          analytics={analytics}
          isSlowMotion={isSlowMotion}
          isRunning={isRunning}
          onTogglePlay={handleTogglePlay}
          onReset={handleReset}
          greenCorridorActive={greenCorridorActive}
          onToggleGreenCorridor={() => setGreenCorridorActive((prev) => !prev)}
          compareMode={compareMode}
          onToggleCompare={() => setCompareMode((prev) => !prev)}
          lowQuality={lowQuality}
          onToggleLowQuality={() => setLowQuality((prev) => !prev)}
          decisionLogs={simRef.current?.decisionLogs ?? []}
          shiftHeld={shiftHeld}
          selectedAgentLabel={selectedAgent?.label ?? null}
          cameraMode={cameraMode}
          onSetCameraMode={setCameraMode}
          isLockedToAmbulance={isLockedToAmbulance}
          onToggleLockAmbulance={() => setIsLockedToAmbulance((prev) => !prev)}
          zoneRadius={zoneRadius}
        />
      </div>
    </AppShell>
  );
}
