import { invoke } from "@tauri-apps/api/core";

// Flashes Heron's taskbar button while another app is in front, so an
// agent is noticed from there (see attention.rs). Nothing happens while
// Heron is in front.

export const flashTaskbar = () => invoke<void>("flash_taskbar");
