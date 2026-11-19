// Vice Shores — boot and the one loop. Builds the whole game (world, player,
// cars, traffic, pedestrians, police, missions, combat, HUD, audio), moves it
// between four screens — title, play, paused, game over — and saves progress
// (money, mission, best score) to localStorage. Keyboard + mouse only, no network.
//
// ?seed=N fixes the city and traffic. ?shot=start|play|chase|end (with &seed=N)
// stages that scene instead of running the loop, paints it twice and sets
// window.__shotReady for a screenshot.
import { BEST_KEY, HINTS, PLAYER, SAVE_KEY } from './config.js';
import { createRandom } from './random.js';
import { createWorld } from './world.js';
import { createPlayer } from './player.js';
import { spawnParkedCar } from './vehicles.js';
import { createTraffic } from './traffic.js';
import { createPedestrians } from './pedestrians.js';
import { createPolice } from './police.js';
import { createMissions } from './missions.js';
import { createCombat } from './combat.js';
import { createHud } from './hud.js';
import { createRender } from './render.js';
import { createAudio } from './audio.js';
import { ACTION_CONFIRM, ACTION_ENTER, ACTION_MUTE, ACTION_PAUSE, ACTION_PUNCH, ACTION_SHOOT, createInput } from './input.js';
import { stageShot } from './shots.js';

const THREE = window.THREE;
const MAX_FRAME = 0.25;
/** The simulation's fixed step, in seconds: 60 updates a second whatever the display's rate. */
const STEP = 1 / 60;

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : Math.floor(Math.random() * 4294967296);
const random = createRandom(seed);

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const world = createWorld(random);
const player = createPlayer(world.scene, random);
const traffic = createTraffic(world.scene, random, 14);
const pedestrians = createPedestrians(world.scene, random, 24);
const police = createPolice(world.scene, random);
const missions = createMissions(world);
const combat = createCombat(world.scene);
const hud = createHud();
const render = createRender(canvas, world.scene);
const audio = createAudio();

const parkedCars = [];
for (let i = 0; i < 10; i += 1) {
  const spot = world.parking[Math.floor(random() * world.parking.length)];
  parkedCars.push(spawnParkedCar(world.scene, spot, random));
}

const G = {
  world, player, traffic, pedestrians, police, missions, combat, hud, render, audio, parkedCars,
  money: 0, best: 0, screen: 'title', playerCar: null, overReason: 'WASTED',
  elapsed: 0, hintIndex: 0, engineTimer: 0, skidTimer: 0,
  state: player.state,
};

