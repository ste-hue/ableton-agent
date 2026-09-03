import { TEMBRO_SKILLS } from "./skills.js";

export interface LandingPageOptions {
  checkoutUrl?: string;
  /** Lemon Squeezy discount code that makes the first Starter pack free; pre-applied at checkout. */
  freeFirstPackCode?: string;
  downloadUrl?: string;
  supportEmail?: string;
  baseCreditCost?: number;
}

function safeHttpsUrl(value?: string): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" ? url.toString() : null;
  } catch {
    return null;
  }
}

function safeDiscountCode(value?: string): string | null {
  if (!value) return null;
  const code = value.trim().toUpperCase();
  return /^[A-Z0-9]{2,40}$/.test(code) ? code : null;
}

function withDiscountCode(checkoutUrl: string, code: string): string {
  const url = new URL(checkoutUrl);
  url.searchParams.set("checkout[discount_code]", code);
  return url.toString();
}

function safeEmail(value?: string): string | null {
  if (!value) return null;
  const email = value.trim().toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : null;
}

function escapeAttribute(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

export function landingPage(options: LandingPageOptions = {}): string {
  const checkoutUrl = safeHttpsUrl(options.checkoutUrl);
  const downloadUrl = safeHttpsUrl(options.downloadUrl);
  const supportEmail = safeEmail(options.supportEmail);
  const baseCreditCost = Math.max(1, Math.floor(options.baseCreditCost ?? 1));
  const freeCode = checkoutUrl ? safeDiscountCode(options.freeFirstPackCode) : null;
  const primaryUrl = checkoutUrl && freeCode ? withDiscountCode(checkoutUrl, freeCode) : (checkoutUrl ?? downloadUrl);
  const freeBeta = !checkoutUrl && Boolean(downloadUrl);
  const ctaLabel = freeBeta ? "Download free beta" : freeCode ? "Get 40 credits free" : "Get Tembro";
  const primaryCta = primaryUrl
    ? `<a class="button button-primary" href="${escapeAttribute(primaryUrl)}">${ctaLabel}<span aria-hidden="true">↗</span></a>`
    : '<span class="button button-primary button-disabled" aria-disabled="true">Early access soon</span>';
  const firstStep = freeBeta
    ? '<article class="step"><span class="num">01</span><h3>Download</h3><p>One DMG. No card, checkout, or little subscription surprise while the beta is free.</p></article>'
    : freeCode
      ? `<article class="step"><span class="num">01</span><h3>Claim</h3><p>Your first Starter pack is free with code ${freeCode}, already applied at checkout. No card. Your personal license key arrives by email.</p></article>`
      : '<article class="step"><span class="num">01</span><h3>Buy</h3><p>One credit pack, one payment. No subscription. Your personal license key arrives by email.</p></article>';
  const activationStep = freeBeta
    ? '<article class="step"><span class="num">03</span><h3>Connect</h3><p>Email and beta code once. That is it. No OpenAI account or API key.</p></article>'
    : '<article class="step"><span class="num">03</span><h3>Activate</h3><p>Enter your purchase email and license key once. No OpenAI account or API key required.</p></article>';
  const accessFeature = freeBeta
    ? "Free beta access code activation"
    : "License activation on one studio computer";
  const supportLink = supportEmail
    ? `<a href="mailto:${escapeAttribute(supportEmail)}">${escapeAttribute(supportEmail)}</a>`
    : '<a href="#how-it-works">Installation guide</a>';
  const skillMenu = TEMBRO_SKILLS.map(
    (skill) =>
      `<div class="credit-row"><div><strong>${skill.label}</strong><span>${skill.description}</span></div><b>${baseCreditCost * skill.creditMultiplier}</b></div>`,
  ).join("");

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="theme-color" content="#19180f">
  <meta name="description" content="Tembro turns plain-language music direction into verified actions inside Ableton Live.">
  <title>Tembro — AI for Ableton Live</title>
  <style>
    :root {
      color-scheme: dark;
      --black: #1b1720;
      --white: #ded8c7;
      --paper: #c8c0ac;
      --soft: #ada994;
      --mid: #514b53;
      --line: #878276;
      --night-line: #4a4352;
      --night-mid: #a69cab;
      --sun: #a89b5c;
      --rust: #a56554;
      --sage: #879783;
      --blue: #7f939d;
      --mauve: #9b8496;
      --max: 1240px;
      font-family: Inter, ui-sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    }
    * { box-sizing: border-box; }
    html { overflow-x: hidden; scroll-behavior: smooth; }
    body {
      margin: 0;
      overflow-x: clip;
      color: var(--paper);
      background: var(--black);
      font-size: 16px;
      line-height: 1.5;
      -webkit-font-smoothing: antialiased;
    }
    a { color: inherit; }
    h1, h2, h3, p { margin-top: 0; }
    .wrap { width: min(calc(100% - 48px), var(--max)); margin-inline: auto; }
    .mono {
      font-family: ui-monospace, "SFMono-Regular", Menlo, Consolas, monospace;
      font-size: 11px;
      letter-spacing: .08em;
      text-transform: uppercase;
    }
    .nav {
      min-height: 76px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-bottom: 1px solid var(--night-line);
    }
    .wordmark {
      display: flex;
      align-items: center;
      gap: 10px;
      font-size: 17px;
      font-weight: 680;
      letter-spacing: -.035em;
    }
    .mark {
      width: 32px;
      height: 29px;
      display: block;
      color: var(--sun);
    }
    .mark circle, .hero-eclipse circle, .link-glyph circle { fill: var(--rust); }
    .mark svg { width: 100%; height: 100%; display: block; }
    .nav-links { display: flex; align-items: center; gap: 30px; font-size: 13px; }
    .nav-links a { text-decoration: none; }
    .nav-links a:hover { text-decoration: underline; text-underline-offset: 4px; }
    .hero {
      min-height: 690px;
      display: grid;
      grid-template-columns: minmax(0, 1.15fr) minmax(340px, .85fr);
      align-items: center;
      gap: clamp(50px, 8vw, 118px);
      padding-block: 90px 110px;
    }
    .eyebrow { margin-bottom: 28px; }
    h1 {
      max-width: 800px;
      margin-bottom: 30px;
      font-size: clamp(54px, 7vw, 92px);
      font-weight: 560;
      line-height: .98;
      letter-spacing: -.065em;
    }
    .lede {
      max-width: 620px;
      margin-bottom: 36px;
      color: var(--night-mid);
      font-size: clamp(18px, 1.8vw, 21px);
      line-height: 1.58;
      letter-spacing: -.02em;
    }
    .actions { display: flex; flex-wrap: wrap; align-items: center; gap: 10px; }
    .button {
      min-height: 50px;
      display: inline-flex;
      align-items: center;
      justify-content: space-between;
      gap: 34px;
      padding: 0 18px;
      border: 1px solid var(--paper);
      border-radius: 8px;
      color: var(--paper);
      background: transparent;
      text-decoration: none;
      font-size: 13px;
      font-weight: 680;
      transition: color .15s ease, background .15s ease;
    }
    .button:hover { color: var(--black); background: var(--paper); }
    .button-primary { color: var(--white); border-color: var(--rust); background: var(--rust); }
    .button-primary:hover { color: var(--white); border-color: var(--white); background: transparent; }
    .button-disabled { opacity: .45; cursor: default; }
    .button-disabled:hover { color: var(--black); background: var(--paper); }
    .compat { margin: 22px 0 0; color: var(--night-mid); font-size: 12px; }
    .device-shell { position: relative; padding-top: 72px; }
    .hero-eclipse { width: 162px; height: 147px; position: absolute; top: -30px; right: 34px; z-index: 0; color: var(--sun); }
    .hero-eclipse svg { width: 100%; height: 100%; display: block; }
    .device { position: relative; z-index: 1; overflow: hidden; border: 1px solid var(--night-line); border-radius: 18px; background: #292433; box-shadow: 0 28px 80px rgba(0,0,0,.24); }
    .device-head {
      min-height: 44px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 14px;
      border-bottom: 1px solid var(--night-line);
      font: 10px/1 ui-monospace, "SFMono-Regular", Menlo, monospace;
      letter-spacing: .04em;
      text-transform: uppercase;
    }
    .status { display: flex; align-items: center; gap: 7px; color: var(--night-mid); }
    .link-glyph { width: 15px; height: 14px; display: block; color: var(--paper); }
    .chat { min-height: 450px; display: flex; flex-direction: column; padding: 18px; gap: 12px; }
    .bubble { max-width: 88%; padding: 12px 14px; border: 1px solid var(--night-line); border-radius: 12px; font-size: 13px; line-height: 1.55; }
    .bubble-user { align-self: flex-end; color: var(--white); border-color: var(--rust); background: var(--rust); }
    .bubble-ai { align-self: flex-start; background: #342f3f; }
    .site-trace { overflow: hidden; border: 1px solid var(--night-line); border-radius: 10px; background: #1d1a23; font: 9px/1.4 ui-monospace, "SFMono-Regular", Menlo, monospace; }
    .site-trace > summary { display: flex; align-items: center; gap: 8px; padding: 8px 10px; color: var(--night-mid); cursor: pointer; list-style: none; text-transform: uppercase; }
    .site-trace > summary::-webkit-details-marker, .site-call > summary::-webkit-details-marker { display: none; }
    .site-trace > summary strong { color: var(--sage); letter-spacing: .12em; }
    .site-trace > summary span:last-child { margin-left: auto; }
    .site-trace-log { padding: 3px 7px 6px; border-top: 1px solid var(--night-line); }
    .site-call { border-bottom: 1px dotted var(--night-line); }
    .site-call > summary { display: grid; grid-template-columns: 22px minmax(0, 1fr) auto auto; gap: 7px; padding: 5px 3px; color: var(--night-mid); cursor: pointer; list-style: none; }
    .site-call code { overflow: hidden; color: var(--white); text-overflow: ellipsis; white-space: nowrap; }
    .site-call b { color: var(--sage); font-weight: 500; text-transform: uppercase; }
    .site-call p { margin: 0; padding: 4px 4px 9px 25px; color: var(--night-mid); font: 10px/1.5 Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
    .site-call a { color: var(--blue); white-space: nowrap; }
    .result {
      padding: 13px 14px;
      border-top: 1px solid var(--night-line);
      border-bottom: 1px solid var(--night-line);
      color: var(--night-mid);
      font: 11px/1.8 ui-monospace, "SFMono-Regular", Menlo, monospace;
    }
    .composer {
      margin-top: auto;
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 12px 13px;
      border: 1px solid var(--night-line);
      border-radius: 10px;
      color: var(--night-mid);
      font-size: 12px;
    }
    section { color: var(--black); background: var(--paper); border-top: 1px solid var(--black); }
    main > section:nth-of-type(1) { background: #9aa594; }
    main > section:nth-of-type(2) { background: #c8bba8; }
    main > section:nth-of-type(3) { background: #8fa1a9; }
    main > section:nth-of-type(4) { background: #b59a94; }
    main > section:nth-of-type(5) { background: #aca0ad; }
    .section { padding-block: clamp(82px, 10vw, 132px); }
    .section-head {
      display: grid;
      grid-template-columns: .42fr 1.58fr;
      gap: 54px;
      margin-bottom: 68px;
    }
    .kicker { padding-top: 8px; }
    h2 {
      max-width: 920px;
      margin-bottom: 0;
      font-size: clamp(40px, 5vw, 68px);
      font-weight: 540;
      line-height: 1.04;
      letter-spacing: -.052em;
    }
    h3 { margin-bottom: 13px; font-size: 17px; letter-spacing: -.025em; }
    .steps { display: grid; grid-template-columns: repeat(4, 1fr); border-top: 1px solid var(--black); }
    .step { min-height: 236px; padding: 23px 22px 22px 0; border-right: 1px solid var(--line); }
    .step:not(:first-child) { padding-left: 22px; }
    .step:last-child { border-right: 0; }
    .num { display: block; margin-bottom: 64px; font: 11px/1 ui-monospace, "SFMono-Regular", Menlo, monospace; }
    .step p, .principle p { margin-bottom: 0; color: var(--mid); font-size: 13px; line-height: 1.65; }
    .prompt-grid { display: grid; grid-template-columns: 1.2fr .8fr; border: 1px solid var(--black); }
    .prompt { min-height: 190px; display: flex; flex-direction: column; justify-content: space-between; padding: 24px; background: #c8bba8; }
    .prompt-large { min-height: 390px; color: var(--white); background: var(--black); }
    .prompt-stack { display: grid; grid-template-rows: 1fr 1fr; }
    .prompt-stack .prompt:first-child { background: #9aa594; }
    .prompt-stack .prompt:last-child { background: #8fa1a9; }
    .prompt-stack .prompt + .prompt { border-top: 1px solid var(--black); }
    .label { font: 10px/1 ui-monospace, "SFMono-Regular", Menlo, monospace; letter-spacing: .08em; text-transform: uppercase; }
    .quote { max-width: 700px; margin: 0; font-size: clamp(23px, 3vw, 42px); line-height: 1.15; letter-spacing: -.045em; }
    .prompt-stack .quote { font-size: clamp(18px, 2vw, 27px); }
    .principles { display: grid; grid-template-columns: repeat(3, 1fr); border-top: 1px solid var(--black); border-bottom: 1px solid var(--black); }
    .principle { min-height: 250px; padding: 24px; border-right: 1px solid var(--line); }
    .principle:first-child { padding-left: 0; }
    .principle:last-child { border-right: 0; padding-right: 0; }
    .principle .num { margin-bottom: 74px; }
    .pricing { display: grid; grid-template-columns: 1.08fr .92fr; gap: clamp(60px, 9vw, 130px); align-items: start; }
    .pricing-copy h2 { margin-bottom: 28px; }
    .pricing-copy p { max-width: 610px; color: #3f3f3b; font-size: 16px; }
    .credit-menu { max-width: 610px; margin-top: 34px; border-top: 1px solid var(--black); }
    .credit-row { min-height: 66px; display: grid; grid-template-columns: 1fr auto; align-items: center; gap: 24px; border-bottom: 1px solid var(--line); }
    .credit-row div { display: grid; gap: 2px; }
    .credit-row strong { font-size: 13px; }
    .credit-row span { color: var(--mid); font-size: 11px; }
    .credit-row b { width: 34px; height: 34px; display: grid; place-items: center; border: 1px solid var(--black); border-radius: 50%; font: 11px/1 ui-monospace, "SFMono-Regular", Menlo, monospace; }
    .credit-row:nth-child(1) b { background: var(--sage); }
    .credit-row:nth-child(2) b { background: var(--rust); }
    .credit-row:nth-child(3) b { background: var(--blue); }
    .credit-row:nth-child(4) b { background: var(--mauve); }
    .price-card { border: 1px solid var(--black); background: #c8bba8; }
    .price-title { display: flex; justify-content: space-between; gap: 24px; padding: 18px; border-bottom: 1px solid var(--black); }
    .price-title strong { font-size: 15px; }
    .price-title span { color: var(--mid); font-size: 11px; }
    .features { list-style: none; margin: 0; padding: 26px 18px; display: grid; gap: 13px; font-size: 13px; }
    .features li { padding-bottom: 13px; border-bottom: 1px solid var(--soft); }
    .features li::before { content: "—"; margin-right: 10px; }
    .price-card .button { width: calc(100% - 36px); margin: 0 18px; }
    .fine { margin: 14px 18px 18px; color: var(--mid); font-size: 10px; text-align: center; }
    .final { padding-block: clamp(94px, 12vw, 150px); }
    .final h2 { max-width: 1000px; margin-bottom: 40px; }
    footer { color: var(--paper); background: var(--black); border-top: 1px solid var(--night-line); }
    .footer { min-height: 90px; display: flex; align-items: center; justify-content: space-between; gap: 30px; color: var(--night-mid); font-size: 11px; }
    .footer-links { display: flex; gap: 24px; }
    .footer a:hover { color: var(--paper); }
    @media (max-width: 920px) {
      .hero { min-height: auto; grid-template-columns: 1fr; }
      .device-shell { width: min(100%, 650px); }
      .device { width: 100%; }
      .section-head { grid-template-columns: 1fr; gap: 22px; }
      .steps { grid-template-columns: 1fr 1fr; }
      .step:nth-child(2) { border-right: 0; }
      .step:nth-child(-n+2) { border-bottom: 1px solid var(--line); }
      .prompt-grid, .pricing { grid-template-columns: 1fr; }
      .principles { grid-template-columns: 1fr; }
      .principle, .principle:first-child, .principle:last-child { min-height: auto; padding: 26px 0; border-right: 0; border-bottom: 1px solid var(--line); }
      .principle:last-child { border-bottom: 0; }
      .principle .num { margin-bottom: 34px; }
    }
    @media (max-width: 620px) {
      .wrap { width: min(calc(100% - 28px), var(--max)); }
      .nav { min-height: 66px; }
      .nav-links a:not(.nav-buy) { display: none; }
      .hero { padding-block: 66px 80px; }
      h1 { font-size: clamp(52px, 16vw, 72px); }
      .lede { font-size: 17px; }
      .actions { align-items: stretch; flex-direction: column; }
      .button { width: 100%; }
      .device-shell { padding-top: 56px; }
      .hero-eclipse { width: 124px; height: 113px; top: -28px; right: 22px; }
      .chat { min-height: 390px; padding: 13px; }
      .steps { grid-template-columns: 1fr; }
      .step, .step:not(:first-child) { min-height: auto; padding: 26px 0; border-right: 0; border-bottom: 1px solid var(--line); }
      .step:last-child { border-bottom: 0; }
      .num { margin-bottom: 34px; }
      .prompt-large { min-height: 330px; }
      .prompt { min-height: 170px; }
      .footer { align-items: flex-start; flex-direction: column; padding-block: 28px; }
    }
    @media (prefers-reduced-motion: reduce) {
      html { scroll-behavior: auto; }
      .button { transition: none; }
    }
  </style>
</head>
<body>
  <header class="wrap nav">
    <div class="wordmark"><span class="mark" aria-hidden="true"><svg viewBox="0 0 64 58" focusable="false"><path fill="currentColor" d="M29 5C15.745 5 5 15.745 5 29s10.745 24 24 24c9.087 0 16.995-5.05 21.07-12.49H29c-6.357 0-11.51-5.153-11.51-11.51S22.643 17.49 29 17.49h21.07C45.995 10.05 38.087 5 29 5Z"/><circle cx="51" cy="29" r="8" fill="currentColor"/></svg></span> Tembro</div>
    <nav class="nav-links" aria-label="Main navigation">
      <a href="#how-it-works">How it works</a>
      <a href="#credits">Credits</a>
      <a class="nav-buy" href="#get-tembro">Get Tembro</a>
    </nav>
  </header>

  <main>
    <div class="wrap hero">
      <div>
        <p class="eyebrow mono">Tembro / inside Ableton Live</p>
        <h1>Tell Tembro where the track should go.</h1>
        <p class="lede">A bassline here. A transition there. The full arrangement, if that is where the evening is going. It works inside Live and checks what changed.</p>
        <div class="actions">
          ${primaryCta}
          <a class="button" href="#how-it-works">Take a peek<span aria-hidden="true">↓</span></a>
        </div>
        <p class="compat">macOS · Ableton Live 12 · Max for Live · Internet required</p>
      </div>

      <div class="device-shell">
        <div class="hero-eclipse" aria-hidden="true"><svg viewBox="0 0 64 58" focusable="false"><path fill="currentColor" d="M29 5C15.745 5 5 15.745 5 29s10.745 24 24 24c9.087 0 16.995-5.05 21.07-12.49H29c-6.357 0-11.51-5.153-11.51-11.51S22.643 17.49 29 17.49h21.07C45.995 10.05 38.087 5 29 5Z"/><circle cx="51" cy="29" r="8" fill="currentColor"/></svg></div>
        <div class="device" aria-label="Example Tembro conversation">
          <div class="device-head"><span>Tembro / Live Set</span><span class="status"><svg class="link-glyph" viewBox="0 0 64 58" aria-hidden="true"><path fill="currentColor" d="M29 5C15.745 5 5 15.745 5 29s10.745 24 24 24c9.087 0 16.995-5.05 21.07-12.49H29c-6.357 0-11.51-5.153-11.51-11.51S22.643 17.49 29 17.49h21.07C45.995 10.05 38.087 5 29 5Z"/><circle cx="51" cy="29" r="8" fill="currentColor"/></svg>connected</span></div>
          <div class="chat">
            <div class="bubble bubble-user">128 bars. Dark trap. Let kick and snare disappear for a second before each hook. Do not overdo the fills.</div>
            <details class="site-trace" open>
              <summary><strong>Liveworks</strong><span>agent calls</span><span>3</span></summary>
              <div class="site-trace-log">
                <details class="site-call"><summary><span>01</span><code>live_set_summary</code><span>Song</span><b>done</b></summary><p>Reads the Live Set, including tempo, tracks, clips, and Arrangement state. <a href="https://docs.cycling74.com/apiref/lom/song/" target="_blank" rel="noreferrer">Official documentation ↗</a></p></details>
                <details class="site-call"><summary><span>02</span><code>tembro_arrange_clip</code><span>ClipSlot</span><b>done</b></summary><p>Places Session material into the Arrangement, then reads each new clip back. <a href="https://docs.cycling74.com/apiref/lom/clipslot/" target="_blank" rel="noreferrer">Official documentation ↗</a></p></details>
                <details class="site-call"><summary><span>03</span><code>live_get</code><span>Clip</span><b>done</b></summary><p>Checks the resulting clip timing and position before Tembro says it is finished. <a href="https://docs.cycling74.com/apiref/lom/clip/" target="_blank" rel="noreferrer">Official documentation ↗</a></p></details>
              </div>
            </details>
            <div class="bubble bubble-ai">Done. Gave the drums some air and kept the fills where they earn it. It is all in Live.</div>
            <div class="result">01  Drums know when to leave<br>02  Fills kept in their lane<br>03  All there, checked in Live</div>
            <div class="composer"><span>What does the track need?</span><span aria-hidden="true">↑</span></div>
          </div>
        </div>
      </div>
    </div>

    <section id="how-it-works">
      <div class="wrap section">
        <div class="section-head">
          <div class="kicker mono">01 / Get in</div>
          <h2>One install. Then it mostly stays out of the way.</h2>
        </div>
        <div class="steps">
          ${firstStep}
          <article class="step"><span class="num">02</span><h3>Install</h3><p>Open the DMG and run Install Tembro. The device and local bridge go to the right folders automatically.</p></article>
          ${activationStep}
          <article class="step"><span class="num">04</span><h3>Chat</h3><p>Add Tembro to a MIDI track, describe the musical result, and watch the work progress in Live.</p></article>
        </div>
      </div>
    </section>

    <section>
      <div class="wrap section">
        <div class="section-head">
          <div class="kicker mono">02 / Say it</div>
          <h2>Say what the track needs.</h2>
        </div>
        <div class="prompt-grid">
          <article class="prompt prompt-large"><div class="label">Full arrangement</div><p class="quote">Create a 128-bar trap track with two distinct hooks, controlled 808 variations, drum suspensions, and fills at the major transitions.</p></article>
          <div class="prompt-stack">
            <article class="prompt"><div class="label">MIDI</div><p class="quote">Make the selected bassline more syncopated.</p></article>
            <article class="prompt"><div class="label">Live Set</div><p class="quote">Set the tempo to 142 and build an eight-bar intro.</p></article>
          </div>
        </div>
      </div>
    </section>

    <section>
      <div class="wrap section">
        <div class="section-head">
          <div class="kicker mono">03 / Have a look</div>
          <h2>It checks its work. Quietly.</h2>
        </div>
        <div class="principles">
          <article class="principle"><span class="num">01</span><h3>The useful tools</h3><p>It gets the Ableton moves it needs. Not a blank cheque to run whatever it likes.</p></article>
          <article class="principle"><span class="num">02</span><h3>Close to the Set</h3><p>The actual work moves through the Ableton bridge on your Mac. Nice and close.</p></article>
          <article class="principle"><span class="num">03</span><h3>One more look</h3><p>After a move, it looks again. If Live disagrees, Tembro does not pretend.</p></article>
        </div>
      </div>
    </section>

    <section id="credits">
      <div class="wrap section pricing">
        <div class="pricing-copy">
          <p class="kicker mono">04 / The tab</p>
          <h2>Credits. Nothing mysterious.</h2>
          <p>They are Tembro credits, not OpenAI tokens. They sit on your Tembro account and cover the model${freeBeta ? " while the beta is free" : ". Buy a pack when you need one; credits never expire"}.</p>
          <p>A quick move costs less than a full arrangement. You see the estimate before sending; if the server cannot complete it, the charge goes back. Fair enough.</p>
          <div class="credit-menu" aria-label="Estimated Tembro credits by skill">${skillMenu}</div>
        </div>
        <div class="price-card" id="get-tembro">
          <div class="price-title"><strong>${freeBeta ? "Tembro free beta" : "Tembro credit packs"}</strong><span>macOS / Live 12</span></div>
          <ul class="features">
            <li>Tembro Max for Live device</li>
            <li>Guided local bridge installation</li>
            <li>${accessFeature}</li>
            <li>${freeBeta ? "Included usage credits" : "40 or 120 credits, one-time, never expiring"}</li>
            <li>Early-access updates</li>
          </ul>
          ${primaryCta}
          <p class="fine">${freeBeta ? "Free during beta. An access code is required to use the AI service." : freeCode ? `First 40 credits free with code ${freeCode}. Studio · 120 credits €29. No subscription. Secure checkout and license delivery by Lemon Squeezy.` : "Packs from €12. No subscription. Secure checkout and license delivery by Lemon Squeezy."}</p>
        </div>
      </div>
    </section>

    <section>
      <div class="wrap final">
        <p class="eyebrow mono">Anyway</p>
        <h2>Back to the track.</h2>
        <div class="actions">${primaryCta}</div>
      </div>
    </section>
  </main>

  <footer>
    <div class="wrap footer">
      <div>© ${new Date().getUTCFullYear()} Tembro · Built for Ableton Live</div>
      <div class="footer-links"><a href="/v0/health">API status</a><span>${supportLink}</span></div>
    </div>
  </footer>
</body>
</html>`;
}
