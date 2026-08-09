/**
 * Strings, in the widget rather than the host.
 *
 * Deliberately self-contained. Every host names its translation keys differently,
 * and reading from the host would make the widget depend on that host's i18n
 * framework and its namespace layout — which is exactly the coupling that produced
 * two divergent copies of this component in the first place.
 *
 * A host that wants its own wording overrides it per key via the `strings`
 * attribute (JSON) — no framework, no build step.
 */

export const LOCALES = ['fr', 'en'] as const
export type Locale = (typeof LOCALES)[number]

export interface Strings {
  trigger: string
  title: string
  description: string
  typeLabel: string
  typeBug: string
  typeIdea: string
  typeOther: string
  messageLabel: string
  messagePlaceholder: string
  screenshotLabel: string
  screenshotCapturing: string
  screenshotFailed: string
  screenshotRetry: string
  screenshotRemove: string
  pick: string
  picking: string
  pickDone: string
  picked: string
  voiceStart: string
  voiceStop: string
  cancel: string
  submit: string
  submitting: string
  thanks: string
  error: string
}

const FR: Strings = {
  trigger: 'Envoyer un retour',
  title: 'Envoyer un retour',
  description: 'Signalez un bug, proposez une idée, ou dites-nous ce qui ne va pas.',
  typeLabel: 'Type',
  typeBug: 'Bug',
  typeIdea: 'Idée',
  typeOther: 'Autre',
  messageLabel: 'Votre retour',
  messagePlaceholder: 'Décrivez ce qui s’est passé…',
  screenshotLabel: 'Capture d’écran',
  screenshotCapturing: 'Capture en cours…',
  screenshotFailed: 'La capture a échoué.',
  screenshotRetry: 'Réessayer',
  screenshotRemove: 'Retirer',
  pick: 'Désigner un élément',
  picking: 'Touchez l’élément concerné',
  pickDone: 'Terminé',
  picked: 'élément(s) désigné(s)',
  voiceStart: 'Dicter',
  voiceStop: 'Arrêter',
  cancel: 'Annuler',
  submit: 'Envoyer',
  submitting: 'Envoi…',
  thanks: 'Merci — c’est bien reçu.',
  error: 'L’envoi a échoué. Réessayez.',
}

const EN: Strings = {
  trigger: 'Send feedback',
  title: 'Send feedback',
  description: 'Report a bug, suggest an idea, or tell us what looks wrong.',
  typeLabel: 'Type',
  typeBug: 'Bug',
  typeIdea: 'Idea',
  typeOther: 'Other',
  messageLabel: 'Your feedback',
  messagePlaceholder: 'Describe what happened…',
  screenshotLabel: 'Screenshot',
  screenshotCapturing: 'Capturing…',
  screenshotFailed: 'Capture failed.',
  screenshotRetry: 'Retry',
  screenshotRemove: 'Remove',
  pick: 'Point at an element',
  picking: 'Tap the element you mean',
  pickDone: 'Done',
  picked: 'element(s) selected',
  voiceStart: 'Dictate',
  voiceStop: 'Stop',
  cancel: 'Cancel',
  submit: 'Send',
  submitting: 'Sending…',
  thanks: 'Thanks — received.',
  error: 'Could not send. Try again.',
}

const TABLES: Record<Locale, Strings> = { fr: FR, en: EN }

function isLocale(value: string): value is Locale {
  return (LOCALES as readonly string[]).includes(value)
}

/** Resolve a locale, falling back to fr — the default host locale. */
export function stringsFor(locale: string | null, overrides: string | null): Strings {
  const base = locale && isLocale(locale) ? TABLES[locale] : FR
  if (!overrides) {
    return base
  }
  // A malformed `strings` attribute must not break the only way a user can
  // report that the `strings` attribute is malformed.
  try {
    const parsed: unknown = JSON.parse(overrides)
    if (typeof parsed !== 'object' || parsed === null) {
      return base
    }
    const merged: Strings = { ...base }
    for (const [key, value] of Object.entries(parsed)) {
      if (key in merged && typeof value === 'string') {
        merged[key as keyof Strings] = value
      }
    }
    return merged
  } catch {
    return base
  }
}
