// 배틀로얄 서버: 정적 파일 + WebSocket. 실행: npm install → npm start
import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { WebSocketServer } from 'ws';
import { genMap, spawnPoint, rng, MAP, MAPS, MAP_IDS, ZONE, AMMO_PACK, MEDS, ARMOR, armorHit, losBlocked, mapAabbs, ZONE_MUL, falloff } from './public/mapgen.js';

const DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), 'public');
const PORT = +process.env.PORT || 3000;
const THREE_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), 'node_modules', 'three');
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.json': 'application/json', '.png': 'image/png', '.css': 'text/css' };

const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]); if (p === '/') p = '/index.html';
  const base = p.startsWith('/three/') ? THREE_DIR : DIR; const rel = p.startsWith('/three/') ? p.slice(7) : p;
  const f = path.join(base, path.normalize(rel).replace(/^([/\\])+/, ''));
  if (!f.startsWith(base)) { res.writeHead(403); return res.end(); }
  fs.readFile(f, (e, d) => { if (e) { res.writeHead(404); return res.end('not found'); } res.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream', 'Cache-Control': p.startsWith('/models/') || p.startsWith('/three/') ? 'public, max-age=86400' : 'no-cache' }); res.end(d); });
});
const wss = new WebSocketServer({ server });

/* ---------- 아이템 ---------- */
const GUNS = [['akm', '7.62mm', 10], ['assault_rifle_q', '5.56mm', 10], ['rifle_west', '5.56mm', 8], ['rifle_east', '5.45mm', 7], ['mp7', '4.6mm', 7], ['mpx', '9mm', 8], ['smg_west', '.45 ACP', 7],
  ['mossberg_590a1', '12게이지', 6], ['shotgun_pump_west', '12게이지', 6], ['mk14', '7.62mm', 3], ['sniper_west', '7.62mm', 3], ['awp', '.300 매그넘', 1], ['kar98k', '7.62mm', 4],
  ['glock', '9mm', 6], ['glock19_rigged', '9mm', 4], ['sig_p228_rigged', '9mm', 4], ['pistol_9mm_q', '9mm', 4], ['pistol_west', '9mm', 4]];
const THROWS = [['frag_west', 5], ['flashbang_west', 3], ['smoke_west', 3], ['incendiary_east', 2]];
const OPTS = [['reddot', 6], ['holo', 5], ['x2', 4], ['x4', 3], ['x8', 1]];
const MEDW = [['bandage', 8], ['kit', 3], ['med', 1]];
const ARMW = [['v1', 6], ['v2', 3], ['v3', 1]];
const ATTW = [['comp_ar', 3], ['flash_ar', 3], ['sup_ar', 1], ['comp_smg', 3], ['flash_smg', 3], ['sup_smg', 2], ['comp_sr', 1], ['flash_sr', 1], ['sup_sr', 1], ['sup_p', 2], ['choke', 2], ['duck', 1],
  ['grip_v', 4], ['grip_a', 3], ['grip_h', 3], ['grip_t', 3], ['grip_l', 3], ['mag_e_ar', 3], ['mag_q_ar', 3], ['mag_eq_ar', 1], ['mag_e_smg', 3], ['mag_q_smg', 3], ['mag_eq_smg', 1], ['mag_e_sr', 1], ['mag_q_sr', 1], ['mag_eq_sr', 1], ['mag_e_p', 2], ['stock_t', 2], ['cheek', 1], ['loops', 2]];
const pickW = (R, list) => { const tot = list.reduce((a, b) => a + b[b.length - 1], 0); let r = R() * tot; for (const x of list) { r -= x[x.length - 1]; if (r <= 0) return x; } return list[0]; };

