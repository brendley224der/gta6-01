// Missions and the story arc: three scripted jobs for Mara Voss, then repeatable
// courier runs for cash. A mission has a target, a live objective line for the
// HUD, and a beacon in the world; completing one pays out and advances the arc.
// The module owns no rendering beyond the beacon — the world draws that.
import { MISSIONS } from './config.js';

export function createMissions(world) {
  let index = 0; // index into MISSIONS, or MISSIONS.length when the arc is done
  let active = null; // live mission state
  let tailTimer = 0;
  let phase = 'idle'; // idle | active | done
  let message = '';
  let messageTimer = 0;
  let repeatCount = 0;

  function startMission(i) {
    const def = MISSIONS[i];
    active = { def, stage: 0, pickedUp: false };
    tailTimer = 0;
    phase = 'active';
    if (def.kind === 'goto') world.setBeacon(def.target.x, def.target.z, true);
    if (def.kind === 'pickup') world.setBeacon(def.target.x, def.target.z, true);
    if (def.kind === 'tail') world.setBeacon(0, 0, false);
    return def;
  }

  function completeMission() {
    const def = active.def;
    world.setBeacon(0, 0, false);
    const reward = def.reward;
    index += 1;
    active = null;
    phase = index >= MISSIONS.length ? 'done' : 'idle';
    return reward;
  }

  return {
    get index() { return index; },
    get phase() { return phase; },
    get active() { return active; },
    get message() { return message; },
    get messageTimer() { return messageTimer; },
    setIndex(i) {
      index = Math.max(0, Math.min(MISSIONS.length, i));
      phase = index >= MISSIONS.length ? 'done' : 'idle';
    },
    currentDef() {
      return index < MISSIONS.length ? MISSIONS[index] : null;
    },
    /** Objective line for the HUD. */
    objective() {
      if (phase === 'active' && active) {
        if (active.def.kind === 'pickup' && active.stage === 1) return 'Reach the Safehouse — lose the heat!';
        if (active.def.kind === 'tail') return `Tail the courier — ${Math.max(0, Math.ceil(active.def.duration - tailTimer))}s to go`;
        return active.def.objective;
      }
      if (phase === 'done') return 'Story complete — free roam! Press Enter for a courier run ($300)';
      const def = MISSIONS[index];
      return def ? `Next: ${def.title} — press Enter to start` : 'Free roam';
    },
    start() {
      if (phase !== 'idle') return null;
      const def = startMission(index);
      message = `${def.title}: ${def.brief}`;
      messageTimer = 6;
      return def;
    },
    /** Start a repeatable courier run once the story is done. */
    startRepeat(playerX, playerZ) {
      repeatCount += 1;
      const targets = [
        { x: 118, z: 118 }, { x: -118, z: -118 }, { x: 118, z: -118 }, { x: -118, z: 118 },
      ];
      const target = targets[repeatCount % targets.length];
      active = { def: { id: 'courier', title: 'Courier Run', brief: 'Drop the parcel at the marker.', objective: 'Deliver to the marker', reward: 300, kind: 'goto', target }, stage: 0 };
      phase = 'active';
      world.setBeacon(target.x, target.z, true);
      message = 'Courier Run: deliver the parcel to the gold marker.';
      messageTimer = 4;
      return active.def;
    },
    /** Advance the active mission. Returns {reward} when finished, or null. */
    update(dt, player, playerCar, courier, police) {
      if (messageTimer > 0) messageTimer -= dt;
      if (phase !== 'active' || !active) return null;
      const def = active.def;
      const px = playerCar ? playerCar.x : player.x;
      const pz = playerCar ? playerCar.z : player.z;
      if (def.kind === 'goto') {
        const d = Math.hypot(px - def.target.x, pz - def.target.z);
        if (d < 7) {
          const reward = completeMission();
          message = `Delivered! +$${reward}`;
          messageTimer = 5;
          return { reward };
        }
      } else if (def.kind === 'tail') {
        const d = Math.hypot(px - courier.x, pz - courier.z);
        if (d < 26) {
          tailTimer += dt;
          if (tailTimer >= def.duration) {
            const reward = completeMission();
            message = `You tailed him the whole way. +$${reward}`;
            messageTimer = 5;
            return { reward };
          }
        } else {
          tailTimer = Math.max(0, tailTimer - dt * 0.5);
        }
      } else if (def.kind === 'pickup') {
        if (active.stage === 0) {
          const d = Math.hypot(px - def.target.x, pz - def.target.z);
          if (d < 6) {
            active.stage = 1;
            active.pickedUp = true;
            world.setBeacon(def.safehouse.x, def.safehouse.z, true);
            message = 'Case grabbed! Get to the Safehouse — and shake the cops!';
            messageTimer = 5;
            if (police) police.addCrime(1);
          }
        } else {
          const d = Math.hypot(px - def.safehouse.x, pz - def.safehouse.z);
          if (d < 7) {
            const reward = completeMission();
            message = `Clean getaway! +$${reward}`;
            messageTimer = 5;
            return { reward };
          }
        }
      }
      return null;
    },
    onMissionStartWanted(police) {
      if (active && active.def.wantedOnStart && police) police.setStars(active.def.wantedOnStart);
    },
  };
}
