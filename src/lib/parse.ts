import type { AgentSession, Approval, RefusedAction, ToolCall } from "../types";
import {
  isSessionLike,
  normalizeSession,
  parseDurationLabel,
  splitReason,
} from "./session";

const TOOL_LINE =
  /^(?:tool|called|invoked|using|used|ran)s?\s*(?:the\s+)?(?:tool|function|command|skill)?\s*[:\-]\s*[`"'"]?([a-zA-Z][\w./:-]*)/i;
const TOOL_BRACKET = /\[(?:tool|function)[:\s]+([^\]]+)\]/i;
const TOOL_XML = /<(?:tool|invoke|function)_call[^>]*\bname=["']([^"']+)/i;
const TOOL_CALLED =
  /(?:called|invoked|used|using)\s+(?:the\s+)?(?:tool|function|skill)\s+[`"'"]?([a-zA-Z][\w./:-]*)/i;

const KEY_ALIASES: Record<string, string> = {
  title: "title",
  headline: "title",
  summary: "summary",
  description: "summary",
  model: "model",
  stack: "stack",
  runtime: "duration",
  duration: "duration",
  elapsed: "duration",
  source: "source",
  id: "id",
};

export function parseSessionInput(raw: string): AgentSession | null {
  const text = raw.trim();
  if (!text) return null;

  const json = tryParseJson(text);
  if (json) return normalizeSession(json, json.source ? undefined : "json");

  const labeled = parseLabeled(text);
  if (labeled) return labeled;

  return parseHeuristic(text);
}

function tryParseJson(text: string): Record<string, unknown> | null {
  if (!(text.startsWith("{") || text.startsWith("["))) return null;
  try {
    const parsed: unknown = JSON.parse(text);
    if (Array.isArray(parsed) && parsed.length === 1 && isSessionLike(parsed[0])) {
      return parsed[0] as Record<string, unknown>;
    }
    if (isSessionLike(parsed)) return parsed;
  } catch {
    return null;
  }
  return null;
}

function parseLabeled(text: string): AgentSession | null {
  const fields: Record<string, unknown> = {};
  const tools: ToolCall[] = [];
  const approvals: Approval[] = [];
  const refused: RefusedAction[] = [];
  let hits = 0;

  for (const original of text.split(/\r?\n/)) {
    const line = original.trim();
    if (!line || line.startsWith("#")) continue;
    const match = line.match(/^([a-zA-Z][\w.-]*)\s*:\s*(.+)$/);
    if (!match) continue;
    const key = match[1].toLowerCase();
    const value = match[2].trim();
    if (!value) continue;

    if (key === "tool" || key === "tools") {
      tools.push({ name: stripWrap(value), count: 1 });
      hits += 1;
      continue;
    }
    if (key === "approval" || key === "approved" || key === "approve") {
      approvals.push({ action: value });
      hits += 1;
      continue;
    }
    if (
      key === "refuse" ||
      key === "refused" ||
      key === "blocked" ||
      key === "deny" ||
      key === "denied"
    ) {
      const [action, reason] = splitReason(value);
      refused.push({ action, reason });
      hits += 1;
      continue;
    }
    const alias = KEY_ALIASES[key];
    if (alias) {
      fields[alias] = value;
      hits += 1;
    }
  }

  if (hits < 2) return null;
  if (tools.length) fields.tools = tools;
  if (approvals.length) fields.approvals = approvals;
  if (refused.length) fields.refused = refused;
  if (!fields.title && !tools.length) return null;
  return normalizeSession(fields, "paste");
}