/* ---------- 상태 ---------- */
// 방 설정 (로비에서 누구나 바꿀 수 있음): 맵, 봇 수, 봇 난이도
const CFG = { map: 'farm', bots: 0, diff: 'normal' };
const players = new Map(); let nextId = 1;
let G = newRound();
function newRound() { const seed = (Math.random() * 1e9) | 0; for (const [id, p] of players) if (p.bot) players.delete(id); return { phase: 'lobby', seed, mapId: CFG.map === 'random' ? MAP_IDS[Math.floor(Math.random() * MAP_IDS.length)] : CFG.map, map: null, loot: new Map(), lootId: 1, zone: null, startN: 0, humans: 0, t0: 0, endAt: 0 }; }
function send(p, m) { if (p.ws && p.ws.readyState === 1) p.ws.send(JSON.stringify(m)); }
function bcast(m, except) { const s = JSON.stringify(m); for (const p of players.values()) if (p !== except && p.ws && p.ws.readyState === 1) p.ws.send(s); }
function lobbyMsg() { return { t: 'lobby', phase: G.phase, cfg: CFG, maps: MAP_IDS.map(k => [k, MAPS[k].name]), players: [...players.values()].map(p => ({ id: p.id, name: p.name, alive: p.alive, kills: p.kills, inGame: p.inGame, bot: !!p.bot })) }; }
function addLoot(type, k, n, x, y, z) { const id = G.lootId++; const it = { id, type, k, n, x: +x.toFixed(2), y: +y.toFixed(2), z: +z.toFixed(2) }; G.loot.set(id, it); return it; }
const L = it => [it.id, it.type, it.k, it.n, it.x, it.y, it.z];

function begin() {
  if (CFG.map !== 'random') G.mapId = CFG.map; G.map = genMap(G.seed, G.mapId); G.aabbs = mapAabbs(G.map); const R = rng(G.seed ^ 0x5bd1e995);
  for (const [x, y, z] of G.map.loot) {
    const roll = R(); const jx = () => x + (R() - .5) * 1.2, jz = () => z + (R() - .5) * 1.2;
    if (roll < .3) { const g = pickW(R, GUNS); addLoot('gun', g[0], 1, x, y, z); addLoot('ammo', g[1], AMMO_PACK[g[1]], jx(), y, jz()); }
    else if (roll < .5) { const g = pickW(R, GUNS); addLoot('ammo', g[1], AMMO_PACK[g[1]], x, y, z); }
    else if (roll < .64) { const m = pickW(R, MEDW); addLoot('med', m[0], 1, x, y, z); }
    else if (roll < .72) { const a = pickW(R, ARMW); addLoot('armor', a[0], ARMOR[a[0]].dur, x, y, z); }
    else if (roll < .85) { const a = pickW(R, ATTW); addLoot('att', a[0], 1, x, y, z); }
    else if (roll < .93) { const o = pickW(R, OPTS); addLoot('optic', o[0], 1, x, y, z); }
    else { const t = pickW(R, THROWS); addLoot('throw', t[0], 1, x, y, z); }
  }
  const half = G.map.half; G.zs = Math.max(.6, half / 250); G.zone = { cx: 0, cz: 0, r: half * 1.5, ncx: 0, ncz: 0, nr: half * 1.5, ph: 0, st: 'wait', tl: ZONE[0][0], dps: 0, fromR: 0, fromX: 0, fromZ: 0 };
  nextZone();
  G.phase = 'live'; G.t0 = Date.now(); G.startN = 0;
  const SR = rng(Date.now() & 0xffffff);
  addBots(R);
  for (const p of players.values()) {
    p.inGame = true; p.alive = true; p.hp = 100; p.kills = 0; p.inv = p.bot ? p.inv : []; p.armor = p.bot ? p.armor : null; G.startN++; if (!p.bot) G.humans++;
    const sp = spawnPoint(G.map, SR); p.pos = sp; p.yaw = 0; p.pitch = 0; p.s = 0; p.w = p.bot ? p.bot.gun.k : ''; p.a = 0;
    send(p, { t: 'begin', seed: G.seed, map: G.mapId, spawn: sp, loot: [...G.loot.values()].map(L), n: G.startN });
  }
  bcast(lobbyMsg()); console.log(`[게임 시작] ${G.startN}명, 시드 ${G.seed}`);
}
function nextZone() { const z = G.zone, ph = ZONE[z.ph]; if (!ph) return; const nr = ph[2] * G.zs; const maxOff = Math.max(0, Math.min(z.r, G.map.half) - nr); const a = Math.random() * Math.PI * 2, d = Math.sqrt(Math.random()) * maxOff * .8;
  let ncx = z.cx + Math.cos(a) * d, ncz = z.cz + Math.sin(a) * d; const lim = G.map.half - nr - 5; ncx = Math.max(-lim, Math.min(lim, ncx)); ncz = Math.max(-lim, Math.min(lim, ncz));
  if (z.ph === 0) { ncx = (Math.random() - .5) * G.map.half; ncz = (Math.random() - .5) * G.map.half; }
  Object.assign(z, { ncx, ncz, nr, st: 'wait', tl: ph[0], dps: ZONE[Math.max(0, z.ph - 1)][3] * (z.ph ? 1 : .6) }); }
