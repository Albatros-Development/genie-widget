// src/i18n.ts
var LOCALES = ["fr", "en"];
var FR = {
  trigger: "Envoyer un retour",
  title: "Envoyer un retour",
  description: "Signalez un bug, proposez une id\xE9e, ou dites-nous ce qui ne va pas.",
  typeLabel: "Type",
  typeBug: "Bug",
  typeIdea: "Id\xE9e",
  typeOther: "Autre",
  messageLabel: "Votre retour",
  messagePlaceholder: "D\xE9crivez ce qui s\u2019est pass\xE9\u2026",
  screenshotLabel: "Capture d\u2019\xE9cran",
  screenshotCapturing: "Capture en cours\u2026",
  screenshotFailed: "La capture a \xE9chou\xE9.",
  screenshotRetry: "R\xE9essayer",
  screenshotRemove: "Retirer",
  pick: "D\xE9signer un \xE9l\xE9ment",
  picking: "Touchez l\u2019\xE9l\xE9ment concern\xE9",
  pickDone: "Termin\xE9",
  picked: "\xE9l\xE9ment(s) d\xE9sign\xE9(s)",
  voiceStart: "Dicter",
  voiceStop: "Arr\xEAter",
  cancel: "Annuler",
  submit: "Envoyer",
  submitting: "Envoi\u2026",
  thanks: "Merci \u2014 c\u2019est bien re\xE7u.",
  error: "L\u2019envoi a \xE9chou\xE9. R\xE9essayez."
};
var EN = {
  trigger: "Send feedback",
  title: "Send feedback",
  description: "Report a bug, suggest an idea, or tell us what looks wrong.",
  typeLabel: "Type",
  typeBug: "Bug",
  typeIdea: "Idea",
  typeOther: "Other",
  messageLabel: "Your feedback",
  messagePlaceholder: "Describe what happened\u2026",
  screenshotLabel: "Screenshot",
  screenshotCapturing: "Capturing\u2026",
  screenshotFailed: "Capture failed.",
  screenshotRetry: "Retry",
  screenshotRemove: "Remove",
  pick: "Point at an element",
  picking: "Tap the element you mean",
  pickDone: "Done",
  picked: "element(s) selected",
  voiceStart: "Dictate",
  voiceStop: "Stop",
  cancel: "Cancel",
  submit: "Send",
  submitting: "Sending\u2026",
  thanks: "Thanks \u2014 received.",
  error: "Could not send. Try again."
};
var TABLES = { fr: FR, en: EN };
function isLocale(value) {
  return LOCALES.includes(value);
}
function stringsFor(locale, overrides) {
  const base = locale && isLocale(locale) ? TABLES[locale] : FR;
  if (!overrides) {
    return base;
  }
  try {
    const parsed = JSON.parse(overrides);
    if (typeof parsed !== "object" || parsed === null) {
      return base;
    }
    const merged = { ...base };
    for (const [key, value] of Object.entries(parsed)) {
      if (key in merged && typeof value === "string") {
        merged[key] = value;
      }
    }
    return merged;
  } catch {
    return base;
  }
}

