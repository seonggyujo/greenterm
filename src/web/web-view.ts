import { createLogger } from "../app/log";
import { onOverlay, overlayUp } from "../app/overlay";
import * as ipc from "../ipc/web";
import { layoutBox } from "./layout-box";

// One native web page (Rust web/) kept over a host element; the host only
// reserves the space. The page box is sent again after a resize (fit) and
// after a move (style change on `moved`, the pane). While app UI must draw
// over it (app/overlay.ts), the page hides. Logs the page URL and title;
// the Rust side logs opening, moving, hiding and navigation.

const log = createLogger("web-view");

export class WebView {
  private opened = false;
  private closed = false;
  private wantFocus = false;
  private frame = 0;
  private sent = "";
  private lastUrl = "";
  private readonly watchStyle = new MutationObserver(() => this.schedule());
  private readonly stopOverlay: () => void;
  private readonly stopPage: Promise<() => void>;
  private readonly stopFocus: Promise<() => void>;

  constructor(
    readonly label: string,
    private readonly host: HTMLElement,
    moved: HTMLElement,
    onPage: (page: ipc.WebPage) => void,
    /** A click into the page gave it keyboard focus. */
    onFocused: () => void,
  ) {
    this.watchStyle.observe(moved, { attributes: true, attributeFilter: ["style"] });
    this.stopOverlay = onOverlay((up) => this.setShown(!up));
    this.stopPage = ipc.onWebPage((page) => {
      if (page.label !== label) return;
      if (page.url !== this.lastUrl) log.debug(`${label} at ${page.url}`);
      if (page.title !== null) log.debug(`${label} title "${page.title}"`);
      this.lastUrl = page.url;
      onPage(page);
    });
    this.stopFocus = ipc.onWebFocus((focused) => {
      if (focused === label) onFocused();
    });
  }

  /** Creates the webview. Rejects when the page cannot be opened. */
  async open(url: string): Promise<void> {
    await ipc.openWeb(this.label, url, layoutBox(this.host));
    if (this.closed) return this.call(ipc.closeWeb(this.label));
    this.opened = true;
    this.schedule();
    if (overlayUp()) this.setShown(false);
    if (this.wantFocus) this.focus();
  }

  /** The host was resized. */
  fit(): void {
    this.schedule();
  }

  focus(): void {
    this.wantFocus = !this.opened;
    if (this.live()) this.call(ipc.focusWeb(this.label));
  }

  navigate(url: string): void {
    if (this.live()) this.call(ipc.navigateWeb(this.label, url));
  }

  back(): void {
    if (this.live()) this.call(ipc.webBack(this.label));
  }

  reload(): void {
    if (this.live()) this.call(ipc.webReload(this.label));
  }

  /** Takes the page away at once; a webview cannot fade out. */
  close(): void {
    if (this.closed) return;
    this.closed = true;
    if (this.opened) this.call(ipc.closeWeb(this.label));
  }

  dispose(): void {
    this.close();
    this.watchStyle.disconnect();
    this.stopOverlay();
    void this.stopPage.then((stop) => stop());
    void this.stopFocus.then((stop) => stop());
    cancelAnimationFrame(this.frame);
  }

  private live(): boolean {
    return this.opened && !this.closed;
  }

  /** At most one box update per frame, however many changes came in. */
  private schedule(): void {
    if (this.frame || !this.live()) return;
    this.frame = requestAnimationFrame(() => {
      this.frame = 0;
      this.sync();
    });
  }

  private sync(): void {
    if (!this.live() || !this.host.isConnected) return;
    const box = layoutBox(this.host);
    const key = `${box.x},${box.y},${box.width},${box.height}`;
    if (key === this.sent) return;
    this.sent = key;
    this.call(ipc.setWebBounds(this.label, box));
  }

  private setShown(shown: boolean): void {
    if (this.live()) this.call(ipc.setWebVisible(this.label, shown));
  }

  private call(p: Promise<void>): void {
    p.catch((err) => log.warn(`${this.label}: ${err}`));
  }
}
