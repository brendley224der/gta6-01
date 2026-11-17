// Combat on foot: a hitscan pistol shot and a close-range punch. Shooting draws
// a bright tracer line that fades, kicks a few particles, and can damage police
// cars, traffic cars and pedestrians — every shot is a crime, so the wanted level
// climbs. Punching is quieter: it only counts when it lands on a pedestrian.
import { PLAYER } from './config.js';

const THREE = window.THREE;

export function createCombat(scene) {
  const tracers = [];
  const tracerMat = new THREE.MeshBasicMaterial({ color: 0xffe27a });

  function addTracer(from, to) {
    const dir = new THREE.Vector3().subVectors(to, from);
    const len = dir.length();
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, len), tracerMat);
    mesh.position.copy(from).addScaledVector(dir, 0.5);
    mesh.lookAt(to);
    scene.add(mesh);
    tracers.push({ mesh, life: 0.12 });
  }

  return {
    /** Fire from the player's position toward the camera aim. Returns what was hit. */
    shoot(player, camAngle, police, traffic, pedestrians, addWanted) {
      const range = 60;
      const dirX = Math.sin(player.angle);
      const dirZ = Math.cos(player.angle);
      const from = new THREE.Vector3(player.x, 1.5, player.z);
      let bestD = range;
      let hit = null;
      let hitPoint = new THREE.Vector3(player.x + dirX * range, 1.5, player.z + dirZ * range);
      // Police cars first, then traffic, then pedestrians — nearest along the shot line.
      const testCar = (car) => {
        const rx = car.x - player.x;
        const rz = car.z - player.z;
        const along = rx * dirX + rz * dirZ;
        if (along < 0 || along > bestD) return;
        const perp = Math.abs(rx * dirZ - rz * dirX);
        if (perp < 2.2) {
          bestD = along;
          hit = { kind: 'car', car };
          hitPoint.set(player.x + dirX * along, 1.2, player.z + dirZ * along);
        }
      };
      for (const entry of police.cars) testCar(entry.car);
      for (const entry of traffic.cars) testCar(entry.car);
      testCar(traffic.courier);
      for (const w of pedestrians.walkers) {
        if (w.down) continue;
        const rx = w.x - player.x;
        const rz = w.z - player.z;
        const along = rx * dirX + rz * dirZ;
        if (along < 0 || along > bestD) continue;
        const perp = Math.abs(rx * dirZ - rz * dirX);
        if (perp < 1.0) {
          bestD = along;
          hit = { kind: 'ped', ped: w };
          hitPoint.set(player.x + dirX * along, 1.2, player.z + dirZ * along);
        }
      }
      addTracer(from, hitPoint);
      if (hit) {
        if (hit.kind === 'car') {
          const destroyed = hit.car.damage(34);
          if (destroyed && hit.car.driver === 'police') {
            // Wrecked police car: remove it from the pursuit fleet.
            const idx = police.cars.findIndex((e) => e.car === hit.car);
            if (idx >= 0) {
              police.cars[idx].car.remove();
              police.cars.splice(idx, 1);
            }
          }
        } else if (hit.kind === 'ped') {
          hit.ped.down = true;
          hit.ped.downTimer = 6;
          hit.ped.group.rotation.x = Math.PI / 2;
          hit.ped.group.position.y = 0.3;
        }
      }
      if (addWanted) addWanted(1);
      return hit;
    },
    /** Punch the nearest pedestrian in front of the player. Returns true on a hit. */
    punch(player, pedestrians) {
      const fx = Math.sin(player.angle);
      const fz = Math.cos(player.angle);
      for (const w of pedestrians.walkers) {
        if (w.down) continue;
        const dx = w.x - player.x;
        const dz = w.z - player.z;
        const d = Math.hypot(dx, dz);
        if (d > PLAYER.punchRange) continue;
        if ((dx * fx + dz * fz) / (d || 1) < 0.3) continue;
        w.down = true;
        w.downTimer = 5;
        w.group.rotation.x = Math.PI / 2;
        w.group.position.y = 0.3;
        return true;
      }
      return false;
    },
    update(dt) {
      for (let i = tracers.length - 1; i >= 0; i -= 1) {
        tracers[i].life -= dt;
        if (tracers[i].life <= 0) {
          scene.remove(tracers[i].mesh);
          tracers.splice(i, 1);
        }
      }
    },
  };
}
