// Vice Shores — entry point: builds the scene, owns the game state, runs
// the loop, and wires input, cars, police, missions, HUD, and minimap.

import * as THREE from 'three';
import { CITY, STREETS, makeRng, clamp, dist2d } from './config.js';
import { keys, initInput, consumeInteract, consumeMissionKey } from './input.js';
import { buildWorld, randomStreetPoint } from './world.js';
import { createPlayer, updatePlayerOnFoot, updateCamera, makeCamState } from './player.js';
import { spawnVehicles, driveCar, updateTraffic, nearestCar, carSpeedKmh } from './vehicles.js';
import { createWanted, addWanted, syncPolice, updatePolice, updateWantedDecay, makePoliceRng } from './police.js';
import { createMissionState, startMission, updateMissions, currentObjective } from './missions.js';
import { buildHud, renderHud, showStartScreen, hideStartScreen } from './hud.js';
import { drawMinimap } from './minimap.js';
import { parseShotParams, stageShot } from './shots.js';

const shotParams = parseShotParams();
const rng = makeRng(shotParams.seed);

// --- renderer / scene ----------------------------------------------------
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
// Pixel ratio 1: SwiftShader software rendering in headless tests runs at
// ~7 fps with a higher ratio; the scene stays crisp at 1280x720 without it.
renderer.setPixelRatio(1);
document.getElementById('game-container').appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87b5d6);
scene.fog = new THREE.Fog(0x87b5d6, 180, 420);
const camera = new THREE.PerspectiveCamera(62, window.innerWidth / window.innerHeight, 0.1, 800);
camera.position.set(0, 40, 90);

const hemi = new THREE.HemisphereLight(0xcfe8ff, 0x3a5a3a, 1.25);
scene.add(hemi);
// Ambient fill so building faces away from the sun never read as flat black.
scene.add(new THREE.AmbientLight(0xffffff, 0.35));
const sun = new THREE.DirectionalLight(0xfff2d0, 1.4);
sun.position.set(120, 180, 60);
scene.add(sun);

buildWorld(scene, shotParams.seed);
const cars = spawnVehicles(scene, shotParams.seed);
const player = createPlayer(scene, 0, 20);
const wanted = createWanted();
const policeRng = makePoliceRng(shotParams.seed);
const missions = createMissionState(scene);
const camState = makeCamState();
const hud = buildHud();
const minimapCanvas = document.getElementById('minimap');

// --- pedestrians ----------------------------------------------------------
const pedestrians = [];
function spawnPedestrians() {
  const prng = makeRng(shotParams.seed + 101);
  for (let i = 0; i < 16; i++) {
    const p = randomStreetPoint(prng);
    const g = new THREE.Group();
    const shirt = new THREE.MeshLambertMaterial({ color: [0xe74c3c, 0x3498db, 0x2ecc71, 0xf1c40f, 0x9b59b6][i % 5] });
    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.9, 0.4), shirt);
    torso.position.y = 1.0;
    g.add(torso);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.3, 10, 8), new THREE.MeshLambertMaterial({ color: 0xe8b98a }));
    head.position.y = 1.7;
    g.add(head);
    const legs = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.7, 0.35), new THREE.MeshLambertMaterial({ color: 0x2c3e50 }));
    legs.position.y = 0.35;
    g.add(legs);
    g.position.set(p.x + (prng() > 0.5 ? 7 : -7), 0, p.z);
    scene.add(g);
    pedestrians.push({
      group: g,
      heading: prng() * Math.PI * 2,
      speed: 1.2 + prng() * 1.2,
      down: false,
      downTimer: 0,
      retarget: 0,
      prng,
    });
  }
}
spawnPedestrians();

function updatePedestrians(dt) {
  for (const p of pedestrians) {
    if (p.down) {
      p.downTimer -= dt;
      if (p.downTimer <= 0) {
        p.down = false;
        p.group.rotation.x = 0;
        p.group.position.y = 0;
      }
      continue;
    }
    p.retarget -= dt;
    if (p.retarget <= 0) {
      p.retarget = 3 + p.prng() * 4;
      p.heading += (p.prng() - 0.5) * 1.6;
    }
    p.group.position.x = clamp(p.group.position.x + Math.sin(p.heading) * p.speed * dt, -188, 188);
    p.group.position.z = clamp(p.group.position.z + Math.cos(p.heading) * p.speed * dt, -188, 222);
    p.group.rotation.y = p.heading;
  }
}

