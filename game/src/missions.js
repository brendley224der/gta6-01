// Vice Shores — story missions: three sequential missions, each with steps,
// a world marker, progress, and a completion reward. The game loop calls
// updateMissions every frame with the player's position and state.

import * as THREE from 'three';
import { MISSIONS, dist2d } from './config.js';

export function createMissionState(scene) {
  // One shared marker: a tall glowing beacon + a floating diamond.
  const marker = new THREE.Group();
  const beam = new THREE.Mesh(
    new THREE.CylinderGeometry(1.2, 1.2, 60, 12, 1, true),
    new THREE.MeshBasicMaterial({ color: 0xffd23e, transparent: true, opacity: 0.35, side: THREE.DoubleSide }),
  );
  beam.position.y = 30;
  marker.add(beam);
  const gem = new THREE.Mesh(
    new THREE.OctahedronGeometry(1.6),
    new THREE.MeshBasicMaterial({ color: 0xffd23e }),
  );
  gem.position.y = 6;
  marker.add(gem);
  marker.visible = false;
  scene.add(marker);
  return {
    index: 0, // which mission is current (0-based)
    step: 0,
    active: false,
    completed: [false, false, false],
    marker,
    gem,
    banner: null, // { text, until } set by the game for the HUD banner
    justCompleted: null, // mission id completed this frame (consumed by HUD)
    heatPrimed: false, // mission 2: have we reached 2 stars yet?
  };
}

export function currentMission(state) {
  return MISSIONS[state.index] || null;
}

export function currentObjective(state) {
  const m = currentMission(state);
  if (!m || !state.active) return state.index >= MISSIONS.length ? 'All missions complete — free roam!' : 'Press M to start the next mission';
  return `${m.title}: ${m.steps[state.step].text}`;
}

export function startMission(state) {
  const m = currentMission(state);
  if (!m || state.active) return null;
  state.active = true;
  state.step = 0;
  state.heatPrimed = false;
  placeMarker(state);
  return m;
}

function placeMarker(state) {
  const m = currentMission(state);
  const step = m && m.steps[state.step];
  if (step && step.target) {
    state.marker.position.set(step.target.x, 0, step.target.z);
    state.marker.visible = true;
  } else {
    state.marker.visible = false;
  }
}

function completeStep(state, game) {
  const m = currentMission(state);
  state.step += 1;
  if (state.step >= m.steps.length) {
    completeMission(state, game);
  } else {
    placeMarker(state);
  }
}

function completeMission(state, game) {
  const m = currentMission(state);
  state.completed[state.index] = true;
  state.justCompleted = m.id;
  game.money += m.reward;
  state.banner = { text: `Mission complete: ${m.title} — +$${m.reward}`, until: performance.now() + 4000 };
  state.active = false;
  state.marker.visible = false;
  state.index += 1;
}

// `ctx` carries the live game facts the missions need:
// { x, z, wanted, inCar, inTaxi, hasVip, game }.
export function updateMissions(state, ctx, dt) {
  // Spin the marker gem for visibility.
  if (state.marker.visible) state.gem.rotation.y += dt * 2;
  if (!state.active) return;
  const m = currentMission(state);
  if (!m) return;

  if (m.id === 1) {
    // Reach the marker for each step.
    const step = m.steps[state.step];
    if (step.target && dist2d(ctx.x, ctx.z, step.target.x, step.target.z) < 6) {
      completeStep(state, ctx.game);
    }
  } else if (m.id === 2) {
    // Step 0: reach 2 stars. Step 1: wanted fully cleared.
    if (state.step === 0) {
      if (ctx.wanted >= 2) {
        state.heatPrimed = true;
        state.step = 1;
      }
    } else if (ctx.wanted === 0 && state.heatPrimed) {
      completeMission(state, ctx.game);
    }
  } else if (m.id === 3) {
    if (state.step === 0) {
      if (ctx.inTaxi) {
        state.step = 1;
        placeMarker(state);
      }
    } else if (state.step === 1) {
      const step = m.steps[1];
      if (dist2d(ctx.x, ctx.z, step.target.x, step.target.z) < 6) {
        ctx.hasVip = true;
        state.step = 2;
        placeMarker(state);
      }
    } else {
      const step = m.steps[2];
      if (ctx.inTaxi && dist2d(ctx.x, ctx.z, step.target.x, step.target.z) < 7) {
        completeMission(state, ctx.game);
      }
    }
  }
}
