import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { City3DDigitalTwin } from "@/components/city-3d/city-3d-digital-twin";
import { CityMap } from "@/components/city-map";
import { AgentReasoningStream } from "@/components/agent-reasoning-stream";
import { ExplainabilityBars } from "@/components/explainability-bars";
import { GlassCard, LiveBadge, SectionHeader, SeverityChip } from "@/components/ui-kit";
import { useSentinelStore } from "@/lib/store";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { Boxes, Map } from "lucide-react";

export const Route = createFileRoute("/map")({
  head: () => ({
    meta: [
      { title: "Digital Twin Map · Kochi | Project Sentinel" },
      { name: "description", content: "Live urban 3D digital twin of Kochi. Real-time incidents, traffic simulation, backwaters and transit overlays." },
      { property: "og:title", content: "Digital Twin Map · Kochi" },
      { property: "og:description", content: "Live urban 3D digital twin of Kochi." },
    ],
  }),
  component: MapPage,
});

const layers = [
  { key: "buildings", label: "Buildings (3D)" },
  { key: "traffic", label: "Traffic" },
  { key: "cctv", label: "CCTV" },
  { key: "transit", label: "Transit" },
];

function MapPage() {
  const [active, setActive] = useState<string[]>(["buildings", "traffic", "cctv", "transit"]);
  const [viewMode, setViewMode] = useState<"3d" | "2d">("3d");
  const toggle = (k: string) =>
    setActive((a) => (a.includes(k) ? a.filter((x) => x !== k) : [...a, k]));

  const { incidents } = useSentinelStore();

  return (
    <AppShell>
      <div className="space-y-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-widest text-muted-foreground">Monitor · 02</p>
            <h1 className="font-display text-3xl font-semibold tracking-tight">Digital Twin</h1>
            <p className="mt-1 text-sm text-muted-foreground">Live urban 3D model of Kochi. Every pin is a real-time signal.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <LiveBadge />

            {/* View Mode Toggle (3D City Twin vs 2D GIS Map) */}
            <div className="flex items-center rounded-full bg-secondary/80 p-0.5 border border-border mr-2">
              <button
                onClick={() => setViewMode("3d")}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer",
                  viewMode === "3d"
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Boxes className="size-3.5" />
                <span>3D City Twin</span>
              </button>
              <button
                onClick={() => setViewMode("2d")}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer",
                  viewMode === "2d"
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Map className="size-3.5" />
                <span>2D GIS Map</span>
              </button>
            </div>

            {layers.map((l) => (
              <button
                key={l.key}
                onClick={() => toggle(l.key)}
                className={cn(
                  "rounded-full border px-3 py-1 text-xs font-medium transition-colors cursor-pointer",
                  active.includes(l.key)
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-card text-muted-foreground hover:text-foreground",
                )}
              >
                {l.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          <GlassCard className="lg:col-span-2 !p-0 overflow-hidden relative min-h-[640px]">
            {viewMode === "3d" ? (
              <City3DDigitalTwin height={640} activeLayers={active} />
            ) : (
              <CityMap height={640} activeLayers={active} />
            )}
          </GlassCard>

          <div className="space-y-4">
            <GlassCard>
              <SectionHeader title="Multi-agent reasoning" />
              <AgentReasoningStream scenarioId="default" compact />
            </GlassCard>
            <GlassCard>
              <ExplainabilityBars title="Congestion attribution · Vytilla" />
            </GlassCard>
          </div>
        </div>

        <GlassCard>
          <SectionHeader title="Active incidents on map" />
          <ul className="divide-y divide-border">
            {incidents.map((i) => (
              <li key={i.id} className="flex flex-wrap items-center gap-3 py-3">
                <SeverityChip severity={i.severity} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{i.title}</p>
                  <p className="truncate text-xs text-muted-foreground">{i.location}</p>
                </div>
                <span className="text-xs font-mono text-muted-foreground">{i.confidence}%</span>
                <span className="text-xs text-muted-foreground">{i.minutesAgo}m</span>
              </li>
            ))}
          </ul>
        </GlassCard>
      </div>
    </AppShell>
  );
}