// --- game state ------------------------------------------------------------
const game = {
  scene,
  camera,
  player,
  wanted,
  missions,
  policeRng,
  camState,
  shotParams,
  shotOrbit: false,
  started: false,
  money: 250,
  currentCar: null,
  currentCarKmh: 0,
  objectiveText: 'Press M to start the first mission',
  bannerText: '',
  promptText: '',
  hasVip: false,
  framesRendered: 0,
  speedingCooldown: 0,
  playTime: 0,
};

function playerPos() {
  // Return the live position object (not a copy) so police rams can push it.
  if (game.currentCar) return game.currentCar.mesh.position;
  return player.group.position;
}

function playerHeading() {
  return game.currentCar ? game.currentCar.heading : player.heading;
}

function enterCar(car, opts = {}) {
  game.currentCar = car;
  player.group.visible = false;
  if (car.kind === 'parked' && !car.stolen && !opts.silent) {
    car.stolen = true;
    addWanted(wanted, 1, 'car stolen');
    game.bannerText = 'Car stolen — wanted level up!';
    game.bannerUntil = performance.now() + 3500;
  } else if (car.kind === 'parked') {
    car.stolen = true;
  }
  if (car.kind === 'taxi') {
    game.bannerText = 'Taxi hailed — no charge, drive safe.';
    game.bannerUntil = performance.now() + 3500;
  }
}

function exitCar() {
  const car = game.currentCar;
  if (!car) return;
  game.currentCar = null;
  player.group.position.set(
    clamp(car.mesh.position.x + Math.cos(car.heading) * 2.5, -188, 188),
    0,
    clamp(car.mesh.position.z - Math.sin(car.heading) * 2.5, -188, 222),
  );
  player.group.visible = true;
  player.heading = car.heading;
  player.group.rotation.y = car.heading;
}

function beginPlay() {
  if (game.started) return;
  game.started = true;
  hideStartScreen(hud);
  startMission(missions);
}

showStartScreen(hud, beginPlay);
initInput();

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// --- per-frame update ------------------------------------------------------
const clock = new THREE.Clock();
let shotStaged = false;
let shotReadyFrames = 0;

