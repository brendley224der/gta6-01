// The HUD: health bar, cash, wanted stars, mission objective, speed and hints,
// plus the live minimap — a small canvas that draws the road grid, the beach,
// the player arrow, cars, police and the gold mission beacon, north-up.
import { CITY } from './config.js';

export function createHud() {
  const el = (id) => document.getElementById(id);
  const healthFill = el('health-fill');
  const healthText = el('health-text');
  const moneyEl = el('money');
  const starsEl = el('stars');
  const objectiveEl = el('objective');
  const missionEl = el('mission-title');
  const speedEl = el('speed');
  const messageEl = el('message');
  const hintEl = el('hint');
  const minimap = el('minimap');
  const mapCtx = minimap.getContext('2d');

  function drawMinimap(state) {
    const size = minimap.width;
    const scale = size / (CITY.half * 2 + 60);
    const toMap = (x, z) => [(x + CITY.half + 30) * scale, (z + CITY.half + 30) * scale];
    mapCtx.clearRect(0, 0, size, size);
    // Land, beach, ocean.
    mapCtx.fillStyle = '#3d6b35';
    mapCtx.fillRect(0, 0, size, size);
    const [bx] = toMap(CITY.beachX, 0);
    mapCtx.fillStyle = '#e8cf9a';
    mapCtx.fillRect(bx, 0, size - bx, size);
    mapCtx.fillStyle = '#1d7fa8';
    mapCtx.fillRect(bx + 18 * scale, 0, size, size);
    // Roads.
    mapCtx.strokeStyle = '#2b2f36';
    mapCtx.lineWidth = 7 * scale;
    const step = CITY.block + CITY.road;
    for (let i = -2; i <= 2; i += 1) {
      const [x0, y0] = toMap(i * step, -CITY.half - 20);
      const [x1, y1] = toMap(i * step, CITY.half + 20);
      mapCtx.beginPath(); mapCtx.moveTo(x0, y0); mapCtx.lineTo(x1, y1); mapCtx.stroke();
      const [ax0, ay0] = toMap(-CITY.half - 20, i * step);
      const [ax1, ay1] = toMap(CITY.half + 20, i * step);
      mapCtx.beginPath(); mapCtx.moveTo(ax0, ay0); mapCtx.lineTo(ax1, ay1); mapCtx.stroke();
    }
    // Mission beacon.
    if (state.beacon) {
      const [mx, my] = toMap(state.beacon.x, state.beacon.z);
      mapCtx.fillStyle = '#ffd23f';
      mapCtx.beginPath(); mapCtx.arc(mx, my, 7, 0, Math.PI * 2); mapCtx.fill();
      mapCtx.strokeStyle = '#fff';
      mapCtx.lineWidth = 2;
      mapCtx.stroke();
    }
    // Police as blue dots, traffic as grey dots.
    for (const p of state.police || []) {
      const [mx, my] = toMap(p.x, p.z);
      mapCtx.fillStyle = '#3a7bd5';
      mapCtx.beginPath(); mapCtx.arc(mx, my, 3.5, 0, Math.PI * 2); mapCtx.fill();
    }
    for (const c of state.traffic || []) {
      const [mx, my] = toMap(c.x, c.z);
      mapCtx.fillStyle = '#c8c8c8';
      mapCtx.fillRect(mx - 2, my - 2, 4, 4);
    }
    // Player arrow, rotated to face the heading.
    const [px, py] = toMap(state.x, state.z);
    mapCtx.save();
    mapCtx.translate(px, py);
    mapCtx.rotate(state.angle);
    mapCtx.fillStyle = '#ff5a5a';
    mapCtx.beginPath();
    mapCtx.moveTo(0, -8); mapCtx.lineTo(6, 6); mapCtx.lineTo(0, 3); mapCtx.lineTo(-6, 6);
    mapCtx.closePath(); mapCtx.fill();
    mapCtx.restore();
  }

  return {
    update(state) {
      const hp = Math.max(0, Math.round(state.health));
      healthFill.style.width = `${hp}%`;
      healthFill.style.background = hp > 50 ? '#4caf50' : hp > 25 ? '#ff9800' : '#f44336';
      healthText.textContent = `HP ${hp}`;
      moneyEl.textContent = `$${state.money.toLocaleString('en-US')}`;
      starsEl.textContent = '★'.repeat(state.stars) + '☆'.repeat(5 - state.stars);
      starsEl.style.color = state.stars > 0 ? '#ff5252' : '#ffffff88';
      objectiveEl.textContent = state.objective;
      missionEl.textContent = state.missionTitle;
      speedEl.textContent = state.inCar ? `${Math.round(Math.abs(state.speed) * 3.6)} km/h` : '';
      messageEl.textContent = state.message || '';
      messageEl.style.opacity = state.message ? '1' : '0';
      hintEl.textContent = state.hint || '';
      drawMinimap(state);
    },
  };
}
