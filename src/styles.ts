/**
 * The widget's stylesheet, scoped by the shadow root.
 *
 * This is the reason for shadow DOM. A host app ships its own CSS reset, its own
 * radius and colour scales, and its own stacking order — and an overlay living in
 * the host's tree inherits all three, then has to win a z-index argument whose
 * other side it cannot see. Inside a shadow root none of that reaches us and we
 * reach none of it, so one stylesheet is correct in every host.
 *
 * Hosts theme it by setting custom properties on the element:
 *   genie-feedback { --genie-accent: #7c3aed; --genie-radius: 10px }
 */

export const STYLES = `
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

/* ── trigger ───────────────────────────────────────────────── */
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

/* ── dialog ────────────────────────────────────────────────── */
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

/* ── element picker ────────────────────────────────────────── */
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
`
