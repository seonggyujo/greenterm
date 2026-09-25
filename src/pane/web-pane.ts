import { createLogger } from "../app/log";
import { WebView } from "../web/web-view";
import type { PaneCallbacks, PaneItem } from "./pane-item";
import { animateEnter, animateLeave } from "./pane-motion";
import { createWebHeader, type WebHeader } from "./web-header";

// One web page pane = header (back, reload, address, title) + WebView. The
// page is a native webview laid over the body (web/web-view.ts); the body
// itself only shows the host name while the page loads or hides.

const log = createLogger("web-pane");

let nextId = 1;

function hostOf(url: string): string {
  try {
    return new URL(url).host;
  } catch {
    return url;
  }
}

export interface WebPaneOptions extends PaneCallbacks {
  url: string;
}

export class WebPane implements PaneItem {
  readonly el: HTMLElement;
  readonly name = `web-${nextId++}`;
  readonly running = false;
  private readonly url: string;
  private readonly body: HTMLElement;
  private readonly header: WebHeader;
  private readonly view: WebView;

  constructor(parent: HTMLElement, opts: WebPaneOptions) {
    this.url = opts.url;
    this.el = document.createElement("section");
    this.el.className = "pane web-pane";
    this.header = createWebHeader(opts.url, {
      onNavigate: (url) => this.view.navigate(url),
      onBack: () => this.view.back(),
      onReload: () => this.view.reload(),
      onClose: () => opts.onClose(this),
    });
    this.body = document.createElement("div");
    this.body.className = "pane-body web-body";
    this.body.textContent = hostOf(opts.url);
    this.el.append(this.header.el, this.body);
    parent.append(this.el);

    this.view = new WebView(this.name, this.body, this.el, (page) => {
      this.header.setUrl(page.url);
      if (page.title !== null) this.header.setTitle(page.title);
    });
    this.el.addEventListener("focusin", () => opts.onFocus(this));
    this.header.el.addEventListener("mousedown", () => opts.onFocus(this));
  }

  async start(): Promise<void> {
    try {
      await this.view.open(this.url);
    } catch (err) {
      log.error(`open ${this.name} failed`, err);
      this.body.textContent = `Could not open ${this.url}`;
    }
  }

  get handle(): HTMLElement {
    return this.header.el;
  }

  fit(): void {
    this.view.fit();
  }

  setFontSize(): void {}

  paste(): void {
    log.debug(`${this.name}: dropped files are only typed into terminals`);
  }

  setFocused(focused: boolean): void {
    this.el.classList.toggle("focused", focused);
  }

  focus(): void {
    this.view.focus();
  }

  enter(): void {
    animateEnter(this.el);
  }

  leave(): Promise<void> {
    this.view.close();
    return animateLeave(this.el);
  }

  dispose(): void {
    this.view.dispose();
    this.el.remove();
  }
}
