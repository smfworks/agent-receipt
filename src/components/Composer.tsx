import type { DragEvent } from "react";
import { PASTE_PLACEHOLDER, SAMPLES } from "../data/samples";

interface ComposerProps {
  raw: string;
  sampleId: string | null;
  dragging: boolean;
  onRawChange: (value: string) => void;
  onSample: (id: string) => void;
  onPickFile: () => void;
  onDragState: (value: boolean) => void;
  onDrop: (event: DragEvent<HTMLElement>) => void;
}

export function Composer({
  raw,
  sampleId,
  dragging,
  onRawChange,
  onSample,
  onPickFile,
  onDragState,
  onDrop,
}: ComposerProps) {
  return (
    <section
      className={`composer${dragging ? " is-dragging" : ""}`}
      onDragEnter={(event) => {
        event.preventDefault();
        onDragState(true);
      }}
      onDragOver={(event) => event.preventDefault()}
      onDragLeave={(event) => {
        if (event.currentTarget.contains(event.relatedTarget as Node)) return;
        onDragState(false);
      }}
      onDrop={onDrop}
    >
      <div className="composer-head">
        <h2>Session</h2>
        <p>Pick a sample, paste a log, or load JSON other tools emit.</p>
      </div>
      <div className="sample-row" role="list">
        {SAMPLES.map((sample) => (
          <button
            key={sample.id}
            type="button"
            role="listitem"
            className={sampleId === sample.id ? "chip is-on" : "chip"}
            onClick={() => onSample(sample.id)}
          >
            <span>{sample.label}</span>
            <small>{sample.blurb}</small>
          </button>
        ))}
      </div>
      <label className="editor-label" htmlFor="session-input">
        Transcript or JSON
      </label>
      <textarea
        id="session-input"
        value={raw}
        onChange={(event) => onRawChange(event.target.value)}
        placeholder={PASTE_PLACEHOLDER}
        spellCheck={false}
        autoComplete="off"
      />
      <div className="composer-foot">
        <button type="button" className="text-btn" onClick={onPickFile}>
          Load JSON file
        </button>
        <span>{raw.trim() ? `${raw.length.toLocaleString()} chars` : "Drop a .json on this panel"}</span>
      </div>
    </section>
  );
}
