// Vice Shores — shared constants: city layout, tuning, mission text.
// Pure data, no DOM or three.js imports, so every module can share it.

export const CITY = {
  half: 190, // playable ground extends -190..190 on x and z
  roadSpacing: 60, // streets form a grid every 60 units
  roadWidth: 10,
  beachZ: 150, // south edge (z > 150) is sand + ocean
  marinaX: 140, // east edge (x > 140) is water, docks and boats
  parkMinX: -180,
  parkMaxX: -70,
  parkMinZ: -180,
  parkMaxZ: -70,
};

// Streets run along these coordinates (both axes).
export const STREETS = [-120, -60, 0, 60, 120];

export const PLAYER = {
  walkSpeed: 6,
  runSpeed: 11,
  radius: 0.9,
  height: 1.8,
};

export const CAR = {
  accel: 22,
  brake: 34,
  reverseAccel: 12,
  maxSpeed: 34, // ~122 km/h
  maxReverse: 10,
  turnRate: 2.1,
  drag: 0.55,
};

export const POLICE = {
  maxSpeed: 30,
  accel: 20,
  ramPush: 9,
  spawnDistance: 55,
  sightRange: 70,
  // Wanted decays only while no police car is this close.
  safeDistance: 60,
  decayAfterSeconds: 6,
  decayStepSeconds: 4,
};

export const MISSIONS = [
  {
    id: 1,
    title: 'Package Run',
    intro: 'Pick up the package at the yellow marker, then drop it off downtown.',
    steps: [
      { text: 'Pick up the package at the yellow marker', target: { x: -120, z: 90 } },
      { text: 'Deliver the package downtown', target: { x: 60, z: -60 } },
    ],
    reward: 500,
  },
  {
    id: 2,
    title: 'Lose the Heat',
    intro: 'The cops are on you. Break line of sight and stay clear until the heat dies down.',
    steps: [
      { text: 'Reach 2 wanted stars, then escape the police', target: null },
      { text: 'Stay out of sight until your wanted level clears', target: null },
    ],
    reward: 750,
  },
  {
    id: 3,
    title: 'VIP to the Marina',
    intro: 'A VIP needs a ride to the marina. Hail a taxi, pick them up, then drive them there.',
    steps: [
      { text: 'Get into a yellow taxi (press E near one)', target: null },
      { text: 'Pick up the VIP at the pink marker', target: { x: -30, z: 60 } },
      { text: 'Drive the VIP to the marina', target: { x: 150, z: 60 } },
    ],
    reward: 1000,
  },
];

export const SHOT_NAMES = ['start', 'drive', 'chase', 'mission'];

// Deterministic PRNG (mulberry32) so ?seed=1 stages the same city every run.
export function makeRng(seed) {
  let a = seed >>> 0;
  return function rng() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function clamp(v, lo, hi) {
  return v < lo ? lo : v > hi ? hi : v;
}

export function dist2d(ax, az, bx, bz) {
  const dx = ax - bx;
  const dz = az - bz;
  return Math.sqrt(dx * dx + dz * dz);
}
