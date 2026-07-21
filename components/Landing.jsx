"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import s from "@/app/tile-landing.module.css";

/* --- asset base path --- */
const A = "/asset/www.tile.pt";

/* --- Bugglo Logo Component --- */
function BuggloLogo({ size = 36, className }) {
  return (
    <img 
      src="/logo-128.png" 
      alt="Bugglo Logo" 
      width={size} 
      height={size} 
      className={className} 
      style={{ borderRadius: "7px", display: "block" }} 
    />
  );
}

/* --- Craft SVG Icons --- */
function getCraftIcon(index) {
  const size = 32;
  const strokeColor = "#0037FF";
  
  switch(index) {
    case 0: // rug check
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={strokeColor} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
          <path d="m9 11 2 2 4-4"/>
        </svg>
      );
    case 1: // trending tracker
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={strokeColor} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/>
          <polyline points="16 7 22 7 22 13"/>
        </svg>
      );
    case 2: // sentiment & fud
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={strokeColor} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10"/>
          <path d="M8 14s1.5 2 4 2 4-2 4-2"/>
          <line x1="9" y1="9" x2="9.01" y2="9"/>
          <line x1="15" y1="9" x2="15.01" y2="9"/>
        </svg>
      );
    case 3: // wallet analysis
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={strokeColor} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="4" width="20" height="16" rx="2"/>
          <path d="M12 11h.01"/>
          <path d="M16 8h-4a2 2 0 0 0-2 2v4a2 2 0 0 0 2 2h4"/>
        </svg>
      );
    default:
      return null;
  }
}

/* --- Supported partner logo list --- */
const TRUSTED = [
  "ahptus.svg","antarte.svg","bsustain.svg","curya.png","deltay.svg",
  "gimmi.svg","invariant.svg","marrakech.svg","propwise.svg","spotgov.svg",
];

/* --- Bugglo security features rows data --- */
const CRAFTS = [
  {
    title: "/rug", italic: "check",
    desc: "Analyze contract safety instantly. Check liquidity locks, token creator balances, owner permissions, and minting functions before you ape in.",
    tags: ["/rugcheck", "liquidity analysis", "ownership checks", "honeypot scan", "mint audit"],
  },
  {
    title: "/trending", italic: "tracker",
    desc: "Track hot tokens on the Robinhood Chain. Access a live feed of active contracts with real-time price updates, volume metrics, and sparklines.",
    tags: ["/trending", "live price", "volume monitoring", "active pools", "sparkline"],
  },
  {
    title: "/sentiment", italic: "& fud",
    desc: "Scan social channels and onchain metadata to check community sentiment and detect automated FUD or hype loops around any project.",
    tags: ["/sentiment", "/fud", "social analysis", "onchain signals", "hype detector"],
  },
  {
    title: "/wallet", italic: "analysis",
    desc: "Audit wallet statistics, track token distributions among holders, and monitor balance movements on the Robinhood Chain (4663).",
    tags: ["/wallet", "holder distribution", "balance changes", "whale alert"],
  },
];

/* --- Verified contract tools data --- */
const WORKS = [
  { name: "/rugcheck", img: "/rug.png" },
  { name: "/trending", img: "/trending.png" },
  { name: "/sentiment", img: "/sentiment.png" },
  { name: "/wallet", img: "/wallet.png" },
  { name: "/fud", img: "/fud.png" },
];

/* --- Card positions for latest work fan layout --- */
const CARD_POSITIONS = [
  { left: "27%", top: "8%", width: "46%", height: "70%", rotate: "0deg", z: 5 },
  { left: "54%", top: "17%", width: "30%", height: "55%", rotate: "15deg", z: 3 },
  { left: "72%", top: "22%", width: "28%", height: "50%", rotate: "0deg", z: 1 },
  { left: "2%", top: "22%", width: "26%", height: "50%", rotate: "0deg", z: 1 },
  { left: "14%", top: "17%", width: "30%", height: "55%", rotate: "-15deg", z: 3 },
];