// src/highlighter.ts
var MAX_PICKS = 5;
function boundsOf(el) {
  const r = el.getBoundingClientRect();
  return { top: r.top, left: r.left, width: r.width, height: r.height };
}
function labelOf(el) {
  const aria = el.getAttribute("aria-label");
  if (aria) {
    return aria.slice(0, 60);
  }
  const text = (el.textContent ?? "").trim().replace(/\s+/g, " ");
  if (text && text.length <= 60) {
    return text;
  }
  if (text) {
    return `${text.slice(0, 57)}\u2026`;
  }
  const alt = el.getAttribute("alt") ?? el.getAttribute("placeholder");
  return alt ? alt.slice(0, 60) : el.tagName.toLowerCase();
}
function selectorOf(el) {
  if (el.id) {
    return `#${el.id}`;
  }
  const parts = [];
  let node = el;
  for (let depth = 0; node && depth < 4; depth++) {
    let part = node.tagName.toLowerCase();
    const testId = node.getAttribute("data-testid");
    if (testId) {
      parts.unshift(`[data-testid="${testId}"]`);
      break;
    }
    const cls = (node.getAttribute("class") ?? "").split(/\s+/).filter((c) => c && !c.includes("[") && c.length < 24).slice(0, 2);
    if (cls.length > 0) {
      part += `.${cls.join(".")}`;
    }
    parts.unshift(part);
    node = node.parentElement;
  }
  return parts.join(" > ");
}
function startPicking(host, cb) {
  const picks = [];
  const pickBounds = [];
  const isOurs = (target) => target instanceof Node && (target === host || host.contains(target));
  const elementAt = (x, y) => {
    const el = document.elementFromPoint(x, y);
    if (!el || el === host || host.contains(el) || el === document.body) {
      return null;
    }
    return el;
  };
  const onPointerMove = (e) => {
    if (isOurs(e.target)) {
      cb.onHover(null);
      return;
    }
    const el = elementAt(e.clientX, e.clientY);
    cb.onHover(el ? boundsOf(el) : null);
  };
  const onClick = (e) => {
    if (isOurs(e.target)) {
      return;
    }
    e.preventDefault();
    e.stopPropagation();
    if (picks.length >= MAX_PICKS) {
      return;
    }
    const el = elementAt(e.clientX, e.clientY);
    if (!el) {
      return;
    }
    picks.push({ label: labelOf(el), selector: selectorOf(el) });
    pickBounds.push(boundsOf(el));
    cb.onPick([...picks], [...pickBounds]);
  };
  window.addEventListener("pointermove", onPointerMove, true);
  window.addEventListener("click", onClick, true);
  return {
    stop: () => {
      window.removeEventListener("pointermove", onPointerMove, true);
      window.removeEventListener("click", onClick, true);
      cb.onHover(null);
    }
  };
}

// src/screenshot.ts
var MAX_ATTEMPTS = 3;
var MAX_BYTES = 45e4;
var RUNGS = [
  { quality: 0.6, pixelRatio: 1 },
  { quality: 0.45, pixelRatio: 0.75 },
  { quality: 0.3, pixelRatio: 0.5 }
];
async function capture(host) {
  const { toJpeg } = await import("html-to-image");
  const filter = (node) => node !== host;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      for (const { quality, pixelRatio } of RUNGS) {
        const dataUrl = await toJpeg(document.body, { quality, pixelRatio, filter });
        if (dataUrl.length <= MAX_BYTES) {
          return { dataUrl, failed: false };
        }
      }
      return { dataUrl: null, failed: true };
    } catch {
      if (attempt < MAX_ATTEMPTS) {
        await new Promise((resolve) => setTimeout(resolve, 500 * attempt));
      }
    }
  }
  return { dataUrl: null, failed: true };
}

// src/speech.ts
function ctor() {
  const w = window;
  const found = w["SpeechRecognition"] ?? w["webkitSpeechRecognition"];
  return typeof found === "function" ? found : null;
}
function speechSupported() {
  return ctor() !== null;
}
function startDictation(locale, onText, onEnd) {
  const Ctor = ctor();
  if (!Ctor) {
    return null;
  }
  const rec = new Ctor();
  rec.lang = locale === "en" ? "en-GB" : "fr-FR";
  rec.continuous = true;
  rec.interimResults = false;
  rec.onresult = (e) => {
    for (let i = e.resultIndex; i < e.results.length; i++) {
      const result = e.results[i];
      if (result?.isFinal) {
        const text = result[0]?.transcript?.trim();
        if (text) {
          onText(text);
        }
      }
    }
  };
  rec.onerror = onEnd;
  rec.onend = onEnd;
  try {
    rec.start();
  } catch {
    return null;
  }
  return { stop: () => rec.stop() };
}

