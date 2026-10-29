// 사람 모델: three.js 예제의 Soldier (Mixamo 리그). 걷기·뛰기 애니메이션 + 총 잡는 팔은 IK로 맞춤
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { clone as skClone } from 'three/addons/utils/SkeletonUtils.js';

let SRC = null; const waiting = [];
export function loadSoldier(url) { new GLTFLoader().load(url, g => { SRC = g; waiting.splice(0).forEach(f => f()); }, undefined, e => console.warn('사람 모델을 못 불러왔어요', e)); }
export const soldierReady = () => !!SRC;

const V = () => new THREE.Vector3();
const _a = V(), _b = V(), _c = V(), _d1 = V(), _d2 = V(), _S = V(), _E = V(), _H = V(), _T = V(), _P = V(), _f = V(), _r = V(), _u = V(0, 1, 0);
const _q = new THREE.Quaternion(), _q2 = new THREE.Quaternion(), _q3 = new THREE.Quaternion();
const hideMat = new THREE.MeshBasicMaterial({ visible: false });

function findBones(root) { const B = {}; root.traverse(o => { if (o.isBone) B[o.name.replace(/^mixamorig:?/, '')] = o; }); return B; }
// 뼈를 돌려서 자식 뼈가 target 방향을 보게 (월드 기준)
function aimBone(b, child, target) { b.getWorldPosition(_a); child.getWorldPosition(_b); _d1.subVectors(_b, _a).normalize(); _d2.subVectors(target, _a).normalize(); if (_d2.lengthSq() < 1e-8) return;
  _q.setFromUnitVectors(_d1, _d2); b.getWorldQuaternion(_q2); _q2.premultiply(_q); b.parent.getWorldQuaternion(_q3); b.quaternion.copy(_q3.invert().multiply(_q2)); b.updateMatrixWorld(true); }
function rotWorld(b, axis, ang) { _q.setFromAxisAngle(axis, ang); b.getWorldQuaternion(_q2); _q2.premultiply(_q); b.parent.getWorldQuaternion(_q3); b.quaternion.copy(_q3.invert().multiply(_q2)); }
// 두 마디 IK: 어깨-팔꿈치-손 (또는 엉덩이-무릎-발)
function ik2(up, lo, end, target, pole) { up.getWorldPosition(_S); lo.getWorldPosition(_E); end.getWorldPosition(_H);
  const a = _S.distanceTo(_E), b = _E.distanceTo(_H); _T.subVectors(target, _S); let d = _T.length(); if (d < 1e-5) return; _T.divideScalar(d); d = Math.max(Math.abs(a - b) + 1e-3, Math.min(a + b - 1e-3, d));
  const x = (a * a - b * b + d * d) / (2 * d), h = Math.sqrt(Math.max(0, a * a - x * x));
  _P.copy(pole).addScaledVector(_T, -pole.dot(_T)).normalize();
  _c.copy(_S).addScaledVector(_T, x).addScaledVector(_P, h); aimBone(up, lo, _c);
  _c.copy(_S).addScaledVector(_T, d); aimBone(lo, end, _c); }

// 맞는 판정 상자 (뼈에 붙음, 안 보임). [뼈, 가로, 세로, 앞뒤, 뼈 방향으로 띄움, 종류]
const HITS = [['Head', .24, .27, .27, .1, 'head'], ['Spine1', .4, .42, .27, .06, ''], ['Hips', .36, .24, .26, 0, ''], ['LeftArm', .11, .3, .11, .14, 'limb'], ['RightArm', .11, .3, .11, .14, 'limb'], ['LeftForeArm', .09, .28, .09, .13, 'limb'], ['RightForeArm', .09, .28, .09, .13, 'limb'],
  ['LeftUpLeg', .17, .44, .17, .22, 'limb'], ['RightUpLeg', .17, .44, .17, .22, 'limb'], ['LeftLeg', .13, .44, .13, .21, 'limb'], ['RightLeg', .13, .44, .13, .21, 'limb']];

