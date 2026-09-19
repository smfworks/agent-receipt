import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import { parseSessionInput } from "./parse.ts";
import { formatDuration, isSessionLike, parseDurationLabel } from "./session.ts";

const sampleDir = join(fileURLToPath(new URL(".", import.meta.url)), "../../public/samples");

function loadSample(id: string): string {
  return readFileSync(join(sampleDir, `${id}.json`), "utf8");
}

describe("parseSessionInput", () => {
  it("returns null for empty paste", () => {
    assert.equal(parseSessionInput("   "), null);
  });

  it("reads labeled fields", () => {
    const session = parseSessionInput(`
title: Inbox triage
summary: Drafted four replies
tool: mail.search
tool: mail.draft
approval: send vendor reply
refused: send payment authorization — consequential
duration: 8m 4s
`);
    assert.ok(session);
    assert.equal(session.title, "Inbox triage");
    assert.ok(session.tools.some((tool) => tool.name === "mail.search"));
    assert.ok(session.approvals.length >= 1);
    assert.ok(session.refused.length >= 1);
  });

  it("ingests shipped JSON samples", () => {
    for (const id of ["openclaw-inbox-triage", "cursor-pr-ship", "hermes-omarchy-boot"]) {
      const session = parseSessionInput(loadSample(id));
      assert.ok(session, id);
      assert.ok(session.title, id);
      assert.ok(session.tools.length >= 1, id);
    }
  });
});

describe("isSessionLike", () => {
  it("accepts title, tools, or summary", () => {
    assert.equal(isSessionLike({ title: "Run" }), true);
    assert.equal(isSessionLike({ tools: [] }), true);
    assert.equal(isSessionLike({ summary: "Did a thing" }), true);
    assert.equal(isSessionLike({ foo: 1 }), false);
    assert.equal(isSessionLike(null), false);
  });
});

describe("duration", () => {
  it("parses compact labels and formats ms", () => {
    assert.equal(parseDurationLabel("8m 4s"), 484_000);
    assert.equal(formatDuration(484_000), "8m 04s");
    assert.equal(formatDuration(undefined), "—");
  });
});
