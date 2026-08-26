"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Header } from "@/components/Header";
import { MetricsOverview, computeMetrics } from "@/components/MetricsOverview";
import { DisputeList } from "@/components/DisputeList";
import { AgentReasoningView } from "@/components/AgentReasoningView";
import { DossierViewer } from "@/components/DossierViewer";
import { PipelineSteps } from "@/components/PipelineSteps";
import {
  BackendUnavailableError,
  fetchDisputeDetail,
  fetchDisputes,
  fetchHealth,
  mockDetails,
  postWebhook,
} from "@/lib/api";
import { SCENARIOS } from "@/lib/fixtures";
import type { DisputeDetail, DisputeRecord, HealthInfo, Role } from "@/lib/types";

const POLL_INTERVAL_MS = 20_000;
const PIPELINE_TICK_MS = 1_100;

function seedAmounts(details: DisputeDetail[]): Record<string, number> {
  const map: Record<string, number> = {};
  for (const detail of details) {
    map[detail.dispute_id] = detail.event_payload.amount;
  }
  return map;
}

export default function Page() {
  const [online, setOnline] = useState(false);
  const [health, setHealth] = useState<HealthInfo | null>(null);
  const [role, setRole] = useState<Role>("gateway");
  const [disputes, setDisputes] = useState<DisputeRecord[]>([]);
  const [amounts, setAmounts] = useState<Record<string, number>>({});
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedDetail, setSelectedDetail] = useState<DisputeDetail | null>(null);
  const [runningScenario, setRunningScenario] = useState(false);
  const [activeScenarioId, setActiveScenarioId] = useState<string | null>(null);
  const [pipelineStep, setPipelineStep] = useState(0);
  const [pipelineCompleted, setPipelineCompleted] = useState(false);
  const [opsDecisions, setOpsDecisions] = useState<Record<string, "contest" | "accept">>({});
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const mockCache = useRef<Map<string, DisputeDetail>>(new Map());

  useEffect(() => {
    for (const detail of mockDetails()) {
      mockCache.current.set(detail.dispute_id, detail);
    }
    setAmounts((prev) => ({ ...seedAmounts(mockDetails()), ...prev }));
    setDisputes(
      mockDetails().map((d) => ({
        dispute_id: d.dispute_id,
        network: d.event_payload.network,
        reason_code: d.result.reason_code,
        claim_type: d.result.claim_type,
        decision: d.result.decision,
        final_status: d.result.final_status,
        win_probability: d.result.win_probability,
        iterations_used: d.result.iterations_used,
        created_at: d.created_at,
      }))
    );
  }, []);

  const loadList = useCallback(async () => {
    try {
      const records = await fetchDisputes();
      setDisputes(records);
      setOnline(true);
    } catch {
      /* keep current (mock) list */
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const info = await fetchHealth();
        if (!cancelled) {
          setHealth(info);
          setOnline(true);
          await loadList();
        }
      } catch {
        if (!cancelled) setOnline(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [loadList]);

  useEffect(() => {
    if (!online) return;
    pollRef.current = setInterval(loadList, POLL_INTERVAL_MS);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [online, loadList]);

  const selectDispute = useCallback(async (disputeId: string) => {
    setSelectedId(disputeId);
    const cachedMock = mockCache.current.get(disputeId);
    if (cachedMock) setSelectedDetail(cachedMock);

    try {
      const detail = await fetchDisputeDetail(disputeId);
      setAmounts((prev) => ({ ...prev, [detail.dispute_id]: detail.event_payload.amount }));
      setSelectedDetail(detail);
      setOnline(true);
    } catch (error) {
      if (!(error instanceof BackendUnavailableError)) {
        console.error("Failed to load dispute detail", error);
      }
    }
  }, []);

  const runScenario = useCallback(
    async (scenarioId: string) => {
      if (runningScenario) return;
      const scenario = SCENARIOS.find((s) => s.id === scenarioId) ?? null;
      if (!scenario) return;

      setRunningScenario(true);
      setActiveScenarioId(scenario.id);
      setPipelineStep(0);
      setPipelineCompleted(false);

      const ticker = setInterval(() => {
        setPipelineStep((step) => Math.min(step + 1, 3));
      }, PIPELINE_TICK_MS);

      let result;
      let usedBackend = true;
      try {
        result = await postWebhook(scenario.payload);
        setOnline(true);
      } catch {
        usedBackend = false;
        setOnline(false);
        await new Promise((resolve) => setTimeout(resolve, PIPELINE_TICK_MS * 3));
        result = scenario.mockResult;
      }

      clearInterval(ticker);
      setPipelineStep(3);
      setPipelineCompleted(true);
      setTimeout(() => {
        setRunningScenario(false);
        setActiveScenarioId(null);
        setPipelineCompleted(false);
        setPipelineStep(0);
      }, 1400);

      setAmounts((prev) => ({ ...prev, [result.dispute_id]: scenario.payload.amount }));

      const created_at = new Date().toISOString();
      const summary: DisputeRecord = {
        dispute_id: result.dispute_id,
        network: result.network,
        reason_code: result.reason_code,
        claim_type: result.claim_type,
        decision: result.decision,
        final_status: result.final_status,
        win_probability: result.win_probability,
        iterations_used: result.iterations_used,
        created_at,
      };
      setDisputes((prev) => [
        summary,
        ...prev.filter((d) => d.dispute_id !== result.dispute_id),
      ]);

      const detail: DisputeDetail = {
        dispute_id: result.dispute_id,
        result,
        event_payload: scenario.payload,
        created_at,
      };
      if (!usedBackend) {
        mockCache.current.set(result.dispute_id, detail);
      }
      setSelectedId(result.dispute_id);
      setSelectedDetail(detail);
    },
    [runningScenario]
  );

  const metrics = useMemo(() => computeMetrics(disputes, amounts), [disputes, amounts]);

  return (
    <div className="flex min-h-screen flex-col bg-surface text-ink">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-50 focus:rounded focus:bg-fight focus:px-3 focus:py-1.5 focus:text-sm focus:text-black"
      >
        Skip to main content
      </a>
      <Header
        health={health}
        online={online}
        role={role}
        onRoleChange={setRole}
        runningScenario={runningScenario}
        activeScenarioId={activeScenarioId}
        onRunScenario={(id) => void runScenario(id)}
      />
      <PipelineSteps
        active={runningScenario}
        currentStep={pipelineStep}
        completed={pipelineCompleted}
      />

      <main
        id="main-content"
        className="grid flex-1 grid-cols-1 content-start gap-4 p-4 lg:h-[calc(100vh-124px)] lg:grid-cols-12 lg:overflow-hidden lg:p-5"
      >
        <div className="flex flex-col gap-4 lg:col-span-4 lg:min-h-0">
          <MetricsOverview metrics={metrics} role={role} />
          <div className="min-h-[320px] flex-1 lg:min-h-0">
            <DisputeList
              disputes={disputes}
              amounts={amounts}
              selectedId={selectedId}
              onSelect={(id) => void selectDispute(id)}
            />
          </div>
        </div>

        <div className="lg:col-span-4 lg:min-h-0">
          <AgentReasoningView detail={selectedDetail} />
        </div>

        <div className="lg:col-span-4 lg:min-h-0">
          <DossierViewer
            detail={selectedDetail}
            opsDecision={selectedId ? opsDecisions[selectedId] ?? null : null}
            onOpsDecision={(disputeId, decision) =>
              setOpsDecisions((prev) => ({ ...prev, [disputeId]: decision }))
            }
          />
        </div>
      </main>

      {!online ? (
        <footer className="border-t border-amber-200 bg-amber-50 px-4 py-1.5 text-center">
          <p className="font-mono text-[10px] uppercase tracking-widest text-amber-700">
            FastAPI backend unreachable at localhost:8000 — serving verified fixture responses in mock mode
          </p>
        </footer>
      ) : null}
    </div>
  );
}