function parseHeuristic(text: string): AgentSession {
  const lines = text.split(/\r?\n/);
  const tools: ToolCall[] = [];
  const approvals: Approval[] = [];
  const refused: RefusedAction[] = [];
  const timestamps: number[] = [];
  let model: string | undefined;
  let stack: string | undefined;
  let durationMs: number | undefined;
  let title = "";
  const summaryParts: string[] = [];

  for (const original of lines) {
    const line = original.trim();
    if (!line) continue;

    const ts = line.match(
      /(\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2}(?:\.\d+)?Z?)/,
    );
    if (ts) {
      const ms = Date.parse(ts[1].includes("T") ? ts[1] : ts[1].replace(" ", "T"));
      if (!Number.isNaN(ms)) timestamps.push(ms);
    }

    const tool =
      line.match(TOOL_LINE)?.[1] ||
      line.match(TOOL_BRACKET)?.[1] ||
      line.match(TOOL_XML)?.[1] ||
      line.match(TOOL_CALLED)?.[1];
    if (tool) tools.push({ name: stripWrap(tool), count: 1 });

    if (
      /\bran (?:terminal |shell )?command\b/i.test(line) ||
      /\bterminal\b.*\b(exit|completed)\b/i.test(line)
    ) {
      tools.push({ name: "Shell", count: 1 });
    }
    if (/^read\b/i.test(line) && /\.\w{1,5}\b/.test(line)) {
      tools.push({ name: "Read", count: 1 });
    }
    if (/^(?:edited?|strreplace|apply.?patch)\b/i.test(line)) {
      tools.push({ name: "StrReplace", count: 1 });
    }

    if (/\b(user )?approv(?:ed|al)\b/i.test(line) || /^✓/.test(line)) {
      const action = cleanTail(
        line.replace(/^(?:user\s+)?approv(?:ed|al)\s*[:\-]\s*/i, "").replace(/^✓\s*/, ""),
      );
      if (action) approvals.push({ action });
    }

    if (
      /\b(refus(?:ed|e)|blocked|denied|not allowed)\b/i.test(line) ||
      /^✕|^✗|^×/.test(line)
    ) {
      const action = cleanTail(
        line
          .replace(/^(?:refus(?:ed|e)|blocked|denied)\s*[:\-]\s*/i, "")
          .replace(/^[✕✗×]\s*/, ""),
      );
      if (action) {
        const [item, reason] = splitReason(action);
        refused.push({ action: item, reason });
      }
    }

    const modelMatch = line.match(
      /\bmodel\s*[=:]\s*([a-zA-Z0-9._:./+-]+)/i,
    );
    if (modelMatch) model = modelMatch[1];

    const stackMatch = line.match(/\bstack\s*[=:]\s*(.+)$/i);
    if (stackMatch) stack = stackMatch[1].trim();

    const durationMatch = line.match(
      /\b(?:duration|elapsed|took|runtime)\s*[=:]\s*([^\n,]+)/i,
    );
    if (durationMatch) {
      durationMs = parseDurationLabel(durationMatch[1]) ?? durationMs;
    }

    if (!title && isTitleCandidate(line)) title = stripWrap(line).slice(0, 90);
    else if (summaryParts.length < 2 && isSummaryCandidate(line)) {
      summaryParts.push(stripWrap(line));
    }
  }

  if (durationMs == null && timestamps.length >= 2) {
    durationMs = Math.max(0, Math.max(...timestamps) - Math.min(...timestamps));
  }

  if (!title) {
    const first = lines.map((line) => line.trim()).find(Boolean);
    title = first ? stripWrap(first).slice(0, 90) : "Pasted session";
  }

  return normalizeSession(
    {
      title,
      summary: summaryParts.join(" ").slice(0, 280),
      model,
      stack,
      tools,
      approvals,
      refused,
      runtime: { durationMs },
    },
    "paste",
  );
}

function stripWrap(value: string): string {
  return value.replace(/^[-*•\d.)\s]+/, "").replace(/^[`"'[]+|[`"'\]]+$/g, "").trim();
}

function cleanTail(value: string): string {
  return value.replace(/\s{2,}/g, " ").trim();
}

function isTitleCandidate(line: string): boolean {
  if (line.length < 8 || line.length > 110) return false;
  if (/[{}<>]|https?:\/\//.test(line)) return false;
  if (/^(tool|approval|refuse|model|stack|duration)\b/i.test(line)) return false;
  return /[a-zA-Z]/.test(line);
}

function isSummaryCandidate(line: string): boolean {
  if (line.length < 20) return false;
  if (/^(tool|approval|refuse|model|stack|duration)\b/i.test(line)) return false;
  return !/^[{[]/.test(line);
}