export function createAvatar(id, name, opt = {}) {
  const root = new THREE.Group(), body = new THREE.Group(); root.add(body);
  const aim = new THREE.Group(); aim.position.set(0, 1.44, 0); root.add(aim); const gunTip = new THREE.Object3D(); aim.add(gunTip);
  const fl = new THREE.Sprite(new THREE.SpriteMaterial({ color: 0xffc070, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true })); fl.scale.setScalar(.35); fl.visible = false; gunTip.add(fl);
  const hit = [];
  // 모델이 오기 전 임시 판정
  const tmp = []; const tb = (w, h, d, y, kind) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), hideMat); m.position.y = y; m.userData.player = id; if (kind === 'head') m.userData.head = true; if (kind === 'limb') m.userData.limb = true; body.add(m); hit.push(m); tmp.push(m); };
  tb(.42, .7, .3, 1.15, ''); tb(.25, .27, .27, 1.66, 'head'); tb(.36, .85, .25, .45, 'limb');
  // 이름표
  if (name) { const c = document.createElement('canvas'); c.width = 256; c.height = 48; const g = c.getContext('2d'); g.font = '600 26px "IBM Plex Sans KR",sans-serif'; g.textAlign = 'center'; g.lineWidth = 5; g.strokeStyle = '#000'; g.strokeText(name, 128, 34); g.fillStyle = '#fff'; g.fillText(name, 128, 34);
    const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; var tag = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false })); tag.scale.set(1.2, .225, 1); tag.position.y = 2.05; root.add(tag); }
  // 방탄복 (가슴 뼈에 붙임)
  const vest = new THREE.Group(); vest.visible = false; const vestM = new THREE.MeshStandardMaterial({ color: 0x555544, roughness: .85 }), pouchM = new THREE.MeshStandardMaterial({ color: 0x3a3a30, roughness: .9 });
  const vp = (w, h, d, x, y, z, m = vestM) => { const me = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); me.position.set(x, y, z); me.castShadow = true; vest.add(me); return me; };
  vp(.36, .34, .05, 0, 0, .14); vp(.36, .36, .05, 0, 0, -.13); for (const sd of [-1, 1]) { vp(.04, .2, .25, sd * .19, -.06, 0); vp(.07, .03, .29, sd * .11, .2, 0); } for (let i = 0; i < 3; i++) vp(.09, .11, .045, -.1 + i * .1, -.1, .18, pouchM);
  const collar = new THREE.Mesh(new THREE.TorusGeometry(.1, .03, 8, 18), vestM); collar.rotation.x = Math.PI / 2; collar.position.y = .27; collar.visible = false; vest.add(collar);
  const U = root.userData = { body, aim, gunHold: aim, gunTip, gun: null, gunK: null, hit, tag, fl, vest, vestM, collar, vestLvl: 0, tR: null, tL: null, crouchT: 0, proneT: 0, deadT: 0, frame: Math.floor(Math.random() * 4), ready: false };
  const attach = () => {
    const model = skClone(SRC.scene); const hue = (id * .37) % 1, tint = new THREE.Color(0x8c8a74).lerp(new THREE.Color().setHSL(hue, .4, .45), .18); // 국방색 계열 + 사람마다 살짝 다른 색
    model.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = false; o.material = o.material.clone(); o.material.color.copy(tint); } });
    body.add(model); model.updateMatrixWorld(true);
    const B = findBones(model), mixer = new THREE.AnimationMixer(model), act = {};
    for (const c of SRC.animations) act[c.name.toLowerCase()] = mixer.clipAction(c);
    ['idle', 'walk', 'run'].forEach(k => { if (act[k]) { act[k].play(); act[k].setEffectiveWeight(k === 'idle' ? 1 : 0); } });
    tmp.forEach(m => { body.remove(m); hit.splice(hit.indexOf(m), 1); m.geometry.dispose(); });
    for (const [bn, w, h, d, off, kind] of HITS) { const b = B[bn]; if (!b) continue; const s = b.getWorldScale(_a).x || 1; const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), hideMat); m.scale.setScalar(1 / s); m.position.y = off / s; m.userData.player = root.userData.pid ?? id; if (kind === 'head') m.userData.head = true; if (kind === 'limb') m.userData.limb = true; b.add(m); hit.push(m); }
    if (B.Spine2) { const s = B.Spine2.getWorldScale(_a).x || 1; vest.scale.setScalar(1 / s); B.Spine2.add(vest); }
    Object.assign(U, { model, B, mixer, act, ready: true });
  };
  if (SRC) attach(); else waiting.push(attach);
  if (opt.scene) opt.scene.add(root);
  return root;
}
// 판정 상자의 주인 바꾸기 (허수아비용)
export function setAvatarOwner(av, pid) { av.userData.pid = pid; av.userData.hit.forEach(m => m.userData.player = pid); const U = av.userData; const t = setInterval(() => { if (U.ready) { U.hit.forEach(m => m.userData.player = pid); clearInterval(t); } }, 200); }

