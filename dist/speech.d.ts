/**
 * Dictation via the Web Speech API — no dependency, and it degrades to absent.
 *
 * Typed locally rather than pulling in DOM lib definitions that vary by
 * TypeScript version: SpeechRecognition is still vendor-prefixed in Safari and
 * missing from Firefox, so the feature has to be optional anyway.
 */
export declare function speechSupported(): boolean;
export interface Dictation {
    stop: () => void;
}
/**
 * Start dictating. `onText` receives each finalised phrase; the caller appends.
 * Returns null when unsupported, so the caller can hide the control.
 */
export declare function startDictation(locale: string, onText: (text: string) => void, onEnd: () => void): Dictation | null;