// src/styles.ts
var STYLES = `
:host {
  --genie-accent: #6d5ce7;
  --genie-accent-ink: #ffffff;
  --genie-ink: #16161d;
  --genie-muted: #6b6b7b;
  --genie-surface: #ffffff;
  --genie-sunken: #f4f4f7;
  --genie-border: #e3e3ea;
  --genie-danger: #b3364a;
  --genie-radius: 10px;
  --genie-z: 2147483000;
  --genie-font: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;

  all: initial;
  font-family: var(--genie-font);
  color: var(--genie-ink);
}

@media (prefers-color-scheme: dark) {
  :host(:not([theme="light"])) {
    --genie-ink: #f2f2f6;
    --genie-muted: #a0a0b0;
    --genie-surface: #1a1a22;
    --genie-sunken: #23232d;
    --genie-border: #32323e;
  }
}
:host([theme="dark"]) {
  --genie-ink: #f2f2f6;
  --genie-muted: #a0a0b0;
  --genie-surface: #1a1a22;
  --genie-sunken: #23232d;
  --genie-border: #32323e;
}

* { box-sizing: border-box; }
button { font: inherit; color: inherit; background: none; border: 0; cursor: pointer; }

/* \u2500\u2500 trigger \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */
.trigger {
  display: inline-flex; align-items: center; justify-content: center;
  width: 32px; height: 32px; border-radius: 8px;
  color: var(--genie-muted);
}
.trigger:hover { background: var(--genie-sunken); color: var(--genie-ink); }
.trigger:focus-visible { outline: 2px solid var(--genie-accent); outline-offset: 2px; }

/* Floating placement, for hosts with no header slot. */
:host([placement="corner"]) .trigger {
  position: fixed; right: 16px;
  bottom: calc(72px + env(safe-area-inset-bottom));
  width: 44px; height: 44px; border-radius: 999px;
  background: var(--genie-accent); color: var(--genie-accent-ink);
  box-shadow: 0 6px 20px -6px rgba(0,0,0,.45);
  z-index: var(--genie-z);
}
:host([placement="corner"]) .trigger:hover { background: var(--genie-accent); opacity: .9; }

/* \u2500\u2500 dialog \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */
.scrim {
  position: fixed; inset: 0; background: rgba(0,0,0,.5);
  z-index: var(--genie-z);
}
.panel {
  position: fixed; z-index: calc(var(--genie-z) + 1);
  left: 50%; top: 50%; transform: translate(-50%, -50%);
  width: min(440px, calc(100vw - 32px));
  max-height: calc(100vh - 48px); overflow-y: auto;
  background: var(--genie-surface);
  border: 1px solid var(--genie-border);
  border-radius: var(--genie-radius);
  box-shadow: 0 24px 60px -20px rgba(0,0,0,.5);
  padding: 18px;
  display: flex; flex-direction: column; gap: 14px;
}
@media (max-width: 520px) {
  .panel {
    top: auto; bottom: 0; transform: translate(-50%, 0);
    width: 100vw; border-radius: var(--genie-radius) var(--genie-radius) 0 0;
    padding-bottom: calc(18px + env(safe-area-inset-bottom));
  }
}

h2 { margin: 0; font-size: 16px; font-weight: 600; letter-spacing: -.01em; }
.desc { margin: 0; font-size: 13px; line-height: 1.45; color: var(--genie-muted); }
.label {
  font-size: 11px; font-weight: 600; letter-spacing: .04em;
  text-transform: uppercase; color: var(--genie-muted);
}
.field { display: flex; flex-direction: column; gap: 6px; }

.chips { display: flex; gap: 6px; flex-wrap: wrap; }
.chip {
  padding: 6px 12px; border-radius: 999px; font-size: 13px;
  border: 1px solid var(--genie-border); color: var(--genie-muted);
}
.chip[aria-pressed="true"] {
  background: var(--genie-accent); border-color: var(--genie-accent);
  color: var(--genie-accent-ink); font-weight: 500;
}
.chip:focus-visible { outline: 2px solid var(--genie-accent); outline-offset: 2px; }

textarea {
  width: 100%; min-height: 96px; resize: vertical;
  font: inherit; font-size: 14px; line-height: 1.45;
  padding: 10px 11px; border-radius: 8px;
  border: 1px solid var(--genie-border);
  background: var(--genie-surface); color: var(--genie-ink);
}
textarea:focus-visible { outline: 2px solid var(--genie-accent); outline-offset: 1px; }
.count { font-size: 11px; color: var(--genie-muted); text-align: right; }

.shot {
  display: flex; align-items: center; gap: 10px;
  padding: 8px 10px; border-radius: 8px;
  background: var(--genie-sunken); border: 1px solid var(--genie-border);
  font-size: 12px; color: var(--genie-muted);
}
.shot img {
  width: 56px; height: 38px; object-fit: cover;
  border-radius: 4px; border: 1px solid var(--genie-border);
}
.shot.failed { border-color: var(--genie-danger); color: var(--genie-danger); }
.shot .grow { flex: 1; }
.link {
  font-size: 12px; text-decoration: underline; color: var(--genie-muted);
}
.link:hover { color: var(--genie-ink); }

.row { display: flex; gap: 8px; align-items: center; }
.actions { display: flex; gap: 8px; margin-top: 2px; }
.btn {
  flex: 1; padding: 11px 12px; border-radius: 8px; font-size: 14px; font-weight: 500;
  border: 1px solid var(--genie-border); text-align: center;
}
.btn:hover { background: var(--genie-sunken); }
.btn.primary {
  background: var(--genie-accent); border-color: var(--genie-accent);
  color: var(--genie-accent-ink);
}
.btn.primary:hover { opacity: .9; background: var(--genie-accent); }
.btn.ghost { flex: 0 0 auto; }
.btn:disabled { opacity: .5; cursor: default; }
.btn:focus-visible { outline: 2px solid var(--genie-accent); outline-offset: 2px; }

.toast {
  position: fixed; left: 50%; bottom: 24px; transform: translateX(-50%);
  z-index: calc(var(--genie-z) + 2);
  background: var(--genie-ink); color: var(--genie-surface);
  padding: 10px 16px; border-radius: 999px; font-size: 13px;
  box-shadow: 0 10px 30px -10px rgba(0,0,0,.5);
}
.toast.bad { background: var(--genie-danger); color: #fff; }

/* \u2500\u2500 element picker \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */
.pickbox {
  position: fixed; pointer-events: none; box-sizing: border-box;
  border: 2px solid var(--genie-accent);
  background: color-mix(in srgb, var(--genie-accent) 12%, transparent);
  z-index: calc(var(--genie-z) + 3);
}
.pickbar {
  position: fixed; left: 50%; bottom: 24px; transform: translateX(-50%);
  z-index: calc(var(--genie-z) + 4);
  display: flex; align-items: center; gap: 12px;
  background: var(--genie-surface); border: 1px solid var(--genie-border);
  border-radius: 999px; padding: 8px 8px 8px 16px; font-size: 13px;
  box-shadow: 0 10px 30px -10px rgba(0,0,0,.4);
}
.pickbar .done {
  padding: 6px 14px; border-radius: 999px;
  background: var(--genie-accent); color: var(--genie-accent-ink); font-weight: 500;
}
.badges { display: flex; gap: 6px; flex-wrap: wrap; }
.badge {
  font-size: 11px; padding: 3px 8px; border-radius: 999px;
  background: var(--genie-sunken); border: 1px solid var(--genie-border);
  color: var(--genie-muted);
}
.hidden { display: none !important; }
`;

