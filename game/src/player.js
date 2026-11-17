// Mara Voss on foot: a simple articulated figure (body, head, arms, legs) that
// walks, runs, punches and shoots. Movement is camera-relative; the figure turns
// to face its travel direction and its limbs swing with the stride.
import { PLAYER } from './config.js';

const THREE = window.THREE;

const SHIRTS = [0xe84a5f, 0x2f9e8f, 0xf2a541, 0x7a5fd0, 0x3a7bd5];

export function createPlayer(scene, random) {
  const group = new THREE.Group();
  const shirt = SHIRTS[Math.floor(random() * SHIRTS.length)];
  const skin = new THREE.MeshLambertMaterial({ color: 0xe8b98a });
  const shirtMat = new THREE.MeshLambertMaterial({ color: shirt });
  const pantsMat = new THREE.MeshLambertMaterial({ color: 0x2b3442 });

  const body = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.85, 0.4), shirtMat);
  body.position.y = 1.15;
  group.add(body);
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.42, 0.42), skin);
  head.position.y = 1.85;
  group.add(head);
  const hair = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.16, 0.46), new THREE.MeshLambertMaterial({ color: 0x1a1210 }));
  hair.position.y = 2.1;
  group.add(hair);
  const armL = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.75, 0.18), shirtMat);
  armL.position.set(-0.48, 1.15, 0);
  group.add(armL);
  const armR = armL.clone();
  armR.position.x = 0.48;
  group.add(armR);
  const legL = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.8, 0.22), pantsMat);
  legL.position.set(-0.18, 0.4, 0);
  group.add(legL);
  const legR = legL.clone();
  legR.position.x = 0.18;
  group.add(legR);
  // A little pistol in the right hand, visible when shooting.
  const gun = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.12, 0.4), new THREE.MeshLambertMaterial({ color: 0x1a1a1a }));
  gun.position.set(0.48, 0.85, 0.25);
  group.add(gun);
  scene.add(group);

  const state = {
    group, armL, armR, legL, legR,
    x: 0, z: 6, angle: 0, // facing +z at spawn, on the road by the start intersection
    health: PLAYER.maxHealth,
    speed: 0,
    walkPhase: 0,
    punchTimer: 0,
    invulnerable: 0,
    dead: false,
  };

  return {
    state,
    reset(x, z) {
      state.x = x;
      state.z = z;
      state.angle = 0;
      state.health = PLAYER.maxHealth;
      state.dead = false;
      state.invulnerable = 0;
      state.speed = 0;
    },
    /** Move on foot. `forward`/`strafe` are -1..1, `camAngle` is the camera yaw. */
    move(dt, forward, strafe, run, camAngle, collide) {
      if (state.dead) return;
      const speed = run ? PLAYER.runSpeed : PLAYER.walkSpeed;
      const sin = Math.sin(camAngle);
      const cos = Math.cos(camAngle);
      let mx = (-sin * forward + cos * strafe);
      let mz = (-cos * forward - sin * strafe);
      const len = Math.hypot(mx, mz);
      if (len > 0.01) {
        mx /= len;
        mz /= len;
        const targetAngle = Math.atan2(mx, mz);
        let diff = targetAngle - state.angle;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        state.angle += diff * Math.min(1, dt * 12);
        state.speed = speed;
        state.walkPhase += dt * speed * 1.4;
        let nx = state.x + mx * speed * dt;
        let nz = state.z + mz * speed * dt;
        if (collide) ({ x: nx, z: nz } = collide(nx, nz, PLAYER.radius));
        state.x = nx;
        state.z = nz;
      } else {
        state.speed = 0;
      }
      if (state.invulnerable > 0) state.invulnerable -= dt;
      if (state.punchTimer > 0) state.punchTimer -= dt;
      const swing = state.speed > 0 ? Math.sin(state.walkPhase) * 0.7 : 0;
      state.legL.rotation.x = swing;
      state.legR.rotation.x = -swing;
      state.armL.rotation.x = -swing * 0.8;
      state.armR.rotation.x = state.punchTimer > 0 ? -1.4 : swing * 0.8;
      group.position.set(state.x, 0, state.z);
      group.rotation.y = state.angle;
      // Blink while invulnerable after a hit.
      group.visible = !(state.invulnerable > 0 && Math.floor(state.invulnerable * 10) % 2 === 0);
    },
    punch() {
      if (state.dead || state.punchTimer > 0) return false;
      state.punchTimer = 0.35;
      return true;
    },
    damage(amount) {
      if (state.invulnerable > 0 || state.dead) return false;
      state.health = Math.max(0, state.health - amount);
      state.invulnerable = 0.8;
      if (state.health <= 0) state.dead = true;
      return true;
    },
    heal(amount) {
      state.health = Math.min(PLAYER.maxHealth, state.health + amount);
    },
  };
}
