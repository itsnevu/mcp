"use client";

import { useEffect, useState } from "react";
import { useI18n } from "@/lib/I18nContext";

/* This component renders /api/prices (GeckoTerminal → DexScreener, see lib/priceFeed.js) and NOTHING
   ELSE. When the feed is down it says so and shows no numbers. There is no substitute row,
   no last-known value, no zero — a made-up price on a trading surface is not a cosmetic bug. */

const REFRESH_MS = 30_000;

function Row({ item, ariaHidden }) {
  return (
    <span className="tick-item" aria-hidden={ariaHidden}>
      <span className="pair">{item.pair}</span>
      <span className="px">{item.price}</span>
      {/* No 24h figure from upstream means we do not know it. "+0.0%" would be a claim that
          the price held flat, which is not the same thing as not knowing. Render nothing. */}
      {item.change === null ? null : (
        <span className={"chg " + (item.up ? "up" : "down")}>
          {item.up ? "+" : ""}
          {item.change}%
        </span>
      )}
    </span>
  );
}

function Half({ items, ariaHidden }) {
  return (
    <>
      {items.map((item) => (
        <Row key={item.pair + (ariaHidden ? "-b" : "-a")} item={item} ariaHidden={ariaHidden} />
      ))}
    </>
  );
}

export default function TickerTape() {
  const { t } = useI18n();
  const [items, setItems] = useState([]);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const controllers = new Set();

    const load = async () => {
      const ctrl = new AbortController();
      controllers.add(ctrl);
      try {
        const res = await fetch("/api/prices", { signal: ctrl.signal, cache: "no-store" });
        const data = await res.json().catch(() => null);
        if (cancelled) return;
        /* Only a payload with actual rows counts as success. A 503 with items:[] is the feed
           telling us it has nothing — and the correct render for nothing is nothing. */
        if (data?.ok && Array.isArray(data.items) && data.items.length) {
          setItems(data.items);
          setFailed(false);
        } else {
          setItems([]);
          setFailed(true);
        }
      } catch {
        if (!cancelled) {
          setItems([]);
          setFailed(true);
        }
      } finally {
        controllers.delete(ctrl);
      }
    };

    load();
    const timer = setInterval(load, REFRESH_MS);
    return () => {
      cancelled = true;
      clearInterval(timer);
      for (const ctrl of controllers) ctrl.abort();
      controllers.clear();
    };
  }, []);

  if (failed) {
    return (
      <div className="ticker">
        <div className="ticker-static">
          <span className="tick-chip tick-chip-off">{t("ticker.unavailable")}</span>
        </div>
      </div>
    );
  }

  // First paint, before the feed has answered. An empty strip beats a fabricated one.
  if (!items.length) {
    return (
      <div className="ticker">
        <div className="ticker-static">
          <span className="tick-chip tick-chip-off">{t("ticker.loading")}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="ticker">
      <div className="ticker-track">
        {/* content duplicated for a seamless -50% translate loop */}
        <Half items={items} ariaHidden={false} />
        <Half items={items} ariaHidden={true} />
      </div>
    </div>
  );
}
