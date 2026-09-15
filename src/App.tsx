import { SAMPLES } from "./data/samples";
import { parseSessionInput } from "./lib/parse";
import { isSessionLike, normalizeSession, slugify } from "./lib/session";
import {
  copyImageBlob,
  copyText,
  downloadBlob,
  receiptToPngBlob,
} from "./lib/exportImage";
import type { AgentSession } from "./types";
import { Actions } from "./components/Actions";
import { Composer } from "./components/Composer";
import { Header } from "./components/Header";
import { Receipt } from "./components/Receipt";
import { Toast } from "./components/Toast";
import { formatCompactStats, formatShareText } from "./lib/share";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { DragEvent } from "react";

export default function App() {
  const [raw, setRaw] = useState("");
  const [session, setSession] = useState<AgentSession | null>(null);
  const [sampleId, setSampleId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [busy, setBusy] = useState<"png" | "copy" | "share" | null>(null);
  const [dragging, setDragging] = useState(false);
  const frameRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const showToast = useCallback((message: string) => {
    setToast(message);
  }, []);

  useEffect(() => {
    if (!toast) return;
    const id = window.setTimeout(() => setToast(null), 2400);
    return () => window.clearTimeout(id);
  }, [toast]);

  useEffect(() => {
    const handle = window.setTimeout(() => {
      setSession(parseSessionInput(raw));
    }, 120);
    return () => window.clearTimeout(handle);
  }, [raw]);

  const loadJsonObject = useCallback(
    (value: unknown, selected?: string) => {
      if (!isSessionLike(value)) {
        showToast("JSON needs a title, summary, or tools array.");
        return;
      }
      const next = normalizeSession(value, "json");
      setSession(next);
      setRaw(JSON.stringify(value, null, 2));
      setSampleId(selected ?? null);
    },
    [showToast],
  );

  const loadSample = useCallback(
    async (id: string) => {
      const sample = SAMPLES.find((item) => item.id === id);
      if (!sample) return;
      try {
        const response = await fetch(sample.file);
        if (!response.ok) throw new Error("missing sample");
        const data: unknown = await response.json();
        loadJsonObject(data, id);
      } catch {
        showToast("Could not load that sample.");
      }
    },
    [loadJsonObject, showToast],
  );

  const onFile = useCallback(
    async (file: File) => {
      const text = await file.text();
      setSampleId(null);
      if (file.name.endsWith(".json") || text.trim().startsWith("{")) {
        try {
          loadJsonObject(JSON.parse(text));
          return;
        } catch {
          // Fall through to paste parsing.
        }
      }
      setRaw(text);
    },
    [loadJsonObject],
  );

  const reset = useCallback(() => {
    setRaw("");
    setSession(null);
    setSampleId(null);
    showToast("Cleared.");
  }, [showToast]);

  const withFrame = useCallback(async () => {
    const node = frameRef.current;
    if (!node || !session) throw new Error("Nothing to print yet.");
    node.classList.add("is-exporting");
    await new Promise((resolve) => requestAnimationFrame(() => resolve(null)));
    try {
      return await receiptToPngBlob(node);
    } finally {
      node.classList.remove("is-exporting");
    }
  }, [session]);

  const downloadPng = useCallback(async () => {
    if (!session) return;
    setBusy("png");
    try {
      const blob = await withFrame();
      downloadBlob(blob, `agent-receipt-${slugify(session.title)}.png`);
      showToast("PNG downloaded.");
    } catch (error) {
      showToast(error instanceof Error ? error.message : "PNG export failed.");
    } finally {
      setBusy(null);
    }
  }, [session, showToast, withFrame]);

  const copyImage = useCallback(async () => {
    if (!session) return;
    setBusy("copy");
    try {
      const blob = await withFrame();
      await copyImageBlob(blob);
      showToast("Image copied.");
    } catch (error) {
      showToast(
        error instanceof Error
          ? error.message
          : "Copy image failed — try Download PNG.",
      );
    } finally {
      setBusy(null);
    }
  }, [session, showToast, withFrame]);

  const copyShare = useCallback(async () => {
    if (!session) return;
    setBusy("share");
    try {
      await copyText(formatShareText(session));
      showToast("Share text copied.");
    } catch {
      showToast("Could not copy share text.");
    } finally {
      setBusy(null);
    }
  }, [session, showToast]);

  const onDrop = useCallback(
    (event: DragEvent<HTMLElement>) => {
      event.preventDefault();
      setDragging(false);
      const file = event.dataTransfer.files?.[0];
      if (file) void onFile(file);
    },
    [onFile],
  );

  const live = useMemo(
    () => (session ? `${session.title} · ${session.runtime.label}` : "Waiting for a session"),
    [session],
  );

  return (
    <div className="page">
      <div className="ambient" aria-hidden="true" />
      <Header />
      <main className="layout">
        <Composer
          raw={raw}
          sampleId={sampleId}
          dragging={dragging}
          onRawChange={(value) => {
            setSampleId(null);
            setRaw(value);
          }}
          onSample={loadSample}
          onPickFile={() => fileRef.current?.click()}
          onDragState={setDragging}
          onDrop={onDrop}
        />
        <section className="stage" aria-label="Receipt preview">
          <p className="sr-only" aria-live="polite">
            {live}
          </p>
          <div className="stage-scroll">
            <div ref={frameRef} className="export-frame">
              <Receipt session={session} />
            </div>
          </div>
          {session ? (
            <p className="stage-stats">{formatCompactStats(session)}</p>
          ) : null}
          <Actions
            disabled={!session}
            busy={busy}
            onDownload={downloadPng}
            onCopyImage={copyImage}
            onCopyShare={copyShare}
            onReset={reset}
          />
        </section>
      </main>
      <footer className="site-foot">
        <p>Intelligence is abundant. Judgment is the product.</p>
        <p>
          MIT · Built by{" "}
          <a href="https://smfworks.com" rel="noreferrer" target="_blank">
            SMF Works
          </a>
          {" · "}
          <a
            href="https://github.com/smfworks/agent-receipt"
            rel="noreferrer"
            target="_blank"
          >
            GitHub
          </a>
        </p>
      </footer>
      <input
        ref={fileRef}
        className="sr-only"
        type="file"
        accept="application/json,.json,.txt,.log,.md"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) void onFile(file);
          event.target.value = "";
        }}
      />
      <Toast message={toast} />
    </div>
  );
}
