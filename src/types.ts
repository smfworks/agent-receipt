export type SessionSource =
  | "hermes"
  | "openclaw"
  | "cursor"
  | "json"
  | "paste";

export interface ToolCall {
  name: string;
  count: number;
}

export interface Approval {
  action: string;
  by?: string;
  at?: string;
}

export interface RefusedAction {
  action: string;
  reason?: string;
}

export interface Runtime {
  startedAt?: string;
  endedAt?: string;
  durationMs?: number;
  label?: string;
}

export interface AgentSession {
  id: string;
  title: string;
  summary: string;
  runtime: Runtime;
  model?: string;
  stack?: string;
  tools: ToolCall[];
  approvals: Approval[];
  refused: RefusedAction[];
  source?: SessionSource;
}

export interface SampleMeta {
  id: string;
  file: string;
  label: string;
  blurb: string;
}
