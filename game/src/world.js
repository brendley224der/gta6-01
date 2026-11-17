// The city itself: road grid, sidewalks, buildings, beach, ocean, palms, lamps and
// the mission markers. Builds the static three.js scene once from the seed, and
// answers layout questions (road centres, parking spots, block corners) for the
// traffic, pedestrians, missions and minimap.
import { CITY, PALETTE } from './config.js';
import { pick, range } from './random.js';

const THREE = window.THREE;

function mat(color, opts = {}) {
  return new THREE.MeshLambertMaterial({ color, ...opts });
}

/** Road centre lines: x = roadXs[i] run north-south, z = roadZs[i] run east-west. */
export function roadLines() {
  const step = CITY.block + CITY.road;
  const lines = [];
  for (let i = -2; i <= 2; i += 1) lines.push(i * step);
  return lines;
}

export function nearestRoadCoord(v) {
  const lines = roadLines();
  let best = lines[0];
  for (const line of lines) if (Math.abs(line - v) < Math.abs(best - v)) best = line;
  return best;
}

/** Is this point on a road (not inside a block)? */
export function onRoad(x, z) {
  const lines = roadLines();
  const half = CITY.road / 2 + 1;
  return lines.some((l) => Math.abs(x - l) < half) || lines.some((l) => Math.abs(z - l) < half);
}

