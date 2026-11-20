// Vice Shores — the city itself: ground, street grid, downtown towers,
// park district, marina with boats, beach and ocean. Built once at startup
// from a seeded RNG so the layout is stable for a given seed.

import * as THREE from 'three';
import { CITY, STREETS, makeRng } from './config.js';

function lambert(color, opts = {}) {
  return new THREE.MeshLambertMaterial({ color, ...opts });
}

function box(w, h, d, color, x, y, z) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), lambert(color));
  m.position.set(x, y, z);
  return m;
}

function isPark(x, z) {
  return x >= CITY.parkMinX && x <= CITY.parkMaxX && z >= CITY.parkMinZ && z <= CITY.parkMaxZ;
}

function isMarina(x, z) {
  return x > CITY.marinaX;
}

function isBeach(x, z) {
  return z > CITY.beachZ && x <= CITY.marinaX;
}

function onRoad(x, z) {
  const half = CITY.roadWidth / 2 + 0.5;
  return STREETS.some((s) => Math.abs(x - s) < half || Math.abs(z - s) < half);
}

export function buildWorld(scene, seed) {
  const rng = makeRng(seed);
  const group = new THREE.Group();
  group.name = 'world';

  // --- ground: grass base, then district overlays -----------------------
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(CITY.half * 2 + 120, CITY.half * 2 + 120),
    lambert(0x4d8a4a),
  );
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  group.add(ground);

  // Park lawn (north-west quadrant).
  const park = new THREE.Mesh(new THREE.PlaneGeometry(110, 110), lambert(0x3f9e4d));
  park.rotation.x = -Math.PI / 2;
  park.position.set(-125, 0.02, -125);
  group.add(park);

  // Beach sand (south edge) and ocean beyond it.
  const sand = new THREE.Mesh(new THREE.PlaneGeometry(340, 60), lambert(0xe8d49a));
  sand.rotation.x = -Math.PI / 2;
  sand.position.set(-15, 0.03, 175);
  group.add(sand);
  const ocean = new THREE.Mesh(new THREE.PlaneGeometry(460, 120), lambert(0x1e6f9e));
  ocean.rotation.x = -Math.PI / 2;
  ocean.position.set(0, 0.01, 235);
  group.add(ocean);

  // Marina water (east edge).
  const marinaWater = new THREE.Mesh(new THREE.PlaneGeometry(90, 380), lambert(0x2a7fb5));
  marinaWater.rotation.x = -Math.PI / 2;
  marinaWater.position.set(185, 0.01, 0);
  group.add(marinaWater);

  // --- streets ----------------------------------------------------------
  const roadMat = lambert(0x33363b);
  for (const s of STREETS) {
    const h = new THREE.Mesh(new THREE.PlaneGeometry(380, CITY.roadWidth), roadMat);
    h.rotation.x = -Math.PI / 2;
    h.position.set(0, 0.05, s);
    group.add(h);
    const v = new THREE.Mesh(new THREE.PlaneGeometry(CITY.roadWidth, 380), roadMat);
    v.rotation.x = -Math.PI / 2;
    v.position.set(s, 0.05, 0);
    group.add(v);
    // Dashed centre lines.
    for (let t = -180; t < 180; t += 12) {
      const dash = new THREE.Mesh(new THREE.PlaneGeometry(5, 0.4), lambert(0xd8d8d8));
      dash.rotation.x = -Math.PI / 2;
      dash.position.set(t, 0.07, s);
      group.add(dash);
    }
  }

  // --- buildings: downtown towers near the centre, low blocks elsewhere -
  const palette = [0x8a7f72, 0x6f7f8a, 0x9a8a6a, 0x7a6a8a, 0x5a6a7a, 0xb08a5a];
  const windows = lambert(0x2a3a4a, { emissive: 0x111418 });
  let colorIdx = 0;
  for (let gx = -150; gx <= 120; gx += 60) {
    for (let gz = -150; gz <= 120; gz += 60) {
      const cx = gx + 30;
      const cz = gz + 30;
      if (isPark(cx, cz) || isMarina(cx, cz) || isBeach(cx, cz)) continue;
      const downtown = Math.abs(cx) <= 90 && Math.abs(cz) <= 90;
      const h = downtown ? 22 + rng() * 38 : 6 + rng() * 10;
      const color = palette[colorIdx++ % palette.length];
      const b = box(34, h, 34, color, cx, h / 2, cz);
      group.add(b);
      // Lit window band near the top so towers read at a glance.
      const band = box(34.4, Math.min(3, h * 0.2), 34.4, 0x2a3a4a, cx, h * 0.82, cz);
      band.material = windows;
      group.add(band);
      // Rooftop box for silhouette variety.
      if (downtown && rng() > 0.5) {
        group.add(box(10, 4, 10, 0x555555, cx + 6, h + 2, cz - 4));
      }
    }
  }

  // --- park: trees, pond, paths -----------------------------------------
  const trunkMat = lambert(0x6a4a2a);
  const leafMat = lambert(0x2f7a33);
  const leafMat2 = lambert(0x4aa84e);
  for (let i = 0; i < 42; i++) {
    const x = CITY.parkMinX + 6 + rng() * 98;
    const z = CITY.parkMinZ + 6 + rng() * 98;
    if (onRoad(x, z)) continue;
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.7, 3, 6), trunkMat);
    trunk.position.set(x, 1.5, z);
    group.add(trunk);
    const leaves = new THREE.Mesh(new THREE.SphereGeometry(2.4 + rng() * 1.4, 8, 6), rng() > 0.5 ? leafMat : leafMat2);
    leaves.position.set(x, 4.2, z);
    group.add(leaves);
  }
  const pond = new THREE.Mesh(new THREE.CircleGeometry(16, 24), lambert(0x3a8ac2));
  pond.rotation.x = -Math.PI / 2;
  pond.position.set(-100, 0.06, -150);
  group.add(pond);
  // Park benches + lamps.
  for (let i = 0; i < 8; i++) {
    const x = -170 + i * 12;
    group.add(box(3, 0.5, 1.2, 0x7a5230, x, 0.6, -95));
  }

  // --- marina: docks, boats, lighthouse ----------------------------------
  const dockMat = lambert(0x8a6a42);
  for (let i = 0; i < 4; i++) {
    const dock = box(3, 0.8, 46, 0x8a6a42, 148 + i * 2, 0.4, -60 + i * 45);
    dock.material = dockMat;
    group.add(dock);
  }
  const boatColors = [0xffffff, 0xe84a4a, 0x4a7ae8, 0xf2c230];
  for (let i = 0; i < 8; i++) {
    const bx = 152 + (i % 4) * 8;
    const bz = -80 + Math.floor(i / 4) * 130 + (i % 2) * 20;
    const hull = new THREE.Mesh(new THREE.BoxGeometry(5, 1.6, 12), lambert(boatColors[i % boatColors.length]));
    hull.position.set(bx, 0.8, bz);
    group.add(hull);
    const cabin = box(3, 1.6, 4, 0xdddddd, bx, 2.2, bz);
    group.add(cabin);
    const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 7, 6), lambert(0x888888));
    mast.position.set(bx, 5.5, bz - 2);
    group.add(mast);
  }
  // Lighthouse at the marina point.
  const tower = new THREE.Mesh(new THREE.CylinderGeometry(3, 4, 26, 10), lambert(0xf2f2f2));
  tower.position.set(168, 13, 120);
  group.add(tower);
  const lamp = new THREE.Mesh(new THREE.CylinderGeometry(2.2, 2.2, 3, 10), lambert(0xffd23e, { emissive: 0xaa8800 }));
  lamp.position.set(168, 27, 120);
  group.add(lamp);

  // --- beach: umbrellas, palms ------------------------------------------
  for (let i = 0; i < 7; i++) {
    const x = -140 + i * 42;
    const z = 168 + (i % 2) * 8;
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 3, 6), lambert(0xdddddd));
    pole.position.set(x, 1.5, z);
    group.add(pole);
    const top = new THREE.Mesh(new THREE.ConeGeometry(3, 1.4, 10), lambert(i % 2 ? 0xe84a4a : 0x4a7ae8));
    top.position.set(x, 3.4, z);
    group.add(top);
  }

  // --- street lamps along the main roads --------------------------------
  const lampMat = lambert(0x444444);
  for (const s of STREETS) {
    for (let t = -150; t <= 150; t += 60) {
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 7, 6), lampMat);
      pole.position.set(s + 7, 3.5, t);
      group.add(pole);
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.7, 8, 6), lambert(0xffe9a0, { emissive: 0x554400 }));
      head.position.set(s + 7, 7.1, t);
      group.add(head);
    }
  }

  scene.add(group);
  return { group, isPark, isMarina, isBeach, onRoad };
}

// A random point on a street (for spawning cars / pedestrians).
export function randomStreetPoint(rng) {
  const s = STREETS[Math.floor(rng() * STREETS.length)];
  const t = -150 + rng() * 300;
  return rng() > 0.5 ? { x: s, z: t } : { x: t, z: s };
}