function tickZone(dt) { const z = G.zone; if (!z) return; z.tl -= dt; const ph = ZONE[z.ph];
  if (!ph) return;
  if (z.st === 'wait' && z.tl <= 0) { z.st = 'shrink'; z.tl = ph[1]; z.fromR = z.r; z.fromX = z.cx; z.fromZ = z.cz; z.dps = ph[3]; }
  else if (z.st === 'shrink') { const u = Math.min(1, 1 - z.tl / ph[1]); z.r = z.fromR + (z.nr - z.fromR) * u; z.cx = z.fromX + (z.ncx - z.fromX) * u; z.cz = z.fromZ + (z.ncz - z.fromZ) * u;
    if (z.tl <= 0) { z.r = z.nr; z.cx = z.ncx; z.cz = z.ncz; z.ph++; if (ZONE[z.ph]) nextZone(); else { z.st = 'final'; z.tl = 0; } } } }

function damage(p, dmg, byId, w, head) {
  if (!p.alive || G.phase !== 'live') return;
  if (p.bot && byId && byId !== p.id) { p.bot.lastHit = byId; p.bot.alertT = 6; }
  if (!head && w !== 'zone' && w !== 'incendiary_east' && p.armor) { const r = armorHit(p.armor, dmg); dmg = r.dmg; p.armor = r.armor; send(p, { t: 'armor', a: p.armor, broke: !!r.broke }); }
  dmg = Math.round(dmg); p.hp = Math.max(0, p.hp - dmg); const by = players.get(byId);
  send(p, { t: 'hp', hp: p.hp, from: by && by !== p ? [by.pos[0], by.pos[2]] : null });
  if (by && by !== p) send(by, { t: 'dealt', id: p.id, dmg, head: !!head, kill: p.hp <= 0 });
  if (p.hp <= 0) die(p, by && by !== p ? by : null, w, head);
}
function die(p, killer, w, head) {
  p.alive = false; if (killer) killer.kills++;
  bcast({ t: 'kill', killer: killer ? killer.id : 0, kn: killer ? killer.name : '', victim: p.id, vn: p.name, w: w || '', head: !!head });
  // 죽은 자리에 소지품을 떨어뜨림
  const add = []; if (p.armor) add.push(addLoot('armor', p.armor.k, p.armor.dur, p.pos[0], p.pos[1], p.pos[2] - .6)); p.armor = null; (p.inv || []).slice(0, 30).forEach((it, i) => { const a = i * 2.4, r = .5 + i * .12; add.push(addLoot(it.type, it.k, it.n, p.pos[0] + Math.cos(a) * r, p.pos[1], p.pos[2] + Math.sin(a) * r)); });
  if (add.length) bcast({ t: 'loot+', items: add.map(L) });
  p.inv = []; checkEnd(); bcast(lobbyMsg());
}
function checkEnd() { if (G.phase !== 'live') return; const alive = [...players.values()].filter(p => p.inGame && p.alive); const humansAlive = alive.filter(p => !p.bot).length;
  // 사람이 모두 죽으면 봇끼리 끝까지 갈 필요 없이 바로 끝냄 (처치가 제일 많은 봇이 우승)
  if ((G.startN >= 2 && alive.length <= 1) || alive.length === 0 || (G.humans > 0 && humansAlive === 0)) { G.phase = 'end'; G.endAt = Date.now() + 12000; const w = alive.length === 1 ? alive[0] : alive.sort((a, b) => b.kills - a.kills)[0]; bcast({ t: 'win', id: w ? w.id : 0, name: w ? w.name : '', kills: w ? w.kills : 0 }); console.log('[게임 끝]', w ? w.name + ' 우승' : '생존자 없음'); } }


