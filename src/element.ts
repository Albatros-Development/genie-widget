/**
 * <genie-feedback> — the drop-in feedback overlay.
 *
 * One implementation, any product, no framework. Replaces ~2,150 lines of
 * hand-rolled feedback UI that solved the same problem twice and drifted apart.
 *
 *   <genie-feedback placement="header"></genie-feedback>
 *
 * It carries NO credentials. It posts to the host's own endpoint (default
 * `/api/v1/feedback`), and the host forwards it onward with its server-side key.
 * An attribute would be readable by anyone with devtools, so a product key must
 * never live here.
 *
 * Attributes
 *   endpoint    where to POST. Default `/api/v1/feedback`.
 *   placement   `header` (inline icon, default) | `corner` (floating button)
 *   locale      `fr` (default) | `en`
 *   theme       `light` | `dark`. Omitted follows prefers-color-scheme.
 *   strings     JSON overriding any i18n key.
 *
 * Emits `genie-submit` (detail: the payload) after a successful send.
 */

import { stringsFor, type Strings } from './i18n.js'
import { startPicking, type Bounds, type Picked, type PickerHandle } from './highlighter.js'
import { capture } from './screenshot.js'
import { speechSupported, startDictation, type Dictation } from './speech.js'
import { STYLES } from './styles.js'

const MAX_LENGTH = 2000
// Values match the service's requestSchema exactly, so a host route can
// forward the payload untouched. Labels stay friendly; the wire does not.
const TYPES = ['bug', 'feature', 'general'] as const
type Type = (typeof TYPES)[number]

interface Payload {
  type: Type
  message: string
  page: string
  screenshot?: string
  picks?: Picked[]
}

export class GenieFeedback extends HTMLElement {
  static get observedAttributes(): string[] {
    return ['locale', 'strings']
  }

  private readonly root: ShadowRoot
  private s: Strings
  private open = false
  private type: Type = 'bug'
  private message = ''
  private shot: string | null = null
  private shotFailed = false
  private capturing = false
  private sending = false
  private picks: Picked[] = []
  private pickBoxes: Bounds[] = []
  private hover: Bounds | null = null
  private picker: PickerHandle | null = null
  private dictation: Dictation | null = null
  private toast: { text: string; bad: boolean } | null = null
  private toastTimer: number | null = null

  constructor() {
    super()
    this.root = this.attachShadow({ mode: 'open' })
    this.s = stringsFor(null, null)
  }

  connectedCallback(): void {
    this.s = stringsFor(this.getAttribute('locale'), this.getAttribute('strings'))
    if (!this.hasAttribute('placement')) {
      this.setAttribute('placement', 'header')
    }
    this.render()
  }

  disconnectedCallback(): void {
    this.picker?.stop()
    this.dictation?.stop()
    if (this.toastTimer !== null) {
      window.clearTimeout(this.toastTimer)
    }
  }

  attributeChangedCallback(): void {
    if (this.isConnected) {
      this.s = stringsFor(this.getAttribute('locale'), this.getAttribute('strings'))
      this.render()
    }
  }

  // ── behaviour ──────────────────────────────────────────────────────────────

  private setOpen(next: boolean): void {
    this.open = next
    if (next) {
      // Capture on open so the picture shows the page as the reporter saw it,
      // before the dialog covered it.
      if (!this.shot && !this.capturing) {
        void this.runCapture()
      }
    } else {
      this.stopPicking()
      this.dictation?.stop()
      this.dictation = null
    }
    this.render()
  }

  private async runCapture(): Promise<void> {
    this.capturing = true
    this.shotFailed = false
    this.render()
    const result = await capture(this)
    this.shot = result.dataUrl
    this.shotFailed = result.failed
    this.capturing = false
    this.render()
  }

  private startPicking(): void {
    if (this.picker) {
      return
    }
    // Hide the panel while picking so the page underneath is reachable.
    this.picker = startPicking(this, {
      onHover: (b) => {
        this.hover = b
        this.paintOverlays()
      },
      onPick: (picks, boxes) => {
        this.picks = picks
        this.pickBoxes = boxes
        this.render()
      },
    })
    this.render()
  }

  private stopPicking(): void {
    this.picker?.stop()
    this.picker = null
    this.hover = null
    this.render()
  }

  private toggleDictation(): void {
    if (this.dictation) {
      this.dictation.stop()
      this.dictation = null
      this.render()
      return
    }
    this.dictation = startDictation(
      this.getAttribute('locale') ?? 'fr',
      (text) => {
        const sep = this.message.trim() ? ' ' : ''
        this.message = (this.message + sep + text).slice(0, MAX_LENGTH)
        this.render()
      },
      () => {
        this.dictation = null
        this.render()
      },
    )
    this.render()
  }

  private showToast(text: string, bad: boolean): void {
    this.toast = { text, bad }
    this.render()
    if (this.toastTimer !== null) {
      window.clearTimeout(this.toastTimer)
    }
    this.toastTimer = window.setTimeout(() => {
      this.toast = null
      this.render()
    }, 4000)
  }

