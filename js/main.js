/* ------------------------------------------------------------------ */
/* 依赖 -------------------------------------------------------------- */
import * as THREE from 'three';
import { OrbitControls } from '../three.js-r153/examples/jsm/controls/OrbitControls.js';

/* ===================== 全局常量 ===================== */
const SIZE_SCALE       = 4;
const ORBIT_SCALE      = 3;
const TARGET_FPS       = 60;
const MAX_DPR          = Math.min(devicePixelRatio, 2);
const MIN_DPR          = 1.0;
const DPR_STEP         = 0.1;
let   curDPR           = MAX_DPR;

const INSET_SIZE       = 300;  // 缩略图像素尺寸
const INSET_MARGIN     = 20;
const ICON_PX          = 16;   // 缩略图里球体直径（px）

/* ================== 运行时状态 & UI ==================== */
let followTarget = null;
const worldPos   = new THREE.Vector3();
let speedLevel   = 3;

const sidebar = document.getElementById('sidebar');

/* —— 退出聚焦按钮 —— */
const exitBtn = document.createElement('button');
exitBtn.id          = 'exitFollow';
exitBtn.textContent = '退出聚焦';
document.body.appendChild(exitBtn);

/* —— 行星信息弹窗 —— */
const infoBox = document.createElement('div');
infoBox.id = 'infoBox';
document.body.appendChild(infoBox);

/* —— 速率面板 —— */
const speedBox = document.createElement('div');
speedBox.id = 'speedBox';
sidebar.appendChild(speedBox);
for (let i = 1; i <= 5; i++) {
  const b = document.createElement('button');
  b.className   = 'speed-btn';
  b.textContent = i;
  if (i === speedLevel) b.classList.add('speed-active');
  b.onclick     = () => setSpeed(i);
  speedBox.appendChild(b);
}
function setSpeed(n) {
  speedLevel = n;
  speedBox.querySelectorAll('.speed-btn')
    .forEach(b => b.classList.toggle('speed-active', +b.textContent === n));
}

/* —— 缩略图容器 & Canvas —— */
const miniMapContainer = document.createElement('div');
miniMapContainer.id = 'miniMapContainer';
miniMapContainer.style.cssText = `
  position:fixed;
  left:${sidebar.clientWidth + INSET_MARGIN}px;
  bottom:${INSET_MARGIN}px;
  width:${INSET_SIZE}px;
  height:${INSET_SIZE}px;
  border-radius:12px;
  overflow:hidden;
  background:rgba(30,30,35,0.4);
  backdrop-filter:blur(8px);
  border:1px solid rgba(255,255,255,0.2);
  box-shadow:0 4px 12px rgba(0,0,0,0.5);
`;
document.body.appendChild(miniMapContainer);

const miniMapCanvas = document.createElement('canvas');
miniMapCanvas.id = 'miniMap';
miniMapCanvas.style.width  = '100%';
miniMapCanvas.style.height = '100%';
miniMapContainer.appendChild(miniMapCanvas);

/* —— 行星简介 —— */
const INFO = {
  Sun:     `<h3>☀️ 太阳</h3>G2V 主序星，每秒释放 3.8×10²⁶ W 能量。`,
  Mercury: `<h3>☿️ 水星</h3>最靠近太阳，昼夜温差约 600 °C。`,
  Venus:   `<h3>♀️ 金星</h3>厚 CO₂ + H₂SO₄ 云层，地表常年 465 °C。`,
  Earth:   `<h3>🌍 地球</h3>唯一已知孕育生命的行星。`,
  Moon:    `<h3>🌙 月球</h3>潮汐锁定；极区永久阴影坑含水冰。`,
  Mars:    `<h3>♂️ 火星</h3>拥有 Olympus Mons 与极冠冰帽。`,
  Jupiter: `<h3>♃ 木星</h3>氢氦巨星，大红斑已延续 350+ 年。`,
  Saturn:  `<h3>♄ 土星</h3>壮丽环系主要由水冰微粒构成。`,
  Uranus:  `<h3>♅ 天王星</h3>自转轴倾角 98°，产生 42 年极昼/夜。`,
  Neptune: `<h3>♆ 海王星</h3>风速可达 2100 km/h，暗斑风暴反复出现。`
};

