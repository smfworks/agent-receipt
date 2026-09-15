import { useEffect, useState } from "react";
import type { AgentSession } from "../types";
import { makeQrDataUrl, RECEIPT_LINK } from "../lib/qr";
import { sessionDateLabel, toolTotal } from "../lib/session";

interface ReceiptProps {
  session: AgentSession | null;
}

function barcodeBars(seed: string): number[] {
  const bars: number[] = [];
  for (let i = 0; i < 28; i += 1) {
    const code = seed.charCodeAt(i % seed.length) + i * 7;
    bars.push(1 + (code % 4));
  }
  return bars;
}

export function Receipt({ session }: ReceiptProps) {
  const [qr, setQr] = useState<string>("");

  useEffect(() => {
    let alive = true;
    void makeQrDataUrl(RECEIPT_LINK).then((url) => {
      if (alive) setQr(url);
    });
    return () => {
      alive = false;
    };
  }, []);

  const empty = !session;
  const tools = session?.tools ?? [];
  const total = session ? toolTotal(session) : 0;
  const runtime = session?.runtime.label ?? "—";

  return (
    <article className={empty ? "receipt is-empty" : "receipt"}>
      <header className="r-top">
        <p className="r-kicker">SMF Works</p>
        <h2>Agent Receipt</h2>
        <p className="r-sub">Human-AI lab · session card</p>
      </header>

      <div className="r-meta">
        <span>NO. {session?.id ?? "AR-0000"}</span>
        <span>{session ? sessionDateLabel(session) : "READY"}</span>
      </div>

      <div className="perforation" aria-hidden="true">
        <span />
      </div>

      <section className="r-hero">
        <p className="r-label">Work completed</p>
        <h3>{session?.title ?? "Waiting for a session"}</h3>
        <p className="r-summary">
          {session?.summary ||
            "Paste a transcript or pick a sample to print a shareable card."}
        </p>
      </section>

      <div className="r-rule" />

      <section className="r-lines">
        <div className="r-cols">
          <span>QTY</span>
          <span>TOOL</span>
        </div>
        {tools.length ? (
          tools.map((tool) => (
            <div className="r-line" key={tool.name}>
              <span className="qty">{tool.count}</span>
              <span className="dots" />
              <span className="item">{tool.name}</span>
            </div>
          ))
        ) : (
          <div className="r-line muted">
            <span className="qty">0</span>
            <span className="dots" />
            <span className="item">no tool calls recorded</span>
          </div>
        )}
        <div className="r-line r-total">
          <span className="qty">{total}</span>
          <span className="dots" />
          <span className="item">tool calls</span>
        </div>
      </section>

      {session && session.approvals.length > 0 ? (
        <section className="r-block">
          <p className="r-label">Human approvals</p>
          <ul>
            {session.approvals.map((item) => (
              <li key={item.action}>
                <span className="mark-ok">✓</span>
                <span>
                  {item.action}
                  {item.by ? <em> · {item.by}</em> : null}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {session && session.refused.length > 0 ? (
        <section className="r-block">
          <p className="r-label">Refused / blocked</p>
          <ul>
            {session.refused.map((item) => (
              <li key={item.action}>
                <span className="mark-no">✕</span>
                <span>
                  {item.action}
                  {item.reason ? <em> · {item.reason}</em> : null}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <div className="r-rule" />

      <section className="r-due">
        <p className="r-label">Runtime</p>
        <p className="r-amount">{runtime}</p>
      </section>

      <section className="r-kv">
        {session?.model ? (
          <div>
            <span>Model</span>
            <strong>{session.model}</strong>
          </div>
        ) : null}
        {session?.stack ? (
          <div>
            <span>Stack</span>
            <strong>{session.stack}</strong>
          </div>
        ) : null}
        {!session?.model && !session?.stack ? (
          <div>
            <span>Stack</span>
            <strong>optional · add model or stack</strong>
          </div>
        ) : null}
      </section>

      <div className="r-rule" />

      <div className="barcode" aria-hidden="true">
        {barcodeBars(session?.id ?? "AR-0000").map((width, index) => (
          <i key={index} style={{ width }} />
        ))}
      </div>

      <footer className="r-foot">
        <div className="qr-plate">
          {qr ? <img src={qr} alt="" width={64} height={64} /> : <span className="qr-ph" />}
        </div>
        <div>
          <p>Agent Receipt · SMF Works</p>
          <p className="r-link">smfworks.com</p>
          <p className="r-motto">Judgment stays human.</p>
        </div>
      </footer>
    </article>
  );
}