// 매 프레임: st = { spd, stance(0 서기 1 앉기 2 엎드림), pitch, dead, dist }
export function poseAvatar(av, dt, st) { const U = av.userData;
  const H = Math.PI / 2, k = 1 - Math.pow(.0005, dt);
  U.crouchT += ((st.stance === 1 && !st.dead ? 1 : 0) - U.crouchT) * k; U.proneT += ((st.stance === 2 && !st.dead ? 1 : 0) - U.proneT) * k;
  if (st.dead) U.deadT = Math.min(1, U.deadT + dt * 2.2); else U.deadT = 0;
  // 몸 전체: 엎드리면 앞으로 눕고, 죽으면 뒤로 넘어짐
  const pr = U.proneT, de = U.deadT * U.deadT;
  U.body.rotation.x = -H * .97 * pr + H * .97 * de; U.body.position.set(0, .1 * pr + .08 * de, .85 * pr - .1 * de);
  U.aim.position.set(.0, 1.44 - .47 * U.crouchT - 1.2 * pr, -.5 * pr); U.aim.rotation.x = Math.max(-.6, Math.min(.6, st.pitch)) * (1 - pr * .6);
  if (U.gun) U.gun.visible = !st.dead;
  if (!U.ready) return;
  // 그림자는 가까운 사람만 (멀리 있는 그림자는 안 보이는데 비용만 큼)
  const sh = (st.dist || 0) < 45; if (U.shadowOn !== sh) { U.shadowOn = sh; U.model.traverse(o => { if (o.isMesh) o.castShadow = sh; }); }
  // 멀리 있으면 애니메이션을 띄엄띄엄 계산
  U.acc = (U.acc || 0) + dt; U.frame++; const far = (st.dist || 0) > 70; if (far && U.frame % 4) return; const adt = U.acc; U.acc = 0;
  const A = U.act, spd = st.dead || pr > .5 ? 0 : st.spd;
  const run = Math.max(0, Math.min(1, (spd - 3.2) / 1.6)), mv = Math.max(0, Math.min(1, spd / 1.2));
  if (A.idle) A.idle.setEffectiveWeight(1 - mv); if (A.walk) { A.walk.setEffectiveWeight(mv * (1 - run)); A.walk.timeScale = Math.max(.6, Math.min(1.7, spd / (U.crouchT > .5 ? 1.0 : 1.5))); } if (A.run) { A.run.setEffectiveWeight(mv * run); A.run.timeScale = Math.max(.7, Math.min(1.4, spd / 5)); }
  if (!st.dead || U.deadT < 1) U.mixer.update(st.dead ? 0 : adt);
  av.updateMatrixWorld(true); const B = U.B; if (!B.Hips) return;
  av.getWorldDirection(_f).negate(); _r.set(1, 0, 0).applyQuaternion(av.getWorldQuaternion(_q3)); // 앞(-z)과 오른쪽
  // 앉기: 엉덩이를 내리고 발은 제자리 (다리 IK)
  if (U.crouchT > .02 && B.LeftFoot) { const fl = B.LeftFoot.getWorldPosition(V()), fr = B.RightFoot.getWorldPosition(V());
    const hp = B.Hips.getWorldPosition(_a); hp.y -= .46 * U.crouchT; hp.addScaledVector(_f, -.08 * U.crouchT); B.Hips.position.copy(B.Hips.parent.worldToLocal(hp)); B.Hips.updateMatrixWorld(true);
    const pole = _c.copy(_f); ik2(B.LeftUpLeg, B.LeftLeg, B.LeftFoot, fl, pole.clone()); ik2(B.RightUpLeg, B.RightLeg, B.RightFoot, fr, pole.clone()); }
  // 위아래 보기: 허리와 목을 나눠서 젖힘
  if (!st.dead && B.Spine1) { const p = U.aim.rotation.x; rotWorld(B.Spine, _r, p * .25 + .12 * U.crouchT); B.Spine.updateMatrixWorld(true); rotWorld(B.Spine1, _r, p * .25); B.Spine1.updateMatrixWorld(true); rotWorld(B.Spine2, _r, p * .2); B.Spine2.updateMatrixWorld(true); if (B.Head) { rotWorld(B.Head, _r, p * .25); B.Head.updateMatrixWorld(true); } }
  // 팔: 총 손잡이로 (없으면 애니메이션 그대로)
  if (!st.dead && U.tR && B.RightArm) { U.aim.updateMatrixWorld(true);
    const tr = U.aim.localToWorld(_b.copy(U.tR)); const pole = V().copy(_r).multiplyScalar(.6).add(_u.clone().multiplyScalar(-1)).addScaledVector(_f, -.3); ik2(B.RightArm, B.RightForeArm, B.RightHand, tr, pole);
    if (U.tL) { const tl = U.aim.localToWorld(V().copy(U.tL)); const pl = V().copy(_r).multiplyScalar(-.5).add(_u.clone().multiplyScalar(-1)); ik2(B.LeftArm, B.LeftForeArm, B.LeftHand, tl, pl); }
    // 손가락이 총 앞쪽을 향하게
    const gf = V(0, 0, -1).transformDirection(U.aim.matrixWorld); if (B.RightHand.children[0]) aimBone(B.RightHand, B.RightHand.children[0], B.RightHand.getWorldPosition(V()).addScaledVector(gf, .1).addScaledVector(_u, -.04));
    if (U.tL && B.LeftHand.children[0]) aimBone(B.LeftHand, B.LeftHand.children[0], B.LeftHand.getWorldPosition(V()).addScaledVector(gf, .08).addScaledVector(_r, .04)); }
}
