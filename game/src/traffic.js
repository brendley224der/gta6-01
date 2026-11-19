// Traffic: civilian cars that cruise the road grid on rectangular loops, keeping
// to their lane and slowing for the car ahead, plus the red courier car the tail
// mission follows. A few of the cruisers are yellow cabs. Traffic cars are simple
// state machines, not physics bodies.
import { createCar } from './vehicles.js';
import { roadLines } from './world.js';
import { chance, range } from './random.js';

const CAR_COLORS = [0xc0392b, 0x2e86c1, 0xf1c40f, 0x7d3c98, 0x1abc9c, 0xe67e22, 0xecf0f1, 0x2c3e50];

export function createTraffic(scene, random, count = 14) {
  const lines = roadLines();
  const cars = [];

  function randomLoop() {
    // A rectangle loop around one block: pick a road pair and a direction.
    const x = lines[Math.floor(random() * lines.length)];
    const z = lines[Math.floor(random() * lines.length)];
    const dir = chance(random, 0.5) ? 1 : -1;
    const half = 28 + Math.floor(random() * 3) * 56;
    return { x, z, dir, half };
  }

  function spawnOne() {
    const loop = randomLoop();
    const isTaxi = chance(random, 0.25);
    const color = isTaxi ? 0xf2c230 : CAR_COLORS[Math.floor(random() * CAR_COLORS.length)];
    const car = createCar(scene, loop.x, loop.z, 0, color, false, isTaxi);
    car.driver = 'traffic';
    car.parked = false;
    const entry = {
      car,
      loop,
      // 0:+x 1:+z 2:-x 3:-z around the rectangle, starting on a random side.
      side: Math.floor(random() * 4),
      speed: range(random, 9, 14),
      cruise: range(random, 9, 14),
    };
    entry.car.angle = [0, Math.PI / 2, Math.PI, -Math.PI / 2][entry.side] * (entry.loop.dir > 0 ? 1 : -1);
    cars.push(entry);
    return entry;
  }

  for (let i = 0; i < count; i += 1) spawnOne();

  // The red courier car for the tail mission: drives a wide loop around the city.
  const courier = createCar(scene, 0, -112, 0, 0xd21f2b, false);
  courier.driver = 'courier';
  courier.parked = false;
  const courierState = { car: courier, side: 0, speed: 13, loop: { x: 0, z: 0, dir: 1, half: 112 } };

  function driveLoop(entry, dt) {
    const { car, loop } = entry;
    const cx = loop.x;
    const cz = loop.z;
    const h = loop.half;
    // Waypoints around the rectangle; steer toward the next corner.
    const corners = [
      { x: cx - h, z: cz - h }, { x: cx + h, z: cz - h },
      { x: cx + h, z: cz + h }, { x: cx - h, z: cz + h },
    ];
    const target = corners[entry.side];
    const dx = target.x - car.x;
    const dz = target.z - car.z;
    const dist = Math.hypot(dx, dz);
    if (dist < 4) {
      entry.side = (entry.side + 1) % 4;
      return;
    }
    const want = Math.atan2(dx, dz);
    let diff = want - car.angle;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    car.angle += Math.max(-1.6 * dt, Math.min(1.6 * dt, diff));
    entry.speed += (entry.cruise - entry.speed) * dt;
    car.x += Math.sin(car.angle) * entry.speed * dt;
    car.z += Math.cos(car.angle) * entry.speed * dt;
    car.syncMesh();
  }

  return {
    cars,
    courier,
    courierState,
    update(dt, playerCar) {
      for (const entry of cars) {
        // Slow down if the player's car is right ahead.
        let slow = false;
        if (playerCar) {
          const d = Math.hypot(entry.car.x - playerCar.x, entry.car.z - playerCar.z);
          if (d < 9) slow = true;
        }
        entry.cruise = slow ? 2 : entry.cruise;
        driveLoop(entry, dt);
        if (!slow) entry.cruise = Math.max(entry.cruise, 9);
      }
      driveLoop(courierState, dt);
    },
    /** Teleport the courier onto a loop near the player for the tail mission. */
    placeCourierNear(x, z) {
      courierState.car.x = x;
      courierState.car.z = z;
      courierState.side = 0;
      courierState.loop = { x, z, dir: 1, half: 56 };
    },
  };
}
