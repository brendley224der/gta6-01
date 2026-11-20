// Vice Shores — the player on foot: a simple third-person character with
// walk/run movement, camera-relative steering, and a follow camera.

import * as THREE from 'three';
import { PLAYER, clamp } from './config.js';

export function createPlayer(scene, startX, startZ) {
  const group = new THREE.Group();
  group.name = 'player';

  const body = new THREE.Mesh(
    new THREE.BoxGeometry(0.9, 1.1, 0.5),
    new THREE.MeshLambertMaterial({ color: 0x2e86de }),
  );
  body.position.y = 1.05;
  group.add(body);
  const head = new THREE.Mesh(
    new THREE.SphereGeometry(0.34, 12, 10),
    new THREE.MeshLambertMaterial({ color: 0xe8b98a }),
  );
  head.position.y = 1.85;
  group.add(head);
  const legL = new THREE.Mesh(
    new THREE.BoxGeometry(0.32, 0.7, 0.32),
    new THREE.MeshLambertMaterial({ color: 0x222831 }),
  );
  legL.position.set(-0.22, 0.35, 0);
  group.add(legL);
  const legR = legL.clone();
  legR.position.x = 0.22;
  group.add(legR);
  // A cap so the player reads at distance.
  const cap = new THREE.Mesh(
    new THREE.CylinderGeometry(0.36, 0.36, 0.14, 12),
    new THREE.MeshLambertMaterial({ color: 0xe84a4a }),
  );
  cap.position.y = 2.1;
  group.add(cap);

  group.position.set(startX, 0, startZ);
  scene.add(group);

  const state = {
    group,
    heading: 0, // facing angle, radians; 0 = facing -z
    speed: 0,
    moving: false,
    camYaw: 0, // camera orbit yaw, follows heading smoothly
    walkPhase: 0,
    legL,
    legR,
  };
  return state;
}

// Move on foot. `keys` is the shared input state; cameraYaw lets movement
// be relative to where the camera looks.
export function updatePlayerOnFoot(state, keys, dt, camYaw) {
  let ix = 0;
  let iz = 0;
  if (keys.up) iz -= 1;
  if (keys.down) iz += 1;
  if (keys.left) ix -= 1;
  if (keys.right) ix += 1;
  const mag = Math.hypot(ix, iz);
  state.moving = mag > 0;
  if (!state.moving) {
    state.speed = 0;
    state.legL.rotation.x = 0;
    state.legR.rotation.x = 0;
    return;
  }
  ix /= mag;
  iz /= mag;
  // Rotate input by camera yaw so W always walks away from the camera.
  const sin = Math.sin(camYaw);
  const cos = Math.cos(camYaw);
  const wx = ix * cos - iz * sin;
  const wz = ix * sin + iz * cos;
  const targetSpeed = keys.run ? PLAYER.runSpeed : PLAYER.walkSpeed;
  state.speed = targetSpeed;
  state.group.position.x = clamp(state.group.position.x + wx * targetSpeed * dt, -188, 188);
  state.group.position.z = clamp(state.group.position.z + wz * targetSpeed * dt, -188, 222);
  state.heading = Math.atan2(wx, wz);
  state.group.rotation.y = state.heading;
  // Simple walk-cycle leg swing.
  state.walkPhase += dt * targetSpeed * 1.4;
  const swing = Math.sin(state.walkPhase) * 0.55;
  state.legL.rotation.x = swing;
  state.legR.rotation.x = -swing;
}

// Smooth third-person camera behind the player (or behind a car).
// `target` is a THREE.Object3D, `heading` its facing angle, `dist`/`height`
// the chase offset. Returns the camera yaw used this frame.
export function updateCamera(camera, target, heading, dt, dist, height, camState) {
  const desiredYaw = heading + Math.PI; // camera sits behind the facing dir
  let dy = desiredYaw - camState.yaw;
  while (dy > Math.PI) dy -= Math.PI * 2;
  while (dy < -Math.PI) dy += Math.PI * 2;
  camState.yaw += dy * Math.min(1, dt * 4);
  const px = target.position.x;
  const pz = target.position.z;
  const cx = px + Math.sin(camState.yaw) * dist;
  const cz = pz + Math.cos(camState.yaw) * dist;
  camera.position.x += (cx - camera.position.x) * Math.min(1, dt * 6);
  camera.position.y += (height - camera.position.y) * Math.min(1, dt * 6);
  camera.position.z += (cz - camera.position.z) * Math.min(1, dt * 6);
  camera.lookAt(px, 1.6, pz);
  return camState.yaw;
}

export function makeCamState() {
  return { yaw: Math.PI };
}
