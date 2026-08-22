/**
 * Minimal in-process LRU with per-entry TTL. A bonus layer only — the
 * platform data cache is what survives across serverless instances.
 */
interface Entry<T> {
  value: T;
  expiresAt: number;
}

export class LruCache<T> {
  private map = new Map<string, Entry<T>>();

  constructor(
    private readonly capacity: number,
    private readonly ttlMs: number = 60_000,
  ) {}

  get(key: string): T | undefined {
    const entry = this.map.get(key);
    if (!entry) return undefined;
    if (Date.now() > entry.expiresAt) {
      this.map.delete(key);
      return undefined;
    }
    this.map.delete(key);
    this.map.set(key, entry);
    return entry.value;
  }

  set(key: string, value: T): void {
    if (this.map.has(key)) this.map.delete(key);
    this.map.set(key, { value, expiresAt: Date.now() + this.ttlMs });
    if (this.map.size > this.capacity) {
      this.map.delete(this.map.keys().next().value as string);
    }
  }
}