export function createWorld(random) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(PALETTE.skyHorizon);
  scene.fog = new THREE.Fog(0xffc98a, 120, 420);

  const sun = new THREE.DirectionalLight(PALETTE.sun, 1.15);
  sun.position.set(-80, 120, -60);
  scene.add(sun);
  scene.add(new THREE.AmbientLight(0xffe0b8, 0.55));
  const hemi = new THREE.HemisphereLight(0x8fb8e8, 0x3a2f28, 0.5);
  scene.add(hemi);

  // Ground: grass base, then road strips, sidewalks and sand on top of it.
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(520, 520), mat(PALETTE.grass));
  ground.rotation.x = -Math.PI / 2;
  ground.position.set(20, -0.05, 0);
  scene.add(ground);

  const lines = roadLines();
  const roadMat = mat(PALETTE.road);
  const walkMat = mat(PALETTE.sidewalk);
  for (const x of lines) {
    const road = new THREE.Mesh(new THREE.PlaneGeometry(CITY.road, 340), roadMat);
    road.rotation.x = -Math.PI / 2;
    road.position.set(x, 0, 0);
    scene.add(road);
    const dash = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 340), mat(PALETTE.roadLine));
    dash.rotation.x = -Math.PI / 2;
    dash.position.set(x, 0.02, 0);
    scene.add(dash);
  }
  for (const z of lines) {
    const road = new THREE.Mesh(new THREE.PlaneGeometry(340, CITY.road), roadMat);
    road.rotation.x = -Math.PI / 2;
    road.position.set(0, 0, z);
    scene.add(road);
  }
  // Sidewalk slabs around every block.
  const step = CITY.block + CITY.road;
  const buildings = [];
  for (let bx = -2; bx <= 2; bx += 1) {
    for (let bz = -2; bz <= 2; bz += 1) {
      const cx = bx * step;
      const cz = bz * step;
      const walk = new THREE.Mesh(new THREE.BoxGeometry(CITY.block, 0.3, CITY.block), walkMat);
      walk.position.set(cx, 0.12, cz);
      scene.add(walk);
      // One or two towers per block, varied heights and pastel colours.
      const count = random() < 0.45 ? 2 : 1;
      for (let k = 0; k < count; k += 1) {
        const w = range(random, 12, 22);
        const d = range(random, 12, 22);
        const h = range(random, 9, count === 1 ? 46 : 26);
        const ox = count === 1 ? 0 : (k === 0 ? -9 : 9);
        const oz = count === 1 ? 0 : (k === 0 ? -9 : 9);
        const color = pick(random, PALETTE.building);
        const tower = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat(color));
        tower.position.set(cx + ox, h / 2 + 0.3, cz + oz);
        scene.add(tower);
        // Glass band near the top, and a rooftop box.
        const band = new THREE.Mesh(new THREE.BoxGeometry(w + 0.2, Math.min(3, h * 0.18), d + 0.2), mat(PALETTE.glass, { emissive: 0x0a2038 }));
        band.position.set(cx + ox, h * 0.82, cz + oz);
        scene.add(band);
        const roof = new THREE.Mesh(new THREE.BoxGeometry(w * 0.3, 1.6, d * 0.3), mat(0x6a6f75));
        roof.position.set(cx + ox, h + 1, cz + oz);
        scene.add(roof);
        buildings.push({ x: cx + ox, z: cz + oz, w, d, h });
      }
    }
  }

  // Beach and ocean on the east edge, with a boardwalk strip.
  const sand = new THREE.Mesh(new THREE.PlaneGeometry(60, 340), mat(PALETTE.sand));
  sand.rotation.x = -Math.PI / 2;
  sand.position.set(CITY.beachX + 18, 0.01, 0);
  scene.add(sand);
  const ocean = new THREE.Mesh(new THREE.PlaneGeometry(140, 520), mat(PALETTE.ocean, { transparent: true, opacity: 0.92 }));
  ocean.rotation.x = -Math.PI / 2;
  ocean.position.set(CITY.oceanX + 70, 0.05, 0);
  scene.add(ocean);
  // Palms along the beach.
  const palms = [];
  for (let z = -140; z <= 140; z += 28) {
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.5, 7, 6), mat(0x8a6a42));
    trunk.position.set(CITY.beachX + 4 + range(random, -2, 2), 3.5, z + range(random, -4, 4));
    scene.add(trunk);
    const crown = new THREE.Mesh(new THREE.SphereGeometry(2.2, 8, 6), mat(0x3f8f3a));
    crown.position.set(trunk.position.x, 7.4, trunk.position.z);
    crown.scale.y = 0.55;
    scene.add(crown);
    palms.push({ x: trunk.position.x, z: trunk.position.z });
  }
  // Street lamps at intersections.
  for (const x of lines) {
    for (const z of lines) {
      if (random() < 0.5) continue;
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 6, 6), mat(0x3a3f45));
      pole.position.set(x + CITY.road / 2 + 1, 3, z + CITY.road / 2 + 1);
      scene.add(pole);
      const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.5, 8, 6), mat(0xffe9a8, { emissive: 0x664411 }));
      lamp.position.set(x + CITY.road / 2 + 1, 6.2, z + CITY.road / 2 + 1);
      scene.add(lamp);
    }
  }

  // A glowing beacon column marks the active mission target.
  const beacon = new THREE.Mesh(
    new THREE.CylinderGeometry(1.6, 1.6, 60, 12, 1, true),
    new THREE.MeshBasicMaterial({ color: 0xffd23f, transparent: true, opacity: 0.28, side: THREE.DoubleSide, depthWrite: false }),
  );
  beacon.position.set(0, 30, 0);
  beacon.visible = false;
  scene.add(beacon);
  const beaconBase = new THREE.Mesh(new THREE.RingGeometry(2, 3.4, 24), new THREE.MeshBasicMaterial({ color: 0xffd23f, transparent: true, opacity: 0.7, side: THREE.DoubleSide }));
  beaconBase.rotation.x = -Math.PI / 2;
  beaconBase.position.set(0, 0.1, 0);
  beaconBase.visible = false;
  scene.add(beaconBase);

  // Parking spots along the roads, for stealable cars.
  const parking = [];
  for (const x of lines) {
    for (const z of [-112, -56, 0, 56, 112]) {
      parking.push({ x: x + CITY.road / 2 - 2.2, z, angle: Math.PI / 2 });
      parking.push({ x: x - CITY.road / 2 + 2.2, z: z + 7, angle: -Math.PI / 2 });
    }
  }

  return {
    scene,
    sun,
    ocean,
    beacon,
    beaconBase,
    buildings,
    palms,
    parking,
    /** Keep the player and cars inside the playable area. */
    clamp(x, z) {
      return {
        x: Math.max(-CITY.half, Math.min(CITY.beachX + 26, x)),
        z: Math.max(-CITY.half, Math.min(CITY.half, z)),
      };
    },
    /** Circle-vs-building collision: push the point out of any tower footprint. */
    collideBuildings(x, z, radius) {
      for (const b of buildings) {
        const dx = x - b.x;
        const dz = z - b.z;
        const px = b.w / 2 + radius;
        const pz = b.d / 2 + radius;
        if (Math.abs(dx) < px && Math.abs(dz) < pz) {
          const pushX = px - Math.abs(dx);
          const pushZ = pz - Math.abs(dz);
          if (pushX < pushZ) x = b.x + (dx > 0 ? px : -px);
          else z = b.z + (dz > 0 ? pz : -pz);
        }
      }
      return { x, z };
    },
    setBeacon(x, z, visible) {
      beacon.position.x = x;
      beacon.position.z = z;
      beacon.visible = visible;
      beaconBase.position.x = x;
      beaconBase.position.z = z;
      beaconBase.visible = visible;
    },
  };
}
