export type RadarRaster = { setOpacity(value: number): void; remove(): void };
export type RadarSlot = {
  layer: RadarRaster;
  ready(): Promise<boolean>;
  retryFailed?(): void;
};

/** Keep the previous scan visible until its replacement has finished loading.
 * Only neighbouring real scans are blended; seeking and wrapping never invent
 * an intermediate weather time. At most three tile layers are retained.
 */
export class RadarPlayback {
  private cache = new Map<number, RadarSlot>();
  private weights = new Map<number, number>();
  private active: number | null = null;
  private target: number | null = null;
  private generation = 0;
  private animation: number | null = null;
  private finishAnimation: (() => void) | null = null;
  private opacity = 0.65;
  constructor(
    private create: (index: number) => RadarSlot,
    private onDisplay: (index: number) => void,
    private onWaiting: (waiting: boolean) => void,
  ) {}
  private get(index: number) {
    const slot = this.cache.get(index) ?? this.create(index);
    this.cache.delete(index);
    this.cache.set(index, slot);
    this.trim();
    return slot;
  }
  private trim() {
    for (const [index, slot] of this.cache) {
      if (this.cache.size <= 3) break;
      if (index !== this.active && index !== this.target) {
        slot.layer.remove();
        this.cache.delete(index);
        this.weights.delete(index);
      }
    }
  }
  private paint() {
    for (const [index, slot] of this.cache)
      slot.layer.setOpacity((this.weights.get(index) ?? 0) * this.opacity);
  }
  setOpacity(opacity: number) {
    this.opacity = opacity;
    this.paint();
  }
  preload(index: number) {
    this.get(index);
  }
  retryFailed() {
    for (const slot of this.cache.values()) slot.retryFailed?.();
  }
  async show(index: number, duration = 0) {
    const generation = ++this.generation;
    if (this.animation !== null) cancelAnimationFrame(this.animation);
    this.finishAnimation?.();
    this.finishAnimation = null;
    this.target = index;
    // Finish any interrupted transition on its most recent real scan.
    this.weights.clear();
    if (this.active !== null) this.weights.set(this.active, 1);
    this.paint();
    this.onWaiting(true);
    const slot = this.get(index);
    if (!(await slot.ready()) || generation !== this.generation) {
      if (generation === this.generation) this.onWaiting(false);
      return false;
    }
    const previous = this.active;
    this.active = index;
    this.onDisplay(index);
    this.onWaiting(false);
    if (
      duration &&
      previous !== null &&
      index > previous &&
      index - previous <= 900
    ) {
      await new Promise<void>((resolve) => {
        this.finishAnimation = resolve;
        let start: number | null = null;
        const tick = (timestamp: number) => {
          if (generation !== this.generation) return resolve();
          start ??= timestamp;
          const progress = Math.min(1, (timestamp - start) / duration);
          this.weights.set(previous, 1 - progress);
          this.weights.set(index, progress);
          this.paint();
          if (progress < 1) this.animation = requestAnimationFrame(tick);
          else {
            this.animation = null;
            this.finishAnimation = null;
            resolve();
          }
        };
        this.animation = requestAnimationFrame(tick);
      });
    }
    if (generation !== this.generation) return false;
    this.weights.clear();
    this.weights.set(index, 1);
    this.paint();
    this.trim();
    return true;
  }
  destroy() {
    ++this.generation;
    if (this.animation !== null) cancelAnimationFrame(this.animation);
    this.finishAnimation?.();
    for (const slot of this.cache.values()) slot.layer.remove();
    this.cache.clear();
    this.weights.clear();
  }
}
