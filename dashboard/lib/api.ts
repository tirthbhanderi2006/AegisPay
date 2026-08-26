import { SCENARIOS, scenarioSummaries } from "./fixtures";
import type {
  DisputeDetail,
  DisputeRecord,
  DisputeResult,
  EventPayload,
  HealthInfo,
} from "./types";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:8000";
const TIMEOUT_MS = 120_000;

export class BackendUnavailableError extends Error {
  constructor(message = "FastAPI backend unreachable") {
    super(message);
    this.name = "BackendUnavailableError";
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const response = await fetch(`${API_BASE}${path}`, {
      ...init,
      signal: controller.signal,
      headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
      cache: "no-store",
    });
    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      throw new Error(`HTTP ${response.status}: ${detail.slice(0, 200)}`);
    }
    return (await response.json()) as T;
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new BackendUnavailableError("Request timed out");
    }
    if (error instanceof TypeError) {
      throw new BackendUnavailableError();
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

export async function fetchHealth(): Promise<HealthInfo> {
  return request<HealthInfo>("/health");
}

export async function fetchDisputes(): Promise<DisputeRecord[]> {
  return request<DisputeRecord[]>("/disputes");
}

export async function fetchDisputeDetail(disputeId: string): Promise<DisputeDetail> {
  const row = await request<{
    dispute_id: string;
    result: DisputeResult;
    event_payload: EventPayload;
    created_at: string;
  }>(`/disputes/${encodeURIComponent(disputeId)}`);
  return {
    dispute_id: row.dispute_id,
    result: row.result,
    event_payload: row.event_payload,
    created_at: row.created_at,
  };
}

export async function postWebhook(payload: EventPayload): Promise<DisputeResult> {
  return request<DisputeResult>("/webhooks/dispute", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function findScenarioByDisputeId(disputeId: string) {
  return SCENARIOS.find((s) => s.payload.dispute_id === disputeId);
}

export function mockDetails(): DisputeDetail[] {
  return scenarioSummaries();
}
