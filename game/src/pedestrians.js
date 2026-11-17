// Pedestrians: colourful walkers strolling the sidewalks. They pick a corner,
// walk to it, pick another, and flee from gunfire or a speeding car. A walker
// knocked down by a car counts as a crime and raises the wanted level.
import { range } from './random.js';

const THREE = window.THREE;
const SHIRTS = [0xe84a5f, 0x2f9e8f, 0xf2a541, 0x7a5fd0, 0x3a7bd5, 0xeeeeee, 0x222222];
const SKINS = [0xe8b98a, 0xc98d5f, 0x8a5a3b, 0xf0c8a0];

export function createPedestrians(scene, random, count = 24) {
  const walkers = [];

  function buildWalker() {
    const group = new THREE.Group();
    const shirt = new THREE.MeshLambertMaterial({ color: SHIRTS[Math.floor(random() * SHIRTS.length)] });
    const skin = new THREE.MeshLambertMaterial({ color: SKINS[Math.floor(random() * SKINS.length)] });
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.75, 0.35), shirt);
    body.position.y = 1.05;
    group.add(body);
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.36, 0.36), skin);
    head.position.y = 1.65;
    group.add(head);
    const legL = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.65, 0.18), new THREE.MeshLambertMaterial({ color: 0x2b3442 }));
    legL.position.set(-0.15, 0.32, 0);
    group.add(legL);
    const legR = legL.clone();
    legR.position.x = 0.15;
    group.add(legR);
    scene.add(group);
    return { group, legL, legR };
  }

  function randomSidewalkPoint() {
    // Sidewalk = just off a road line, inside a block edge.
    const step = 56;
    const bx = (Math.floor(random() * 5) - 2) * step;
    const bz = (Math.floor(random() * 5) - 2) * step;
    return {
      x: bx + (random() < 0.5 ? -1 : 1) * range(random, 18, 24),
      z: bz + range(random, -24, 24),
    };
  }

  for (let i = 0; i < count; i += 1) {
    const mesh = buildWalker();
    const p = randomSidewalkPoint();
    const target = randomSidewalkPoint();
    walkers.push({
      ...mesh,
      x: p.x, z: p.z,
      target,
      speed: range(random, 1.2, 2.4),
      phase: random() * 6,
      fleeing: 0,
      down: false,
      downTimer: 0,
    });
  }

  return {
    walkers,
    update(dt, danger) {
      for (const w of walkers) {
        if (w.down) {
          w.downTimer -= dt;
          if (w.downTimer <= 0) {
            w.down = false;
            w.group.rotation.x = 0;
            w.group.position.y = 0;
            w.target = randomSidewalkPoint();
          }
          continue;
        }
        if (danger) {
          const d = Math.hypot(w.x - danger.x, w.z - danger.z);
          if (d < 14) w.fleeing = 2;
        }
        if (w.fleeing > 0) {
          w.fleeing -= dt;
          const dx = w.x - (danger ? danger.x : w.x);
          const dz = w.z - (danger ? danger.z : w.z);
          const len = Math.hypot(dx, dz) || 1;
          w.x += (dx / len) * 4.5 * dt;
          w.z += (dz / len) * 4.5 * dt;
          w.group.rotation.y = Math.atan2(dx, dz);
        } else {
          const dx = w.target.x - w.x;
          const dz = w.target.z - w.z;
          const dist = Math.hypot(dx, dz);
          if (dist < 1.5) {
            w.target = randomSidewalkPoint();
          } else {
            w.x += (dx / dist) * w.speed * dt;
            w.z += (dz / dist) * w.speed * dt;
            w.group.rotation.y = Math.atan2(dx, dz);
          }
        }
        w.phase += dt * 8;
        const swing = Math.sin(w.phase) * 0.5;
        w.legL.rotation.x = swing;
        w.legR.rotation.x = -swing;
        w.group.position.set(w.x, 0, w.z);
      }
    },
    /** Knock a walker down (car hit or bullet). Returns the walker or null. */
    knockDown(x, z, radius) {
      for (const w of walkers) {
        if (w.down) continue;
        if (Math.hypot(w.x - x, w.z - z) < radius) {
          w.down = true;
          w.downTimer = 6;
          w.group.rotation.x = Math.PI / 2;
          w.group.position.y = 0.3;
          return w;
        }
      }
      return null;
    },
    nearest(x, z, radius) {
      let best = null;
      let bestD = radius;
      for (const w of walkers) {
        if (w.down) continue;
        const d = Math.hypot(w.x - x, w.z - z);
        if (d < bestD) { bestD = d; best = w; }
      }
      return best;
    },
  };
}
