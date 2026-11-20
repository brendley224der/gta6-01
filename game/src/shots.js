// Vice Shores — screenshot staging: ?shot=<name>&seed=1 puts the game in a
// fixed, good-looking state for each of the four screenshots, then sets
// window.__shotReady = true once the scene has rendered.

import { SHOT_NAMES } from './config.js';
import { addWanted, syncPolice } from './police.js';
import { startMission } from './missions.js';

export function parseShotParams() {
  const q = new URLSearchParams(window.location.search);
  const shot = q.get('shot');
  const seed = Number.parseInt(q.get('seed') || '1', 10) || 1;
  return { shot: SHOT_NAMES.includes(shot) ? shot : null, seed };
}

// Stage one shot. `game` is the live game object from main.js; the helpers
// it needs (enterCar, setWanted, teleport) are passed in as `actions`.
export function stageShot(game, actions) {
  const { shot } = game.shotParams;
  if (!shot) return false;
  if (shot === 'start') {
    // Start screen stays up; the camera orbits the city behind it.
    game.shotOrbit = true;
    return true;
  }
  // Every other shot plays the game: hide the start screen and begin.
  actions.beginPlay();
  // Snap the chase camera behind its subject now: under SwiftShader the
  // smoothed camera starts 50+ units away and converges too slowly for a
  // good still, so staging places it exactly where the loop will keep it.
  const snapCam = (tx, tz, heading, dist, height) => {
    game.camState.yaw = heading + Math.PI;
    game.camera.position.set(tx + Math.sin(game.camState.yaw) * dist, height, tz + Math.cos(game.camState.yaw) * dist);
    game.camera.lookAt(tx, 1.6, tz);
  };
  if (shot === 'drive') {
    const car = actions.nearestParkedCar();
    if (car) actions.enterCar(car, { silent: true });
    // South street (z=120): low-rise blocks on both sides and the beach
    // beyond, so the road and the car read instead of a tower face.
    game.player.group.position.set(0, 0, 120);
    if (game.currentCar) {
      game.currentCar.mesh.position.set(0, 0, 120);
      game.currentCar.heading = Math.PI / 2;
      game.currentCar.mesh.rotation.y = Math.PI / 2;
      game.currentCar.speed = 16;
      snapCam(0, 120, Math.PI / 2, 12, 6);
    }
  } else if (shot === 'chase') {
    const car = actions.nearestParkedCar();
    if (car) actions.enterCar(car, { silent: true });
    if (game.currentCar) {
      game.currentCar.mesh.position.set(-60, 0, 120);
      game.currentCar.heading = Math.PI / 2;
      game.currentCar.mesh.rotation.y = Math.PI / 2;
      game.currentCar.speed = 18;
      snapCam(-60, 120, Math.PI / 2, 12, 6);
    }
    addWanted(game.wanted, 2, 'shot staging');
    syncPolice(game.scene, game.wanted, -60, 120, game.policeRng);
    // Police flanking ahead of the player so the pursuit reads in frame.
    game.wanted.police.forEach((p, i) => {
      p.mesh.position.set(-48, 0, i === 0 ? 108 : 132);
      p.heading = -Math.PI / 2;
      p.speed = 20;
    });
  } else if (shot === 'mission') {
    startMission(game.missions);
    // Stand the player on the x=-120 street just short of the pickup
    // marker, facing it, so beacon, objective line, and player share a frame.
    game.player.group.position.set(-120, 0, 76);
    game.player.heading = 0;
    game.player.group.rotation.y = 0;
    snapCam(-120, 76, 0, 8, 4.2);
  }
  return true;
}
