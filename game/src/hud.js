// Vice Shores — HUD and menus: start screen, wanted stars, speed, money,
// objective line, mission banner, and the "near a car — press E" prompt.

export function buildHud() {
  const hud = document.getElementById('hud');
  const stars = document.getElementById('stars');
  const money = document.getElementById('money');
  const speed = document.getElementById('speed');
  const objective = document.getElementById('objective');
  const banner = document.getElementById('banner');
  const prompt = document.getElementById('prompt');
  const startScreen = document.getElementById('start-screen');
  const playBtn = document.getElementById('play-btn');
  return { hud, stars, money, speed, objective, banner, prompt, startScreen, playBtn };
}

export function renderStars(el, stars) {
  let s = '';
  for (let i = 0; i < 5; i++) s += i < stars ? '★' : '☆';
  el.textContent = s;
  el.classList.toggle('hot', stars > 0);
}

export function renderHud(h, game) {
  renderStars(h.stars, game.wanted.stars);
  h.money.textContent = `$${game.money.toLocaleString('en-US')}`;
  if (game.currentCar) {
    h.speed.style.display = 'block';
    h.speed.textContent = `${game.currentCarKmh} km/h`;
  } else {
    h.speed.style.display = 'none';
  }
  h.objective.textContent = game.objectiveText;
  if (game.bannerText) {
    h.banner.textContent = game.bannerText;
    h.banner.style.display = 'block';
  } else {
    h.banner.style.display = 'none';
  }
  if (game.promptText) {
    h.prompt.textContent = game.promptText;
    h.prompt.style.display = 'block';
  } else {
    h.prompt.style.display = 'none';
  }
}

export function showStartScreen(h, onPlay) {
  h.startScreen.style.display = 'flex';
  h.hud.style.display = 'none';
  h.playBtn.addEventListener('click', onPlay, { once: true });
}

export function hideStartScreen(h) {
  h.startScreen.style.display = 'none';
  h.hud.style.display = 'block';
}