/* ---------- AI 봇 ----------
   서버에서 직접 움직이고 쏨. 시야(지형·벽)를 확인하고, 난이도에 따라 반응 속도·조준 오차·헤드샷 확률이 달라짐 */
const BOT_NAMES = ['철수', '영희', '민수', '지훈', '서연', '도윤', '하준', '지아', '태오', '수빈', '예준', '하은', '시우', '유나', '건우', '로운'];
const DIFF = { easy: { react: 1.1, aim: .075, head: .05, view: 90, armor: ['v1', null] }, normal: { react: .7, aim: .048, head: .1, view: 120, armor: ['v1', 'v2'] }, hard: { react: .42, aim: .032, head: .18, view: 160, armor: ['v2', 'v3'] } };
// 봇 무기 (core.js의 W와 같은 값): 피해, 분당 연사, 탄창, 장전, 종류, 산탄, 선호 거리
const BOT_GUNS = [['akm', 47, 600, 30, 2.4, 'AR', 0, 40, '7.62mm'], ['assault_rifle_q', 41, 780, 30, 2.1, 'AR', 0, 40, '5.56mm'], ['rifle_west', 41, 720, 30, 2.1, 'AR', 0, 45, '5.56mm'], ['rifle_east', 44, 700, 30, 2.3, 'AR', 0, 40, '5.45mm'],
  ['mp7', 29, 950, 40, 1.9, 'SMG', 0, 18, '4.6mm'], ['mpx', 33, 850, 30, 1.9, 'SMG', 0, 18, '9mm'], ['smg_west', 39, 650, 25, 2, 'SMG', 0, 20, '.45 ACP'], ['mossberg_590a1', 26, 70, 8, 4, 'SG', 9, 8, '12게이지'],
  ['mk14', 61, 300, 20, 2.6, 'DMR', 0, 70, '7.62mm'], ['sniper_west', 58, 220, 20, 2.5, 'DMR', 0, 70, '7.62mm'], ['kar98k', 75, 40, 5, 3.2, 'SR', 0, 90, '7.62mm']];
function addBots(R) { const n = CFG.bots; const used = new Set();
  for (let i = 0; i < n; i++) { let nm; do nm = BOT_NAMES[Math.floor(Math.random() * BOT_NAMES.length)]; while (used.has(nm) && used.size < BOT_NAMES.length); used.add(nm);
    const D = DIFF[CFG.diff], g = BOT_GUNS[Math.floor(Math.random() * BOT_GUNS.length)]; const gun = { k: g[0], dmg: g[1], rpm: g[2], mag: g[3], rt: g[4], cls: g[5], pel: g[6], pref: g[7], cal: g[8] };
    const ak = D.armor[Math.floor(Math.random() * D.armor.length)];
    const p = { id: nextId++, ws: null, name: '봇 ' + nm, armor: ak ? { k: ak, dur: ARMOR[ak].dur } : null, alive: false, inGame: false, hp: 100, pos: [0, 0, 0], yaw: 0, pitch: 0, s: 0, w: gun.k, a: 0, kills: 0,
      inv: [{ type: 'gun', k: gun.k, n: 1 }, { type: 'ammo', k: gun.cal, n: AMMO_PACK[gun.cal] * 2 }, { type: 'med', k: 'bandage', n: 2 }],
      bot: { gun, D, ammo: gun.mag, reload: 0, cd: 0, think: Math.random() * .3, target: 0, seenT: 0, wp: null, wpT: 0, strafe: Math.random() < .5 ? 1 : -1, strafeT: 0, burst: 0, rest: 0, stuck: 0, lastHit: 0, alertT: 0, healT: 0, combatT: 0 } };
    players.set(p.id, p); } }
