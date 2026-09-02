/**
 * Seeded Pseudo-Random Number Generator (Mulberry32)
 * Ensures reproducible synthetic datasets across runs.
 */
export class SeededRandom {
  private state: number;

  constructor(seed: number = 42) {
    this.state = seed >>> 0;
  }

  /**
   * Resets the PRNG to a given seed.
   */
  public reseed(seed: number = 42): void {
    this.state = seed >>> 0;
  }

  /**
   * Generates a pseudo-random float between 0 (inclusive) and 1 (exclusive).
   */
  public next(): number {
    let t = (this.state += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /**
   * Generates a random integer in [min, max] inclusive.
   */
  public nextInt(min: number, max: number): number {
    const minCeil = Math.ceil(min);
    const maxFloor = Math.floor(max);
    return Math.floor(this.next() * (maxFloor - minCeil + 1)) + minCeil;
  }

  /**
   * Generates a random float in [min, max).
   */
  public nextFloat(min: number, max: number): number {
    return min + this.next() * (max - min);
  }

  /**
   * Selects a random element from an array.
   */
  public choice<T>(items: readonly T[]): T {
    if (items.length === 0) {
      throw new Error('Cannot pick from an empty array');
    }
    const index = this.nextInt(0, items.length - 1);
    return items[index];
  }

  /**
   * Shuffles an array deterministically in place (Fisher-Yates).
   */
  public shuffle<T>(array: T[]): T[] {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(this.next() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  /**
   * Generates a deterministic date between start and end.
   */
  public nextDate(start: Date, end: Date): Date {
    const startTime = start.getTime();
    const endTime = end.getTime();
    const randomTime = startTime + this.next() * (endTime - startTime);
    return new Date(randomTime);
  }
}

// Global default seeded instance with seed 42
export const globalRng = new SeededRandom(42);
