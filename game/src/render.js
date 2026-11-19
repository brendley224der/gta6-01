// Rendering only: the three.js renderer, the chase camera, sunset lighting,
// and the juice — particles (skid smoke, impacts, pickup sparkles), screen
// shake, a speed-sensitive field of view, and a slowly drifting sun that warms
// the city toward evening.
import { CAMERA } from './config.js';

const THREE = window.THREE;

export function createRender(canvas, scene) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  const camera = new THREE.PerspectiveCamera(CAMERA.fov, window.innerWidth / window.innerHeight, 0.1, 900);

  const particles = [];
  const particleGeo = new THREE.BoxGeometry(0.3, 0.3, 0.3);
  let shake = 0;
  let shakeTime = 0;
  let camAngle = 0.6;
  let camPitch = 0.42;
  let time = 0;
  let vista = false; // wide establishing shot for the title / game-over screens

  function resize() {
    renderer.setSize(window.innerWidth, window.innerHeight);
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
  }
  window.addEventListener('resize', resize);

  function spawnParticles(x, y, z, color, count, spread = 3) {
    for (let i = 0; i < count; i += 1) {
      const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.9 });
      const mesh = new THREE.Mesh(particleGeo, mat);
      mesh.position.set(x, y, z);
      scene.add(mesh);
      particles.push({
        mesh,
        vx: (Math.random() - 0.5) * spread,
        vy: Math.random() * 3 + 1,
        vz: (Math.random() - 0.5) * spread,
        life: 0.6 + Math.random() * 0.5,
      });
    }
  }

  return {
    camera,
    get camAngle() { return camAngle; },
    set camAngle(v) { camAngle = v; },
    get camPitch() { return camPitch; },
    set camPitch(v) { camPitch = Math.max(0.15, Math.min(1.1, v)); },
    get vista() { return vista; },
    set vista(v) { vista = !!v; },
    addShake(amount) {
      shake = Math.min(1.2, shake + amount);
      shakeTime = 0.4;
    },
    burst(x, y, z, color, count, spread) { spawnParticles(x, y, z, color, count, spread); },
    skidPuff(x, z) { spawnParticles(x, 0.3, z, 0xbbbbbb, 2, 1.2); },
    /** Follow the player (or their car) with a smoothed chase camera. */
    follow(dt, fx, fz, heading, inCar, drag) {
      camAngle -= drag.x * 0.005;
      camPitch = Math.max(0.15, Math.min(1.1, camPitch + drag.y * 0.003));
      // When driving, the camera gently swings behind the car's heading.
      let want = camAngle;
      if (inCar) {
        let diff = heading - camAngle;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        want = camAngle + diff * Math.min(1, dt * 0.9);
      }
      camAngle = want;
      // Speed stretches the field of view a little, so fast driving feels fast.
      const speed01 = inCar ? Math.min(1, Math.abs(drag.speed || 0) / 42) : 0;
      const wantFov = CAMERA.fov + speed01 * CAMERA.driveKick;
      if (Math.abs(camera.fov - wantFov) > 0.05) {
        camera.fov = wantFov;
        camera.updateProjectionMatrix();
      }
      const dist = vista ? 58 : (inCar ? 13 : 10);
      const height = vista ? 30 : (inCar ? 5.2 : 4.4);
      const cx = fx - Math.sin(camAngle) * dist;
      const cz = fz - Math.cos(camAngle) * dist;
      camera.position.set(cx, height, cz);
      camera.lookAt(fx, 1.6, fz);
      if (shakeTime > 0) {
        shakeTime -= dt;
        const s = shake * shakeTime * 2.2;
        camera.position.x += (Math.random() - 0.5) * s;
        camera.position.y += (Math.random() - 0.5) * s;
        if (shakeTime <= 0) shake = 0;
      }
    },
    draw(dt, world) {
      time += dt;
      // Sunset drift: the sun sinks slowly and the sky warms.
      if (world && world.sun) {
        const t = (time * 0.004) % 1;
        world.sun.position.set(-80 + Math.sin(t * 6) * 30, 120 - t * 40, -60);
      }
      if (world && world.ocean) {
        world.ocean.position.y = 0.05 + Math.sin(time * 0.8) * 0.08;
      }
      for (let i = particles.length - 1; i >= 0; i -= 1) {
        const p = particles[i];
        p.life -= dt;
        p.mesh.position.x += p.vx * dt;
        p.mesh.position.y += p.vy * dt;
        p.mesh.position.z += p.vz * dt;
        p.mesh.material.opacity = Math.max(0, p.life);
        if (p.life <= 0) {
          scene.remove(p.mesh);
          particles.splice(i, 1);
        }
      }
      renderer.render(scene, camera);
    },
  };
}
