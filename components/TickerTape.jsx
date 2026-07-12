"use client";

const TICKER_DATA = [
  { pair: "HOOD/USDG", px: "2.4180", chg: 3.2 },
  { pair: "RBHX/USDG", px: "0.0841", chg: -1.4 },
  { pair: "SNOW/USDG", px: "1.2250", chg: 0.8 },
  { pair: "WOOD/USDG", px: "0.00421", chg: 12.5 },
  { pair: "R0X/USDG", px: "0.5510", chg: -2.1 },
  { pair: "GLD/USDG", px: "4.1030", chg: 0.3 },
  { pair: "ARROW/USDG", px: "0.0192", chg: 45.7 },
  { pair: "FEATH/USDG", px: "0.3305", chg: -5.8 },
];

function Half({ ariaHidden }) {
  return (
    <>
      <span className="tick-chip" aria-hidden={ariaHidden}>
        DEMO FEED
      </span>
      {TICKER_DATA.map((t) => (
        <span className="tick-item" key={t.pair + (ariaHidden ? "-b" : "-a")} aria-hidden={ariaHidden}>
          <span className="pair">{t.pair}</span>
          <span className="px">{t.px}</span>
          <span className={"chg " + (t.chg >= 0 ? "up" : "down")}>
            {t.chg >= 0 ? "+" : ""}
            {t.chg}%
          </span>
        </span>
      ))}
    </>
  );
}

export default function TickerTape() {
  return (
    <div className="ticker">
      <div className="ticker-track">
        {/* content duplicated for a seamless -50% translate loop */}
        <Half ariaHidden={false} />
        <Half ariaHidden={true} />
      </div>
    </div>
  );
}
