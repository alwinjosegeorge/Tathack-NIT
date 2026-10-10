import { useRef, useState, useCallback, useEffect } from "react";
import { TrafficEngine } from "@/lib/city-sim/engine";
import { TrafficSimulation } from "@/components/city-3d/TrafficSimulation";
import { ControlPanel } from "@/components/city-3d/ControlPanel";
import type { SnapshotData } from "@/components/city-3d/ControlPanel";
import { RootCausePanel } from "@/components/city-3d/RootCausePanel";
import { WhatIfPanel } from "@/components/city-3d/WhatIfPanel";
import { CityMemoryPanel } from "@/components/city-3d/CityMemoryPanel";
import type { IncidentMarker, RecurrenceAlert } from "@/lib/city-sim/types";
import {
  fetchIncidents,
  fetchRecurrenceAlerts,
  submitEmergencyRequest,
  getApprovalStatus,
  BACKEND_AVAILABLE,
} from "@/lib/city-sim/civicApi";
import { Activity, ShieldAlert, Cpu, History, Maximize2, Minimize2 } from "lucide-react";
import { cn } from "@/lib/utils";

type ActiveTab = "traffic" | "root_cause" | "what_if" | "city_memory";

export interface City3DDigitalTwinProps {
  height?: number | string;
  className?: string;
  activeLayers?: string[];
}

