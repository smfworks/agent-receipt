import type { SampleMeta } from "../types";

export const SAMPLES: SampleMeta[] = [
  {
    id: "hermes",
    file: "/samples/hermes-omarchy-boot.json",
    label: "Hermes",
    blurb: "Omarchy boot + autostart",
  },
  {
    id: "openclaw",
    file: "/samples/openclaw-inbox-triage.json",
    label: "OpenClaw",
    blurb: "Inbox triage with review",
  },
  {
    id: "cursor",
    file: "/samples/cursor-pr-ship.json",
    label: "Cursor",
    blurb: "Hardening PR to main",
  },
];

export const PASTE_PLACEHOLDER = `Paste JSON or a session log.

title: Shipped Hermes-on-Omarchy boot
summary: Agent comes up with the machine.
duration: 14m 22s
tool: shell
tool: write
approval: enable ollama.service
refuse: publish .env to a gist | secrets hygiene
model: qwen2.5-coder:32b
stack: Hermes · Omarchy Linux`;
