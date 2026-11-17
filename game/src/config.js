// Vice Shores — every tuning number, colour and mission definition in one place.
// The city is a grid of blocks separated by roads, with a beach and ocean on its east edge.
// One world unit is about one metre; the playable city spans roughly -150..+150 in x and z.
export const CITY = {
  block: 42,
  road: 14,
  blocks: 5, // blocks per side; roads sit between them
  half: 150,
  beachX: 158,
  oceanX: 178,
};

export const PLAYER = {
  walkSpeed: 9,
  runSpeed: 14,
  radius: 0.7,
  maxHealth: 100,
  punchDamage: 25,
  punchRange: 2.2,
};

export const CAR = {
  accel: 22,
  brake: 34,
  reverseAccel: 12,
  maxSpeed: 42,
  maxReverse: 12,
  steer: 1.9,
  drag: 0.6,
};

export const WANTED = {
  decaySeconds: 45, // seconds with no crime before one star fades
  maxStars: 5,
  policePerStar: 2,
  bustDistance: 2.2,
};

export const SAVE_KEY = 'vice-shores.save.v1';
export const BEST_KEY = 'vice-shores.best.v1';

export const PALETTE = {
  skyTop: 0x2e6fb0,
  skyHorizon: 0xffb36b,
  sun: 0xffd9a0,
  road: 0x2b2f36,
  roadLine: 0xf5d76e,
  sidewalk: 0x9aa0a3,
  sand: 0xe8cf9a,
  ocean: 0x1d7fa8,
  grass: 0x5da24a,
  building: [0xe8b48a, 0xd98f6a, 0x8fb8c9, 0xc9a0b4, 0xa8c686, 0x7fa8d9, 0xe0d0a0, 0xb48ac9],
  glass: 0x2a4a66,
  police: 0x1c2733,
  taxi: 0xf2c230,
};

export const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';

// The story: Mara Voss, a courier fresh off the ferry, owes the Shore Syndicate.
// Each mission pays cash; finishing all three opens repeat courier runs.
export const MISSIONS = [
  {
    id: 'delivery',
    title: 'Mission 1 — First Delivery',
    brief: 'Mara needs a driver she can trust. Take the package to the Marina drop-off.',
    objective: 'Drive to the Marina marker',
    reward: 500,
    target: { x: 118, z: -118 },
    kind: 'goto',
  },
  {
    id: 'tail',
    title: 'Mission 2 — Tail the Courier',
    brief: 'A rival courier is moving Syndicate goods. Stay on his tail — do not lose him.',
    objective: 'Tail the red courier car — stay close, stay unseen',
    reward: 800,
    kind: 'tail',
    duration: 20,
  },
  {
    id: 'pickup',
    title: 'Mission 3 — Hot Pickup',
    brief: 'The docks are crawling with Shore PD. Grab the case, then lose the heat at the safehouse.',
    objective: 'Grab the case at the Docks, then reach the Safehouse',
    reward: 1500,
    target: { x: -118, z: 118 },
    safehouse: { x: -118, z: -118 },
    kind: 'pickup',
    wantedOnStart: 2,
  },
];

export const HINTS = [
  'WASD move · Mouse drag camera · E enter/exit car · F punch · Click shoot · P pause · M mute',
  'Steal any parked car with E. Crime raises your wanted stars — Shore PD will chase you.',
  'Finish missions to earn cash. Your progress saves automatically.',
];
