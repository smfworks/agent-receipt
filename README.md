# Agent Receipt

Turn any agent session log into a dark, shareable receipt card.

Paste a transcript, pick a sample (Hermes, OpenClaw, or Cursor-style), or load JSON. Agent Receipt prints a screenshot-worthy card: what the agent did, how long it ran, which tools it called, what a human approved, and what it refused. Built for posting on X, LinkedIn, and READMEs.

**Paste a session. Print a card. Share the work — without handing over the log.**

[![MIT License](https://img.shields.io/badge/license-MIT-00D4FF?labelColor=0A0F1F)](LICENSE)

<p align="center">
  <img src="docs/receipt-placeholder.svg" alt="Agent Receipt card — dark navy ticket with ember runtime and cyan type" width="420" />
</p>

<p align="center"><em>Placeholder — swap in a PNG from Download PNG once you print a live card (<code>docs/receipt.png</code>).</em></p>

## Why a receipt?

Agent work disappears into chat scrolls. A receipt is small enough to screenshot and specific enough to be interesting: runtime, tool counts, approvals, and blocked actions. It is a lab artifact, not a dashboard.

Judgment stays human. The card is the proof.

## Quickstart

```bash
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

```bash
npm run build
npm run preview
```

Node 20+ (22 recommended). Client-side only — no auth, no backend, no secrets.

## Use it

1. Pick **Hermes**, **OpenClaw**, or **Cursor**, or paste a session log / JSON blob.
2. The receipt renders immediately.
3. **Download PNG**, **Copy image**, or **Copy share text** (compact stats + emoji grid for X).
4. **Reset** clears the compositor.

Drop a `.json` file onto the session panel, or use **Load JSON file**. Other tools can emit the schema below and print here.

## Session JSON schema

Canonical file: [`public/schema/agent-session.schema.json`](public/schema/agent-session.schema.json)

Minimal example:

```json
{
  "title": "Shipped Hermes-on-Omarchy boot",
  "summary": "Ollama user unit and desktop autostart so the agent comes up with the machine.",
  "runtime": { "durationMs": 862000 },
  "model": "qwen2.5-coder:32b",
  "stack": "Hermes · Omarchy Linux · Ollama",
  "tools": [
    { "name": "shell", "count": 6 },
    { "name": "write", "count": 3 }
  ],
  "approvals": [{ "action": "enable ollama.service", "by": "michael" }],
  "refused": [
    {
      "action": "publish .env to a public gist",
      "reason": "secrets hygiene"
    }
  ]
}
```

| Field | Required | Notes |
| --- | --- | --- |
| `title` | yes | Headline printed on the card |
| `summary` | yes | One or two sentences |
| `runtime.durationMs` | no | Also accepts `runtime.label` (`14m 22s`) |
| `runtime.startedAt` / `endedAt` | no | ISO-8601; duration derived if ms omitted |
| `tools` | no | `{name, count}` or an array of name strings |
| `approvals` | no | `{action, by?, at?}` or strings |
| `refused` | no | `{action, reason?}` or strings (`action \| reason`) |
| `model` / `stack` | no | Printed in the footer block |
| `id` | no | Receipt number; `AR-xxxx` generated when missing |
| `transcript` | no | Ignored by the printer; useful for round-trips |

Paste also understands a labeled log:

```
title: Landed the LAR hardening PR
summary: Imported the notes that actually landed.
duration: 22m 51s
tool: Read
tool: Shell
approval: open draft pull request to main
refuse: force-push to main | protected branch
model: Composer
stack: Cursor · LAR
```

Messy transcripts are parsed heuristically (tool lines, timestamps, approval/refuse keywords). Prefer JSON when you control the emitter.

## Samples

Polished sessions live in [`public/samples/`](public/samples/):

| File | Agent | What it shows |
| --- | --- | --- |
| `hermes-omarchy-boot.json` | Hermes | Boot + autostart, secrets refuse |
| `openclaw-inbox-triage.json` | OpenClaw | Inbox triage, two holds for review |
| `cursor-pr-ship.json` | Cursor | Hardening PR, protected-branch refuse |

## Host a demo

Static files from `npm run build` (output: `dist/`).

Or Docker:

```bash
docker build -t agent-receipt .
docker run --rm -p 8080:80 agent-receipt
```

Then open [http://localhost:8080](http://localhost:8080).

## Stack

Vite + React + TypeScript. PNG export is client-side via `html-to-image`. QR points at [smfworks.com](https://smfworks.com). Fonts: Inter, Space Grotesk, JetBrains Mono. Palette: navy `#0A0F1F`, ember `#ea580c`, cyan `#00D4FF`.

## Built by SMF Works

[SMF Works](https://smfworks.com) is a human-AI research lab. We publish what we learn, ship open agent tools, and install stacks on hardware you own.

Intelligence is abundant. Judgment is the product.

- Lab: [smfworks.com](https://smfworks.com)
- GitHub: [github.com/smfworks](https://github.com/smfworks)
- X: [@MichaelGannotti](https://x.com/MichaelGannotti)

MIT licensed. No medical or legal claims. This is a shareable card, not an audit.

## License

[MIT](LICENSE) © 2026 SMF Works
