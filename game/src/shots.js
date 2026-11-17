// The screenshot scenes behind ?shot=start|play|chase|end. Each one sets the real
// game to a lived-in moment — the title over the city, a drive with a mission
// running, a three-star police chase, a busted/wasted game over — advances the
// traffic and pedestrians a few seconds so the frame looks alive, and leaves
// the game painted for main.js to capture twice. The same seed always gives
// the same frame.
export function stageShot(name, G, helpers) {
  const { showScreen, resetWorld, enterCar } = helpers;
  const { world, player, traffic, pedestrians, police, missions } = G;

  function idleSeconds(seconds) {
    for (let i = 0; i < seconds * 60; i += 1) {
      traffic.update(1 / 60, G.playerCar);
      pedestrians.update(1 / 60, null);
    }
  }

  function putPlayerInCar() {
    const car = G.parkedCars[0];
    // On the x=0 road, driving north (+z), so the shot reads as a street, not a plaza.
    car.x = 0;
    car.z = -40;
    car.angle = 0;
    car.syncMesh();
    enterCar(car);
  }

  resetWorld();
  G.money = 1250;
  police.setStars(0);

  if (name === 'play') {
    putPlayerInCar();
    missions.start();
    for (let i = 0; i < 150; i += 1) {
      G.playerCar.drive(1 / 60, 1, 0);
      traffic.update(1 / 60, G.playerCar);
      pedestrians.update(1 / 60, null);
    }
    showScreen('play');
    return;
  }

  if (name === 'chase') {
    putPlayerInCar();
    missions.start();
    police.setStars(3);
    for (let i = 0; i < 240; i += 1) {
      G.playerCar.drive(1 / 60, 1, 0);
      traffic.update(1 / 60, G.playerCar);
      pedestrians.update(1 / 60, null);
      police.update(1 / 60, G.playerCar.x, G.playerCar.z, true, null, null);
    }
    // Pull the two nearest police cars into the frame ahead of the player, closing
    // in from up the road, so the chase — not just the stars — is visible: cars
    // placed behind the player would sit behind the chase camera itself.
    const fx = Math.sin(G.playerCar.angle);
    const fz = Math.cos(G.playerCar.angle);
    police.cars.slice(0, 2).forEach((entry, i) => {
      const car = entry.car;
      const ahead = 16 + i * 6;
      const side = i === 0 ? -4 : 5;
      car.x = G.playerCar.x + fx * ahead - fz * side;
      car.z = G.playerCar.z + fz * ahead + fx * side;
      car.angle = G.playerCar.angle + Math.PI; // facing back toward the player
      car.speed = 22;
      car.syncMesh();
    });
    showScreen('play');
    return;
  }

  if (name === 'end') {
    player.state.health = 0;
    player.state.dead = true;
    G.overReason = 'WASTED';
    idleSeconds(3);
    showScreen('over');
    return;
  }

  // start (and any other name): the title over the living city.
  idleSeconds(5);
  showScreen('title');
}