  private async submit(): Promise<void> {
    if (!this.message.trim() || this.sending) {
      return
    }
    this.sending = true
    this.render()

    const payload: Payload = {
      type: this.type,
      message: this.message.trim(),
      page: this.getAttribute('page') ?? window.location.href,
      ...(this.shot ? { screenshot: this.shot } : {}),
      ...(this.picks.length > 0 ? { picks: this.picks } : {}),
    }

    try {
      const res = await fetch(this.getAttribute('endpoint') ?? '/api/v1/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        throw new Error(String(res.status))
      }
      this.dispatchEvent(new CustomEvent('genie-submit', { detail: payload, bubbles: true }))
      this.message = ''
      this.type = 'bug'
      this.shot = null
      this.picks = []
      this.pickBoxes = []
      this.sending = false
      this.setOpen(false)
      this.showToast(this.s.thanks, false)
    } catch {
      this.sending = false
      this.render()
      this.showToast(this.s.error, true)
    }
  }

  // ── rendering ──────────────────────────────────────────────────────────────

  /** Outlines follow the pointer, so they repaint without a full re-render. */
  private paintOverlays(): void {
    const layer = this.root.querySelector('[data-layer]')
    if (!layer) {
      return
    }
    const box = (b: Bounds, solid: boolean): string =>
      `<div class="pickbox" style="top:${b.top}px;left:${b.left}px;width:${b.width}px;height:${b.height}px;${
        solid ? '' : 'border-style:dashed;'
      }"></div>`
    layer.innerHTML =
      this.pickBoxes.map((b) => box(b, true)).join('') +
      (this.hover ? box(this.hover, false) : '')
  }

  private render(): void {
    const s = this.s
    const picking = this.picker !== null
    const typeLabel: Record<Type, string> = {
      bug: s.typeBug,
      feature: s.typeIdea,
      general: s.typeOther,
    }

    const chips = TYPES.map(
      (t) =>
        `<button class="chip" type="button" data-type="${t}" aria-pressed="${t === this.type}">${typeLabel[t]}</button>`,
    ).join('')

    // Four states, kept distinct: capturing · captured · failed · removed. The
    // last two look the same to a naive check, which is how a widget ends up
    // telling you the capture failed before it has been attempted.
    const shotRow = this.capturing
      ? `<div class="shot"><span class="grow">${s.screenshotCapturing}</span></div>`
      : this.shot
        ? `<div class="shot"><img src="${this.shot}" alt="" /><span class="grow">${s.screenshotLabel}</span>
             <button class="link" type="button" data-act="unshot">${s.screenshotRemove}</button></div>`
        : this.shotFailed
          ? `<div class="shot failed"><span class="grow">${s.screenshotFailed}</span>
               <button class="link" type="button" data-act="reshot">${s.screenshotRetry}</button></div>`
          : `<div class="shot"><span class="grow">${s.screenshotLabel}</span>
               <button class="link" type="button" data-act="reshot">${s.screenshotRetry}</button></div>`

    const badges =
      this.picks.length > 0
        ? `<div class="badges">${this.picks
            .map((p) => `<span class="badge">${p.label}</span>`)
            .join('')}</div>`
        : ''

    const voice = speechSupported()
      ? `<button class="btn ghost" type="button" data-act="voice">${
          this.dictation ? s.voiceStop : s.voiceStart
        }</button>`
      : ''

    const panel = !this.open
      ? ''
      : picking
        ? `<div class="pickbar">
             <span>${s.picking}${this.picks.length ? ` · ${this.picks.length} ${s.picked}` : ''}</span>
             <button class="done" type="button" data-act="pickdone">${s.pickDone}</button>
           </div>`
        : `<div class="scrim" data-act="close"></div>
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
               <button class="btn primary" type="button" data-act="submit" ${
                 this.message.trim() && !this.sending ? '' : 'disabled'
               }>${this.sending ? s.submitting : s.submit}</button>
             </div>
           </div>`

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
      ${this.toast ? `<div class="toast${this.toast.bad ? ' bad' : ''}">${this.toast.text}</div>` : ''}
    `

    this.wire()
    this.paintOverlays()
  }

  private wire(): void {
    const area = this.root.querySelector('textarea')
    if (area instanceof HTMLTextAreaElement) {
      area.value = this.message
      area.addEventListener('input', () => {
        this.message = area.value
        const count = this.root.querySelector('.count')
        if (count) {
          count.textContent = `${this.message.length} / ${MAX_LENGTH}`
        }
        const submit = this.root.querySelector('[data-act="submit"]')
        if (submit instanceof HTMLButtonElement) {
          submit.disabled = !this.message.trim() || this.sending
        }
      })
    }

    for (const el of this.root.querySelectorAll('[data-type]')) {
      el.addEventListener('click', () => {
        const value = el.getAttribute('data-type')
        if (value && (TYPES as readonly string[]).includes(value)) {
          this.type = value as Type
          this.render()
        }
      })
    }

    const on = (act: string, fn: () => void): void => {
      for (const el of this.root.querySelectorAll(`[data-act="${act}"]`)) {
        el.addEventListener('click', fn)
      }
    }
    on('open', () => this.setOpen(!this.open))
    on('close', () => this.setOpen(false))
    on('submit', () => void this.submit())
    on('reshot', () => void this.runCapture())
    on('unshot', () => {
      this.shot = null
      this.shotFailed = false
      this.render()
    })
    on('pick', () => this.startPicking())
    on('pickdone', () => this.stopPicking())
    on('voice', () => this.toggleDictation())
  }
}

export function define(tag = 'genie-feedback'): void {
  if (!customElements.get(tag)) {
    customElements.define(tag, GenieFeedback)
  }
}
