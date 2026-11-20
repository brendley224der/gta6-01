// Vice Shores — vehicles: drivable cars, taxis, and looping traffic.
// A car is a small group of boxes with a heading, speed, and a role.
// Entering a parked civilian car is a crime (stealing); taxis are free.

import * as THREE from 'three';
import { CAR, STREETS, clamp, dist2d, makeRng } from './config.js';
import { randomStreetPoint } from './world.js';

const BODY_COLORS = [0xc0392b, 0x2e86de, 0x27ae60, 0xf39c12, 0x8e44ad, 0xecf0f1, 0x1a1a1a, 0x16a085];
const TAXI_COLOR = 0xf2c230;

export function buildCarMesh(color, isTaxi) {
  const g = new THREE.Group();
  const bodyMat = new THREE.MeshLambertMaterial({ color });
  const body = new THREE.Mesh(new THREE.BoxGeometry(2, 0.7, 4.2), bodyMat);
  body.position.y = 0.55;
  g.add(body);
  const cabin = new THREE.Mesh(
    new THREE.BoxGeometry(1.7, 0.65, 2.1),
    new THREE.MeshLambertMaterial({ color: 0x1c2833 }),
  );
  cabin.position.set(0, 1.2, -0.2);
  g.add(cabin);
  const wheelMat = new THREE.MeshLambertMaterial({ color: 0x111111 });
  const wheelGeo = new THREE.CylinderGeometry(0.38, 0.38, 0.3, 10);
  for (const [wx, wz] of [[-0.95, 1.35], [0.95, 1.35], [-0.95, -1.35], [0.95, -1.35]]) {
    const w = new THREE.Mesh(wheelGeo, wheelMat);
    w.rotation.z = Math.PI / 2;
    w.position.set(wx, 0.38, wz);
    g.add(w);
  }
  // Headlights + taillights so cars read at a glance.
  const lightMat = new THREE.MeshLambertMaterial({ color: 0xfff6b0, emissive: 0x555533 });
  for (const wx of [-0.6, 0.6]) {
    const h = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.2, 0.1), lightMat);
    h.position.set(wx, 0.6, 2.12);
    g.add(h);
  }
  const tailMat = new THREE.MeshLambertMaterial({ color: 0xff2222, emissive: 0x330000 });
  for (const wx of [-0.6, 0.6]) {
    const t = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.2, 0.1), tailMat);
    t.position.set(wx, 0.6, -2.12);
    g.add(t);
  }
  if (isTaxi) {
    const sign = new THREE.Mesh(
      new THREE.BoxGeometry(0.9, 0.3, 0.5),
      new THREE.MeshLambertMaterial({ color: 0x111111 }),
    );
    sign.position.set(0, 1.7, -0.2);
    g.add(sign);
    const stripe = new THREE.Mesh(
      new THREE.BoxGeometry(2.02, 0.18, 4.22),
      new THREE.MeshLambertMaterial({ color: 0x111111 }),
    );
    stripe.position.y = 0.72;
    g.add(stripe);
  }
  return g;
}

function newCar(scene, x, z, heading, color, kind) {
  const mesh = buildCarMesh(color, kind === 'taxi');
  mesh.position.set(x, 0, z);
  mesh.rotation.y = heading;
  scene.add(mesh);
  return {
    mesh,
    kind, // 'parked' | 'traffic' | 'taxi' | 'police' (police built in police.js)
    heading,
    speed: 0,
    color,
    loopAxis: null, // traffic loop state
    loopDir: 1,
    loopStreet: 0,
    stolen: false,
  };
}