// src/element.ts
var MAX_LENGTH = 2e3;
var TYPES = ["bug", "feature", "general"];
var GenieFeedback = class extends HTMLElement {
  static get observedAttributes() {
    return ["locale", "strings"];
  }
  root;
  s;
  open = false;
  type = "bug";
  message = "";
  shot = null;
  shotFailed = false;
  capturing = false;
  sending = false;
  picks = [];
  pickBoxes = [];
  hover = null;
  picker = null;
  dictation = null;
  toast = null;
  toastTimer = null;
  constructor() {
    super();
    this.root = this.attachShadow({ mode: "open" });
    this.s = stringsFor(null, null);
  }
  connectedCallback() {
    this.s = stringsFor(this.getAttribute("locale"), this.getAttribute("strings"));
    if (!this.hasAttribute("placement")) {
      this.setAttribute("placement", "header");
    }
    this.render();
  }
  disconnectedCallback() {
    this.picker?.stop();
    this.dictation?.stop();
    if (this.toastTimer !== null) {
      window.clearTimeout(this.toastTimer);
    }
  }
  attributeChangedCallback() {
    if (this.isConnected) {
      this.s = stringsFor(this.getAttribute("locale"), this.getAttribute("strings"));
      this.render();
    }
  }
  // ── behaviour ──────────────────────────────────────────────────────────────
  setOpen(next) {
    this.open = next;
    if (next) {
      if (!this.shot && !this.capturing) {
        void this.runCapture();
      }
    } else {
      this.stopPicking();
      this.dictation?.stop();
      this.dictation = null;
    }
    this.render();
  }
  async runCapture() {
    this.capturing = true;
    this.shotFailed = false;
    this.render();
    const result = await capture(this);
    this.shot = result.dataUrl;
    this.shotFailed = result.failed;
    this.capturing = false;
    this.render();
  }
  startPicking() {
    if (this.picker) {
      return;
    }
    this.picker = startPicking(this, {
      onHover: (b) => {
        this.hover = b;
        this.paintOverlays();
      },
      onPick: (picks, boxes) => {
        this.picks = picks;
        this.pickBoxes = boxes;
        this.render();
      }
    });
    this.render();
  }
  stopPicking() {
    this.picker?.stop();
    this.picker = null;
    this.hover = null;
    this.render();
  }
  toggleDictation() {
    if (this.dictation) {
      this.dictation.stop();
      this.dictation = null;
      this.render();
      return;
    }
    this.dictation = startDictation(
      this.getAttribute("locale") ?? "fr",
      (text) => {
        const sep = this.message.trim() ? " " : "";
        this.message = (this.message + sep + text).slice(0, MAX_LENGTH);
        this.render();
      },
      () => {
        this.dictation = null;
        this.render();
      }
    );
    this.render();
  }
  showToast(text, bad) {
    this.toast = { text, bad };
    this.render();
    if (this.toastTimer !== null) {
      window.clearTimeout(this.toastTimer);
    }
    this.toastTimer = window.setTimeout(() => {
      this.toast = null;
      this.render();
    }, 4e3);
  }
  async submit() {
    if (!this.message.trim() || this.sending) {
      return;
    }
    this.sending = true;
    this.render();
    const payload = {
      type: this.type,
      message: this.message.trim(),
      page: this.getAttribute("page") ?? window.location.href,
      ...this.shot ? { screenshot: this.shot } : {},
      ...this.picks.length > 0 ? { picks: this.picks } : {}
    };
    try {
      const res = await fetch(this.getAttribute("endpoint") ?? "/api/v1/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify(payload)
      });
      if (!res.ok) {
        throw new Error(String(res.status));
      }
      this.dispatchEvent(new CustomEvent("genie-submit", { detail: payload, bubbles: true }));
      this.message = "";
      this.type = "bug";
      this.shot = null;
      this.picks = [];
      this.pickBoxes = [];
      this.sending = false;
      this.setOpen(false);
      this.showToast(this.s.thanks, false);
    } catch {
      this.sending = false;
      this.render();
      this.showToast(this.s.error, true);
    }
  }
  // ── rendering ──────────────────────────────────────────────────────────────
  /** Outlines follow the pointer, so they repaint without a full re-render. */
  paintOverlays() {
    const layer = this.root.querySelector("[data-layer]");
    if (!layer) {
      return;
    }
    const box = (b, solid) => `<div class="pickbox" style="top:${b.top}px;left:${b.left}px;width:${b.width}px;height:${b.height}px;${solid ? "" : "border-style:dashed;"}"></div>`;
    layer.innerHTML = this.pickBoxes.map((b) => box(b, true)).join("") + (this.hover ? box(this.hover, false) : "");
  }
  render() {
    const s = this.s;
    const picking = this.picker !== null;
    const typeLabel = {
      bug: s.typeBug,
      feature: s.typeIdea,
      general: s.typeOther
    };
    const chips = TYPES.map(
      (t) => `<button class="chip" type="button" data-type="${t}" aria-pressed="${t === this.type}">${typeLabel[t]}</button>`
    ).join("");
    const shotRow = this.capturing ? `<div class="shot"><span class="grow">${s.screenshotCapturing}</span></div>` : this.shot ? `<div class="shot"><img src="${this.shot}" alt="" /><span class="grow">${s.screenshotLabel}</span>
             <button class="link" type="button" data-act="unshot">${s.screenshotRemove}</button></div>` : this.shotFailed ? `<div class="shot failed"><span class="grow">${s.screenshotFailed}</span>
               <button class="link" type="button" data-act="reshot">${s.screenshotRetry}</button></div>` : `<div class="shot"><span class="grow">${s.screenshotLabel}</span>
               <button class="link" type="button" data-act="reshot">${s.screenshotRetry}</button></div>`;
    const badges = this.picks.length > 0 ? `<div class="badges">${this.picks.map((p) => `<span class="badge">${p.label}</span>`).join("")}</div>` : "";
    const voice = speechSupported() ? `<button class="btn ghost" type="button" data-act="voice">${this.dictation ? s.voiceStop : s.voiceStart}</button>` : "";
    const panel = !this.open ? "" : picking ? `<div class="pickbar">
             <span>${s.picking}${this.picks.length ? ` \xB7 ${this.picks.length} ${s.picked}` : ""}</span>
             <button class="done" type="button" data-act="pickdone">${s.pickDone}</button>
           </div>` : `<div class="scrim" data-act="close"></div>
           <div class="panel" role="dialog" aria-modal="true" aria-label="${s.title}">
             <div>
               <h2>${s.title}</h2>
               <p class="desc">${s.description}</p>
             </div>
             <div class="field">
               <span class="label">${s.typeLabel}</span>
               <div class="chips">${chips}</div>
             </div>
             <div class="field">
               <span class="label">${s.messageLabel}</span>
               <textarea maxlength="${MAX_LENGTH}" placeholder="${s.messagePlaceholder}"></textarea>
               <span class="count">${this.message.length} / ${MAX_LENGTH}</span>
             </div>
             ${shotRow}
             <div class="row">
               <button class="btn ghost" type="button" data-act="pick">${s.pick}</button>
               ${voice}
             </div>
             ${badges}
             <div class="actions">
               <button class="btn" type="button" data-act="close">${s.cancel}</button>
               <button class="btn primary" type="button" data-act="submit" ${this.message.trim() && !this.sending ? "" : "disabled"}>${this.sending ? s.submitting : s.submit}</button>
             </div>
           </div>`;
    this.root.innerHTML = `
      <style>${STYLES}</style>
      <button class="trigger" type="button" data-act="open" aria-label="${s.trigger}" aria-expanded="${this.open}">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
             stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
      </button>
      ${panel}
      <div data-layer></div>
      ${this.toast ? `<div class="toast${this.toast.bad ? " bad" : ""}">${this.toast.text}</div>` : ""}
    `;
    this.wire();
    this.paintOverlays();
  }
  wire() {
    const area = this.root.querySelector("textarea");
    if (area instanceof HTMLTextAreaElement) {
      area.value = this.message;
      area.addEventListener("input", () => {
        this.message = area.value;
        const count = this.root.querySelector(".count");
        if (count) {
          count.textContent = `${this.message.length} / ${MAX_LENGTH}`;
        }
        const submit = this.root.querySelector('[data-act="submit"]');
        if (submit instanceof HTMLButtonElement) {
          submit.disabled = !this.message.trim() || this.sending;
        }
      });
    }
    for (const el of this.root.querySelectorAll("[data-type]")) {
      el.addEventListener("click", () => {
        const value = el.getAttribute("data-type");
        if (value && TYPES.includes(value)) {
          this.type = value;
          this.render();
        }
      });
    }
    const on = (act, fn) => {
      for (const el of this.root.querySelectorAll(`[data-act="${act}"]`)) {
        el.addEventListener("click", fn);
      }
    };
    on("open", () => this.setOpen(!this.open));
    on("close", () => this.setOpen(false));
    on("submit", () => void this.submit());
    on("reshot", () => void this.runCapture());
    on("unshot", () => {
      this.shot = null;
      this.shotFailed = false;
      this.render();
    });
    on("pick", () => this.startPicking());
    on("pickdone", () => this.stopPicking());
    on("voice", () => this.toggleDictation());
  }
};
function define(tag = "genie-feedback") {
  if (!customElements.get(tag)) {
    customElements.define(tag, GenieFeedback);
  }
}

// src/index.ts
if (typeof window !== "undefined" && typeof customElements !== "undefined") {
  define();
}
export {
  GenieFeedback,
  define
};
