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
export declare const LOCALES: readonly ["fr", "en"];
export type Locale = (typeof LOCALES)[number];
export interface Strings {
    trigger: string;
    title: string;
    description: string;
    typeLabel: string;
    typeBug: string;
    typeIdea: string;
    typeOther: string;
    messageLabel: string;
    messagePlaceholder: string;
    screenshotLabel: string;
    screenshotCapturing: string;
    screenshotFailed: string;
    screenshotRetry: string;
    screenshotRemove: string;
    pick: string;
    picking: string;
    pickDone: string;
    picked: string;
    voiceStart: string;
    voiceStop: string;
    cancel: string;
    submit: string;
    submitting: string;
    thanks: string;
    error: string;
}
/** Resolve a locale, falling back to fr — the default host locale. */
export declare function stringsFor(locale: string | null, overrides: string | null): Strings;