const EYE = 1.55;
function eyeOf(p) { return [p.pos[0], p.pos[1] + (p.s === 1 ? 1.05 : EYE), p.pos[2]]; }
function canSee(a, b) { return !losBlocked(G.map, eyeOf(a), [b.pos[0], b.pos[1] + 1.3, b.pos[2]], G.aabbs); }
function blockedAt(x, y, z) { for (const q of G.aabbs) if (x > q[0] - .35 && x < q[3] + .35 && z > q[2] - .35 && z < q[5] + .35 && y + 1.6 > q[1] && y + .45 < q[4]) return true; return false; }
function hearShot(p, quiet) { for (const b of players.values()) if (b.bot && b.alive && b !== p) { const d = Math.hypot(b.pos[0] - p.pos[0], b.pos[2] - p.pos[2]); if (d < (quiet ? 30 : 110)) { if (!b.bot.target) { b.bot.wp = [p.pos[0] + (Math.random() - .5) * 20, p.pos[2] + (Math.random() - .5) * 20]; b.bot.wpT = 12; } } } }
function tickBots(dt) { const z = G.zone; const all = [...players.values()].filter(p => p.inGame && p.alive);
  for (const p of all) { const pp = p._pp || p.pos; p.vel = p.vel === undefined ? 0 : p.vel * .8 + Math.hypot(p.pos[0] - pp[0], p.pos[2] - pp[2]) / Math.max(dt, .01) * .2; p._pp = p.pos.slice(); }
  for (const p of all) { if (!p.bot) continue; const B = p.bot, gun = B.gun, D = B.D; B.cd -= dt; B.think -= dt; B.reload -= dt; B.alertT -= dt; B.strafeT -= dt; B.rest -= dt; B.combatT -= dt;
    // 1) 목표 찾기 (0.3초마다)
    if (B.think <= 0) { B.think = .3; let best = null, bd = 1e9;
      for (const q of all) { if (q === p) continue; const d = Math.hypot(q.pos[0] - p.pos[0], q.pos[2] - p.pos[2]); if (d > D.view * (gun.cls === 'SR' || gun.cls === 'DMR' ? 1.4 : 1)) continue; const pri = d - (q.id === B.lastHit ? 60 : 0) - (q.bot ? 0 : 10); if (pri < bd && canSee(p, q)) { bd = pri; best = q; } }
      if (best) { if (B.target !== best.id) { B.target = best.id; B.seenT = 0; } B.combatT = 4; } else { if (B.target) { const t = players.get(B.target); if (t && t.alive) { B.wp = [t.pos[0], t.pos[2]]; B.wpT = 8; } } B.target = 0; if (B.lastHit && B.alertT > 0) { const t = players.get(B.lastHit); if (t && t.alive) { B.wp = [t.pos[0], t.pos[2]]; B.wpT = 6; } } } }
    const T = B.target ? players.get(B.target) : null; if (T && !T.alive) B.target = 0;
    // 2) 이동 목표
    let mx = 0, mz = 0, spd = 4.2; const zr = z ? z.r : 1e9, zd = z ? Math.hypot(p.pos[0] - z.cx, p.pos[2] - z.cz) : 0;
    if (z && zd > zr - 6 && (!T || zd > zr + 5)) { mx = z.cx - p.pos[0]; mz = z.cz - p.pos[2]; spd = 5.8; }
    else if (T) { const dx = T.pos[0] - p.pos[0], dz = T.pos[2] - p.pos[2], d = Math.hypot(dx, dz) || 1; const pref = gun.pref;
      if (B.strafeT <= 0) { B.strafeT = 1 + Math.random() * 2; B.strafe = Math.random() < .5 ? 1 : -1; }
      const fwdK = d > pref * 1.3 ? 1 : d < pref * .6 ? -.8 : 0; mx = dx / d * fwdK + (-dz / d) * B.strafe * .9; mz = dz / d * fwdK + (dx / d) * B.strafe * .9; spd = 3.6; }
    else { B.wpT -= dt; if (!B.wp || B.wpT <= 0 || Math.hypot(B.wp[0] - p.pos[0], B.wp[1] - p.pos[2]) < 4) { const a = Math.random() * 6.28, r = Math.sqrt(Math.random()) * Math.min(zr, G.map.half) * .8; B.wp = [(z ? z.cx : 0) + Math.cos(a) * r, (z ? z.cz : 0) + Math.sin(a) * r]; B.wpT = 15 + Math.random() * 10; }
      mx = B.wp[0] - p.pos[0]; mz = B.wp[1] - p.pos[2]; }
    const ml = Math.hypot(mx, mz); if (ml > .01) { mx /= ml; mz /= ml; const nx = p.pos[0] + mx * spd * dt, nz = p.pos[2] + mz * spd * dt; const lim = G.map.half - 2;
      const tryMove = (x, z2) => { x = Math.max(-lim, Math.min(lim, x)); z2 = Math.max(-lim, Math.min(lim, z2)); const y = G.map.h(x, z2); if (G.map.look && G.map.look.water && y < -.2) return false; if (blockedAt(x, y, z2)) return false; p.pos = [x, y, z2]; return true; };
      if (!tryMove(nx, nz) && !tryMove(nx, p.pos[2]) && !tryMove(p.pos[0], nz)) { B.stuck += dt; if (B.stuck > .6) { B.stuck = 0; B.strafe = -B.strafe; B.wp = null; } } else B.stuck = 0;
      if (!T) { const want = Math.atan2(-mx, -mz); const dy = ((want - p.yaw + Math.PI * 3) % (Math.PI * 2)) - Math.PI; p.yaw += Math.sign(dy) * Math.min(Math.abs(dy), dt * 4); p.pitch *= .9; } }
    p.s = 0;
    // 3) 조준과 사격
    if (T) { B.seenT += dt; const e = eyeOf(p), dx = T.pos[0] - e[0], dy = T.pos[1] + 1.25 - e[1], dz = T.pos[2] - e[2], d = Math.hypot(dx, dz); const want = Math.atan2(-dx, -dz);
      let dyaw = ((want - p.yaw + Math.PI * 3) % (Math.PI * 2)) - Math.PI; p.yaw += Math.sign(dyaw) * Math.min(Math.abs(dyaw), dt * 7); p.pitch = Math.atan2(dy, d); p.a = 1;
      if (B.reload > 0) { } else if (B.ammo <= 0) { B.reload = gun.rt; B.ammo = gun.mag; }
      else if (B.seenT > D.react && Math.abs(dyaw) < .12 && B.cd <= 0 && B.rest <= 0 && (gun.cls !== 'SG' || d < 28)) {
        B.cd = 60 / gun.rpm * (gun.cls === 'AR' || gun.cls === 'SMG' ? 1.15 : 1) + (gun.cls === 'SR' ? 1.1 : gun.cls === 'DMR' ? .35 : 0); B.ammo--; B.burst++;
        if ((gun.cls === 'AR' || gun.cls === 'SMG') && B.burst >= 3 + Math.floor(Math.random() * 5)) { B.burst = 0; B.rest = .25 + Math.random() * .5; }
        botShoot(p, T, d); } }
    else { p.a = 0; B.seenT = 0; if (B.ammo < gun.mag * .5 && B.reload <= 0 && B.combatT < 0) { B.reload = gun.rt; B.ammo = gun.mag; } }
    // 4) 싸움이 없으면 붕대
    if (!T && B.combatT < -6 && p.hp < 75) { B.healT += dt; if (B.healT > 4) { B.healT = 0; p.hp = Math.min(75, p.hp + 10); } } else B.healT = 0; } }