function readSave() {
  try {
    const raw = window.localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch { return null; }
}

function saveGame() {
  try {
    window.localStorage.setItem(SAVE_KEY, JSON.stringify({
      money: G.money, missionIndex: missions.index, best: G.best,
    }));
    window.localStorage.setItem(BEST_KEY, String(G.best));
  } catch { /* storage can be off; progress then lasts this visit only */ }
}

const saved = readSave();
if (saved) {
  G.money = saved.money || 0;
  G.best = saved.best || 0;
  if (typeof saved.missionIndex === 'number') missions.setIndex(saved.missionIndex);
}
try {
  G.best = Math.max(G.best, Number.parseInt(window.localStorage.getItem(BEST_KEY) ?? '0', 10) || 0);
} catch { /* ignore */ }

function showScreen(name) {
  G.screen = name;
  for (const id of ['screen-title', 'screen-pause', 'screen-over']) {
    document.getElementById(id).style.display = 'none';
  }
  if (name === 'title') document.getElementById('screen-title').style.display = 'flex';
  if (name === 'paused') document.getElementById('screen-pause').style.display = 'flex';
  if (name === 'over') {
    document.getElementById('over-title').textContent = G.overReason;
    document.getElementById('over-stats').textContent = `Cash $${G.money.toLocaleString('en-US')} · Missions done ${missions.index} · Best $${G.best.toLocaleString('en-US')}`;
    document.getElementById('screen-over').style.display = 'flex';
  }
  const title = document.getElementById('title-best');
  if (title) title.textContent = G.best > 0 ? `Best cash: $${G.best.toLocaleString('en-US')} · Saved progress loaded` : 'A sun-soaked open-world crime game';
}

function announce(message) {
  status.textContent = message;
}

function resetWorld() {
  player.reset(0, 6);
  police.clear();
  G.playerCar = null;
  G.elapsed = 0;
  player.state.health = PLAYER.maxHealth;
  for (const car of parkedCars) {
    car.driver = null;
    car.parked = true;
    car.speed = 0;
    car.health = 100;
  }
}

function startGame() {
  resetWorld();
  audio.unlock();
  audio.click();
  showScreen('play');
  announce('Playing. Press Enter to start the next mission.');
}

function endGame(reason) {
  G.overReason = reason;
  if (G.money > G.best) G.best = G.money;
  saveGame();
  showScreen('over');
  announce(`${reason}. Cash $${G.money}. Best $${G.best}.`);
}

function nearestStealableCar() {
  let best = null;
  let bestD = 4;
  for (const car of parkedCars) {
    if (car.driver) continue;
    const d = Math.hypot(car.x - player.state.x, car.z - player.state.z);
    if (d < bestD) { bestD = d; best = car; }
  }
  if (!best) {
    for (const entry of traffic.cars) {
      if (Math.abs(entry.car.speed) > 1) continue;
      const d = Math.hypot(entry.car.x - player.state.x, entry.car.z - player.state.z);
      if (d < bestD) { bestD = d; best = entry.car; }
    }
  }
  return best;
}

function enterCar(car) {
  car.driver = 'player';
  car.parked = false;
  G.playerCar = car;
  player.state.group.visible = false;
  police.addCrime(1);
  audio.wantedUp();
  announce('Car stolen — the cops noticed!');
}

function exitCar() {
  const car = G.playerCar;
  if (!car) return;
  car.driver = null;
  car.parked = true;
  car.speed = 0;
  G.playerCar = null;
  const side = car.angle + Math.PI / 2;
  player.state.x = car.x + Math.sin(side) * 2.4;
  player.state.z = car.z + Math.cos(side) * 2.4;
  player.state.group.visible = true;
  player.state.group.position.set(player.state.x, 0, player.state.z);
}

function hudState() {
  const beacon = world.beacon.visible ? { x: world.beacon.position.x, z: world.beacon.position.z } : null;
  const def = missions.currentDef();
  return {
    health: player.state.health,
    money: G.money,
    stars: police.stars,
    missionIndex: missions.index,
    objective: missions.objective(),
    missionTitle: missions.phase === 'active' && missions.active ? missions.active.def.title : (def ? def.title : 'Vice Shores — Free Roam'),
    speed: G.playerCar ? G.playerCar.speed : 0,
    inCar: !!G.playerCar,
    message: missions.messageTimer > 0 ? missions.message : '',
    hint: HINTS[G.hintIndex % HINTS.length],
    beacon,
    x: G.playerCar ? G.playerCar.x : player.state.x,
    z: G.playerCar ? G.playerCar.z : player.state.z,
    angle: G.playerCar ? G.playerCar.angle : player.state.angle,
    police: police.cars.map((e) => ({ x: e.car.x, z: e.car.z })),
    traffic: traffic.cars.map((e) => ({ x: e.car.x, z: e.car.z })),
  };
}

function paint(dt) {
  render.vista = G.screen === 'title' || G.screen === 'over';
  const focusX = G.playerCar ? G.playerCar.x : player.state.x;
  const focusZ = G.playerCar ? G.playerCar.z : player.state.z;
  const heading = G.playerCar ? G.playerCar.angle : player.state.angle;
  // The camera gets the speed too, so the field of view can stretch with pace.
  render.follow(dt, focusX, focusZ, heading, !!G.playerCar, { x: 0, y: 0, speed: G.playerCar ? G.playerCar.speed : 0 });
  render.draw(dt, world);
  hud.update(hudState());
}

// Exposed for the play-test and the shot stager — not part of the game itself.
window.__viceShores = {
  get screen() { return G.screen; },
  get money() { return G.money; },
  get stars() { return police.stars; },
  get health() { return player.state.health; },
  get missionIndex() { return missions.index; },
  get inCar() { return !!G.playerCar; },
  get playerX() { return player.state.x; },
  get playerZ() { return player.state.z; },
  get elapsed() { return G.elapsed; },
  G,
};

function runShot(name) {
  showScreen('title');
  stageShot(name, G, { showScreen, paint, resetWorld, enterCar });
  let painted = 0;
  function frame() {
    paint(0.016);
    painted += 1;
    if (painted < 2) requestAnimationFrame(frame);
    else window.__shotReady = true;
  }
  requestAnimationFrame(frame);
}

function runGame() {
  const input = createInput(canvas);
  let last = performance.now();
  let accumulator = 0;
  let hintTimer = 0;

  showScreen('title');
  announce('Vice Shores. Press Space or click Start to play.');

  document.getElementById('btn-start').addEventListener('click', () => startGame());
  document.getElementById('btn-resume').addEventListener('click', () => { showScreen('play'); announce('Playing.'); });
  document.getElementById('btn-retry').addEventListener('click', () => startGame());
  document.getElementById('btn-title').addEventListener('click', () => showScreen('title'));

  function handleActions() {
    const actions = input.takeActions();
    if (actions & ACTION_MUTE) {
      const muted = audio.setMuted(!audio.isMuted());
      announce(muted ? 'Sound muted.' : 'Sound on.');
    }
    if (G.screen === 'title' || G.screen === 'over') {
      if (actions & ACTION_CONFIRM) startGame();
      return;
    }
    if (G.screen === 'paused') {
      if (actions & (ACTION_PAUSE | ACTION_CONFIRM)) { showScreen('play'); announce('Playing.'); }
      return;
    }
    // Playing.
    if (actions & ACTION_PAUSE) {
      showScreen('paused');
      announce('Paused.');
      return;
    }
    if (actions & ACTION_CONFIRM) {
      if (missions.phase === 'idle') {
        const def = missions.start();
        if (def) {
          missions.onMissionStartWanted(police);
          if (def.kind === 'tail') traffic.placeCourierNear(player.state.x + 20, player.state.z - 10);
          audio.click();
          announce(def.brief);
        }
      } else if (missions.phase === 'done') {
        missions.startRepeat(player.state.x, player.state.z);
        audio.click();
      }
      return;
    }
    if (actions & ACTION_ENTER) {
      if (G.playerCar) exitCar();
      else {
        const car = nearestStealableCar();
        if (car) enterCar(car);
      }
    }
    if (actions & ACTION_PUNCH && !G.playerCar) {
      if (player.punch()) {
        audio.punch();
        if (combat.punch(player.state, pedestrians)) police.addCrime(1);
      }
    }
    if (actions & ACTION_SHOOT && !G.playerCar) {
      audio.shoot();
      render.addShake(0.25);
      combat.shoot(player.state, render.camAngle, police, traffic, pedestrians, (n) => police.addCrime(n));
    }
  }

  function step(dt) {
    G.elapsed += dt;
    hintTimer += dt;
    if (hintTimer > 9) { hintTimer = 0; G.hintIndex += 1; }
    const move = input.move();
    const drag = input.takeDrag();
    render.camAngle -= drag.x * 0.005;
    render.camPitch += drag.y * 0.003;

    const danger = G.playerCar && Math.abs(G.playerCar.speed) > 6 ? { x: G.playerCar.x, z: G.playerCar.z } : null;
    traffic.update(dt, G.playerCar);
    pedestrians.update(dt, danger || (player.state.health < PLAYER.maxHealth ? { x: player.state.x, z: player.state.z } : null));
    combat.update(dt);

    if (G.playerCar) {
      const car = G.playerCar;
      const throttle = move.forward;
      const steer = move.strafe;
      const wasSkid = car.drive(dt, throttle, steer);
      const clamped = world.clamp(car.x, car.z);
      const hitWall = clamped.x !== car.x || clamped.z !== car.z;
      car.x = clamped.x;
      car.z = clamped.z;
      const after = world.collideBuildings(car.x, car.z, 2);
      if (after.x !== car.x || after.z !== car.z) {
        if (Math.abs(car.speed) > 12) {
          audio.crash();
          render.addShake(0.7);
          render.burst(car.x, 1, car.z, 0xffaa33, 10, 4);
          car.speed *= -0.25;
        }
        car.x = after.x;
        car.z = after.z;
        car.syncMesh();
      }
      if (hitWall && Math.abs(car.speed) > 15) {
        audio.crash();
        render.addShake(0.5);
        car.speed *= 0.4;
      }
      if (wasSkid) {
        render.skidPuff(car.x - Math.sin(car.angle) * 2, car.z - Math.cos(car.angle) * 2);
        G.skidTimer -= dt;
        if (G.skidTimer <= 0) { audio.skid(); G.skidTimer = 0.5; }
      }
      G.engineTimer -= dt;
      if (G.engineTimer <= 0) { audio.engine(Math.abs(car.speed) / 42); G.engineTimer = 0.18; }
      // Running over pedestrians is a crime.
      for (const w of pedestrians.walkers) {
        if (w.down) continue;
        if (Math.hypot(w.x - car.x, w.z - car.z) < 2.4 && Math.abs(car.speed) > 5) {
          pedestrians.knockDown(w.x, w.z, 1);
          police.addCrime(1);
          audio.crash();
          render.addShake(0.5);
        }
      }
      if (police.ramCheck(car)) {
        audio.crash();
        render.addShake(0.6);
        render.burst(car.x, 1, car.z, 0xff5533, 8, 4);
        car.health -= 12;
        if (car.health <= 0) {
          render.burst(car.x, 1.5, car.z, 0xff8833, 24, 6);
          exitCar();
          player.damage(20);
        }
      }
      // Mission progress while driving.
      const done = missions.update(dt, player.state, car, traffic.courier, police);
      if (done) { G.money += done.reward; audio.missionDone(); saveGame(); }
    } else {
      player.move(dt, move.forward, move.strafe, move.run, render.camAngle, (x, z, r) => world.collideBuildings(x, z, r));
      const clamped = world.clamp(player.state.x, player.state.z);
      player.state.x = clamped.x;
      player.state.z = clamped.z;
      player.state.group.position.set(player.state.x, 0, player.state.z);
      if (player.state.health < PLAYER.maxHealth) player.heal(dt * 1.5);
      const done = missions.update(dt, player.state, null, traffic.courier, police);
      if (done) { G.money += done.reward; audio.missionDone(); saveGame(); }
    }

    police.update(dt, G.playerCar ? G.playerCar.x : player.state.x, G.playerCar ? G.playerCar.z : player.state.z, !!G.playerCar, () => endGame('BUSTED'), audio);
    if (player.state.dead) endGame('WASTED');
  }

  function frame(now) {
    requestAnimationFrame(frame);
    const dt = Math.min((now - last) / 1000, MAX_FRAME);
    last = now;
    handleActions();
    if (G.screen === 'play') {
      accumulator += dt;
      while (accumulator >= STEP) {
        step(STEP);
        accumulator -= STEP;
        if (G.screen !== 'play') { accumulator = 0; break; }
      }
    } else {
      accumulator = 0;
      // The title screen still shows the living city behind the panel.
      if (G.screen === 'title') {
        traffic.update(dt, null);
        pedestrians.update(dt, null);
      }
    }
    paint(dt);
  }

  document.addEventListener('visibilitychange', () => {
    if (document.hidden && G.screen === 'play') showScreen('paused');
  });

  requestAnimationFrame(frame);
}

if (shot) runShot(shot);
else runGame();