export function City3DDigitalTwin({
  height = 640,
  className,
  activeLayers,
}: City3DDigitalTwinProps) {
  const [mounted, setMounted] = useState(false);
  const engineRef = useRef<TrafficEngine | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!engineRef.current && typeof window !== "undefined") {
    engineRef.current = new TrafficEngine();
  }

  const [snapshot, setSnapshot] = useState<SnapshotData | null>(null);
  const [sirenEnabled, setSirenEnabled] = useState(false);
  const sirenRef = useRef<HTMLAudioElement | null>(null);

  // Navigation & panels
  const [activeTab, setActiveTab] = useState<ActiveTab>("traffic");
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Camera & Selection
  const [followAmbulance, setFollowAmbulance] = useState(false);
  const [selectedVehicleId, setSelectedVehicleId] = useState<number | null>(null);

  // Civic Intelligence State
  const [incidents, setIncidents] = useState<IncidentMarker[]>([]);
  const [recurrences, setRecurrences] = useState<RecurrenceAlert[]>([]);
  const [selectedIncidentId, setSelectedIncidentId] = useState<string | null>(null);
  const [emergencyPending, setEmergencyPending] = useState(false);

  // Load incidents & recurrences
  useEffect(() => {
    fetchIncidents().then((res) => setIncidents(res.data));
    fetchRecurrenceAlerts().then((res) => setRecurrences(res.data));
  }, []);

  const handleSnapshot = useCallback((snap: ReturnType<TrafficEngine["getSnapshot"]>) => {
    setSnapshot(snap as SnapshotData);
  }, []);

  const handleActivateEmergency = useCallback(async () => {
    if (!engineRef.current) return;
    setEmergencyPending(true);

    try {
      // 1. Submit emergency request via API
      const reqRes = await submitEmergencyRequest("south", !BACKEND_AVAILABLE);
      const requestId = reqRes.data.requestId;

      // 2. Poll for operator approval
      let attempts = 0;
      const interval = setInterval(async () => {
        attempts++;
        const statusRes = await getApprovalStatus(requestId);
        if (statusRes.data.status === "approved") {
          clearInterval(interval);
          setEmergencyPending(false);
          engineRef.current?.activateEmergency("south");
          setFollowAmbulance(true);
        } else if (statusRes.data.status === "rejected" || attempts > 10) {
          clearInterval(interval);
          setEmergencyPending(false);
        }
      }, 500);
    } catch {
      setEmergencyPending(false);
      engineRef.current.activateEmergency("south");
      setFollowAmbulance(true);
    }
  }, []);

  const handleDeactivateEmergency = useCallback(() => {
    engineRef.current?.deactivateEmergency();
    setFollowAmbulance(false);
  }, []);

  const handleToggleSiren = useCallback(() => {
    setSirenEnabled((prev) => {
      const next = !prev;
      if (next) {
        try {
          const ctx = new AudioContext();
          const oscillator = ctx.createOscillator();
          const gainNode = ctx.createGain();
          oscillator.connect(gainNode);
          gainNode.connect(ctx.destination);
          gainNode.gain.value = 0.08;
          oscillator.frequency.value = 700;
          oscillator.type = "sine";

          let toggle = false;
          const interval = setInterval(() => {
            toggle = !toggle;
            oscillator.frequency.linearRampToValueAtTime(toggle ? 700 : 900, ctx.currentTime + 0.4);
          }, 400);

          oscillator.start();
          sirenRef.current = {
            pause: () => {
              clearInterval(interval);
              ctx.close();
            },
          } as unknown as HTMLAudioElement;
        } catch {
          // Audio not available
        }
      } else {
        sirenRef.current?.pause();
      }
      return next;
    });
  }, []);

  const selectedIncident = incidents.find((i) => i.id === selectedIncidentId) || null;

  const handleSelectIncident = useCallback(
    (id: string) => {
      setSelectedIncidentId(id);
      if (activeTab === "traffic") {
        setActiveTab("root_cause");
      }
    },
    [activeTab]
  );

  if (!mounted || typeof window === "undefined" || !engineRef.current) {
    return (
      <div
        style={{ height }}
        className="w-full bg-slate-950 flex flex-col items-center justify-center text-slate-400 font-mono text-xs gap-3 rounded-2xl"
      >
        <div className="size-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
        <span>Initializing 3D Digital Twin City Model...</span>
      </div>
    );
  }

  return (
    <div
      style={{ height: isFullscreen ? "100vh" : height }}
      className={cn(
        "relative w-full overflow-hidden bg-slate-950 select-none rounded-3xl transition-all glow-border-intense",
        isFullscreen && "fixed inset-0 z-50 rounded-none",
        className
      )}
    >
      {/* 3D Canvas */}
      <TrafficSimulation
        engine={engineRef.current}
        onSnapshot={handleSnapshot}
        followAmbulance={followAmbulance}
        selectedVehicleId={selectedVehicleId}
        incidents={incidents}
        recurrences={recurrences}
        selectedIncidentId={selectedIncidentId}
        onSelectIncident={handleSelectIncident}
      />

      {/* Main Tab Navigation Bar */}
      <div className="absolute top-3 left-1/2 -translate-x-1/2 z-20 pointer-events-auto max-w-[95%]">
        <div className="bg-slate-900/90 backdrop-blur-md rounded-2xl border border-indigo-400/35 shadow-[0_0_25px_-3px_rgba(139,92,246,0.35)] p-1.5 flex flex-wrap items-center gap-1 dot-pattern-card">
          <button
            onClick={() => setActiveTab("traffic")}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer",
              activeTab === "traffic"
                ? "bg-cyan-500 text-slate-950 shadow-md"
                : "text-slate-300 hover:text-white hover:bg-slate-800"
            )}
          >
            <Activity size={13} />
            <span>Live Traffic</span>
          </button>

          <button
            onClick={() => {
              setActiveTab("root_cause");
              if (!selectedIncidentId && incidents.length > 0) {
                setSelectedIncidentId(incidents[0].id);
              }
            }}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer",
              activeTab === "root_cause"
                ? "bg-amber-500 text-slate-950 shadow-md"
                : "text-slate-300 hover:text-white hover:bg-slate-800"
            )}
          >
            <ShieldAlert size={13} />
            <span>Root-Cause</span>
          </button>

          <button
            onClick={() => {
              setActiveTab("what_if");
              if (!selectedIncidentId && incidents.length > 0) {
                setSelectedIncidentId(incidents[0].id);
              }
            }}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer",
              activeTab === "what_if"
                ? "bg-blue-500 text-white shadow-md"
                : "text-slate-300 hover:text-white hover:bg-slate-800"
            )}
          >
            <Cpu size={13} />
            <span>What-If Lab</span>
          </button>

          <button
            onClick={() => {
              setActiveTab("city_memory");
              if (!selectedIncidentId && incidents.length > 0) {
                setSelectedIncidentId(incidents[0].id);
              }
            }}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer",
              activeTab === "city_memory"
                ? "bg-purple-500 text-white shadow-md"
                : "text-slate-300 hover:text-white hover:bg-slate-800"
            )}
          >
            <History size={13} />
            <span>City Memory</span>
          </button>

          <button
            onClick={() => setIsFullscreen((f) => !f)}
            title={isFullscreen ? "Exit Fullscreen" : "Fullscreen 3D View"}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs text-slate-400 hover:text-white hover:bg-slate-800 transition-all cursor-pointer border-l border-slate-700/60 ml-0.5"
          >
            {isFullscreen ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
          </button>
        </div>
      </div>

      {/* Emergency Pending Banner */}
      {emergencyPending && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-20 pointer-events-auto">
          <div className="bg-amber-500/90 text-slate-950 font-bold px-4 py-2 rounded-xl shadow-lg border border-amber-300 flex items-center gap-2 animate-pulse text-xs">
            <span className="w-2.5 h-2.5 rounded-full bg-slate-950 animate-ping" />
            <span>Awaiting Operator Approval for Emergency Corridor Priority...</span>
          </div>
        </div>
      )}

      {/* Bottom Traffic Control Panel */}
      <ControlPanel
        snapshot={snapshot}
        engine={engineRef.current}
        onActivateEmergency={handleActivateEmergency}
        onDeactivateEmergency={handleDeactivateEmergency}
        onToggleSiren={handleToggleSiren}
        sirenEnabled={sirenEnabled}
        followAmbulance={followAmbulance}
        onToggleFollowAmbulance={() => setFollowAmbulance((f) => !f)}
        selectedVehicleId={selectedVehicleId}
        onSelectVehicle={setSelectedVehicleId}
      />

      {/* Side Intelligence Panels */}
      {activeTab === "root_cause" && (
        <RootCausePanel
          incident={selectedIncident}
          allIncidents={incidents}
          onClose={() => setActiveTab("traffic")}
          onSelectIncident={setSelectedIncidentId}
          onOpenWhatIf={(id) => {
            setSelectedIncidentId(id);
            setActiveTab("what_if");
          }}
        />
      )}

      {activeTab === "what_if" && (
        <WhatIfPanel
          incident={selectedIncident}
          engine={engineRef.current}
          onClose={() => setActiveTab("traffic")}
        />
      )}

      {activeTab === "city_memory" && (
        <CityMemoryPanel incident={selectedIncident} onClose={() => setActiveTab("traffic")} />
      )}
    </div>
  );
}
