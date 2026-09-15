interface ActionsProps {
  disabled: boolean;
  busy: "png" | "copy" | "share" | null;
  onDownload: () => void;
  onCopyImage: () => void;
  onCopyShare: () => void;
  onReset: () => void;
}

export function Actions({
  disabled,
  busy,
  onDownload,
  onCopyImage,
  onCopyShare,
  onReset,
}: ActionsProps) {
  return (
    <div className="actions">
      <button
        type="button"
        className="btn btn-ember"
        disabled={disabled || busy !== null}
        onClick={onDownload}
      >
        {busy === "png" ? "Printing…" : "Download PNG"}
      </button>
      <button
        type="button"
        className="btn"
        disabled={disabled || busy !== null}
        onClick={onCopyImage}
      >
        {busy === "copy" ? "Copying…" : "Copy image"}
      </button>
      <button
        type="button"
        className="btn"
        disabled={disabled || busy !== null}
        onClick={onCopyShare}
      >
        {busy === "share" ? "Copying…" : "Copy share text"}
      </button>
      <button type="button" className="btn btn-ghost" onClick={onReset}>
        Reset
      </button>
    </div>
  );
}
