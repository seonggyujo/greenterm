import { invoke } from "@tauri-apps/api/core";

// Flashes greenterm's taskbar button while another app is in front, so an
// agent is noticed from there (see attention.rs). Nothing happens while
// greenterm is in front.

export const flashTaskbar = () => invoke<void>("flash_taskbar");
