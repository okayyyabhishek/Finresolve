import { SeededRandom } from '../src/utils/seedRandom';

describe('Data Generator Integrity and Determinism Tests', () => {
  test('seeded random PRNG should produce identical output sequences for seed 42', () => {
    const rng1 = new SeededRandom(42);
    const rng2 = new SeededRandom(42);

    for (let i = 0; i < 25; i++) {
      expect(rng1.next()).toBe(rng2.next());
      expect(rng1.nextInt(1, 100)).toBe(rng2.nextInt(1, 100));
    }
  });

  test('seeded PRNG shuffle should be fully deterministic', () => {
    const rng1 = new SeededRandom(42);
    const rng2 = new SeededRandom(42);

    const array1 = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    const array2 = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

    const shuffled1 = rng1.shuffle(array1);
    const shuffled2 = rng2.shuffle(array2);

    expect(shuffled1).toEqual(shuffled2);
  });
});
