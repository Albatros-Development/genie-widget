/**
 * Screenshot capture.
 *
 * The descending-fidelity rungs below are not premature optimisation. An endpoint
 * that caps its payload rejects a full-fidelity capture of a content-heavy page,
 * and it does so as a validation error long after the user pressed send — so the
 * capture has to walk down until one fits rather than fail at the top.
 *
 * The widget excludes itself from the capture by skipping its own host element.
 * That is a benefit of the shadow root: a widget rendered into the page's own tree
 * has to identify itself by ARIA role or a data attribute and filter that out.
 */

const MAX_ATTEMPTS = 3
const MAX_BYTES = 450_000

/** Better-looking first, then degrade until it fits the cap. */
const RUNGS: ReadonlyArray<{ quality: number; pixelRatio: number }> = [
  { quality: 0.6, pixelRatio: 1 },
  { quality: 0.45, pixelRatio: 0.75 },
  { quality: 0.3, pixelRatio: 0.5 },
]

export interface Capture {
  dataUrl: string | null
  failed: boolean
}

export async function capture(host: Element): Promise<Capture> {
  const { toJpeg } = await import('html-to-image')

  // Our own UI must not appear in the picture of the page it describes.
  const filter = (node: Node): boolean => node !== host

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      for (const { quality, pixelRatio } of RUNGS) {
        const dataUrl = await toJpeg(document.body, { quality, pixelRatio, filter })
        if (dataUrl.length <= MAX_BYTES) {
          return { dataUrl, failed: false }
        }
      }
      // Even the smallest rung was too large. Report the failure rather than
      // sending something the service will reject.
      return { dataUrl: null, failed: true }
    } catch {
      if (attempt < MAX_ATTEMPTS) {
        await new Promise((resolve) => setTimeout(resolve, 500 * attempt))
      }
    }
  }
  return { dataUrl: null, failed: true }
}
