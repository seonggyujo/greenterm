// Tracks bytes handed to xterm but not yet parsed (the write callback fires
// once a chunk is processed). Above HIGH we ask the backend to stop reading;
// below LOW we let it continue. This bounds memory under heavy output.

const HIGH_WATER = 256 * 1024;
const LOW_WATER = 32 * 1024;

export interface FlowHooks {
  pause(): void;
  resume(): void;
}

export class FlowControl {
  private pending = 0;
  private paused = false;

  constructor(private readonly hooks: FlowHooks) {}

  /** Call with every chunk; returns the callback to pass to `term.write`. */
  track(bytes: number): () => void {
    this.pending += bytes;
    if (!this.paused && this.pending > HIGH_WATER) {
      this.paused = true;
      this.hooks.pause();
    }
    return () => {
      this.pending -= bytes;
      if (this.paused && this.pending < LOW_WATER) {
        this.paused = false;
        this.hooks.resume();
      }
    };
  }
}
