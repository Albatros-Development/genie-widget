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
export declare class GenieFeedback extends HTMLElement {
    static get observedAttributes(): string[];
    private readonly root;
    private s;
    private open;
    private type;
    private message;
    private shot;
    private shotFailed;
    private capturing;
    private sending;
    private picks;
    private pickBoxes;
    private hover;
    private picker;
    private dictation;
    private toast;
    private toastTimer;
    constructor();
    connectedCallback(): void;
    disconnectedCallback(): void;
    attributeChangedCallback(): void;
    private setOpen;
    private runCapture;
    private startPicking;
    private stopPicking;
    private toggleDictation;
    private showToast;
    private submit;
    /** Outlines follow the pointer, so they repaint without a full re-render. */
    private paintOverlays;
    private render;
    private wire;
}
export declare function define(tag?: string): void;