function update(dt) {
  game.playTime += dt;
  if (game.speedingCooldown > 0) game.speedingCooldown -= dt;

  // Start-screen orbit camera until Play (or a shot that plays the game).
  if (!game.started) {
    if (game.shotOrbit) {
      const t = performance.now() / 1000;
      camera.position.set(Math.sin(t * 0.08) * 120, 55, Math.cos(t * 0.08) * 120);
      camera.lookAt(0, 0, 20);
    }
    return;
  }

  // Edge-triggered keys.
  if (consumeInteract()) {
    if (game.currentCar) {
      exitCar();
    } else {
      const pos = playerPos();
      const near = nearestCar(cars, pos.x, pos.z, 4.5, ['parked', 'taxi']);
      if (near) enterCar(near);
    }
  }
  if (consumeMissionKey() && !missions.active && missions.index < 3) {
    startMission(missions);
  }

  // Movement: driving or on foot.
  if (game.currentCar) {
    const speed = driveCar(game.currentCar, keys, dt);
    game.currentCarKmh = carSpeedKmh(game.currentCar);
    // Speeding past police is a crime.
    if (Math.abs(speed) > 25 && game.speedingCooldown <= 0) {
      const nearPolice = wanted.police.some((p) => dist2d(p.mesh.position.x, p.mesh.position.z, game.currentCar.mesh.position.x, game.currentCar.mesh.position.z) < 30);
      if (nearPolice) {
        addWanted(wanted, 1, 'speeding near police');
        game.speedingCooldown = 10;
      }
    }
    // Hitting a pedestrian with the car is a crime.
    for (const p of pedestrians) {
      if (p.down) continue;
      const d = dist2d(game.currentCar.mesh.position.x, game.currentCar.mesh.position.z, p.group.position.x, p.group.position.z);
      if (d < 2.6 && Math.abs(speed) > 3) {
        p.down = true;
        p.downTimer = 6;
        p.group.rotation.x = Math.PI / 2;
        p.group.position.y = 0.4;
        addWanted(wanted, 1, 'hit a pedestrian');
        game.bannerText = 'You hit a pedestrian — wanted level up!';
        game.bannerUntil = performance.now() + 3500;
      }
    }
  } else {
    updatePlayerOnFoot(player, keys, dt, camState.yaw);
    game.currentCarKmh = 0;
  }

  // Traffic + pedestrians keep the city alive.
  for (const c of cars) updateTraffic(c, dt);
  updatePedestrians(dt);

  // Wanted system: sync police count, pursue, decay.
  const pos = playerPos();
  syncPolice(scene, wanted, pos.x, pos.z, policeRng);
  const seen = updatePolice(wanted, pos, game.currentCar, dt);
  updateWantedDecay(wanted, seen, dt);

  // Missions.
  const ctx = {
    x: pos.x,
    z: pos.z,
    wanted: wanted.stars,
    inCar: !!game.currentCar,
    inTaxi: !!game.currentCar && game.currentCar.kind === 'taxi',
    hasVip: game.hasVip,
    game,
  };
  updateMissions(missions, ctx, dt);
  game.hasVip = ctx.hasVip;
  if (missions.justCompleted) {
    game.bannerText = missions.banner ? missions.banner.text : game.bannerText;
    missions.justCompleted = null;
  }
  if (missions.banner && performance.now() > missions.banner.until) {
    missions.banner = null;
    game.bannerText = '';
    game.bannerUntil = 0;
  } else if (game.bannerUntil && performance.now() > game.bannerUntil && !missions.banner) {
    game.bannerText = '';
    game.bannerUntil = 0;
  }
  game.objectiveText = currentObjective(missions);

  // Interact prompt.
  if (!game.currentCar) {
    const near = nearestCar(cars, pos.x, pos.z, 4.5, ['parked', 'taxi']);
    game.promptText = near ? (near.kind === 'taxi' ? 'Press E to hail the taxi' : 'Press E to get in the car') : '';
  } else {
    game.promptText = 'Press E to exit the car';
  }

  // Camera follows the player or the car.
  const target = game.currentCar ? game.currentCar.mesh : player.group;
  const dist = game.currentCar ? 12 : 8;
  const height = game.currentCar ? 6 : 4.2;
  updateCamera(camera, target, playerHeading(), dt, dist, height, camState);

  // Minimap.
  drawMinimap(minimapCanvas, {
    player: { x: pos.x, z: pos.z, heading: playerHeading() },
    marker: missions.marker.visible ? { x: missions.marker.position.x, z: missions.marker.position.z } : null,
    police: wanted.police.map((p) => ({ x: p.mesh.position.x, z: p.mesh.position.z })),
    taxis: cars.filter((c) => c.kind === 'taxi').map((c) => ({ x: c.mesh.position.x, z: c.mesh.position.z })),
  });

  renderHud(hud, game);
}

function animate() {
  requestAnimationFrame(animate);
  const dt = Math.min(clock.getDelta(), 0.05);
  if (!shotStaged) {
    shotStaged = true;
    stageShot(game, {
      beginPlay,
      nearestParkedCar: () => nearestCar(cars, player.group.position.x, player.group.position.z, 500, ['parked']),
      enterCar,
    });
  }
  update(dt);
  renderer.render(scene, camera);
  game.framesRendered += 1;
  if (shotParams.shot && game.framesRendered > 5) {
    shotReadyFrames += 1;
    if (shotReadyFrames === 30 && !window.__shotReady) {
      window.__shotReady = true;
    }
  }
}
animate();

// Debug handle for the headless test harness (read-only state, no cheats).
window.__game = game;
window.__shotReady = false;
