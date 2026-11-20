// Vice Shores — minimap: a 2D canvas top-down view of the city with the
// player arrow, mission marker, police dots, and taxi icons.

import { CITY, STREETS } from './config.js';

function toMap(x, z, size) {
  const span = CITY.half * 2 + 60;
  const px = ((x + span / 2) / span) * size;
  const py = ((z + span / 2) / span) * size;
  return [px, py];
}

export function drawMinimap(canvas, view) {
  const ctx = canvas.getContext('2d');
  const size = canvas.width;
  ctx.clearRect(0, 0, size, size);
  // Background: dark map with district tints.
  ctx.fillStyle = '#14202e';
  ctx.fillRect(0, 0, size, size);
  const span = CITY.half * 2 + 60;
  const scale = size / span;
  const rect = (x0, z0, x1, z1, color) => {
    const [px, py] = toMap(x0, z0, size);
    ctx.fillStyle = color;
    ctx.fillRect(px, py, (x1 - x0) * scale, (z1 - z0) * scale);
  };
  rect(CITY.parkMinX, CITY.parkMinZ, CITY.parkMaxX, CITY.parkMaxZ, '#1f5c2e'); // park
  rect(CITY.marinaX, -CITY.half, CITY.half + 30, CITY.half, '#1d5f8a'); // marina water
  rect(-CITY.half - 30, CITY.beachZ, CITY.half + 30, CITY.half + 30, '#8a7440'); // beach
  // Streets.
  ctx.strokeStyle = '#5a6a7a';
  ctx.lineWidth = 3;
  for (const s of STREETS) {
    const [x0] = toMap(s, -190, size);
    ctx.beginPath();
    ctx.moveTo(x0, 0);
    ctx.lineTo(x0, size);
    ctx.stroke();
    const [, z0] = toMap(-190, s, size);
    ctx.beginPath();
    ctx.moveTo(0, z0);
    ctx.lineTo(size, z0);
    ctx.stroke();
  }
  // Mission marker (pulsing yellow diamond).
  if (view.marker) {
    const [mx, my] = toMap(view.marker.x, view.marker.z, size);
    const r = 5 + Math.sin(performance.now() / 300) * 1.5;
    ctx.fillStyle = '#ffd23e';
    ctx.beginPath();
    ctx.moveTo(mx, my - r - 2);
    ctx.lineTo(mx + r, my);
    ctx.lineTo(mx, my + r + 2);
    ctx.lineTo(mx - r, my);
    ctx.closePath();
    ctx.fill();
  }
  // Taxis (small yellow squares).
  ctx.fillStyle = '#f2c230';
  for (const t of view.taxis) {
    const [tx, ty] = toMap(t.x, t.z, size);
    ctx.fillRect(tx - 2.5, ty - 2.5, 5, 5);
  }
  // Police (red dots with white ring).
  for (const p of view.police) {
    const [px, py] = toMap(p.x, p.z, size);
    ctx.fillStyle = '#ff3344';
    ctx.beginPath();
    ctx.arc(px, py, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1;
    ctx.stroke();
  }
  // Player arrow (white triangle pointing along heading).
  const [px, py] = toMap(view.player.x, view.player.z, size);
  ctx.save();
  ctx.translate(px, py);
  ctx.rotate(view.player.heading);
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.moveTo(0, -8);
  ctx.lineTo(6, 6);
  ctx.lineTo(-6, 6);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}
