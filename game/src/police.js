// Vice Shores — the wanted system: stars rise on crimes, police cars spawn
// and pursue the player, ramming them; staying out of sight lets the heat
// decay back to zero.

import * as THREE from 'three';
import { POLICE, clamp, dist2d, makeRng } from './config.js';
import { buildCarMesh } from './vehicles.js';

export function createWanted() {
  return {
    stars: 0,
    unseenTimer: 0,
    decayTimer: 0,
    police: [], // police car objects
  };
}

export function addWanted(wanted, n, reason) {
  const before = wanted.stars;
  wanted.stars = clamp(wanted.stars + n, 0, 5);
  wanted.unseenTimer = 0;
  wanted.decayTimer = 0;
  return { before, after: wanted.stars, reason };
}

export function spawnPoliceCar(scene, wanted, px, pz, rng) {
  const angle = rng() * Math.PI * 2;
  const x = clamp(px + Math.cos(angle) * POLICE.spawnDistance, -180, 180);
  const z = clamp(pz + Math.sin(angle) * POLICE.spawnDistance, -180, 200);
  const mesh = buildCarMesh(0x1a1a1a, false);
  // Police livery: white doors + light bar.
  const bar = new THREE.Mesh(
    new THREE.BoxGeometry(1.4, 0.25, 0.5),
    new THREE.MeshLambertMaterial({ color: 0x2244ff, emissive: 0x112266 }),
  );
  bar.position.set(0, 1.65, -0.2);
  mesh.add(bar);
  const stripe = new THREE.Mesh(
    new THREE.BoxGeometry(2.02, 0.5, 4.22),
    new THREE.MeshLambertMaterial({ color: 0xffffff }),
  );
  stripe.position.y = 0.6;
  mesh.add(stripe);
  mesh.position.set(x, 0, z);
  scene.add(mesh);
  const car = { mesh, kind: 'police', heading: Math.atan2(px - x, pz - z), speed: 0 };
  wanted.police.push(car);
  return car;
}

// Keep the number of police cars equal to the wanted level (min 1 while wanted).
export function syncPolice(scene, wanted, px, pz, rng) {
  const want = wanted.stars === 0 ? 0 : Math.max(1, wanted.stars);
  while (wanted.police.length < want) spawnPoliceCar(scene, wanted, px, pz, rng);
  while (wanted.police.length > want) {
    const c = wanted.police.pop();
    scene.remove(c.mesh);
  }
}

// Police pursuit: steer toward the player, ram on contact (push + slow).
// Returns true when any police car is close enough to see the player.
export function updatePolice(wanted, playerPos, playerCar, dt) {
  let seen = false;
  for (const p of wanted.police) {
    const tx = playerPos.x;
    const tz = playerPos.z;
    const d = dist2d(p.mesh.position.x, p.mesh.position.z, tx, tz);
    if (d < POLICE.sightRange) seen = true;
    const desired = Math.atan2(tx - p.mesh.position.x, tz - p.mesh.position.z);
    let dh = desired - p.heading;
    while (dh > Math.PI) dh -= Math.PI * 2;
    while (dh < -Math.PI) dh += Math.PI * 2;
    p.heading += clamp(dh, -2.4 * dt, 2.4 * dt);
    // Ease off when very close so they ram instead of orbiting.
    const targetSpeed = d > 6 ? POLICE.maxSpeed : POLICE.maxSpeed * 0.55;
    p.speed += (targetSpeed - p.speed) * Math.min(1, dt * 1.5);
    p.mesh.position.x += Math.sin(p.heading) * p.speed * dt;
    p.mesh.position.z += Math.cos(p.heading) * p.speed * dt;
    p.mesh.position.x = clamp(p.mesh.position.x, -188, 188);
    p.mesh.position.z = clamp(p.mesh.position.z, -188, 222);
    p.mesh.rotation.y = p.heading;
    // Ram: on contact, shove the player's car and cut its speed. The push
    // is small per frame so a ram nudges the player instead of blasting
    // them off the road (an earlier factor of 8 threw cars onto the grass).
    if (d < 4.5) {
      const push = POLICE.ramPush * dt;
      const nx = (playerPos.x - p.mesh.position.x) / (d || 1);
      const nz = (playerPos.z - p.mesh.position.z) / (d || 1);
      if (playerCar) {
        playerCar.mesh.position.x += nx * push * 2;
        playerCar.mesh.position.z += nz * push * 2;
        playerCar.speed *= 1 - Math.min(0.5, dt * 3);
      } else {
        playerPos.x += nx * push * 1.5;
        playerPos.z += nz * push * 1.5;
      }
    }
  }
  return seen;
}

// Decay: after `decayAfterSeconds` with no police in sight range, lose a
// star every `decayStepSeconds`.
export function updateWantedDecay(wanted, seen, dt) {
  if (wanted.stars === 0) return;
  if (seen) {
    wanted.unseenTimer = 0;
    wanted.decayTimer = 0;
    return;
  }
  wanted.unseenTimer += dt;
  if (wanted.unseenTimer < POLICE.decayAfterSeconds) return;
  wanted.decayTimer += dt;
  if (wanted.decayTimer >= POLICE.decayStepSeconds) {
    wanted.decayTimer = 0;
    wanted.stars = Math.max(0, wanted.stars - 1);
  }
}

export function makePoliceRng(seed) {
  return makeRng(seed + 31);
}