function botShoot(p, T, d) { const B = p.bot, gun = B.gun, D = B.D; const e = eyeOf(p); const tx = T.pos[0], ty = T.pos[1] + (T.s === 2 ? .3 : T.s === 1 ? .9 : 1.25), tz = T.pos[2];
  // 움직이는 목표, 멀수록, 봇이 움직일수록 빗나감
  const tv = T.vel || 0; const sig = D.aim * (1 + (T.bot ? 0 : .2)) * (1 + Math.min(1.2, tv * .12)) * (1 + d / 160) * (B.burst > 2 ? 1 + B.burst * .1 : 1) * (B.seenT < D.react + .6 ? 1.5 : 1);
  const dirs = [], n = gun.pel || 1; let hits = 0, head = false;
  for (let i = 0; i < n; i++) { const ex = (Math.random() + Math.random() + Math.random() - 1.5) * sig * (gun.pel ? 1.9 : 1), ey = (Math.random() + Math.random() + Math.random() - 1.5) * sig * (gun.pel ? 1.9 : 1);
    const vx = tx - e[0], vy = ty - e[1], vz = tz - e[2], L = Math.hypot(vx, vy, vz); const rx = -vz / L, rz = vx / L; const dir = [vx / L + rx * ex, vy / L + ey, vz / L + rz * ex]; const dl = Math.hypot(...dir); dirs.push(dir.map(v => +(v / dl).toFixed(4)));
    const miss = Math.hypot(ex, ey) * L; if (miss < (T.s === 2 ? .22 : .3)) { hits++; if (i === 0 && Math.random() < D.head) head = true; } }
  bcast({ t: 'shot', id: p.id, w: gun.k, o: e.map(v => +v.toFixed(2)), d: dirs, q: 0 }); hearShot(p, false);
  if (hits && T.alive) { const M = ZONE_MUL[gun.cls] || ZONE_MUL.AR; const dmg = gun.dmg * falloff(gun.cls, d) * (head ? M[0] : M[1]) * hits; const pt = [T.pos[0], T.pos[1] + (head ? 1.6 : 1.2), T.pos[2]]; const dl = Math.hypot(T.pos[0] - e[0], T.pos[2] - e[2]) || 1;
    bcast({ t: 'blood', p: pt.map(v => +v.toFixed(2)), d: [+((T.pos[0] - e[0]) / dl).toFixed(3), 0, +((T.pos[2] - e[2]) / dl).toFixed(3)], head });
    damage(T, Math.round(dmg), p.id, gun.k, head); } }

