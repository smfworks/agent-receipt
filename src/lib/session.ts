import type {
  AgentSession,
  Approval,
  RefusedAction,
  Runtime,
  SessionSource,
  ToolCall,
} from "../types";

const SOURCE_VALUES: SessionSource[] = [
  "hermes",
  "openclaw",
  "cursor",
  "json",
  "paste",
];

export function formatDuration(ms?: number, fallback?: string): string {
  if (fallback && fallback.trim()) return fallback.trim();
  if (ms == null || !Number.isFinite(ms) || ms < 0) return "—";
  if (ms < 1000) return `${Math.round(ms)}ms`;
  if (ms < 60_000) {
    const seconds = ms / 1000;
    return seconds < 10 ? `${seconds.toFixed(1)}s` : `${Math.round(seconds)}s`;
  }
  const totalSeconds = Math.round(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (hours > 0) {
    return `${hours}h ${minutes.toString().padStart(2, "0")}m`;
  }
  return `${minutes}m ${seconds.toString().padStart(2, "0")}s`;
}

export function parseDurationLabel(label: string): number | undefined {
  const text = label.trim().toLowerCase();
  if (!text) return undefined;

  const iso = text.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))$/);
  if (iso) {
    const a = Number(iso[1]);
    const b = Number(iso[2]);
    const c = iso[3] != null ? Number(iso[3]) : undefined;
    if (c != null) return ((a * 60 + b) * 60 + c) * 1000;
    return (a * 60 + b) * 1000;
  }

  let ms = 0;
  let matched = false;
  const hours = text.match(/(\d+(?:\.\d+)?)\s*h(?:ours?)?\b/);
  const minutes = text.match(/(\d+(?:\.\d+)?)\s*m(?:in(?:ute)?s?)?\b/);
  const seconds = text.match(/(\d+(?:\.\d+)?)\s*s(?:ec(?:ond)?s?)?\b/);
  const millis = text.match(/(\d+(?:\.\d+)?)\s*ms\b/);
  if (hours) {
    ms += Number(hours[1]) * 3_600_000;
    matched = true;
  }
  if (minutes) {
    ms += Number(minutes[1]) * 60_000;
    matched = true;
  }
  if (seconds) {
    ms += Number(seconds[1]) * 1000;
    matched = true;
  }
  if (millis) {
    ms += Number(millis[1]);
    matched = true;
  }
  return matched ? Math.round(ms) : undefined;
}

export function toolTotal(session: AgentSession): number {
  return session.tools.reduce((sum, tool) => sum + tool.count, 0);
}

export function sessionDateLabel(session: AgentSession): string {
  const iso = session.runtime.endedAt || session.runtime.startedAt;
  if (!iso) return formatToday();
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return formatToday();
  return formatReceiptDate(date);
}

export function formatToday(): string {
  return formatReceiptDate(new Date());
}

const MONTHS = [
  "JAN",
  "FEB",
  "MAR",
  "APR",
  "MAY",
  "JUN",
  "JUL",
  "AUG",
  "SEP",
  "OCT",
  "NOV",
  "DEC",
];

export function formatReceiptDate(date: Date): string {
  const dd = String(date.getUTCDate()).padStart(2, "0");
  const yy = String(date.getUTCFullYear()).slice(-2);
  return `${dd} ${MONTHS[date.getUTCMonth()]} ${yy}`;
}

export function slugify(value: string): string {
  const slug = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
  return slug || "session";
}

export function hashId(input: string): string {
  let hash = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).slice(0, 4).toUpperCase().padStart(4, "0");
}

export function coalesceTools(tools: ToolCall[]): ToolCall[] {
  const counts = new Map<string, number>();
  const order: string[] = [];
  for (const tool of tools) {
    const name = tool.name.trim();
    if (!name) continue;
    const count = Math.max(1, Math.round(tool.count) || 1);
    if (!counts.has(name)) order.push(name);
    counts.set(name, (counts.get(name) ?? 0) + count);
  }
  return order.map((name) => ({ name, count: counts.get(name) ?? 1 }));
}

function asString(value: unknown): string | undefined {
  if (typeof value === "string" && value.trim()) return value.trim();
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return undefined;
}

function asNumber(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const n = Number(value);
    if (Number.isFinite(n)) return n;
  }
  return undefined;
}