/* --- Value cards data --- */
const VALUES = [
  {
    title: "read-only security",
    art: `${A}/homepage/co-founder-mentality.svg`,
    artStyle: { transform: "scaleX(-1)", transformOrigin: "center" },
    desc: "No private keys, no write transactions. Bugglo only reads smart contract states and simulates calls, ensuring your capital is 100% immune to external drainers.",
  },
  {
    title: "simulation engine",
    art: `${A}/homepage/engineering-mindset.svg`,
    artStyle: {},
    desc: "We test transactions in a simulated block header before broadcasting, exposing complex hidden triggers and custom fee traps that static code scanners miss.",
  },
  {
    title: "agent-first integration",
    art: `${A}/homepage/storytelling-craft.svg`,
    artStyle: {},
    desc: "Designed for autonomous workflows. Secure your agent pipelines with our CLI tool (npx bugglo) and Bugglo MCP server to plug into Cursor or Claude.",
  },
];

/* --- Articles data --- */
const ARTICLES = [
  {
    slug: "pre-trade-simulation-trader-confidence",
    title: "the invisible power of security: how pre-trade simulation shapes trader confidence",
    img: `${A}/articles/article 1.webp`,
    readTime: "6 minutes",
    author: "Bugglo Research Group",
  },
  {
    slug: "history-of-honeypots-contract-vulnerability-vectors",
    title: "the history of honeypots: a complete breakdown of contract vulnerability vectors",
    img: `${A}/articles/article 2.webp`,
    readTime: "7 minutes",
    author: "Bugglo Research Group",
    imgStyle: { objectPosition: "15% center" },
  },
];

/* --- Scroll Observer Hook --- */
function useScrollReveal(threshold = 0.15) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setVisible(true); obs.disconnect(); } }, { threshold });
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return [ref, visible];
}

/* ======================================================
   MAIN LANDING COMPONENT
   ====================================================== */
