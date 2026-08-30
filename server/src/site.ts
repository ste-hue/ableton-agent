export interface LandingPageOptions {
  checkoutUrl?: string;
  supportEmail?: string;
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
  const supportEmail = safeEmail(options.supportEmail);
  const checkoutCta = checkoutUrl
    ? `<a class="button button-primary" href="${escapeAttribute(checkoutUrl)}">Get Tembro <span aria-hidden="true">✿</span></a>`
    : '<span class="button button-primary button-disabled" aria-disabled="true">Early access soon ♡</span>';
  const supportLink = supportEmail
    ? `<a href="mailto:${escapeAttribute(supportEmail)}">${escapeAttribute(supportEmail)}</a>`
    : '<a href="#how-it-works">Installation guide</a>';

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="theme-color" content="#fffaf7">
  <meta name="description" content="Tembro turns natural-language ideas into safe, verified actions inside Ableton Live.">
  <title>Tembro — Talk to Ableton Live</title>
  <style>
    :root {
      color-scheme: dark;
      --ink: #f4f1e8;
      --muted: #aaa99f;
      --dim: #77776f;
      --line: rgba(244, 241, 232, 0.14);
      --panel: rgba(255, 255, 255, 0.045);
      --accent: #e8ff62;
      --accent-ink: #11120b;
      --orange: #ff8c42;
      --page: #0d0e0e;
      --max: 1180px;
    }
    * { box-sizing: border-box; }
    html { overflow-x: hidden; scroll-behavior: smooth; }
    body {
      margin: 0;
      overflow-x: clip;
      color: var(--ink);
      background:
        radial-gradient(900px 500px at 72% -10%, rgba(232,255,98,.10), transparent 60%),
        radial-gradient(700px 420px at 0% 42%, rgba(255,140,66,.07), transparent 62%),
        var(--page);
      font: 16px/1.55 ui-sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      -webkit-font-smoothing: antialiased;
    }
    a { color: inherit; }
    .wrap { width: min(calc(100% - 40px), var(--max)); margin-inline: auto; }
    .nav {
      min-height: 80px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-bottom: 1px solid var(--line);
    }
    .wordmark { display: flex; align-items: center; gap: 11px; font-weight: 720; letter-spacing: -.02em; }
    .mark {
      width: 28px;
      height: 28px;
      border: 1px solid var(--ink);
      border-radius: 50%;
      display: grid;
      place-items: center;
      font-size: 13px;
    }
    .nav-links { display: flex; align-items: center; gap: 28px; color: var(--muted); font-size: 14px; }
    .nav-links a { text-decoration: none; }
    .nav-links a:hover { color: var(--ink); }
    .hero {
      min-height: 720px;
      display: grid;
      grid-template-columns: 1.02fr .98fr;
      align-items: center;
      gap: clamp(50px, 8vw, 110px);
      padding-block: 90px 100px;
    }
    .eyebrow {
      margin: 0 0 28px;
      color: var(--accent);
      font-size: 12px;
      font-weight: 750;
      letter-spacing: .16em;
      text-transform: uppercase;
    }
    h1, h2, h3, p { margin-top: 0; }
    h1 {
      max-width: 730px;
      margin-bottom: 28px;
      font-size: clamp(52px, 7vw, 94px);
      line-height: .96;
      letter-spacing: -.068em;
      font-weight: 720;
    }
    .lede { max-width: 610px; margin-bottom: 38px; color: var(--muted); font-size: clamp(18px, 2vw, 22px); }
    .actions { display: flex; flex-wrap: wrap; align-items: center; gap: 14px; }
    .button {
      min-height: 50px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 18px;
      padding: 0 23px;
      border: 1px solid var(--line);
      border-radius: 100px;
      text-decoration: none;
      font-size: 14px;
      font-weight: 720;
      transition: transform .18s ease, background .18s ease;
    }
    .button:hover { transform: translateY(-2px); }
    .button-primary { color: var(--accent-ink); border-color: var(--accent); background: var(--accent); }
    .button-secondary { background: rgba(255,255,255,.035); }
    .button-disabled { opacity: .58; cursor: default; }
    .button-disabled:hover { transform: none; }
    .compat { margin-top: 24px; color: var(--dim); font-size: 13px; }
    .device {
      position: relative;
      padding: 14px;
      border: 1px solid var(--line);
      border-radius: 18px;
      background: rgba(0,0,0,.45);
      box-shadow: 0 35px 100px rgba(0,0,0,.35);
      transform: rotate(1.2deg);
    }
    .device::before {
      content: "";
      position: absolute;
      inset: -45px -50px;
      z-index: -1;
      background: radial-gradient(circle, rgba(232,255,98,.10), transparent 67%);
    }
    .device-head { display: flex; align-items: center; justify-content: space-between; padding: 3px 4px 15px; color: var(--muted); font-size: 12px; }
    .status { display: flex; align-items: center; gap: 7px; color: #b9d878; }
    .status::before { content: ""; width: 7px; height: 7px; border-radius: 50%; background: var(--accent); box-shadow: 0 0 10px var(--accent); }
    .chat { min-height: 430px; padding: 22px; border-radius: 10px; background: #161818; display: flex; flex-direction: column; gap: 14px; }
    .bubble { max-width: 88%; padding: 12px 15px; border-radius: 13px; font-size: 14px; }
    .bubble-user { align-self: flex-end; color: #20220f; background: #ddea87; border-bottom-right-radius: 4px; }
    .bubble-ai { align-self: flex-start; color: #deddd5; background: #282a2a; border-bottom-left-radius: 4px; }
    .result { margin-top: 2px; padding: 12px 14px; border: 1px solid rgba(232,255,98,.23); border-radius: 9px; color: #c8c9bd; background: rgba(232,255,98,.035); font: 12px/1.5 ui-monospace, SFMono-Regular, Menlo, monospace; }
    .check { color: var(--accent); }
    .composer { margin-top: auto; display: flex; align-items: center; justify-content: space-between; padding: 12px 14px; border: 1px solid var(--line); border-radius: 9px; color: #64655f; font-size: 13px; }
    section { border-top: 1px solid var(--line); }
    .section { padding-block: clamp(85px, 11vw, 145px); }
    .section-head { display: grid; grid-template-columns: .65fr 1.35fr; gap: 50px; margin-bottom: 72px; }
    .kicker { color: var(--dim); font-size: 12px; letter-spacing: .13em; text-transform: uppercase; }
    h2 { max-width: 800px; font-size: clamp(38px, 5vw, 68px); line-height: 1.02; letter-spacing: -.05em; font-weight: 680; }
    h3 { font-size: 20px; letter-spacing: -.025em; }
    .steps { display: grid; grid-template-columns: repeat(4, 1fr); border-top: 1px solid var(--line); }
    .step { min-height: 230px; padding: 26px 24px 24px 0; border-right: 1px solid var(--line); }
    .step:not(:first-child) { padding-left: 24px; }
    .step:last-child { border-right: 0; }
    .num { margin-bottom: 56px; color: var(--accent); font: 12px/1 ui-monospace, SFMono-Regular, Menlo, monospace; }
    .step p, .card p { color: var(--muted); font-size: 14px; }
    .prompt-grid { display: grid; grid-template-columns: 1.18fr .82fr; gap: 16px; }
    .prompt-stack { display: grid; gap: 16px; }
    .prompt {
      min-height: 170px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      padding: 25px;
      border: 1px solid var(--line);
      border-radius: 12px;
      background: var(--panel);
    }
    .prompt-large { min-height: 356px; background: linear-gradient(150deg, rgba(232,255,98,.075), rgba(255,255,255,.025)); }
    .quote { max-width: 620px; font-size: clamp(25px, 3vw, 42px); line-height: 1.16; letter-spacing: -.035em; }
    .label { color: var(--dim); font: 11px/1.4 ui-monospace, SFMono-Regular, Menlo, monospace; text-transform: uppercase; }
    .trust-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; }
    .card { min-height: 245px; padding: 27px; border: 1px solid var(--line); border-radius: 12px; background: var(--panel); }
    .card-icon { margin-bottom: 62px; color: var(--orange); font: 18px/1 ui-monospace, SFMono-Regular, Menlo, monospace; }
    .pricing {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: clamp(50px, 9vw, 130px);
      align-items: start;
    }
    .pricing-copy p { max-width: 550px; color: var(--muted); font-size: 18px; }
    .price-card { padding: 34px; border: 1px solid rgba(232,255,98,.35); border-radius: 14px; background: rgba(232,255,98,.035); }
    .price-title { display: flex; justify-content: space-between; gap: 30px; padding-bottom: 28px; border-bottom: 1px solid var(--line); }
    .price-title strong { font-size: 22px; }
    .price-title span { color: var(--muted); font-size: 13px; }
    .features { list-style: none; margin: 27px 0 30px; padding: 0; display: grid; gap: 13px; color: #cac9c0; font-size: 14px; }
    .features li::before { content: "✓"; margin-right: 10px; color: var(--accent); }
    .price-card .button { width: 100%; }
    .fine { margin: 16px 0 0; color: var(--dim); font-size: 12px; text-align: center; }
    .final { padding-block: 120px; text-align: center; }
    .final h2 { margin-inline: auto; }
    .final .actions { justify-content: center; }
    footer { border-top: 1px solid var(--line); }
    .footer { min-height: 110px; display: flex; align-items: center; justify-content: space-between; gap: 30px; color: var(--dim); font-size: 12px; }
    .footer-links { display: flex; gap: 24px; }
    .footer a:hover { color: var(--ink); }
    @media (max-width: 900px) {
      .hero { min-height: auto; grid-template-columns: 1fr; padding-block: 75px 90px; }
      .device { width: min(100%, 620px); transform: none; }
      .section-head { grid-template-columns: 1fr; gap: 20px; }
      .steps { grid-template-columns: 1fr 1fr; }
      .step:nth-child(2) { border-right: 0; }
      .step:nth-child(-n+2) { border-bottom: 1px solid var(--line); }
      .prompt-grid, .pricing { grid-template-columns: 1fr; }
      .trust-grid { grid-template-columns: 1fr; }
      .card { min-height: 210px; }
    }
    @media (max-width: 600px) {
      .wrap { width: min(calc(100% - 28px), var(--max)); }
      .nav { min-height: 68px; }
      .nav-links a:not(.nav-buy) { display: none; }
      h1 { font-size: 50px; }
      .hero { padding-top: 58px; }
      .chat { min-height: 360px; padding: 15px; }
      .steps { grid-template-columns: 1fr; }
      .step, .step:not(:first-child) { min-height: 185px; padding: 25px 0; border-right: 0; border-bottom: 1px solid var(--line); }
      .step:last-child { border-bottom: 0; }
      .num { margin-bottom: 38px; }
      .prompt-large { min-height: 285px; }
      .footer { align-items: flex-start; flex-direction: column; padding-block: 28px; }
    }
    @media (prefers-reduced-motion: reduce) {
      html { scroll-behavior: auto; }
      .button { transition: none; }
    }

    /* Tembro terminal skin: raw, local, inspectable. */
    :root {
      --ink: #e8ffe9;
      --muted: #94a996;
      --dim: #5e7160;
      --line: rgba(100, 255, 117, .24);
      --panel: rgba(9, 25, 12, .74);
      --accent: #64ff75;
      --accent-ink: #031105;
      --orange: #ffb000;
      --page: #030705;
    }
    html { background: var(--page); }
    body {
      position: relative;
      background-color: var(--page);
      background-image:
        linear-gradient(rgba(100,255,117,.035) 1px, transparent 1px),
        linear-gradient(90deg, rgba(100,255,117,.035) 1px, transparent 1px),
        radial-gradient(900px 520px at 82% 12%, rgba(100,255,117,.10), transparent 62%);
      background-size: 32px 32px, 32px 32px, auto;
      font-family: ui-monospace, "SFMono-Regular", Menlo, Monaco, Consolas, monospace;
      letter-spacing: -.015em;
    }
    body::before {
      content: "";
      position: fixed;
      inset: 0;
      z-index: 50;
      pointer-events: none;
      opacity: .13;
      background: repeating-linear-gradient(to bottom, transparent 0 3px, rgba(0,0,0,.42) 3px 4px);
    }
    .wrap { width: min(calc(100% - 48px), var(--max)); }
    .nav {
      min-height: 68px;
      border-bottom-color: var(--accent);
      text-transform: uppercase;
    }
    .wordmark { gap: 10px; color: var(--accent); font-size: 14px; font-weight: 650; letter-spacing: .08em; }
    .wordmark::after { content: "_"; animation: blink 1.1s steps(1) infinite; }
    .mark { width: 27px; height: 27px; border-color: var(--accent); border-radius: 0; color: var(--accent); }
    .nav-links { gap: 24px; color: var(--dim); font-size: 11px; letter-spacing: .08em; }
    .nav-links a::before { content: "./"; color: var(--accent); }
    .nav-links a:hover { color: var(--accent); }
    .hero {
      min-height: 760px;
      grid-template-columns: 1.08fr .92fr;
      gap: clamp(46px, 7vw, 92px);
      padding-block: 92px 112px;
    }
    .hero > div:first-child { position: relative; }
    .hero > div:first-child::before {
      content: "SYSTEM ONLINE / BUILD 00.1";
      display: block;
      width: fit-content;
      margin-bottom: 26px;
      padding: 5px 8px;
      color: var(--accent-ink);
      background: var(--accent);
      font-size: 10px;
      font-weight: 800;
      letter-spacing: .1em;
    }
    .eyebrow { margin-bottom: 22px; color: var(--accent); font-size: 11px; font-weight: 550; letter-spacing: .1em; }
    .eyebrow::before { content: "> "; }
    h1 {
      max-width: 760px;
      margin-bottom: 30px;
      color: #f2fff3;
      font-family: inherit;
      font-size: clamp(49px, 6.2vw, 83px);
      line-height: .98;
      letter-spacing: -.07em;
      text-transform: uppercase;
      text-shadow: 3px 0 0 rgba(100,255,117,.20);
    }
    .lede { max-width: 650px; margin-bottom: 36px; padding-left: 16px; border-left: 2px solid var(--accent); color: var(--muted); font-size: 17px; }
    .button {
      min-height: 46px;
      gap: 12px;
      border-color: var(--accent);
      border-radius: 0;
      font-size: 12px;
      font-weight: 750;
      letter-spacing: .06em;
      text-transform: uppercase;
      box-shadow: 4px 4px 0 rgba(100,255,117,.17);
      transition: color .14s ease, background .14s ease, transform .14s ease, box-shadow .14s ease;
    }
    .button:hover { transform: translate(2px, 2px); box-shadow: 1px 1px 0 rgba(100,255,117,.2); }
    .button-secondary { color: var(--accent); background: transparent; }
    .button-disabled { color: #152417; background: #6c8f70; border-color: #6c8f70; box-shadow: none; }
    .compat { margin-top: 23px; color: var(--dim); font-size: 10px; letter-spacing: .04em; text-transform: uppercase; }
    .compat::before { content: "REQ:: "; color: var(--orange); }
    .device {
      padding: 0;
      border-color: var(--accent);
      border-radius: 0;
      background: #020503;
      box-shadow: 13px 13px 0 rgba(100,255,117,.09), 0 0 80px rgba(100,255,117,.08);
      transform: none;
    }
    .device::before { display: none; }
    .device-head {
      min-height: 42px;
      padding: 0 13px;
      border-bottom: 1px solid var(--accent);
      color: var(--accent);
      background: rgba(100,255,117,.06);
      font-size: 10px;
      letter-spacing: .06em;
      text-transform: uppercase;
    }
    .device-head > span:first-child::before { content: "[ TEMBRO_SHELL ] "; color: var(--ink); }
    .status { color: var(--accent); }
    .status::before { width: 6px; height: 6px; border-radius: 0; }
    .chat { min-height: 435px; padding: 19px; border-radius: 0; background: rgba(2,7,3,.90); gap: 0; }
    .bubble { max-width: 100%; padding: 13px 10px; border: 0; border-radius: 0; font-size: 12px; line-height: 1.65; }
    .bubble::before { display: block; margin-bottom: 4px; color: var(--accent); font-size: 9px; letter-spacing: .1em; }
    .bubble-user { align-self: stretch; color: var(--ink); background: transparent; border-bottom: 1px dashed var(--line); }
    .bubble-user::before { content: "USER@LIVE:~$"; }
    .bubble-ai { align-self: stretch; color: var(--muted); background: transparent; }
    .bubble-ai::before { content: "TEMBRO/PLAN::"; color: var(--orange); }
    .result {
      margin: 5px 10px;
      padding: 13px;
      border-color: var(--line);
      border-radius: 0;
      color: var(--accent);
      background: rgba(100,255,117,.035);
      font-size: 11px;
    }
    .composer { margin: auto 10px 3px; padding: 11px 12px; border-color: var(--dim); border-radius: 0; color: var(--dim); font-size: 11px; }
    .composer::before { content: ">"; margin-right: 9px; color: var(--accent); }
    section { position: relative; border-top-color: var(--line); }
    section::before { content: ""; position: absolute; top: -3px; left: 0; width: 90px; height: 5px; background: var(--accent); }
    .section { padding-block: clamp(80px, 10vw, 126px); }
    .section-head { grid-template-columns: .55fr 1.45fr; margin-bottom: 62px; }
    .kicker { color: var(--accent); font-size: 10px; letter-spacing: .08em; }
    .kicker::before { content: "// "; color: var(--orange); }
    h2 { font-family: inherit; font-size: clamp(34px, 4.5vw, 59px); line-height: 1.03; letter-spacing: -.055em; text-transform: uppercase; }
    h3 { color: var(--accent); font-family: inherit; font-size: 15px; letter-spacing: .02em; text-transform: uppercase; }
    .steps { border-color: var(--accent); }
    .step { border-color: var(--line); }
    .num { color: var(--orange); }
    .num::before { content: "["; }
    .num::after { content: "]"; }
    .step p, .card p { color: var(--muted); font-size: 12px; line-height: 1.7; }
    .prompt-grid, .prompt-stack, .trust-grid { gap: 10px; }
    .prompt {
      padding: 22px;
      border-color: var(--line);
      border-radius: 0;
      background: rgba(3,10,5,.82);
    }
    .prompt-large { background: linear-gradient(135deg, rgba(100,255,117,.08), rgba(3,10,5,.9)); }
    .quote { font-family: inherit; font-size: clamp(20px, 2.4vw, 32px); line-height: 1.3; letter-spacing: -.045em; }
    .quote::before { content: "> "; color: var(--accent); }
    .label { color: var(--orange); font-size: 9px; letter-spacing: .1em; }
    .label::before { content: "TARGET::"; }
    .card { border-color: var(--line); border-radius: 0; background: rgba(3,10,5,.82); }
    .card-icon { margin-bottom: 55px; color: var(--orange); font-size: 12px; }
    .card-icon::after { content: " / PASS"; color: var(--accent); }
    .pricing-copy p { color: var(--muted); font-size: 14px; line-height: 1.75; }
    .price-card { padding: 0; border-color: var(--accent); border-radius: 0; background: rgba(3,10,5,.9); box-shadow: 10px 10px 0 rgba(100,255,117,.08); }
    .price-title { padding: 16px 18px; border-bottom-color: var(--accent); color: var(--accent); background: rgba(100,255,117,.07); text-transform: uppercase; }
    .price-title strong { font-size: 14px; }
    .price-title span { color: var(--muted); font-size: 10px; }
    .features { margin: 0; padding: 25px 20px; gap: 12px; color: var(--muted); font-size: 12px; }
    .features li::before { content: "[x]"; color: var(--accent); }
    .price-card .button { width: calc(100% - 40px); margin: 0 20px; }
    .fine { margin: 15px 20px 20px; font-size: 9px; }
    .final { text-align: left; }
    .final h2 { margin-inline: 0; max-width: 980px; }
    .final .actions { justify-content: flex-start; }
    .footer { min-height: 84px; font-size: 10px; text-transform: uppercase; }
    .footer a { color: var(--accent); }
    @keyframes blink { 50% { opacity: 0; } }
    @media (max-width: 900px) {
      .hero { grid-template-columns: 1fr; }
      .section-head { grid-template-columns: 1fr; }
    }
    @media (max-width: 600px) {
      .wrap { width: min(calc(100% - 28px), var(--max)); }
      .hero { padding-top: 62px; }
      .hero > div:first-child::before { margin-bottom: 22px; }
      h1 { font-size: 44px; }
      .lede { font-size: 14px; }
      .actions { align-items: stretch; flex-direction: column; }
      .button { width: 100%; }
      .device { box-shadow: 7px 7px 0 rgba(100,255,117,.09); }
    }

    /* Kawaii minimal skin: gentle, musical, and intentionally un-techy. */
    :root {
      color-scheme: light;
      --ink: #302b3f;
      --muted: #746d82;
      --dim: #9a93a7;
      --line: #e8e0ef;
      --panel: #fffdfd;
      --accent: #8b6de9;
      --accent-ink: #ffffff;
      --orange: #f2a7bd;
      --page: #fffaf7;
    }
    html { background: var(--page); }
    body {
      color: var(--ink);
      background:
        radial-gradient(circle at 88% 9%, rgba(204,186,255,.30) 0 9%, transparent 9.2%),
        radial-gradient(circle at 4% 41%, rgba(255,206,220,.28) 0 7%, transparent 7.2%),
        linear-gradient(180deg, #fffaf7, #fdfaff 46%, #fffaf7);
      background-size: auto;
      font-family: ui-rounded, "SF Pro Rounded", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      letter-spacing: -.012em;
    }
    body::before {
      content: "✦";
      position: fixed;
      inset: auto auto 8% 4%;
      z-index: 0;
      width: auto;
      height: auto;
      color: #e8b7c8;
      background: none;
      opacity: .55;
      font-size: 24px;
    }
    .wrap { width: min(calc(100% - 48px), 1120px); }
    .nav { min-height: 76px; border-bottom: 1px solid var(--line); text-transform: none; }
    .wordmark { gap: 9px; color: var(--ink); font-size: 16px; font-weight: 720; letter-spacing: -.025em; }
    .wordmark::after { content: "♡"; color: #f1a7bd; animation: none; font-size: 12px; }
    .mark { width: 30px; height: 30px; border: 0; border-radius: 10px; color: #fff; background: var(--accent); font-weight: 800; transform: rotate(-5deg); }
    .nav-links { gap: 26px; color: var(--muted); font-size: 13px; letter-spacing: 0; }
    .nav-links a::before { content: none; }
    .nav-links a:hover { color: var(--accent); }
    .hero { min-height: 730px; grid-template-columns: 1.04fr .96fr; gap: clamp(48px, 7vw, 90px); padding-block: 92px 112px; }
    .hero > div:first-child::before {
      content: "✿  made for Ableton Live";
      margin-bottom: 24px;
      padding: 7px 11px;
      border: 1px solid #eadcf8;
      border-radius: 999px;
      color: #775dbf;
      background: #f7efff;
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0;
    }
    .eyebrow { margin-bottom: 19px; color: #b35f7d; font-size: 12px; font-weight: 700; letter-spacing: .08em; }
    .eyebrow::before { content: none; }
    h1 {
      max-width: 700px;
      margin-bottom: 27px;
      color: var(--ink);
      font-family: inherit;
      font-size: clamp(54px, 6.5vw, 84px);
      font-weight: 790;
      line-height: .98;
      letter-spacing: -.07em;
      text-transform: none;
      text-shadow: none;
    }
    .lede { max-width: 570px; margin-bottom: 36px; padding-left: 0; border-left: 0; color: var(--muted); font-size: 19px; line-height: 1.65; }
    .button {
      min-height: 50px;
      gap: 10px;
      padding-inline: 22px;
      border: 1px solid #dccff0;
      border-radius: 16px;
      font-size: 14px;
      font-weight: 720;
      letter-spacing: 0;
      text-transform: none;
      box-shadow: 0 6px 18px rgba(90,65,128,.09);
      transition: transform .15s ease, box-shadow .15s ease;
    }
    .button:hover { transform: translateY(-2px); box-shadow: 0 9px 22px rgba(90,65,128,.13); }
    .button-primary { color: #fff; border-color: var(--accent); background: var(--accent); }
    .button-secondary { color: #625973; background: rgba(255,255,255,.72); }
    .button-disabled { color: #7a6c88; border-color: #eadfeb; background: #f3eaf3; box-shadow: none; }
    .compat { margin-top: 22px; color: var(--dim); font-size: 12px; letter-spacing: 0; text-transform: none; }
    .compat::before { content: "♪ "; color: #d1809d; }
    .device {
      padding: 9px;
      border: 1px solid #dfd2ed;
      border-radius: 28px;
      background: rgba(255,255,255,.88);
      box-shadow: 0 28px 70px rgba(88,63,117,.14), 12px 14px 0 #f2eaff;
      transform: rotate(1deg);
    }
    .device::before {
      content: "✦";
      display: block;
      position: absolute;
      inset: -28px auto auto -22px;
      color: #f1a7bd;
      background: none;
      font-size: 22px;
    }
    .device-head {
      min-height: 45px;
      padding: 0 14px;
      border-bottom: 0;
      color: #665d73;
      background: transparent;
      font-size: 12px;
      letter-spacing: 0;
      text-transform: none;
    }
    .device-head > span:first-child::before { content: none; }
    .status { color: #678976; }
    .status::before { width: 8px; height: 8px; border-radius: 50%; background: #96d7ac; box-shadow: none; }
    .chat { min-height: 425px; padding: 19px; border-radius: 21px; background: #fbf8ff; gap: 13px; }
    .bubble { max-width: 88%; padding: 13px 15px; border: 0; border-radius: 17px; font-size: 13px; line-height: 1.55; }
    .bubble::before { display: none; }
    .bubble-user { align-self: flex-end; color: #4e4050; background: #ffe5ee; border-bottom: 0; border-bottom-right-radius: 6px; }
    .bubble-ai { align-self: flex-start; color: #514963; background: #eee7ff; border-bottom-left-radius: 6px; }
    .result { margin: 0; padding: 13px 15px; border: 1px solid #dceedd; border-radius: 15px; color: #5c7865; background: #effaf1; font-family: inherit; font-size: 12px; line-height: 1.65; }
    .check { color: #57946a; font-weight: 750; }
    .composer { margin: auto 0 0; padding: 13px 14px; border: 1px solid #e5dced; border-radius: 14px; color: #aaa2b3; background: #fff; font-size: 12px; }
    .composer::before { content: none; }
    section { border-top: 1px solid var(--line); }
    section::before { content: "✿"; top: -13px; left: 50%; width: auto; height: auto; padding: 0 9px; color: #c98ba2; background: var(--page); font-size: 14px; transform: translateX(-50%); }
    .section { padding-block: clamp(84px, 10vw, 125px); }
    .section-head { grid-template-columns: .55fr 1.45fr; gap: 44px; margin-bottom: 62px; }
    .kicker { color: #a56b82; font-size: 11px; letter-spacing: .05em; text-transform: uppercase; }
    .kicker::before { content: none; }
    h2 { color: var(--ink); font-family: inherit; font-size: clamp(38px, 4.7vw, 62px); font-weight: 760; line-height: 1.04; letter-spacing: -.06em; text-transform: none; }
    h3 { color: #554b64; font-family: inherit; font-size: 18px; letter-spacing: -.025em; text-transform: none; }
    .steps { border-top: 1px solid var(--line); }
    .step { border-color: var(--line); }
    .num { width: 32px; height: 32px; display: grid; place-items: center; margin-bottom: 45px; border-radius: 50%; color: #765ab0; background: #eee5ff; font-family: inherit; font-size: 11px; }
    .num::before, .num::after { content: none; }
    .step p, .card p { color: var(--muted); font-size: 14px; line-height: 1.65; }
    .prompt-grid, .prompt-stack, .trust-grid { gap: 14px; }
    .prompt { padding: 25px; border: 1px solid #e7ddef; border-radius: 24px; background: rgba(255,255,255,.72); }
    .prompt-large { background: linear-gradient(145deg, #f5edff, #fff8fa); }
    .quote { color: #4d4459; font-family: inherit; font-size: clamp(23px, 2.6vw, 35px); line-height: 1.28; letter-spacing: -.045em; }
    .quote::before { content: "“"; color: #d488a5; }
    .label { color: #a271b5; font-family: inherit; font-size: 10px; letter-spacing: .08em; }
    .label::before { content: none; }
    .card { border: 1px solid #e7ddef; border-radius: 24px; background: rgba(255,255,255,.76); }
    .card:nth-child(2) { background: #fff4f7; }
    .card:nth-child(3) { background: #f2fbf3; }
    .card-icon { width: 38px; height: 38px; display: grid; place-items: center; margin-bottom: 50px; border-radius: 13px; color: #765ab0; background: #eee5ff; font-family: inherit; font-size: 11px; }
    .card-icon::after { content: none; }
    .pricing-copy p { color: var(--muted); font-size: 16px; line-height: 1.75; }
    .price-card { padding: 9px; border: 1px solid #e4d6ea; border-radius: 28px; background: #fff; box-shadow: 10px 13px 0 #f4e9f2; }
    .price-title { padding: 19px 20px; border: 0; border-radius: 20px; color: #554b64; background: #f8efff; text-transform: none; }
    .price-title strong { font-size: 17px; }
    .price-title span { color: #8f829d; font-size: 12px; }
    .features { margin: 0; padding: 27px 22px; gap: 13px; color: var(--muted); font-size: 14px; }
    .features li::before { content: "♡"; color: #c97695; }
    .price-card .button { width: calc(100% - 28px); margin: 0 14px; }
    .fine { margin: 16px 14px 18px; color: var(--dim); font-size: 11px; }
    .final { text-align: center; }
    .final h2 { margin-inline: auto; max-width: 850px; }
    .final .actions { justify-content: center; }
    .footer { min-height: 92px; color: var(--dim); font-size: 12px; text-transform: none; }
    .footer a { color: #856bb4; }
    @media (max-width: 900px) {
      .hero { grid-template-columns: 1fr; }
      .device { width: min(100%, 620px); transform: none; }
      .section-head { grid-template-columns: 1fr; }
    }
    @media (max-width: 600px) {
      .wrap { width: min(calc(100% - 28px), var(--max)); }
      .hero { padding-top: 58px; }
      .hero > div:first-child::before { margin-bottom: 21px; }
      h1 { font-size: 49px; }
      .lede { font-size: 17px; }
      .actions { align-items: stretch; flex-direction: column; }
      .button { width: 100%; }
      .device { box-shadow: 7px 9px 0 #f2eaff; }
    }
  </style>
</head>
<body>
  <header class="wrap nav">
    <div class="wordmark"><span class="mark">T</span> Tembro</div>
    <nav class="nav-links" aria-label="Main navigation">
      <a href="#how-it-works">How it works</a>
      <a href="#credits">Credits</a>
      <a class="nav-buy" href="#get-tembro">Get Tembro</a>
    </nav>
  </header>

  <main>
    <div class="wrap hero">
      <div>
        <p class="eyebrow">A little chat for Ableton Live</p>
        <h1>Big ideas.<br>Tiny clicks.</h1>
        <p class="lede">Tell Tembro what you want to hear. It makes the change inside Live, checks the result, and lets you stay with the music.</p>
        <div class="actions">
          ${checkoutCta}
          <a class="button button-secondary" href="#how-it-works">See how it works</a>
        </div>
        <p class="compat">For macOS · Ableton Live 12 with Max for Live · Internet required</p>
      </div>

      <div class="device" aria-label="Example Tembro conversation">
        <div class="device-head"><span>Tembro · Live Set</span><span class="status">connected</span></div>
        <div class="chat">
          <div class="bubble bubble-user">Set the tempo to 125 and make the selected bass clip more syncopated.</div>
          <div class="bubble bubble-ai">Done! The tempo is 125 BPM and the bass accents feel a little bouncier.</div>
          <div class="result"><span class="check">✓</span> Tempo set to 125 BPM<br><span class="check">✓</span> Bassline updated<br><span class="check">✓</span> Checked in Live</div>
          <div class="composer"><span>What should we make?</span><span aria-hidden="true">↵</span></div>
        </div>
      </div>
    </div>

    <section id="how-it-works">
      <div class="wrap section">
        <div class="section-head">
          <div class="kicker">01 / Easy peasy</div>
          <h2>From download to first prompt in four small steps.</h2>
        </div>
        <div class="steps">
          <article class="step"><div class="num">01</div><h3>Buy</h3><p>Check out securely through LemonSqueezy and receive your personal license key.</p></article>
          <article class="step"><div class="num">02</div><h3>Install</h3><p>Download Tembro, copy it to your Ableton User Library, and complete the guided setup.</p></article>
          <article class="step"><div class="num">03</div><h3>Activate</h3><p>Enter your purchase email and license key once. No OpenAI key is ever required from the customer.</p></article>
          <article class="step"><div class="num">04</div><h3>Chat</h3><p>Drop Tembro onto a MIDI track, describe the result you want, and keep making music.</p></article>
        </div>
      </div>
    </section>

    <section>
      <div class="wrap section">
        <div class="section-head">
          <div class="kicker">02 / Just say it</div>
          <h2>Describe the music, not the menus.</h2>
        </div>
        <div class="prompt-grid">
          <article class="prompt prompt-large"><div class="label">Arrangement</div><div class="quote">“Create an eight-bar build using the selected drums, then bring the bass back on bar nine.”</div></article>
          <div class="prompt-stack">
            <article class="prompt"><div class="label">MIDI</div><div class="quote">“Make this bassline more syncopated.”</div></article>
            <article class="prompt"><div class="label">Session</div><div class="quote">“Set the tempo to 125.”</div></article>
          </div>
        </div>
      </div>
    </section>

    <section>
      <div class="wrap section">
        <div class="section-head">
          <div class="kicker">03 / Quietly careful</div>
          <h2>Sweet on the outside. Guardrails underneath.</h2>
        </div>
        <div class="trust-grid">
          <article class="card"><div class="card-icon">[01]</div><h3>Plans before actions</h3><p>The model can only request a defined set of operations. Tembro validates every plan before it reaches Live.</p></article>
          <article class="card"><div class="card-icon">[02]</div><h3>Local execution</h3><p>Changes happen through the local Ableton bridge. AI requests use Tembro’s server-side key, which customers never receive.</p></article>
          <article class="card"><div class="card-icon">[03]</div><h3>Verified results</h3><p>After each operation, Tembro reads the result back from Live and tells you what actually changed.</p></article>
        </div>
      </div>
    </section>

    <section id="credits">
      <div class="wrap section pricing">
        <div class="pricing-copy">
          <p class="kicker">04 / Simple credits</p>
          <h2>One clear balance. No token homework.</h2>
          <p>Tembro credits are product units, not OpenAI tokens. The customer balance is connected to their Tembro license; model usage is paid by Tembro and included in the product price.</p>
          <p>This lets pricing stay clear even when the underlying AI model changes. A failed AI request is automatically refunded.</p>
        </div>
        <div class="price-card" id="get-tembro">
          <div class="price-title"><strong>Tembro early access</strong><span>macOS / Live 12</span></div>
          <ul class="features">
            <li>Tembro Max for Live device</li>
            <li>Guided local bridge installation</li>
            <li>License activation on one studio computer</li>
            <li>Included usage credits</li>
            <li>Updates during early access</li>
          </ul>
          ${checkoutCta}
          <p class="fine">Secure checkout and license delivery by LemonSqueezy.</p>
        </div>
      </div>
    </section>

    <section>
      <div class="wrap final">
        <p class="eyebrow">Stay in the song</p>
        <h2>Fewer tiny clicks.<br>More big ideas.</h2>
        <div class="actions">${checkoutCta}</div>
      </div>
    </section>
  </main>

  <footer>
    <div class="wrap footer">
      <div>© ${new Date().getUTCFullYear()} Tembro. Built for Ableton Live.</div>
      <div class="footer-links"><a href="/v0/health">API status</a>${supportEmail ? `<span>${supportLink}</span>` : ""}</div>
    </div>
  </footer>
</body>
</html>`;
}