function parseTools(raw: unknown): ToolCall[] {
  if (!Array.isArray(raw)) return [];
  const tools: ToolCall[] = [];
  for (const item of raw) {
    if (typeof item === "string" && item.trim()) {
      tools.push({ name: item.trim(), count: 1 });
      continue;
    }
    if (item && typeof item === "object") {
      const record = item as Record<string, unknown>;
      const name = asString(record.name) || asString(record.tool);
      if (!name) continue;
      tools.push({ name, count: asNumber(record.count) ?? 1 });
    }
  }
  return coalesceTools(tools);
}

function parseApprovals(raw: unknown): Approval[] {
  if (!Array.isArray(raw)) return [];
  const out: Approval[] = [];
  for (const item of raw) {
    if (typeof item === "string" && item.trim()) {
      out.push({ action: item.trim() });
      continue;
    }
    if (item && typeof item === "object") {
      const record = item as Record<string, unknown>;
      const action =
        asString(record.action) ||
        asString(record.item) ||
        asString(record.name);
      if (!action) continue;
      out.push({
        action,
        by: asString(record.by),
        at: asString(record.at),
      });
    }
  }
  return out;
}

function parseRefused(raw: unknown): RefusedAction[] {
  if (!Array.isArray(raw)) return [];
  const out: RefusedAction[] = [];
  for (const item of raw) {
    if (typeof item === "string" && item.trim()) {
      const [action, reason] = splitReason(item.trim());
      out.push({ action, reason });
      continue;
    }
    if (item && typeof item === "object") {
      const record = item as Record<string, unknown>;
      const action =
        asString(record.action) ||
        asString(record.item) ||
        asString(record.name);
      if (!action) continue;
      out.push({
        action,
        reason: asString(record.reason),
      });
    }
  }
  return out;
}

export function splitReason(line: string): [string, string | undefined] {
  const parts = line.split(/\s*[|—–-]\s+reason:\s*/i);
  if (parts.length === 2) return [parts[0].trim(), parts[1].trim()];
  const pipe = line.split(/\s+\|\s+/);
  if (pipe.length === 2) return [pipe[0].trim(), pipe[1].trim()];
  return [line, undefined];
}

function parseRuntime(raw: unknown, fallbackLabel?: string): Runtime {
  const record =
    raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const startedAt = asString(record.startedAt);
  const endedAt = asString(record.endedAt);
  let durationMs = asNumber(record.durationMs);
  const label = asString(record.label) || fallbackLabel;
  if (durationMs == null && startedAt && endedAt) {
    const start = Date.parse(startedAt);
    const end = Date.parse(endedAt);
    if (!Number.isNaN(start) && !Number.isNaN(end) && end >= start) {
      durationMs = end - start;
    }
  }
  if (durationMs == null && label) durationMs = parseDurationLabel(label);
  return {
    startedAt,
    endedAt,
    durationMs,
    label: formatDuration(durationMs, label),
  };
}

function parseSource(raw: unknown): SessionSource | undefined {
  if (typeof raw !== "string") return undefined;
  const value = raw.trim().toLowerCase();
  return SOURCE_VALUES.find((item) => item === value);
}

export function normalizeSession(
  raw: Record<string, unknown>,
  source?: SessionSource,
): AgentSession {
  const title = asString(raw.title) || "Untitled session";
  const summary = asString(raw.summary) || asString(raw.description) || "";
  const idRaw = asString(raw.id);
  const runtime = parseRuntime(
    raw.runtime,
    asString(raw.duration) || asString(raw.runtimeLabel),
  );
  const tools = parseTools(raw.tools);
  const seed = `${title}|${summary}|${tools.map((t) => t.name).join(",")}`;
  return {
    id: idRaw && /^AR-/i.test(idRaw) ? idRaw.toUpperCase() : `AR-${hashId(idRaw || seed)}`,
    title,
    summary,
    runtime,
    model: asString(raw.model),
    stack: asString(raw.stack) || asString(raw.runtimeName),
    tools,
    approvals: parseApprovals(raw.approvals),
    refused: parseRefused(raw.refused ?? raw.blocked ?? raw.denied),
    source: parseSource(raw.source) || source,
  };
}

export function isSessionLike(value: unknown): value is Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const record = value as Record<string, unknown>;
  return (
    typeof record.title === "string" ||
    Array.isArray(record.tools) ||
    typeof record.summary === "string"
  );
}
