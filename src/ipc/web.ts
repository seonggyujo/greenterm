import { invoke } from "@tauri-apps/api/core";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";

// Typed wrappers around the Rust web pane commands (src-tauri/src/web.rs).
// Boxes are in CSS pixels, which are Tauri logical pixels.

export interface WebBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface WebPage {
  label: string;
  url: string;
  /** Only set when the document title changed. */
  title: string | null;
}

export const openWeb = (label: string, url: string, box: WebBox) =>
  invoke<void>("web_open", { label, url, ...box });

export const setWebBounds = (label: string, box: WebBox) => invoke<void>("web_bounds", { label, ...box });

export const setWebVisible = (label: string, visible: boolean) =>
  invoke<void>("web_visible", { label, visible });

export const navigateWeb = (label: string, url: string) => invoke<void>("web_navigate", { label, url });

export const webBack = (label: string) => invoke<void>("web_back", { label });

export const webReload = (label: string) => invoke<void>("web_reload", { label });

export const focusWeb = (label: string) => invoke<void>("web_focus", { label });

export const closeWeb = (label: string) => invoke<void>("web_close", { label });

/** Cookies, history and site data of every web pane; the settings stay. */
export const clearWebData = () => invoke<void>("web_clear_data");

/** A web pane took keyboard focus (a click into the page); payload is its label. */
export function onWebFocus(handler: (label: string) => void): Promise<UnlistenFn> {
  return listen<string>("web-focus", (event) => handler(event.payload));
}

export function onWebPage(handler: (page: WebPage) => void): Promise<UnlistenFn> {
  return listen<WebPage>("web-page", (event) => handler(event.payload));
}
