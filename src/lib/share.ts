import type { AgentSession } from "../types";
import { toolTotal } from "./session";

const SHARE_URL = "https://smfworks.com";

export function formatShareText(session: AgentSession): string {
  const tools = toolTotal(session);
  const runtime = session.runtime.label || "—";
  const toolGlyphs = "🔧".repeat(Math.min(24, Math.max(1, tools)));
  const wrapped = wrapGlyphs(toolGlyphs, 8);
  const approved = "✅".repeat(Math.min(8, session.approvals.length));
  const blocked = "🚫".repeat(Math.min(8, session.refused.length));
  const flags = [approved, blocked].filter(Boolean).join(" ") || "·";
  const stackBits = [session.stack, session.model].filter(Boolean).join(" · ");

  const lines = [
    "🧾 Agent Receipt",
    session.title,
    `⏱ ${runtime} · 🛠 ${tools} · ✅ ${session.approvals.length} · 🚫 ${session.refused.length}`,
    wrapped,
    flags,
  ];
  if (stackBits) lines.push(stackBits);
  lines.push("Agent Receipt · SMF Works", SHARE_URL);
  return lines.join("\n");
}

function wrapGlyphs(value: string, width: number): string {
  const chars = Array.from(value);
  const rows: string[] = [];
  for (let i = 0; i < chars.length; i += width) {
    rows.push(chars.slice(i, i + width).join(""));
  }
  return rows.join("\n");
}

export function formatCompactStats(session: AgentSession): string {
  return `${session.runtime.label || "—"} · ${toolTotal(session)} tools · ${session.approvals.length} approvals · ${session.refused.length} blocked`;
}
