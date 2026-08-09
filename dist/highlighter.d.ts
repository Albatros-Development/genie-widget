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
    label: string;
    selector: string;
}
export interface Bounds {
    top: number;
    left: number;
    width: number;
    height: number;
}
export interface PickerHandle {
    stop: () => void;
}
export interface PickerCallbacks {
    /** Element under the pointer, or null. Drives the preview outline. */
    onHover: (bounds: Bounds | null) => void;
    /** Called on each selection with the full list so far. */
    onPick: (picks: Picked[], bounds: Bounds[]) => void;
}
/**
 * Begin picking. `host` is the widget's own element — everything inside it is
 * chrome and must stay clickable.
 */
export declare function startPicking(host: Element, cb: PickerCallbacks): PickerHandle;
