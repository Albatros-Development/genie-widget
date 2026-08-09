/**
 * genie-widget — the drop-in feedback overlay.
 *
 * Importing this registers <genie-feedback>. Nothing else is required.
 *
 *   import 'genie-widget'
 *   …
 *   <genie-feedback placement="header" />
 *
 * Registration is skipped when the element already exists, so a double import
 * (React fast refresh, two bundles) is harmless rather than a thrown
 * "already defined" error.
 */

import { define, GenieFeedback } from './element.js'

export { GenieFeedback, define }
export type { Picked } from './highlighter.js'
export type { Strings, Locale } from './i18n.js'

if (typeof window !== 'undefined' && typeof customElements !== 'undefined') {
  define()
}
