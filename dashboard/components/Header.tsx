"use client";

import {
  AlertTriangle,
  Handshake,
  Landmark,
  Radio,
  ShieldCheck,
  Swords,
  WifiOff,
} from "lucide-react";
import { Badge, Button, SegmentedControl } from "./legacy-ui";
import { SCENARIOS } from "@/lib/fixtures";
import type { HealthInfo, Role } from "@/lib/types";
import { cn } from "@/lib/format";

const SCENARIO_ICONS = [Swords, Handshake, AlertTriangle, Landmark] as const;

export function Header({
  health,
  online,
  role,
  onRoleChange,
  runningScenario,
  activeScenarioId,
  onRunScenario,
}: {
  health: HealthInfo | null;
  online: boolean;
  role: Role;
  onRoleChange: (role: Role) => void;
  runningScenario: boolean;
  activeScenarioId: string | null;
  onRunScenario: (scenarioId: string) => void;
}) {
  return (
    <header className="border-b border-line bg-white">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-3 px-4 py-3 lg:px-6">
        <div className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-blue-200 bg-blue-50 text-azure shadow-sm">
            <ShieldCheck size={20} aria-hidden="true" />
          </span>
          <div>
            <h1 className="text-base font-semibold leading-tight tracking-tight text-ink">
              AegisPay
            </h1>
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-faint">
              Chargeback Defense Command
            </p>
          </div>
        </div>

        {online ? (
          <Badge tone="fight">
            <Radio size={11} aria-hidden="true" />
            Engine Online · LangGraph Connected
          </Badge>
        ) : (
          <Badge tone="settle">
            <WifiOff size={11} aria-hidden="true" />
            Backend Offline · Mock Mode
          </Badge>
        )}
        {online && health ? (
          <Badge tone={health.database === "up" ? "fight" : "escalate"}>
            DB {health.database === "up" ? "Connected" : "Down"}
          </Badge>
        ) : null}
        {online && health ? (
          <Badge tone="info" className="normal-case tracking-normal">
            {health.model}
          </Badge>
        ) : null}

        <div className="ml-auto flex flex-wrap items-center gap-3">
          <SegmentedControl<Role>
            label="Simulated operator role"
            value={role}
            onChange={onRoleChange}
            options={[
              { value: "gateway", label: "Gateway Risk Lead" },
              { value: "merchant", label: "Merchant Admin" },
            ]}
          />
        </div>
      </div>

      <div className="flex items-center gap-2 overflow-x-auto px-4 pb-3 lg:px-6" role="group" aria-label="One-click demo scenarios">
        <span className="shrink-0 font-mono text-[10px] uppercase tracking-widest text-ink-faint">
          Live Demo Scenarios
        </span>
        {SCENARIOS.map((scenario, index) => {
          const Icon = SCENARIO_ICONS[index] ?? Swords;
          const isRunning = runningScenario && activeScenarioId === scenario.id;
          return (
            <Button
              key={scenario.id}
              size="sm"
              variant={isRunning ? "primary" : "default"}
              disabled={runningScenario}
              onClick={() => onRunScenario(scenario.id)}
              title={`POST ${scenario.fixture}`}
              className={cn("shrink-0 whitespace-nowrap", isRunning && "animate-pulse-glow")}
            >
              <Icon size={13} aria-hidden="true" />
              <span>{scenario.label}</span>
              <span className="hidden font-mono text-[10px] text-ink-faint xl:inline">
                — {scenario.sublabel}
              </span>
            </Button>
          );
        })}
      </div>
    </header>
  );
}
