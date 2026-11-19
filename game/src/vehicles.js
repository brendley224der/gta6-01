// Cars: building a car mesh, arcade driving physics, and the enter/exit dance.
// A car is a body box, a cabin, four spinning wheels and headlights; driving is
// speed + heading with steering that bites harder the slower you go, plus skid
// when you throw it into a hard turn at speed. Taxis are the same car with a
// yellow body and a roof sign; police cars carry a flashing light bar.
import { CAR, PALETTE, SKID } from './config.js';

const THREE = window.THREE;

const CAR_COLORS = [0xc0392b, 0x2e86c1, 0xf1c40f, 0x7d3c98, 0x1abc9c, 0xe67e22, 0xecf0f1, 0x2c3e50, 0x16a085];

export function buildCarMesh(color, isPolice = false, random = Math.random, isTaxi = false) {
  const group = new THREE.Group();
  const paint = isPolice ? PALETTE.police : (isTaxi ? PALETTE.taxi : color);
  const bodyMat = new THREE.MeshLambertMaterial({ color: paint });
  const body = new THREE.Mesh(new THREE.BoxGeometry(2, 0.75, 4.4), bodyMat);
  body.position.y = 0.65;
  group.add(body);
  const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.65, 2.1), new THREE.MeshLambertMaterial({ color: 0x1c2733 }));
  cabin.position.set(0, 1.3, -0.2);
  group.add(cabin);
  if (isTaxi) {
    // Roof sign so cabs read as cabs from the chase camera.
    const sign = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.22, 0.35), new THREE.MeshLambertMaterial({ color: 0x111111 }));
    sign.position.set(0, 1.72, -0.2);
    group.add(sign);
    const signTop = new THREE.Mesh(new THREE.BoxGeometry(0.94, 0.06, 0.39), new THREE.MeshBasicMaterial({ color: 0xffe27a }));
    signTop.position.set(0, 1.85, -0.2);
    group.add(signTop);
  }
  if (isPolice) {
    const bar = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.18, 0.4), new THREE.MeshLambertMaterial({ color: 0xffffff, emissive: 0x888888 }));
    bar.position.set(0, 1.72, -0.2);
    group.add(bar);
    const lightR = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.2, 0.42), new THREE.MeshBasicMaterial({ color: 0xff2222 }));
    lightR.position.set(-0.32, 1.72, -0.2);
    group.add(lightR);
    const lightB = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.2, 0.42), new THREE.MeshBasicMaterial({ color: 0x2244ff }));
    lightB.position.set(0.32, 1.72, -0.2);
    group.add(lightB);
    group.userData.lightR = lightR;
    group.userData.lightB = lightB;
  }
  const wheelGeo = new THREE.CylinderGeometry(0.42, 0.42, 0.3, 10);
  const wheelMat = new THREE.MeshLambertMaterial({ color: 0x141414 });
  const wheels = [];
  for (const [wx, wz] of [[-0.95, 1.45], [0.95, 1.45], [-0.95, -1.45], [0.95, -1.45]]) {
    const wheel = new THREE.Mesh(wheelGeo, wheelMat);
    wheel.rotation.z = Math.PI / 2;
    wheel.position.set(wx, 0.42, wz);
    group.add(wheel);
    wheels.push(wheel);
  }
  const head = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.18, 0.1), new THREE.MeshBasicMaterial({ color: 0xfff2b0 }));
  head.position.set(0, 0.7, 2.22);
  group.add(head);
  // Tail lights, so a car reads from behind as well as from the front.
  const tail = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.16, 0.1), new THREE.MeshBasicMaterial({ color: 0xcc2222 }));
  tail.position.set(0, 0.7, -2.22);
  group.add(tail);
  group.userData.wheels = wheels;
  return group;
}

export function createCar(scene, x, z, angle, color, isPolice = false, isTaxi = false) {
  const mesh = buildCarMesh(color, isPolice, Math.random, isTaxi);
  mesh.position.set(x, 0, z);
  mesh.rotation.y = angle;
  scene.add(mesh);
  return {
    mesh,
    x, z, angle,
    speed: 0,
    health: 100,
    isPolice,
    isTaxi,
    color,
    parked: !isPolice,
    driver: null, // 'player' | 'traffic' | 'police' | 'courier' | null
    skid: 0,
    /** Arcade step: throttle -1..1, steer -1..1. Returns true when skidding. */
    drive(dt, throttle, steer) {
      const maxF = CAR.maxSpeed;
      const maxR = CAR.maxReverse;
      if (throttle > 0) this.speed += CAR.accel * throttle * dt;
      else if (throttle < 0) {
        this.speed += (this.speed > 0.5 ? -CAR.brake : CAR.reverseAccel * throttle) * dt;
      } else {
        this.speed -= this.speed * CAR.drag * dt;
        if (Math.abs(this.speed) < 0.2) this.speed = 0;
      }
      this.speed = Math.max(-maxR, Math.min(maxF, this.speed));
      const steerAmount = CAR.steer * steer * dt * Math.min(1, Math.abs(this.speed) / 8 + 0.25) * (this.speed < 0 ? -1 : 1);
      this.angle += steerAmount;
      this.skid = Math.abs(steer) > SKID.minSteer && Math.abs(this.speed) > SKID.minSpeed ? 1 : 0;
      this.x += Math.sin(this.angle) * this.speed * dt;
      this.z += Math.cos(this.angle) * this.speed * dt;
      mesh.position.set(this.x, 0, this.z);
      mesh.rotation.y = this.angle;
      for (const wheel of mesh.userData.wheels) wheel.rotation.x += this.speed * dt * 2.4;
      return this.skid === 1;
    },
    syncMesh() {
      mesh.position.set(this.x, 0, this.z);
      mesh.rotation.y = this.angle;
    },
    damage(amount) {
      this.health = Math.max(0, this.health - amount);
      return this.health <= 0;
    },
    remove() {
      scene.remove(mesh);
    },
  };
}

/** A parked, stealable car at a parking spot. */
export function spawnParkedCar(scene, spot, random) {
  const isTaxi = random() < 0.2;
  const color = isTaxi ? PALETTE.taxi : CAR_COLORS[Math.floor(random() * CAR_COLORS.length)];
  const car = createCar(scene, spot.x, spot.z, spot.angle, color, false, isTaxi);
  car.parked = true;
  return car;
}