export function spawnVehicles(scene, seed) {
  const rng = makeRng(seed + 7);
  const cars = [];
  // Parked civilian cars along streets.
  for (let i = 0; i < 12; i++) {
    const p = randomStreetPoint(rng);
    const along = rng() > 0.5;
    const x = along ? p.x + (rng() > 0.5 ? 6.5 : -6.5) : p.x;
    const z = along ? p.z : p.z + (rng() > 0.5 ? 6.5 : -6.5);
    const heading = along ? (rng() > 0.5 ? 0 : Math.PI) : rng() > 0.5 ? Math.PI / 2 : -Math.PI / 2;
    cars.push(newCar(scene, x, z, heading, BODY_COLORS[i % BODY_COLORS.length], 'parked'));
  }
  // Taxis: parked at stands and cruising.
  const taxiStands = [
    { x: 6.5, z: 20, heading: 0 },
    { x: -53.5, z: -40, heading: Math.PI / 2 },
    { x: 66.5, z: 80, heading: Math.PI },
    { x: -113.5, z: 100, heading: -Math.PI / 2 },
  ];
  for (const s of taxiStands) {
    cars.push(newCar(scene, s.x, s.z, s.heading, TAXI_COLOR, 'taxi'));
  }
  // Traffic cars looping rectangular routes on the street grid.
  for (let i = 0; i < 8; i++) {
    const street = STREETS[i % STREETS.length];
    const c = newCar(scene, street + 2.5, -150 + i * 20, 0, BODY_COLORS[(i + 3) % BODY_COLORS.length], 'traffic');
    c.kind = 'traffic';
    c.loopStreet = street;
    c.loopDir = i % 2 === 0 ? 1 : -1;
    c.speed = 9 + rng() * 4;
    cars.push(c);
  }
  return cars;
}

// Drive a car with arcade physics. Returns the speed in units/sec.
export function driveCar(car, keys, dt) {
  const throttle = keys.up ? 1 : keys.down ? -0.6 : 0;
  if (throttle > 0) car.speed += CAR.accel * dt;
  else if (throttle < 0) {
    car.speed -= (car.speed > 0.5 ? CAR.brake : CAR.reverseAccel) * dt;
  } else {
    car.speed -= car.speed * CAR.drag * dt;
    if (Math.abs(car.speed) < 0.05) car.speed = 0;
  }
  car.speed = clamp(car.speed, -CAR.maxReverse, CAR.maxSpeed);
  const steer = (keys.left ? 1 : 0) - (keys.right ? 1 : 0);
  const dir = car.speed >= 0 ? 1 : -1;
  car.heading += steer * CAR.turnRate * dt * dir * Math.min(1, Math.abs(car.speed) / 8 + 0.25);
  car.mesh.position.x += Math.sin(car.heading) * car.speed * dt;
  car.mesh.position.z += Math.cos(car.heading) * car.speed * dt;
  car.mesh.position.x = clamp(car.mesh.position.x, -188, 188);
  car.mesh.position.z = clamp(car.mesh.position.z, -188, 222);
  car.mesh.rotation.y = car.heading;
  return car.speed;
}

// Traffic cars drive a rectangular loop around one street block.
export function updateTraffic(car, dt) {
  if (car.kind !== 'traffic') return;
  const s = car.loopStreet;
  const off = 2.5;
  const min = -150;
  const max = 150;
  // Loop: down one side of the street, across, back up the other side.
  const x = car.mesh.position.x;
  const z = car.mesh.position.z;
  let targetHeading;
  if (Math.abs(x - (s + off)) < 3 && z < max) targetHeading = 0; // +z along street
  else if (z >= max - 2 && x > s - off) targetHeading = Math.PI / 2; // cross to other side
  else if (Math.abs(x - (s - off)) < 3 && z > min) targetHeading = Math.PI; // -z back
  else targetHeading = -Math.PI / 2; // cross back
  let dh = targetHeading - car.heading;
  while (dh > Math.PI) dh -= Math.PI * 2;
  while (dh < -Math.PI) dh += Math.PI * 2;
  car.heading += clamp(dh, -2.2 * dt, 2.2 * dt);
  car.mesh.position.x += Math.sin(car.heading) * car.speed * dt;
  car.mesh.position.z += Math.cos(car.heading) * car.speed * dt;
  car.mesh.rotation.y = car.heading;
}

export function nearestCar(cars, x, z, maxDist, kinds) {
  let best = null;
  let bestD = maxDist;
  for (const c of cars) {
    if (kinds && !kinds.includes(c.kind)) continue;
    const d = dist2d(x, z, c.mesh.position.x, c.mesh.position.z);
    if (d < bestD) {
      bestD = d;
      best = c;
    }
  }
  return best;
}

export function carSpeedKmh(car) {
  return Math.round(Math.abs(car.speed) * 3.6);
}
