// The wanted system and Shore PD. Stars rise on crime (stealing a car, hitting
// a pedestrian, shooting, ramming police) and fade after a quiet spell. While
// wanted, black-and-white police cars spawn at the city edge, chase the player,
// ram their car, and bust them on foot at close range. Lose them by breaking
// line of sight and staying clean — or reach a safehouse.
import { WANTED } from './config.js';
import { createCar } from './vehicles.js';

export function createPolice(scene, random) {
  const cars = [];
  let stars = 0;
  let quietTimer = 0;
  let sirenTimer = 0;
  let spawnTimer = 0;
  let clock = 0;
  let lastRam = -10;

  function wantedCount() {
    return Math.min(WANTED.maxStars, stars);
  }

  function spawnOne(x, z) {
    // Spawn on a road near the player, offset toward a random edge.
    const angle = Math.random() * Math.PI * 2;
    const sx = x + Math.sin(angle) * 55;
    const sz = z + Math.cos(angle) * 55;
    const car = createCar(scene, sx, sz, 0, 0x1c2733, true);
    car.driver = 'police';
    car.parked = false;
    car.speed = 0;
    cars.push({ car, stuck: 0 });
    return car;
  }

  return {
    get stars() { return stars; },
    setStars(n) {
      stars = Math.max(0, Math.min(WANTED.maxStars, n));
      quietTimer = 0;
    },
    addCrime(amount = 1) {
      const before = stars;
      stars = Math.min(WANTED.maxStars, stars + amount);
      quietTimer = 0;
      return stars > before;
    },
    cars,
    /** Spawn/maintain the pursuit fleet for the current wanted level. */
    update(dt, px, pz, playerInCar, onBusted, audio) {
      if (stars === 0) {
        // Despawn the fleet once the heat is off.
        for (const entry of cars) entry.car.remove();
        cars.length = 0;
        return;
      }
      quietTimer += dt;
      clock += dt;
      if (quietTimer > WANTED.decaySeconds) {
        stars = Math.max(0, stars - 1);
        quietTimer = 0;
      }
      const wanted = WANTED.policePerStar * wantedCount();
      spawnTimer -= dt;
      if (cars.length < wanted && spawnTimer <= 0) {
        spawnOne(px, pz);
        spawnTimer = 1.2;
      }
      sirenTimer -= dt;
      if (sirenTimer <= 0) {
        sirenTimer = 2.4;
        if (audio) audio.siren();
      }
      for (const entry of cars) {
        const car = entry.car;
        const dx = px - car.x;
        const dz = pz - car.z;
        const dist = Math.hypot(dx, dz);
        if (dist < 1.2) continue;
        const want = Math.atan2(dx, dz);
        let diff = want - car.angle;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        car.angle += Math.max(-2.4 * dt, Math.min(2.4 * dt, diff));
        // The hotter the chase, the faster the pursuit cars push.
        const targetSpeed = dist > 30 ? 34 : 26;
        car.speed += (targetSpeed - car.speed) * dt * 0.8;
        car.x += Math.sin(car.angle) * car.speed * dt;
        car.z += Math.cos(car.angle) * car.speed * dt;
        car.syncMesh();
        // Flashing light bar: red and blue alternate, never both bright at once.
        const redOn = Math.floor(performance.now() / 260) % 2 === 0;
        if (car.mesh.userData.lightR) car.mesh.userData.lightR.material.color.setHex(redOn ? 0xff2222 : 0x551111);
        if (car.mesh.userData.lightB) car.mesh.userData.lightB.material.color.setHex(redOn ? 0x111155 : 0x2244ff);
        // Busted: police reach the player on foot at close range.
        if (!playerInCar && dist < WANTED.bustDistance && onBusted) onBusted();
      }
    },
    /** Ram damage when a police car touches the player's car. Returns true on a hit. */
    ramCheck(playerCar) {
      if (!playerCar) return false;
      // One ram per second at most: without a cooldown a trailing police car
      // would shred the player's car in a single second of contact.
      if (clock - lastRam < 1) return false;
      for (const entry of cars) {
        const d = Math.hypot(entry.car.x - playerCar.x, entry.car.z - playerCar.z);
        if (d < 3.4 && Math.abs(entry.car.speed) > 5) {
          // Shove the player's car and slow the police car, like a PIT nudge.
          playerCar.x += Math.sin(entry.car.angle) * 0.8;
          playerCar.z += Math.cos(entry.car.angle) * 0.8;
          entry.car.speed *= 0.5;
          lastRam = clock;
          return true;
        }
      }
      return false;
    },
    clear() {
      for (const entry of cars) entry.car.remove();
      cars.length = 0;
      stars = 0;
    },
  };
}