/* ================================================================== */
/* 主初始化函数                                                      */
export function initSolarSystem() {
  /* --- 主场景 & 摄像机 & 渲染器 --- */
  const scene  = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(60, innerWidth/innerHeight, 0.1, 1e6);
  camera.position.set(0,150,400);

  const renderer = new THREE.WebGLRenderer({
    antialias:      true,
    powerPreference:'high-performance',
    precision:      'highp'
  });
  renderer.setSize(innerWidth, innerHeight);
  renderer.setPixelRatio(curDPR);
  renderer.outputEncoding          = THREE.sRGBEncoding;
  renderer.physicallyCorrectLights = true;
  renderer.toneMappingExposure     = 1.6;
  document.body.appendChild(renderer.domElement);

  /* --- OrbitControls --- */
  const controls = new OrbitControls(camera, renderer.domElement);

  /* --- miniScene & 正交相机 --- */
  const miniScene = new THREE.Scene();
  const MAP_RADIUS = ORBIT_SCALE * 500;
  const mapCam = new THREE.OrthographicCamera(
    -MAP_RADIUS, MAP_RADIUS, MAP_RADIUS, -MAP_RADIUS, 0.1, 1e6
  );
  mapCam.position.set(0, MAP_RADIUS, 0);
  mapCam.up.set(0,0,-1);
  mapCam.lookAt(0,0,0);

  /* --- 世界单位 ⇄ 缩略图像素 --- */
  const worldPerPixel   = (MAP_RADIUS * 2) / INSET_SIZE;
  const miniRadiusWorld = ICON_PX * worldPerPixel / 2;

  /* --- miniRenderer --- */
  const miniRenderer = new THREE.WebGLRenderer({
    canvas:         miniMapCanvas,
    antialias:      true,
    alpha:          true,
    powerPreference:'high-performance',
    precision:      'highp'
  });
  miniRenderer.setPixelRatio(window.devicePixelRatio);
  miniRenderer.setSize(INSET_SIZE, INSET_SIZE, false);
  miniRenderer.setClearColor(0x000000, 0);

  /* --- 星空背景 (主 + mini) --- */
  const skyG = new THREE.SphereGeometry(6000,64,64);
  skyG.scale(-1,1,1);
  const skyM = new THREE.MeshBasicMaterial({
    map:new THREE.TextureLoader().load('../textures/starfield.jpg')
  });
  scene.add(new THREE.Mesh(skyG, skyM));
  miniScene.add(new THREE.Mesh(skyG.clone(), skyM.clone()));

  /* --- 光源 (仅主场景) --- */
  scene.add(
    new THREE.PointLight(0xffffff,180000,1e4,2),
    new THREE.AmbientLight(0x202020,0.06)
  );

  /* --- 生成行星、轨道与 mini 球体 --- */
  const PLANETS = [
    {name:'Sun',     size:696340/30000*SIZE_SCALE, dist:0,               tex:'sun.jpg',     rot:0.0004, rev:0},
    {name:'Mercury', size:2439/2000*SIZE_SCALE,    dist:100*ORBIT_SCALE, tex:'mercury.jpg', rot:0.004 , rev:0.0048},
    {name:'Venus',   size:6051/2000*SIZE_SCALE,    dist:150*ORBIT_SCALE, tex:'venus.jpg',   rot:0.001 , rev:0.0035},
    {name:'Earth',   size:6371/2000*SIZE_SCALE,    dist:200*ORBIT_SCALE, tex:'earth.jpg',   rot:0.02  , rev:0.00298},
    {name:'Mars',    size:3390/2000*SIZE_SCALE,    dist:250*ORBIT_SCALE, tex:'mars.jpg',    rot:0.018 , rev:0.0024},
    {name:'Jupiter', size:69911/15000*SIZE_SCALE,  dist:300*ORBIT_SCALE, tex:'jupiter.jpg', rot:0.04  , rev:0.0013},
    {name:'Saturn',  size:58232/15000*SIZE_SCALE,  dist:350*ORBIT_SCALE, tex:'saturn.jpg',  rot:0.038 , rev:0.00097},
    {name:'Uranus',  size:25362/15000*SIZE_SCALE,  dist:400*ORBIT_SCALE, tex:'uranus.jpg',  rot:0.03  , rev:0.00068},
    {name:'Neptune', size:24622/15000*SIZE_SCALE,  dist:450*ORBIT_SCALE, tex:'neptune.jpg', rot:0.03  , rev:0.00054}
  ];
  const loader       = new THREE.TextureLoader();
  const planetMeshes = [];
  const miniMeshes   = {};
  const raycaster    = new THREE.Raycaster();

  PLANETS.forEach(p => {
    // 主场景行星
    const geo = new THREE.SphereGeometry(p.size, 64, 64);
    const mat = p.name==='Sun'
      ? new THREE.MeshBasicMaterial({ map:loader.load(`../textures/${p.tex}`), toneMapped:false, color:0xffffff })
      : new THREE.MeshStandardMaterial({ map:loader.load(`../textures/${p.tex}`) });
    const mesh = new THREE.Mesh(geo, mat);
    const pivot= new THREE.Object3D(); pivot.add(mesh);
    mesh.position.x = p.dist;
    scene.add(pivot);

    // 土星环
    if (p.name==='Saturn') {
      const ringG = new THREE.RingGeometry(p.size*1.2, p.size*2.2, 64);
      const uv    = ringG.attributes.uv;
      for (let i=0; i<uv.count; i++) uv.setY(i, 1-uv.getY(i));
      const ringM = new THREE.MeshBasicMaterial({
        map:loader.load('../textures/saturn_ring.png'),
        transparent:true, side:THREE.DoubleSide
      });
      const ring = new THREE.Mesh(ringG, ringM);
      ring.rotation.x = Math.PI/2;
      mesh.add(ring);
    }

    planetMeshes.push({ name:p.name, mesh, pivot, rot:p.rot, rev:p.rev, size:p.size });
    addItem(p.name, mesh, p.size);

    // 主轨道
    if (p.dist>0) {
      const seg=256, pos=new Float32Array(seg*3);
      for (let i=0; i<seg; i++){
        const θ=(i/seg)*Math.PI*2;
        pos[i*3]   = Math.cos(θ)*p.dist;
        pos[i*3+2] = Math.sin(θ)*p.dist;
      }
      const geoO = new THREE.BufferGeometry().setAttribute('position', new THREE.BufferAttribute(pos,3));
      const matO = new THREE.LineDashedMaterial({ color:0x888888, dashSize:5, gapSize:5 });
      matO.depthWrite = false;
      const loopMain = new THREE.LineLoop(geoO, matO);
      loopMain.computeLineDistances();
      scene.add(loopMain);
      const loopMini = new THREE.LineLoop(geoO, matO);
      loopMini.computeLineDistances();
      miniScene.add(loopMini);
    }

    // miniScene 球体
    const miniGeo = new THREE.SphereGeometry(miniRadiusWorld, 16, 16);
    const miniMat = new THREE.MeshBasicMaterial({ map:loader.load(`../textures/${p.tex}`) });
    const miniMesh= new THREE.Mesh(miniGeo, miniMat);
    miniScene.add(miniMesh);
    miniMesh.userData = { name:p.name, mesh, radius:p.size };
    miniMeshes[p.name] = miniMesh;
  });

  /* --- 月球系统 & 缩略图月球优化 --- */
  {
    const earth = planetMeshes.find(o=>o.name==='Earth');
    if (earth) {
      const ER = 6371/2000*SIZE_SCALE;
      const MR = 1737/2000*SIZE_SCALE;
      const MD = ER*4;

      // 主场景月球
      const mGeo = new THREE.SphereGeometry(MR,32,32);
      const mMat = new THREE.MeshStandardMaterial({ map:loader.load('../textures/moon.jpg') });
      const mMesh= new THREE.Mesh(mGeo, mMat);
      const mPivot= new THREE.Object3D();
      earth.mesh.add(mPivot);
      mMesh.position.x = MD;
      mPivot.add(mMesh);

      planetMeshes.push({ name:'Moon', mesh:mMesh, pivot:mPivot, rot:0.02, rev:0.01, size:MR });
      addItem('Moon', mMesh, MR);

      // 月球轨道
      const seg2=128,pos2=new Float32Array(seg2*3);
      for (let i=0; i<seg2; i++){
        const θ=(i/seg2)*Math.PI*2;
        pos2[i*3]   = Math.cos(θ)*MD;
        pos2[i*3+2]= Math.sin(θ)*MD;
      }
      const geoM= new THREE.BufferGeometry().setAttribute('position', new THREE.BufferAttribute(pos2,3));
      const matM= new THREE.LineDashedMaterial({ color:0x666666, dashSize:2, gapSize:2, depthWrite:false });
      const loopM= new THREE.LineLoop(geoM, matM);
      loopM.computeLineDistances();
      mPivot.add(loopM);

      // 缩略图月球球体（缩小到 60%）
      const MOON_MINI_FACTOR = 0.6;
      const miniMoonRadius   = miniRadiusWorld * MOON_MINI_FACTOR;
      const miniMoonGeo      = new THREE.SphereGeometry(miniMoonRadius, 16, 16);
      const miniMoonMat      = new THREE.MeshBasicMaterial({ map: loader.load('../textures/moon.jpg') });
      const miniMoon         = new THREE.Mesh(miniMoonGeo, miniMoonMat);
      miniScene.add(miniMoon);
      miniMoon.userData = { name:'Moon', mesh:mMesh, radius:MR };
      miniMeshes['Moon'] = miniMoon;
    }
  }

  /* --- 侧栏列表 & 聚焦 --- */
  function addItem(label, mesh, radius){
    const div = document.createElement('div');
    div.className = 'planet-item';
    div.textContent = label;
    div.onclick = () => focus(mesh, radius, label);
    sidebar.appendChild(div);
  }
  function focus(mesh, radius, label){
    mesh.getWorldPosition(worldPos);
    camera.position.set(
      worldPos.x,
      worldPos.y + radius*1.5,
      worldPos.z + radius*4
    );
    controls.target.copy(worldPos);
    controls.update();
    followTarget = mesh;
    exitBtn.classList.add('show');
    exitBtn.classList.remove('hide');
    infoBox.innerHTML = INFO[label] || `<h3>${label}</h3>`;
    infoBox.classList.add('show');
  }
  exitBtn.onclick = () => {
    followTarget = null;
    exitBtn.classList.add('hide');
    exitBtn.classList.remove('show');
    infoBox.classList.remove('show');
    controls.target.set(0,0,0);
    camera.position.set(0,150,400);
    controls.update();
  };

  /* --- 缩略图点击拾取 --- */
  miniMapCanvas.addEventListener('click', e => {
    const rect = miniMapCanvas.getBoundingClientRect();
    const mx = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    const my = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera({ x: mx, y: my }, mapCam);
    const hits = raycaster.intersectObjects(Object.values(miniMeshes));
    if (hits.length > 0) {
      const ud = hits[0].object.userData;
      focus(ud.mesh, ud.radius, ud.name);
    }
  });

  /* --- 窗口变化处理 --- */
  window.addEventListener('resize', () => {
    const w = innerWidth, h = innerHeight;
    camera.aspect = w/h; camera.updateProjectionMatrix();
    renderer.setSize(w,h);
    miniRenderer.setSize(INSET_SIZE, INSET_SIZE, false);
    miniMapContainer.style.left = `${sidebar.clientWidth + INSET_MARGIN}px`;
  });

  /* --- 动态 DPR & 动画循环 --- */
  const FRAME_WINDOW = TARGET_FPS;
  let accumTime = 0, accumCount = 0;
  const clock = new THREE.Clock();

  (function animate(){
    requestAnimationFrame(animate);

    const delta = clock.getDelta();
    const dt    = delta * speedLevel * 0.5;
    accumTime  += delta * 1000; accumCount++;

    // 自转 & 公转
    planetMeshes.forEach(p=>{
      p.mesh.rotation.y  += p.rot * dt * 60;
      p.pivot.rotation.y += p.rev * dt * 60;
    });

    // 持续跟随
    if (followTarget) {
      const offset = camera.position.clone().sub(controls.target);
      followTarget.getWorldPosition(worldPos);
      controls.target.copy(worldPos);
      camera.position.copy(worldPos).add(offset);
    }

    controls.update();
    renderer.render(scene, camera);

    // 更新 miniMeshes 位置
    planetMeshes.forEach(p=>{
      miniMeshes[p.name].position.copy(p.mesh.getWorldPosition(worldPos));
    });
    miniRenderer.render(miniScene, mapCam);

    // 动态 DPR 调整
    if (accumCount >= FRAME_WINDOW) {
      const avg = accumTime / accumCount, tgt = 1000 / TARGET_FPS;
      if (avg > tgt * 1.15 && curDPR > MIN_DPR) curDPR = Math.max(MIN_DPR, +(curDPR - DPR_STEP).toFixed(2));
      else if (avg < tgt * 0.85 && curDPR < MAX_DPR) curDPR = Math.min(MAX_DPR, +(curDPR + DPR_STEP).toFixed(2));
      renderer.setPixelRatio(curDPR);
      renderer.setSize(innerWidth, innerHeight, false);
      miniRenderer.setPixelRatio(window.devicePixelRatio);
      miniRenderer.setSize(INSET_SIZE, INSET_SIZE, false);
      accumTime = accumCount = 0;
    }
  })();
}
