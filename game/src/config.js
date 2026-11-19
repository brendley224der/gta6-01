// Vice Shores — every tuning number, colour and mission definition in one place.
// The city is a grid of blocks separated by roads, with a beach and ocean on its
// east edge. One world unit is about one metre; the playable city spans roughly
// -150..+150 in x and z, with the sand and water stretching further east.
export const CITY = {
  block: 42, // side of one city block, in metres
  road: 14, // width of the roads between blocks
  blocks: 5, // blocks per side; roads sit between them
  half: 150, // playable half-extent in x and z
  beachX: 158, // where the sand starts, east of downtown
  oceanX: 178, // where the water starts
};

export const PLAYER = {
  walkSpeed: 9,
  runSpeed: 14,
  radius: 0.7, // collision radius on foot
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
  steer: 1.9, // radians per second at full lock
  drag: 0.6, // rolling drag when coasting
};

export const SKID = {
  minSpeed: 18, // skidding needs this speed and a hard turn
  minSteer: 0.7,
};

export const CAMERA = {
  fov: 62, // base field of view, degrees
  driveKick: 8, // extra fov at top speed, for a sense of pace
};

export const WANTED = {
  decaySeconds: 45, // seconds with no crime before one star fades
  maxStars: 5,
  policePerStar: 2,
  bustDistance: 2.2, // how close a cop must get to bust Mara on foot
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
  marina: 0x2a6f7f, // hulls and the pier at the docks
  park: 0x4a7d3a, // the deep green of the central park's trees
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
  'The minimap shows the gold mission marker, traffic in grey and police in blue.',
  'At 3 stars or more the cops ram hard — a fresh car is cheaper than a hospital bill.',
];
