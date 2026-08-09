/**
 * Element picker — "point at the thing that's wrong".
 *
 * Two defects, both observed in hand-rolled versions of this, are designed out:
 *
 * 1. **The swallowed Done click.** A capture-phase click listener on window that
 *    calls stopPropagation() unconditionally — before any early return — also
 *    swallows clicks on the picker's own controls, because they are descendants of
 *    what it is guarding. That leaves Escape as the only way to commit, and a
 *    phone has no Escape, so on touch there is no exit at all. Here anything
 *    originating from the widget's host element is let through untouched, and that
 *    check runs BEFORE preventDefault rather than after.
 *
 * 2. **No touch path.** Listening for `mousemove` gives a hover preview on a
 *    desktop and nothing on a phone, so the affordance reads as broken rather than
 *    absent. This uses `pointermove`, which fires for both, and a tap still
 *    selects.
 */

export interface Picked {
  label: string
  selector: string
}

export interface Bounds {
  top: number
  left: number
  width: number
  height: number
}

const MAX_PICKS = 5

function boundsOf(el: Element): Bounds {
  const r = el.getBoundingClientRect()
  return { top: r.top, left: r.left, width: r.width, height: r.height }
}

/** A short, human-recognisable name — what the reporter would call this thing. */
function labelOf(el: Element): string {
  const aria = el.getAttribute('aria-label')
  if (aria) {
    return aria.slice(0, 60)
  }
  const text = (el.textContent ?? '').trim().replace(/\s+/g, ' ')
  if (text && text.length <= 60) {
    return text
  }
  if (text) {
    return `${text.slice(0, 57)}…`
  }
  const alt = el.getAttribute('alt') ?? el.getAttribute('placeholder')
  return alt ? alt.slice(0, 60) : el.tagName.toLowerCase()
}

/** Enough of a path to find it again, without being a brittle nth-child chain. */
function selectorOf(el: Element): string {
  if (el.id) {
    return `#${el.id}`
  }
  const parts: string[] = []
  let node: Element | null = el
  for (let depth = 0; node && depth < 4; depth++) {
    let part = node.tagName.toLowerCase()
    const testId = node.getAttribute('data-testid')
    if (testId) {
      parts.unshift(`[data-testid="${testId}"]`)
      break
    }
    const cls = (node.getAttribute('class') ?? '')
      .split(/\s+/)
      .filter((c) => c && !c.includes('[') && c.length < 24)
      .slice(0, 2)
    if (cls.length > 0) {
      part += `.${cls.join('.')}`
    }
    parts.unshift(part)
    node = node.parentElement
  }
  return parts.join(' > ')
}

export interface PickerHandle {
  stop: () => void
}

export interface PickerCallbacks {
  /** Element under the pointer, or null. Drives the preview outline. */
  onHover: (bounds: Bounds | null) => void
  /** Called on each selection with the full list so far. */
  onPick: (picks: Picked[], bounds: Bounds[]) => void
}

/**
 * Begin picking. `host` is the widget's own element — everything inside it is
 * chrome and must stay clickable.
 */
export function startPicking(host: Element, cb: PickerCallbacks): PickerHandle {
  const picks: Picked[] = []
  const pickBounds: Bounds[] = []

  /** True when the event came from the widget's own UI. */
  const isOurs = (target: EventTarget | null): boolean =>
    target instanceof Node && (target === host || host.contains(target))

  const elementAt = (x: number, y: number): Element | null => {
    const el = document.elementFromPoint(x, y)
    if (!el || el === host || host.contains(el) || el === document.body) {
      return null
    }
    // A shadow host resolves to itself; ours is excluded above, and any other
    // component's host is a legitimate target.
    return el
  }

  const onPointerMove = (e: PointerEvent): void => {
    if (isOurs(e.target)) {
      cb.onHover(null)
      return
    }
    const el = elementAt(e.clientX, e.clientY)
    cb.onHover(el ? boundsOf(el) : null)
  }

  const onClick = (e: MouseEvent): void => {
    // The fix: our own controls keep working while picking is active.
    if (isOurs(e.target)) {
      return
    }
    e.preventDefault()
    e.stopPropagation()
    if (picks.length >= MAX_PICKS) {
      return
    }
    const el = elementAt(e.clientX, e.clientY)
    if (!el) {
      return
    }
    picks.push({ label: labelOf(el), selector: selectorOf(el) })
    pickBounds.push(boundsOf(el))
    cb.onPick([...picks], [...pickBounds])
  }

  window.addEventListener('pointermove', onPointerMove, true)
  window.addEventListener('click', onClick, true)

  return {
    stop: () => {
      window.removeEventListener('pointermove', onPointerMove, true)
      window.removeEventListener('click', onClick, true)
      cb.onHover(null)
    },
  }
}
