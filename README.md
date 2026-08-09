# genie-widget

`<genie-feedback>` — a drop-in feedback overlay. One implementation, any product, no framework.

**Status: in production in one app.** Driven end to end in a browser (17 checks, below).

## Why it exists

Feedback UI is the kind of thing every app grows its own copy of, and the copies drift. Two apps
built theirs independently and ended up with near-identical filenames — `feedback-widget`,
`component-highlighter`, `feedback-card`, `highlighter-utils` — around **~2,150 lines** solving one
problem twice, with different type enums, different trigger APIs and different stacking conventions.

**~1,030 lines here replace all of it.**

## Why a custom element and not a React package

A framework-free custom element is droppable into anything that renders HTML, which is the point —
the next host may not be the same framework as the last one.

Shadow DOM is the load-bearing part, not a stylistic preference. A host app ships its own CSS reset,
radius scale and stacking order, and a widget living in the host's tree is subject to all three. It
inherits a preflight it did not ask for, and it has to win a z-index argument it cannot see the other
side of. Inside a shadow root none of that reaches the widget and the widget reaches none of it, so
**one stylesheet is correct in every host** — no reset fights, no z-index arms race.

## It carries no credentials

The widget POSTs to the **host's own endpoint**; the host forwards it onward with a server-side key.
An attribute would be readable in devtools, so a product key must never live here. Integration is the
element plus one route.

```
<genie-feedback>  ──POST {endpoint}──▶  host route  ──▶  your backend  ──▶  your tracker
```

## Use

```tsx
import 'genie-widget'

<genie-feedback placement="header" locale="fr" />
```

| Attribute | |
|---|---|
| `endpoint` | where to POST. Default `/api/v1/feedback` |
| `placement` | `header` — inline icon (default) · `corner` — floating button |
| `locale` | `fr` (default) · `en` |
| `theme` | `light` · `dark`. Omitted follows `prefers-color-scheme` |
| `strings` | JSON overriding any i18n key |
| `page` | override the reported URL |

Emits `genie-submit` with the payload after a successful send.

The payload is `{ type, message, page, screenshot?, picks? }`, where `type` is
`bug` · `feature` · `general` and `picks` is the elements the reporter pointed at, each
`{ label, selector }`.

### Theming

```css
genie-feedback {
  --genie-accent: #7c3aed;
  --genie-radius: 8px;
}
```

Full set in `src/styles.ts`. It is themed by the host rather than pixel-matched to it: the widget owns
its layout, the host owns its palette.

## What it does

Type chips · message with counter · **auto screenshot** on open (excludes itself) · **element
picker** — point at what's wrong · **dictation** via Web Speech, hidden where unsupported ·
toast · full-screen sheet under 520px.

## Two defects designed out

Both are real failures from hand-rolled versions of this widget, and both are the kind that look like
polish problems until you notice the feature is simply unusable:

1. **The swallowed Done click.** A capture-phase `click` listener on `window` that calls
   `stopPropagation()` unconditionally — *before any early return* — swallows clicks on the widget's
   own controls, because they are descendants of the thing it is guarding. The result was a picker
   whose Done button did nothing, with Escape as the only way to commit. A phone has no Escape, so on
   touch the feature had no exit at all. Here, anything originating inside the widget's host element
   passes through untouched, and that check runs *before* `preventDefault`.
2. **No touch path.** Listening for `mousemove` gives a hover preview on a desktop and nothing on a
   phone, so the affordance reads as broken rather than absent. This uses `pointermove`.

## Verified

Bundled and driven with Playwright against a harness host page — 17/17, zero page errors:

element registers · trigger renders in the shadow root · dialog opens · 3 chips, selection sticks ·
submit disabled while empty, enabled on input · screenshot captured · picker outlines · **a pick
does not activate the host's own button** · **Done commits** · badge renders · POST fires once ·
payload carries type, message, page, a 9.6 KB screenshot and the pick · dialog closes.

## Install

```bash
npm install github:mriahi1/genie-widget
```

`dist/` is not committed — the `prepare` script builds it when npm installs the package, which is what
makes a git dependency work without the host configuring anything. No `transpilePackages`, no
`extensionAlias`, no build config in your app.

```bash
npm run build   # esbuild bundle + .d.ts, into dist/
```

`html-to-image` is left external so a host that already depends on it resolves its own copy — 24 KB
rather than 54. It is a declared dependency, so a host that does not have it gets it.

## Known limits

- **No tests in CI.** The Playwright drive was ad hoc; it should become a spec.
- **Screenshot capture uses `html-to-image`**, inheriting its limits on cross-origin images and
  exotic colour functions.
- **The type enum is fixed at three.** A host with a richer taxonomy needs either a mapping or a
  fourth chip; there is no extension point yet.