export default function Landing() {
  /* --- Splash --- */
  const [splashGone, setSplashGone] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setSplashGone(true), 2200);
    return () => clearTimeout(t);
  }, []);

  /* --- Force White Background & Enable Scroll --- */
  useEffect(() => {
    const htmlEl = document.documentElement;
    const origTheme = htmlEl.getAttribute("data-theme");
    
    // Force light theme and white body background for the landing page
    htmlEl.setAttribute("data-theme", "light");
    
    const origBg = document.body.style.background;
    const origColor = document.body.style.color;
    const origOverflow = document.body.style.overflow;
    const origHeight = document.body.style.height;
    
    const origHtmlOverflow = htmlEl.style.overflow;
    const origHtmlHeight = htmlEl.style.height;
    
    htmlEl.style.setProperty("overflow", "auto", "important");
    htmlEl.style.setProperty("height", "auto", "important");
    htmlEl.style.setProperty("scroll-behavior", "smooth", "important");
    
    document.body.style.setProperty("background", "#ffffff", "important");
    document.body.style.setProperty("color", "#000000", "important");
    document.body.style.setProperty("overflow", "auto", "important");
    document.body.style.setProperty("height", "auto", "important");
    
    return () => {
      // Restore original theme and styles when navigating away
      if (origTheme) {
        htmlEl.setAttribute("data-theme", origTheme);
      } else {
        htmlEl.removeAttribute("data-theme");
      }
      htmlEl.style.overflow = origHtmlOverflow;
      htmlEl.style.height = origHtmlHeight;
      htmlEl.style.scrollBehavior = "auto";
      
      document.body.style.background = origBg;
      document.body.style.color = origColor;
      document.body.style.overflow = origOverflow;
      document.body.style.height = origHeight;
    };
  }, []);

  /* --- Navbar --- */
  const [menuOpen, setMenuOpen] = useState(false);
  const handleScrollTo = useCallback((id) => {
    setMenuOpen(false);
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, []);

  /* --- Scroll to Top Button Visibility Trigger --- */
  const [showScrollTop, setShowScrollTop] = useState(false);
  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 400) {
        setShowScrollTop(true);
      } else {
        setShowScrollTop(false);
      }
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleScrollToTop = useCallback(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  /* --- Hero reveal --- */
  const [heroRef, heroVisible] = useScrollReveal(0.2);

  /* --- Craft accordion --- */
  const [expandedCraft, setExpandedCraft] = useState(-1);
  const toggleCraft = useCallback((i) => {
    setExpandedCraft((prev) => (prev === i ? -1 : i));
  }, []);

  /* --- Latest work carousel --- */
  const [activeWork, setActiveWork] = useState(0);
  const rotateWork = useCallback((dir) => {
    setActiveWork((p) => (p + dir + WORKS.length) % WORKS.length);
  }, []);

  /* --- Value cards flip --- */
  const [flippedCards, setFlippedCards] = useState({});
  const toggleFlip = useCallback((i) => {
    setFlippedCards((p) => ({ ...p, [i]: !p[i] }));
  }, []);

  /* --- Article carousel --- */
  const articleScrollRef = useRef(null);
  const [activeArticle, setActiveArticle] = useState(0);
  const scrollToArticle = useCallback((i) => {
    const el = articleScrollRef.current;
    if (!el) return;
    const cards = el.querySelectorAll("[data-article-card]");
    if (cards[i]) {
      cards[i].scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
      setActiveArticle(i);
    }
  }, []);

  /* --- Section scroll reveals --- */
  const [craftRef, craftVisible] = useScrollReveal(0.1);
  const [workRef, workVisible] = useScrollReveal(0.1);
  const [testiRef, testiVisible] = useScrollReveal(0.1);
  const [brandRef, brandVisible] = useScrollReveal(0.1);
  const [valueRef, valueVisible] = useScrollReveal(0.1);
  const [ctaRef, ctaVisible] = useScrollReveal(0.1);
  const [articleRef, articleVisible] = useScrollReveal(0.1);
  const [footerRef, footerVisible] = useScrollReveal(0.05);

  /* --- Card layout computation --- */
  function getCardStyle(workIdx) {
    const offset = (workIdx - activeWork + WORKS.length) % WORKS.length;
    const pos = CARD_POSITIONS[offset] || CARD_POSITIONS[CARD_POSITIONS.length - 1];
    return {
      left: pos.left, top: pos.top, width: pos.width, height: pos.height,
      transform: `rotate(${pos.rotate})`, zIndex: pos.z,
      cursor: offset === 0 ? "default" : "pointer",
    };
  }

  return (
    <>
      {/* Splash Screen */}
      <div className={`${s.splash} ${splashGone ? s.splashHidden : ""}`} aria-hidden="true">
        <BuggloLogo size={64} className={s.splashLogo} />
      </div>

      {/* Navbar */}
      <nav className={`${s.nav} ${menuOpen ? s.navOpen : ""}`}>
        <div className={`${s.navInner} ${menuOpen ? s.navOpen : ""}`}>
          <div className={s.navBar}>
            <a className={s.navLogoLink} href="/">
              <BuggloLogo size={36} className={s.navLogoImg} />
              <span className={s.navLogoText}>Bugglo<span className={s.navLogoTextDot}>.</span></span>
            </a>
            <div className={s.navActions}>
              <a href="/app" className={s.navCta} style={{ textDecoration: "none" }}>login</a>
              <button type="button" className={s.navToggle} onClick={() => setMenuOpen(!menuOpen)} aria-label={menuOpen ? "Close menu" : "Open menu"} aria-expanded={menuOpen}>+</button>
            </div>
          </div>
          <div className={`${s.navMenu} ${menuOpen ? s.navMenuOpen : ""}`} aria-hidden={!menuOpen}>
            <button type="button" className={s.navMenuLink} onClick={() => handleScrollTo("craft")} style={{ background: "none", border: "none", width: "100%", textAlign: "left", cursor: "pointer" }}>the tool<span className={s.navMenuArrow}>&rsaquo;</span></button>
            <button type="button" className={s.navMenuLink} onClick={() => handleScrollTo("values")} style={{ background: "none", border: "none", width: "100%", textAlign: "left", cursor: "pointer" }}>how it works<span className={s.navMenuArrow}>&rsaquo;</span></button>
            <a className={s.navMenuLink} href="/docs/bugglo-cli">for agents<span className={s.navMenuArrow}>&rsaquo;</span></a>
          </div>
        </div>
      </nav>

      {/* Main Page */}
      <main className={s.page}>

        {/* Hero */}
        <section className={s.hero} ref={heroRef}>
          {/* Caravela Background Tile */}
          <div className={s.heroTile}>
            <img src={`${A}/tiles_homepage/caravela.webp`} alt="" aria-hidden="true" className={s.heroTileImg} />
          </div>
          
          {/* Floating animated background fish */}
          <div style={{ position: "absolute", top: "12%", left: "15%", width: "120px", height: "auto", pointerEvents: "none", opacity: 0.25, zIndex: 0 }}>
            <img src={`${A}/homepage/animations/introsection/zemanel.gif`} alt="" style={{ width: "100%", height: "auto" }} />
          </div>
          <div style={{ position: "absolute", bottom: "15%", left: "40%", width: "100px", height: "auto", pointerEvents: "none", opacity: 0.25, zIndex: 0 }}>
            <img src={`${A}/homepage/animations/introsection/zeca.gif`} alt="" style={{ width: "100%", height: "auto" }} />
          </div>

          <div className={s.heroContent}>
            <span className={s.eyebrow} style={{ display: "inline-flex", alignItems: "center", gap: "8px", fontSize: "15px", fontWeight: 600, letterSpacing: "0.14em", textTransform: "uppercase", color: "#0037FF", marginBottom: "22px" }}>
              <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#0037FF" }} />
              Robinhood Chain &middot; 4663
            </span>
            <h1 className={`${s.heroTitle} ${heroVisible ? s.heroVisible : ""}`}>
              <span className={s.heroWord} style={{ animationDelay: "0ms" }}>read </span>
              <span className={s.heroWord} style={{ animationDelay: "95ms" }}>before </span>
              <br className={s.mobileOnly} />
              <span className={s.heroWord} style={{ animationDelay: "190ms" }}>you </span>
              <span className={`${s.heroWord} ${s.heroTileName}`} style={{ animationDelay: "285ms" }}>ape</span>
              <span className={`${s.heroWord} ${s.heroItalic}`} style={{ animationDelay: "285ms" }}>.</span>
              {" "}
              <br />
              <span style={{ display: "inline-block", animationDelay: "380ms" }} className={s.heroWord}>
                <a href="/app" className={s.letsTalkBtn} aria-label="login to Bugglo" style={{ textDecoration: "none" }}>
                  <svg className={s.letsTalkSvg} viewBox="0 0 220 44" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <rect x="1" y="1" width="218" height="42" rx="9" stroke="#0037FF" strokeWidth="2" fill="none" />
                    <text x="65" y="28" fill="#0037FF" style={{ fontFamily: "var(--tile-font-display)", fontSize: "16px", fontWeight: 500 }}>login to Bugglo</text>
                    <clipPath id="ltSweep"><rect x="0" y="0" width="220" height="44" className={s.letsTalkSweep} /></clipPath>
                    <g clipPath="url(#ltSweep)">
                      <rect x="1" y="1" width="218" height="42" rx="9" fill="#0037FF" />
                      <text x="65" y="28" fill="#FFFFFF" style={{ fontFamily: "var(--tile-font-display)", fontSize: "16px", fontWeight: 500 }}>login to Bugglo</text>
                    </g>
                  </svg>
                </a>
              </span>
            </h1>
            <div className={`${s.heroSub} ${heroVisible ? s.heroVisible : ""}`}>
              <span className={s.heroSubWord} style={{ animationDelay: "475ms" }}>but </span>
              <span className={s.heroSubWord} style={{ animationDelay: "570ms" }}>first </span>
              <button type="button" className={s.heroExplore} onClick={() => handleScrollTo("craft")} style={{ background: "none", border: "none", cursor: "pointer", display: "inline-flex", alignItems: "center" }}>
                <span className={`${s.heroSubWord} ${s.heroArrow}`} style={{ animationDelay: "665ms", color: "#0037FF" }}>&rarr; </span>
                <span className={s.heroSubWord} style={{ animationDelay: "760ms" }}>explore </span>
                <span className={s.heroSubWord} style={{ animationDelay: "855ms" }}>our </span>
                <span className={s.heroSubWord} style={{ animationDelay: "950ms" }}>security </span>
                <span className={s.heroSubWord} style={{ animationDelay: "1045ms" }}>checks</span>
              </button>
            </div>
          </div>
        </section>

        {/* Support marquee */}
        <section className={s.trustedBy}>
          <h4 className={s.trustedByLabel}>secured &amp; trusted integrations</h4>
          <div className={s.marqueeOuter}>
            <div className={s.marqueeTrack}>
              {[...TRUSTED, ...TRUSTED, ...TRUSTED].map((logo, i) => (
                <div key={i} className={s.marqueeItem}>
                  <img src={`${A}/homepage/trustedby/${logo}`} alt="" draggable="false" />
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* What We Do / Security */}
        <section className={`${s.craftSection} ${s.fadeInUp} ${craftVisible ? s.fadeInUpVisible : ""}`} ref={craftRef} id="craft">
          <div className={s.craftLeft}>
            <h2 className={s.craftTitle}>
              our smart<br />
              <span className={s.craftTitleItalic}>firewall tools</span>
            </h2>
          </div>
          <div className={s.craftRight}>
            {CRAFTS.map((craft, i) => (
              <div key={i} className={`${s.craftRow} ${expandedCraft === i ? s.craftRowExpanded : ""}`} onClick={() => toggleCraft(i)}>
                <div className={s.craftRowInner}>
                  <div className={s.craftRowHeader}>
                    <h4 className={s.craftRowTitle}>
                      {craft.title} <span className={s.craftRowTitleItalic}>{craft.italic}</span>
                    </h4>
                    <div className={s.craftRowThumb}>
                      {getCraftIcon(i)}
                    </div>
                  </div>
                  <div className={s.craftRowDesc}>
                    <p className={s.craftRowDescText}>{craft.desc}</p>
                  </div>
                  <div className={s.craftTags}>
                    {craft.tags.map((tag) => (
                      <span key={tag} className={s.craftTag}>{tag}</span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Latest Verified */}
        <section className={`${s.latestWork} ${s.fadeInUp} ${workVisible ? s.fadeInUpVisible : ""}`} ref={workRef} id="latest-work">
          <div className={s.latestWorkHeader}>
            <h2 className={s.latestWorkTitle}>recently verified</h2>
            <a className={s.latestWorkAllBtn} href="/app">check contract</a>
          </div>
          <div>
            <div className={s.cardStack} onClick={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              const x = e.clientX - rect.left;
              if (x > rect.width / 2) rotateWork(1); else rotateWork(-1);
            }}>
              {WORKS.map((w, i) => (
                <div key={w.name} className={s.card} style={getCardStyle(i)}>
                  <div className={s.cardInner}>
                    <img src={w.img} alt={w.name} draggable="false" />
                  </div>
                </div>
              ))}
            </div>
            <div className={s.cardInfo}>
              <div className={s.cardInfoInner} style={{ marginLeft: "27%", width: "46%" }}>
                <h3 className={s.cardInfoName}>{WORKS[activeWork].name}</h3>
                <a className={s.cardInfoBtn} href="/app" aria-label={`Check ${WORKS[activeWork].name}`}>
                  <svg viewBox="0 0 22 22" fill="none"><path d="M11 2v18M2 11h18" stroke="#FFF" strokeWidth="2.4" strokeLinecap="round" /></svg>
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* Testimonials */}
        <section className={`${s.testimonials} ${s.fadeInUp} ${testiVisible ? s.fadeInUpVisible : ""}`} ref={testiRef} style={{ position: "relative" }}>
          {/* Floating animated background fish inside testimonials */}
          <div style={{ position: "absolute", top: "10%", right: "15%", width: "110px", height: "auto", pointerEvents: "none", opacity: 0.18, zIndex: 0 }}>
            <img src={`${A}/homepage/animations/introsection/zemanel.gif`} alt="" style={{ width: "100%", height: "auto" }} />
          </div>
          
          <div className={s.testimonialsInner} style={{ position: "relative", zIndex: 10 }}>
            <div className={s.testimonialQuote}>
              <p className={s.testimonialText}>
                Bugglo has completely changed how our trading bots interact with new pools. The pre-trade simulation saved us from three honeypots in the first week.
              </p>
              <div className={s.testimonialAuthor}>
                <img src={`${A}/homepage/testimonials/gimmi.svg`} alt="" className={s.testimonialAuthorImg} />
                <span className={s.testimonialAuthorName}>Duarte, lead engineer @ AgentCapital</span>
              </div>
            </div>
            <div className={s.testimonialRight}>
              <h2 className={s.testimonialHeading}>
                protocols <span className={s.heroItalic}>say things</span>. luckily, some of them are about our security.
              </h2>
              <div className={s.testimonialBigQuote} aria-hidden="true">
                <svg viewBox="0 0 220 160" fill="none" style={{ width: "100%", height: "100%" }}>
                  <text x="220" y="160" textAnchor="end">&ldquo;</text>
                </svg>
              </div>
            </div>
          </div>
        </section>

        {/* Security Assured */}
        <section className={`${s.brandCovered} ${s.fadeInUp} ${brandVisible ? s.fadeInUpVisible : ""}`} ref={brandRef}>
          <div className={s.brandCoveredInner}>
            <div className={s.brandCoveredText}>
              <h2 className={s.brandCoveredTitle}>
                we&apos;ve got the<br />
                <span className={s.heroItalic}>safety layer</span> covered.
              </h2>
              <div style={{ display: "flex", flexDirection: "column", gap: "24px", alignItems: "flex-start" }}>
                <a href="/app" className={s.letsTalkBtn} aria-label="login to Bugglo" style={{ textDecoration: "none" }}>
                  <svg className={s.letsTalkSvg} viewBox="0 0 220 44" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <rect x="1" y="1" width="218" height="42" rx="9" stroke="#0037FF" strokeWidth="2" fill="none" />
                    <text x="65" y="28" fill="#0037FF" style={{ fontFamily: "var(--tile-font-display)", fontSize: "16px", fontWeight: 500 }}>login to Bugglo</text>
                    <clipPath id="bcSweep"><rect x="0" y="0" width="220" height="44" className={s.letsTalkSweep} /></clipPath>
                    <g clipPath="url(#bcSweep)">
                      <rect x="1" y="1" width="218" height="42" rx="9" fill="#0037FF" />
                      <text x="65" y="28" fill="#FFF" style={{ fontFamily: "var(--tile-font-display)", fontSize: "16px", fontWeight: 500 }}>login to Bugglo</text>
                    </g>
                  </svg>
                </a>
                <p className={s.brandCoveredDesc}>
                  Bugglo is the safety layer for onchain agents - a read-only rug check and pre-trade firewall that tells you the plain truth about a contract before your money moves.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Value Cards */}
        <section className={`${s.valueCards} ${s.fadeInUp} ${valueVisible ? s.fadeInUpVisible : ""}`} ref={valueRef} id="values">
          <div className={s.valueCardsInner}>
            {VALUES.map((v, i) => (
              <div key={i} className={`${s.valueCard} ${flippedCards[i] ? s.valueCardFlipped : ""}`} onClick={() => toggleFlip(i)}>
                <div className={s.valueCardInnerWrapper}>
                  {/* Front Face */}
                  <div className={s.valueCardFront}>
                    <img src={v.art} alt="" className={s.valueCardArt} style={v.artStyle} />
                    <h4 className={s.valueCardTitle}>{v.title}</h4>
                  </div>
                  {/* Back Face */}
                  <div className={s.valueCardBack}>
                    <p className={s.valueCardBackText}>{v.desc}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* CTA Cards */}
        <section className={`${s.ctaSection} ${s.fadeInUp} ${ctaVisible ? s.fadeInUpVisible : ""}`} ref={ctaRef}>
          <div className={s.ctaGrid}>
            <div className={`${s.ctaCard} ${s.ctaCardBlue}`}>
              <h3 className={s.ctaCardTitle}>
                running an agent?<br />
                <span className={s.heroItalic}>help us improve.</span>
              </h3>
              <div className={s.ctaCardBody}>
                <p className={s.ctaCardDesc}>
                  We are building Bugglo with you. Every click, suggestion, and audit log help shape what comes next. Join us in refining the safety standard of onchain autonomous trade pipelines.
                </p>
                <a href="https://x.com/BuggloAi" target="_blank" rel="noopener noreferrer" className={`${s.sweepBtn} ${s.sweepBtnWhite}`} style={{ textDecoration: "none" }}>
                  give us feedback
                  <span className={`${s.sweepBtnFill} ${s.sweepBtnWhiteFill}`}>give us feedback</span>
                </a>
              </div>
            </div>
            <div className={`${s.ctaCard} ${s.ctaCardChecker}`}>
              <h3 className={s.ctaCardTitle}>
                <span className={s.heroItalic}>read our </span>
                <span style={{ color: "#0037FF" }}>technical</span>
                <span className={s.heroItalic}> docs</span>
              </h3>
              <div className={s.ctaCardBody}>
                <p className={s.ctaCardDesc}>
                  Enter the secure developer ecosystem. Learn how to plug Bugglo Firewall directly into your Node.js or Python agents with zero friction and robust error recovery.
                </p>
                <a href="/docs" className={`${s.sweepBtn} ${s.sweepBtnBlack}`} style={{ textDecoration: "none" }}>
                  documentation
                  <span className={`${s.sweepBtnFill} ${s.sweepBtnBlackFill}`}>documentation</span>
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* Articles Carousel */}
        <section className={`${s.articles} ${s.fadeInUp} ${articleVisible ? s.fadeInUpVisible : ""}`} ref={articleRef} id="articles">
          <div style={{ position: "relative", width: "100%" }}>
            <div className={s.articlesScroller} ref={articleScrollRef} onScroll={(e) => {
              const el = e.target;
              const cards = el.querySelectorAll("[data-article-card]");
              const center = el.scrollLeft + el.clientWidth / 2;
              let closest = 0, minDist = Infinity;
              cards.forEach((c, i) => {
                const dist = Math.abs(c.offsetLeft + c.offsetWidth / 2 - center);
                if (dist < minDist) { minDist = dist; closest = i; }
              });
              setActiveArticle(closest % ARTICLES.length);
            }}>
              <div className={s.articlesTrack}>
                {[...ARTICLES, ...ARTICLES, ...ARTICLES, ...ARTICLES].map((art, i) => (
                  <a key={i} data-article-card="true" className={s.articleCard} href={art.slug ? `/blog/${art.slug}` : "/blog"}>
                    <img src={art.img} alt="" className={s.articleCardImg} draggable="false" style={art.imgStyle || {}} />
                    <div className={s.articleCardOverlay} />
                    <div className={s.articleCardContent}>
                      <div className={s.articleMeta}>
                        <span className={s.articleMetaItem}>reading time: {art.readTime}</span>
                        <span className={s.articleMetaItem}>written by: {art.author}</span>
                      </div>
                      <h3 className={s.articleTitle}>{art.title}</h3>
                    </div>
                  </a>
                ))}
              </div>
            </div>
            <div className={s.articleDots}>
              {ARTICLES.map((_, i) => (
                <button key={i} type="button" className={`${s.articleDot} ${activeArticle === i ? s.articleDotActive : ""}`} onClick={() => scrollToArticle(i)} aria-label={`Go to article ${i + 1}`} />
              ))}
            </div>
            <button type="button" className={`${s.articleArrow} ${s.articleArrowLeft}`} onClick={() => scrollToArticle((activeArticle - 1 + ARTICLES.length) % ARTICLES.length)} aria-label="Previous article">
              <svg width="16" height="32" viewBox="0 0 16 32" fill="none"><path d="M14 2L2 16L14 30" stroke="#FFF" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </button>
            <button type="button" className={`${s.articleArrow} ${s.articleArrowRight}`} onClick={() => scrollToArticle((activeArticle + 1) % ARTICLES.length)} aria-label="Next article">
              <svg width="16" height="32" viewBox="0 0 16 32" fill="none"><path d="M2 2L14 16L2 30" stroke="#FFF" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </button>
          </div>
        </section>

        {/* Footer */}
        <footer className={`${s.footer} ${s.fadeInUp} ${footerVisible ? s.fadeInUpVisible : ""}`} ref={footerRef}>
          <div className={s.footerMobile}>
            <div className={s.footerTopRow}>
              <img src={`${A}/homepage/logo-footer.svg`} alt="Bugglo Tile" className={s.footerLogo} />
              <div className={s.footerBtns}>
                <a className={s.footerBtnOutline} href="/docs">the tool</a>
                <a className={s.footerBtnFilled} href="/app">talk with us</a>
              </div>
            </div>
            <div className={s.footerBottom}>
              <div className={s.footerInfoRow}>
                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                  <span className={s.footerInfoLabel}>network</span>
                  <span className={s.footerInfoText}>{"Robinhood Chain\nRead-only state check\nNot financial advice"}</span>
                </div>
              </div>
              <div className={s.footerSocialsRow}>
                <a href="https://x.com/BuggloAi" target="_blank" rel="noopener noreferrer" className={s.footerSocial}>x</a>
              </div>
              <div className={s.footerCopyright}>
                <span className={s.footerCopyrightText}>&copy; 2026 Bugglo. all rights reserved.</span>
              </div>
            </div>
          </div>

          <div className={s.footerDesktop}>
            <div className={s.footerDesktopTop}>
              <img src={`${A}/homepage/logo-footer.svg`} alt="Bugglo Tile" className={s.footerLogoLg} />
              <div className={s.footerDesktopRight}>
                <div className={s.footerDesktopNav}>
                  <a className={s.footerDesktopNavLink} href="/intro">the tool</a>
                  <a className={s.footerDesktopNavLink} href="/app">talk with us</a>
                </div>
              </div>
            </div>
            <div className={s.footerDesktopBottom}>
              <div className={s.footerDesktopBottomLeft}>
                <span className={s.footerInfoLabel}>network</span>
                <span className={s.footerInfoText}>{"Robinhood Chain, Read-only state check. Not financial advice."}</span>
                <div className={s.footerSocialsRow}>
                  <a href="https://x.com/BuggloAi" target="_blank" rel="noopener noreferrer" className={s.footerSocial}>x</a>
                </div>
              </div>
              <div className={s.footerDesktopBottomRight}>
                <span className={s.footerCopyrightText}>&copy; 2026 Bugglo. all rights reserved.</span>
              </div>
            </div>
          </div>
        </footer>
      </main>

      {/* Floating Scroll to Top Button */}
      <button
        type="button"
        className={`${s.scrollTopBtn} ${showScrollTop ? s.scrollTopBtnVisible : ""}`}
        onClick={handleScrollToTop}
        aria-label="Scroll to top"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <line x1="12" y1="19" x2="12" y2="5"></line>
          <polyline points="5 12 12 5 19 12"></polyline>
        </svg>
      </button>
    </>
  );
}
