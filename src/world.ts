import {
  createEngine, createSceneContext, createFreeCamera, enableOrthographicCamera,
  createHemisphericLight, createDirectionalLight, createStandardMaterial,
  createBox, createSphere, createCylinder, createTransformNode, setParent,
  addToScene, registerScene, startEngine, onBeforeRender, resizeEngine, setSubtreeVisible,
  type SceneNode, type StandardMaterialProps,
} from '@babylonjs/lite';
import { platforms, coinLocations, FLAG_LOWER_SECONDS, type Game } from './game';

export async function createWorld(canvas: HTMLCanvasElement, game: Game, update: (dt: number) => void) {
  const engine = await createEngine(canvas, { msaaSamples: 4 });
  const scene = createSceneContext(engine);
  scene.clearColor = { r: .64, g: .83, b: .85, a: 1 };
  const camera = createFreeCamera({ x: 7, y: 6.1, z: -22 }, { x: 7, y: 1.7, z: 0 });
  const bounds = enableOrthographicCamera(camera, { halfHeight: 4.7 });
  scene.camera = camera;
  const ambient = createHemisphericLight([0, 1, -.2], .8);
  ambient.groundColor = [.5, .55, .43];
  addToScene(scene, ambient);
  addToScene(scene, createDirectionalLight([-.4, -1, .5], .35));
  const materials = new Map<string, StandardMaterialProps>();
  function material(hex: string) {
    if (materials.has(hex)) return materials.get(hex)!;
    const value = parseInt(hex.replace('#', ''), 16);
    const mat = createStandardMaterial();
    mat.diffuseColor = [(value >> 16 & 255) / 255, (value >> 8 & 255) / 255, (value & 255) / 255];
    mat.specularColor = [.04, .04, .04];
    materials.set(hex, mat); return mat;
  }
  function place<T extends SceneNode>(node: T, x: number, y: number, z: number, parent?: SceneNode): T {
    if (parent) setParent(node, parent);
    node.position.x = x; node.position.y = y; node.position.z = z;
    addToScene(scene, node); return node;
  }
  function box(x: number, y: number, z: number, w: number, h: number, d: number, color: string, parent?: SceneNode) {
    const mesh = createBox(engine, { width: w, height: h, depth: d });
    mesh.material = material(color); return place(mesh, x, y, z, parent);
  }
  function sphere(x: number, y: number, z: number, size: number, color: string, parent?: SceneNode) {
    const mesh = createSphere(engine, { diameter: size, segments: 12 });
    mesh.material = material(color); return place(mesh, x, y, z, parent);
  }
  function cylinder(x: number, y: number, z: number, diameter: number, height: number, color: string, parent?: SceneNode) {
    const mesh = createCylinder(engine, { diameter, height, tessellation: 24 });
    mesh.material = material(color); return place(mesh, x, y, z, parent);
  }
  // A shallow toy landscape: collision surfaces sit on a single, readable plane.
  for (const p of platforms) {
    const ground = p.top === 0, width = p.right - p.left;
    box((p.left + p.right) / 2, (p.top + p.bottom) / 2, .2, width, p.top - p.bottom, 2.4, ground ? '#c08e63' : '#dd9a62');
    box((p.left + p.right) / 2, p.top - .08, .2, width + .06, .16, 2.5, ground ? '#8ba95c' : '#f0bb7d');
    if (ground) {
      box((p.left + p.right) / 2, -.32, -1.02, width, .3, .03, '#a67b54');
      for (let x = p.left + .6; x < p.right; x += 1.2) {
        box(x, -.8, -1.02, .035, .48, .04, '#b4825c');
        if (x + .675 < p.right) box(x + .4, -1.9, -1.02, .55, .045, .04, '#b4825c');
      }
    } else {
      for (let x = p.left + .8; x < p.right; x += .8) box(x, p.top - .32, -1.02, .025, .38, .04, '#bc7b4d');
    }
  }
  // Distant hills and trees never obscure the course.
  for (let i = 0; i < 15; i++) {
    const x = i * 5.7 - 12;
    const hill = sphere(x, -.45, 8 + i % 3, 7 + i % 4, i % 2 ? '#a9c4a2' : '#98b99a');
    hill.scaling.y = .7; hill.scaling.z = .25;
  }
  for (let i = 0; i < 12; i++) {
    const x = i * 6 + 2;
    cylinder(x, .5, 4.2, .22, 2.6, '#a78a68');
    const crown = sphere(x, 2.05, 4.2, 2.2, i % 2 ? '#7f9e6c' : '#94ad76');
    crown.scaling.y = 1.2;
  }
  for (let i = 0; i < 9; i++) {
    const x = i * 9 - 10, y = 5.4 + (i % 3) * .65;
    for (let j = 0; j < 3; j++) {
      const cloud = sphere(x + j * .65, y + (j === 1 ? .23 : 0), 9, 1.3, '#e8efdc');
      cloud.scaling.y = .6; cloud.scaling.z = .45;
    }
  }
  const sun = sphere(-3, 6, 12, 1.8, '#f9deb0'); sun.scaling.z = .3;
  for (const [l, r] of [[-2, 11], [15, 27], [31, 42], [46, 58]]) {
    for (let x = l; x < r; x += 2.1) {
      const tuft = sphere(x, .08, 1.12, .3, '#77964d'); tuft.scaling.y = .55;
      if (Math.floor(x) % 3 === 0) {
        cylinder(x + .4, .15, .85, .035, .3, '#7d914c');
        sphere(x + .4, .33, .85, .17, '#f2d689');
      }
    }
  }
  // An original little cap-wearing adventurer, built entirely from primitives.
  const hero = place(createTransformNode('hero'), game.x, 0, -.2);
  box(0, .51, 0, .55, .45, .4, '#e16b42', hero);
  box(0, .32, -.035, .5, .23, .44, '#536d73', hero);
  box(-.12, .63, -.23, .075, .19, .035, '#536d73', hero);
  box(.12, .63, -.23, .075, .19, .035, '#536d73', hero);
  sphere(-.12, .53, -.25, .065, '#f4cb76', hero);
  sphere(.12, .53, -.25, .065, '#f4cb76', hero);
  box(0, .91, 0, .48, .37, .44, '#f1c59a', hero);
  box(0, 1.13, 0, .54, .16, .48, '#e16b42', hero);
  box(.13, 1.05, -.13, .64, .065, .52, '#dc6139', hero);
  box(.13, .93, -.231, .055, .065, .025, '#3d463c', hero);
  box(.31, .86, -.04, .14, .13, .2, '#e9b58a', hero);
  const leftLeg = box(-.16, .14, 0, .2, .26, .32, '#536d73', hero);
  const rightLeg = box(.16, .14, 0, .2, .26, .32, '#536d73', hero);
  box(.025, -.07, -.04, .27, .13, .4, '#514a3b', leftLeg);
  box(.025, -.07, -.04, .27, .13, .4, '#514a3b', rightLeg);
  const arm = box(-.34, .51, 0, .15, .33, .24, '#eac39b', hero);
  box(.34, .51, 0, .15, .33, .24, '#eac39b', hero);
  const shadow = cylinder(game.x, .012, -.2, .9, .013, '#789452'); shadow.scaling.z = .55;

  const coins = coinLocations.map(([x, y], i) => {
    const node = place(createTransformNode(`coin-${i}`), x, y, -.15);
    const coin = cylinder(0, 0, 0, .43, .095, '#eeb644', node); coin.rotation.x = Math.PI / 2;
    const center = cylinder(0, 0, -.053, .3, .012, '#ffce61', node); center.rotation.x = Math.PI / 2;
    box(0, 0, -.066, .045, .2, .012, '#d69b32', node);
    return node;
  });
  const enemy = place(createTransformNode('beetle'), game.enemyX, .29, -.1);
  const shell = sphere(0, .07, 0, .7, '#ad674a', enemy); shell.scaling.y = .75;
  box(0, .3, -.04, .025, .04, .5, '#774c3a', enemy);
  sphere(-.2, .03, -.27, .18, '#fff0c8', enemy); sphere(.2, .03, -.27, .18, '#fff0c8', enemy);
  sphere(-.2, .03, -.35, .07, '#394736', enemy); sphere(.2, .03, -.35, .07, '#394736', enemy);
  for (const x of [-.23, .23]) box(x, -.2, -.04, .2, .14, .5, '#66533d', enemy);
  cylinder(59, 2, .3, .07, 4, '#e8ddbd');
  sphere(59, 4.03, .3, .16, '#edba55');
  const flag = place(createTransformNode('flag'), 59, 3.45, .3);
  box(.62, 0, 0, 1.2, .66, .06, '#e86b43', flag);
  box(.55, 0, -.05, .25, .25, .04, '#ffe2ac', flag).rotation.z = Math.PI / 4;
  box(59, .1, .3, .6, .2, .7, '#e4c58d');
  // A little finish gate and a sign at the trailhead.
  box(61.8, 1, 1.5, 1.8, 2, 1.5, '#e7d1a5');
  const roof = box(61.8, 2.15, 1.5, 1.65, 1.65, 1.6, '#b57354'); roof.rotation.z = Math.PI / 4;
  box(61.8, .6, .71, .52, 1.2, .04, '#8f805d');
  box(3.1, .5, .8, .1, 1, .1, '#a48a62');
  box(3.1, .92, .8, .9, .42, .14, '#e8cb94');
  box(3.19, .93, .71, .42, .055, .015, '#926b45');
  const signTip = box(3.38, .93, .71, .15, .15, .02, '#926b45'); signTip.rotation.z = Math.PI / 4;

  const initialAspect = canvas.clientWidth / canvas.clientHeight;
  let clock = 0, cameraX = Math.max(2, bounds.halfHeight * initialAspect - 2);
  camera.position.x = cameraX; camera.target.x = cameraX;
  new ResizeObserver(() => {
    resizeEngine(engine);
    bounds.halfHeight = canvas.clientWidth < 600 ? 4.5 : 4.7;
  }).observe(canvas);
  onBeforeRender(scene, deltaMs => {
    const dt = Math.min(deltaMs / 1000, .1); clock += dt;
    update(dt);
    hero.position.x = game.x; hero.position.y = game.y;
    hero.scaling.x = game.facing;
    const stride = game.grounded ? Math.sin(clock * 17) * Math.min(Math.abs(game.vx) / 4.8, 1) : .3;
    leftLeg.rotation.z = stride * .5; rightLeg.rotation.z = -stride * .5; arm.rotation.z = -stride * .4;
    shadow.position.x = game.x;
    shadow.scaling.x = Math.max(.3, 1 - game.y * .13);
    setSubtreeVisible(shadow, game.y >= 0 && platforms.some(p => p.top === 0 && game.x >= p.left && game.x <= p.right));
    coins.forEach((node, i) => {
      setSubtreeVisible(node, !game.coins[i]);
      node.rotation.y = clock * 1.9 + i;
      node.position.y = coinLocations[i][1] + Math.sin(clock * 2.7 + i) * .07;
    });
    enemy.position.x = game.enemyX;
    const squash = game.enemyAlive ? 0 : Math.min(1, game.enemySquashTime / .14);
    const squashEase = 1 - (1 - squash) ** 3;
    enemy.scaling.y = 1 - .82 * squashEase;
    enemy.scaling.x = 1 + .3 * squashEase;
    enemy.scaling.z = 1 + .15 * squashEase;
    // Keep the feet on the ground as the body flattens.
    enemy.position.y = game.enemyAlive ? .29 + Math.sin(clock * 10) * .025 : .02 + .27 * enemy.scaling.y;
    setSubtreeVisible(enemy, game.enemyAlive || game.enemySquashTime < 1);
    const flagProgress = game.status === 'won' ? Math.min(1, game.finishTime / FLAG_LOWER_SECONDS) : 0;
    const flagEase = flagProgress * flagProgress * (3 - 2 * flagProgress);
    flag.position.y = 3.45 - 2.85 * flagEase;
    const aspect = canvas.clientWidth / canvas.clientHeight;
    const halfWidth = bounds.halfHeight * aspect;
    const minCamera = Math.max(2, halfWidth - 2);
    const maxCamera = Math.max(minCamera, 64 - halfWidth);
    const target = Math.max(minCamera, Math.min(maxCamera, game.x + (aspect > 1.4 ? 3 : 1.4)));
    cameraX += (target - cameraX) * Math.min(1, dt * 5);
    camera.position.x = cameraX; camera.target.x = cameraX;
  });
  await registerScene(scene);
  await startEngine(engine);
}
