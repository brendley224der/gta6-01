// A small seeded random number generator (mulberry32): the same seed gives the
// same city layout and traffic pattern, which is what makes the screenshot
// scenes repeatable — ?seed=1 always stages the same frame.
export function createRandom(seed) {
  let a = seed | 0;
  return function random() {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Pick one entry of an array with the seeded random. */
export function pick(random, array) {
  return array[Math.floor(random() * array.length)];
}

/** A random number between min and max. */
export function range(random, min, max) {
  return min + random() * (max - min);
}

/** True with probability p (0..1). */
export function chance(random, p) {
  return random() < p;
}

/** A shuffled copy of an array (Fisher-Yates), using the seeded random. */
export function shuffle(random, array) {
  const out = array.slice();
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    const tmp = out[i];
    out[i] = out[j];
    out[j] = tmp;
  }
  return out;
}