wss.on('connection', ws => {
  const p = { id: nextId++, ws, name: '플레이어', armor: null, alive: false, inGame: false, hp: 100, pos: [0, 0, 0], yaw: 0, pitch: 0, s: 0, w: '', a: 0, kills: 0, inv: [] }; players.set(p.id, p);
  send(p, { t: 'hello', id: p.id, phase: G.phase, seed: G.seed, map: G.mapId });
  ws.on('message', raw => { let m; try { m = JSON.parse(raw); } catch (e) { return; }
    switch (m.t) {
      case 'join': p.name = String(m.name || '플레이어').slice(0, 14) || '플레이어'; bcast(lobbyMsg()); break;
      case 'start': if (G.phase === 'lobby' && players.size > 0) begin(); break;
      case 'cfg': if (G.phase !== 'lobby') break; if (MAP_IDS.includes(m.map) || m.map === 'random') { CFG.map = m.map; G.mapId = m.map === 'random' ? G.mapId : m.map; } if (Number.isFinite(+m.bots)) CFG.bots = Math.max(0, Math.min(15, m.bots | 0)); if (['easy', 'normal', 'hard'].includes(m.diff)) CFG.diff = m.diff; bcast(lobbyMsg()); break;
      case 'st': if (!p.alive) break; if (Array.isArray(m.p) && m.p.length === 3 && m.p.every(Number.isFinite)) p.pos = m.p.map((v, i) => i === 1 ? v : Math.max(-(G.map ? G.map.half : MAP.half) - 5, Math.min((G.map ? G.map.half : MAP.half) + 5, v))); p.yaw = +m.y || 0; p.pitch = +m.pi || 0; p.s = m.s | 0; p.w = String(m.w || '').slice(0, 24); p.a = m.a ? 1 : 0; break;
      case 'shot': if (p.alive) { bcast({ t: 'shot', id: p.id, w: m.w, o: m.o, d: m.d, q: m.q ? 1 : 0 }, p); hearShot(p, !!m.q); } break;
      case 'throw': if (p.alive) bcast({ t: 'throw', id: p.id, k: m.k, p: m.p, v: m.v }, p); break;
      case 'hit': { const v = players.get(m.id); if (!v || !p.alive || v === p) break; const dist = Math.hypot(v.pos[0] - p.pos[0], v.pos[2] - p.pos[2]);
        const dmg = Math.max(0, Math.min(260, +m.dmg || 0)); if (dist > 700) break;
        if (Array.isArray(m.pt) && Array.isArray(m.d)) bcast({ t: 'blood', p: m.pt, d: m.d, head: !!m.head }, p);
        damage(v, dmg, p.id, m.w, m.head); break; }
      case 'self': { const by = players.get(m.by) ? m.by : p.id; damage(p, Math.max(0, Math.min(200, +m.dmg || 0)), by, m.kind, false); break; }
      case 'heal': { if (!p.alive) break; const med = MEDS[m.k]; if (!med) break; p.hp = Math.min(Math.max(p.hp, Math.min(med.cap, p.hp + med.heal)), 100); send(p, { t: 'hp', hp: p.hp, heal: 1 }); break; }
      case 'pick': { const it = G.loot.get(m.id); if (!it || !p.alive) { send(p, { t: 'loot-', id: m.id }); break; } if (Math.hypot(it.x - p.pos[0], it.z - p.pos[2]) > 4) break;
        G.loot.delete(it.id); bcast({ t: 'loot-', id: it.id });
        if (it.type === 'armor') { if (p.armor) bcast({ t: 'loot+', items: [L(addLoot('armor', p.armor.k, p.armor.dur, p.pos[0] + .6, p.pos[1], p.pos[2]))] }); p.armor = { k: it.k, dur: it.n }; send(p, { t: 'armor', a: p.armor }); }
        send(p, { t: 'got', item: L(it) }); break; }
      case 'drop': { if (!p.alive && G.phase === 'live') break; const add = (m.items || []).slice(0, 10).map((it, i) => addLoot(String(it.type), String(it.k), Math.max(1, it.n | 0), p.pos[0] + Math.cos(p.yaw + Math.PI + i) * .9, p.pos[1], p.pos[2] - Math.sin(p.yaw + Math.PI + i) * .9)); if (add.length) bcast({ t: 'loot+', items: add.map(L) }); break; }
      case 'inv': p.inv = Array.isArray(m.items) ? m.items.slice(0, 30) : []; break;
      case 'ping': send(p, { t: 'pong', c: m.c }); break;
    } });
  ws.on('close', () => { players.delete(p.id); if (p.alive && G.phase === 'live') { p.alive = false; die(p, null, 'leave', false); } bcast(lobbyMsg()); if (![...players.values()].some(q => !q.bot)) G = newRound(); });
  bcast(lobbyMsg());
});

