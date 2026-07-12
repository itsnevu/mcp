import { ImageResponse } from "next/og";
import { APP_NAME, CHAIN_NAME } from "./chatContract";
import { OG_LOGO_DATA_URI } from "./ogLogo";

/* Facebook, X, LinkedIn, Slack, Discord and iMessage all crop toward 1.91:1.
   1200x630 is the size every one of them accepts without re-encoding. */
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const ACCENT = "#cbda1b";
const BACKGROUND = "#0a0a0a";

/* Satori (what renders this) implements a flexbox subset — no grid, no cascade,
   and every element holding more than one child needs an explicit display. Styles
   here are deliberately verbose for that reason, not by accident. */
export function ogImage({ eyebrow, title, subtitle }) {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: BACKGROUND,
          padding: "72px",
          fontFamily: "sans-serif",
          position: "relative",
        }}
      >
        {/* Accent wash in the corner, so the card reads as ours at thumbnail size
            where the wordmark is already too small to identify. */}
        <div
          style={{
            position: "absolute",
            top: "-220px",
            right: "-160px",
            width: "620px",
            height: "620px",
            borderRadius: "50%",
            background: ACCENT,
            opacity: 0.14,
            display: "flex",
          }}
        />

        <div style={{ display: "flex", alignItems: "center", gap: "18px" }}>
          {/* next/image cannot appear here: Satori rasterises this tree to a PNG
              rather than mounting it in a browser, so there is no DOM for the
              loader to hydrate and no LCP for it to optimise. The lint rule is
              aimed at page components and does not apply to an ImageResponse. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={OG_LOGO_DATA_URI}
            width={44}
            height={44}
            style={{ borderRadius: "50%" }}
            alt=""
          />
          <div
            style={{
              display: "flex",
              fontSize: "30px",
              fontWeight: 700,
              color: "#ffffff",
              letterSpacing: "-0.01em",
            }}
          >
            {APP_NAME}
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          {eyebrow ? (
            <div
              style={{
                display: "flex",
                fontSize: "24px",
                fontWeight: 600,
                color: ACCENT,
                textTransform: "uppercase",
                letterSpacing: "0.12em",
              }}
            >
              {eyebrow}
            </div>
          ) : null}

          <div
            style={{
              display: "flex",
              fontSize: title.length > 34 ? "64px" : "78px",
              fontWeight: 800,
              color: "#ffffff",
              lineHeight: 1.08,
              letterSpacing: "-0.03em",
              maxWidth: "980px",
            }}
          >
            {title}
          </div>

          {subtitle ? (
            <div
              style={{
                display: "flex",
                fontSize: "30px",
                color: "#a1a1a1",
                lineHeight: 1.35,
                maxWidth: "940px",
              }}
            >
              {subtitle}
            </div>
          ) : null}
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            borderTop: "1px solid #262626",
            paddingTop: "28px",
            fontSize: "24px",
            color: "#737373",
          }}
        >
          <div style={{ display: "flex" }}>Built on {CHAIN_NAME}</div>
          <div style={{ display: "flex" }}>Research tool — not financial advice</div>
        </div>
      </div>
    ),
    size,
  );
}
