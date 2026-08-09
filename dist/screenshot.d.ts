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
export interface Capture {
    dataUrl: string | null;
    failed: boolean;
}
export declare function capture(host: Element): Promise<Capture>;
