"use client";

/* Rich reply widgets: rug-check report, trending sparklines, sentiment bar, wallet tiles */

function WidgetHead({ icon, title, demo, children }) {
  return (
    <div className="widget-head">
      <svg viewBox="0 0 24 24">
        <use href={`#${icon}`} />
      </svg>
      <span className="widget-title">{title}</span>
      {children}
      {demo ? <span className="demo-tag">DEMO DATA</span> : null}
    </div>
  );
}

export function Sparkline({ data, up }) {
  if (!data || data.length < 2) return null;
  const w = 84,
    h = 24,
    pad = 2;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const pts = data
    .map((v, i) => {
      const x = pad + (i * (w - pad * 2)) / (data.length - 1);
      const y = h - pad - ((v - min) / range) * (h - pad * 2);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`}>
      <polyline
        points={pts}
        fill="none"
        stroke={up ? "var(--accent)" : "var(--red)"}
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function RugcheckWidget({ reply }) {
  const score = Math.min(100, Math.max(0, reply.riskScore ?? 0));
  const cls = score < 34 ? "low" : score < 67 ? "med" : "high";
  return (
    <div className="widget">
      <WidgetHead icon="i-shield" title="Rug Check Report" demo={reply.demo}>
        <span className={`verdict-pill ${cls}`}>{reply.verdict}</span>
      </WidgetHead>
      <div style={{ marginBottom: 10 }}>
        <span className="addr-chip">{reply.address}</span>
      </div>
      <div className="gauge">
        <div className="gauge-track">
          <div className="gauge-marker" style={{ left: `${score}%` }} />
        </div>
        <div className="gauge-labels">
          <span>SAFER</span>
          <span>Risk score: {score}/100</span>
          <span>RISKIER</span>
        </div>
      </div>
      {(reply.checks || []).map((c, i) => (
        <div className={`check-row ${c.ok ? "ok" : "warn"}`} key={i}>
          <span className="ic">
            <svg viewBox="0 0 24 24">
              <use href={`#${c.ok ? "i-check" : "i-alert"}`} />
            </svg>
          </span>
          <span>
            <b>{c.label}</b> — {c.note}
          </span>
        </div>
      ))}
      {reply.summary ? (
        <div style={{ marginTop: 10, fontSize: 13, color: "var(--text-3)" }}>{reply.summary}</div>
      ) : null}
    </div>
  );
}

function TrendingWidget({ reply }) {
  return (
    <div className="widget">
      <WidgetHead icon="i-trend" title="Trending on 𝕏" demo={reply.demo} />
      {(reply.items || []).map((it, i) => (
        <div className="trend-row" key={it.ticker + i}>
          <span className="rank">{i + 1}</span>
          <span className="tk">{it.ticker}</span>
          <span className="meta">
            {Number(it.mentions).toLocaleString()} mentions · {it.senti}
          </span>
          <span className="spark">
            <Sparkline data={it.spark} up={it.change >= 0} />
          </span>
          <span className={`chg-badge ${it.change >= 0 ? "up" : "down"}`}>
            {it.change >= 0 ? "+" : ""}
            {it.change}%
          </span>
        </div>
      ))}
    </div>
  );
}

function SentimentWidget({ reply }) {
  return (
    <div className="widget">
      <WidgetHead icon="i-sparkle" title={`𝕏 Sentiment — ${reply.ticker}`} demo={reply.demo} />
      <div className="senti-bar">
        <span className="b" style={{ width: `${reply.bullish}%` }} />
        <span className="n" style={{ width: `${reply.neutral}%` }} />
        <span className="r" style={{ width: `${reply.bearish}%` }} />
      </div>
      <div className="senti-legend">
        <span>
          <i style={{ background: "var(--accent)" }} />
          Bullish {reply.bullish}%
        </span>
        <span>
          <i style={{ background: "var(--text-4)" }} />
          Neutral {reply.neutral}%
        </span>
        <span>
          <i style={{ background: "var(--red)" }} />
          Bearish {reply.bearish}%
        </span>
        <span style={{ marginLeft: "auto" }}>{Number(reply.posts).toLocaleString()} posts · 24h</span>
      </div>
      {reply.note ? <div style={{ marginTop: 10, fontSize: 13, color: "var(--text-3)" }}>{reply.note}</div> : null}
    </div>
  );
}

function WalletWidget({ reply }) {
  return (
    <div className="widget">
      <WidgetHead icon="i-wallet" title="Wallet Analysis" demo={reply.demo} />
      <div style={{ marginBottom: 10 }}>
        <span className="addr-chip">{reply.address}</span>
      </div>
      <div className="stat-grid">
        {(reply.stats || []).map((s) => (
          <div className="stat-tile" key={s.label}>
            <div className="k">{s.label}</div>
            <div className="v">{s.value}</div>
          </div>
        ))}
      </div>
      {(reply.flags || []).map((f, i) => (
        <div className="check-row ok" style={{ marginTop: 8 }} key={i}>
          <span className="ic">
            <svg viewBox="0 0 24 24">
              <use href="#i-check" />
            </svg>
          </span>
          <span>{f}</span>
        </div>
      ))}
    </div>
  );
}

export default function Widget({ reply }) {
  if (!reply || typeof reply !== "object") return null;
  switch (reply.kind) {
    case "rugcheck":
      return <RugcheckWidget reply={reply} />;
    case "trending":
      return <TrendingWidget reply={reply} />;
    case "sentiment":
      return <SentimentWidget reply={reply} />;
    case "wallet":
      return <WalletWidget reply={reply} />;
    default:
      return null;
  }
}