let last = Date.now(), dmgAcc = 0;
setInterval(() => {
  const now = Date.now(), dt = (now - last) / 1000; last = now;
  if (G.phase === 'live') {
    tickZone(dt); tickBots(dt); dmgAcc += dt;
    if (dmgAcc >= 1) { dmgAcc -= 1; const z = G.zone; for (const p of players.values()) if (p.alive && z.dps > 0 && Math.hypot(p.pos[0] - z.cx, p.pos[2] - z.cz) > z.r) damage(p, z.dps, 0, 'zone', false); }
  }
  if (G.phase === 'end' && now > G.endAt) { G = newRound(); for (const p of players.values()) { p.inGame = false; p.alive = false; } bcast({ t: 'reset', seed: G.seed, map: G.mapId }); bcast(lobbyMsg()); }
  if (G.phase !== 'lobby') {
    const z = G.zone; const ps = []; for (const p of players.values()) if (p.inGame) ps.push([p.id, +p.pos[0].toFixed(2), +p.pos[1].toFixed(2), +p.pos[2].toFixed(2), +p.yaw.toFixed(3), +p.pitch.toFixed(3), p.s, p.w, p.alive ? 1 : 0, p.a, p.armor ? ARMOR[p.armor.k].lvl : 0]);
    bcast({ t: 'snap', ps, z: z && [+z.cx.toFixed(1), +z.cz.toFixed(1), +z.r.toFixed(1), +z.ncx.toFixed(1), +z.ncz.toFixed(1), z.nr, z.st, Math.max(0, Math.ceil(z.tl)), z.dps, z.ph], alive: ps.filter(x => x[8]).length });
  }
}, 50);

server.listen(PORT, () => {
  console.log(`배틀로얄 서버 실행 중: http://localhost:${PORT}`);
  import('os').then(os => { for (const l of Object.values(os.networkInterfaces()).flat()) if (l && l.family === 'IPv4' && !l.internal) console.log(`  같은 와이파이 친구: http://${l.address}:${PORT}`); });
});
