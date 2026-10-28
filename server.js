// 배틀로얄 서버: 정적 파일 + WebSocket. 실행: npm install → npm start
import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { WebSocketServer } from 'ws';
import { genMap, spawnPoint, rng, MAP, ZONE, AMMO_PACK, MEDS, ARMOR, armorHit } from './public/mapgen.js';

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
const players = new Map(); let nextId = 1;
let G = newRound();
function newRound() { const seed = (Math.random() * 1e9) | 0; return { phase: 'lobby', seed, map: null, loot: new Map(), lootId: 1, zone: null, startN: 0, t0: 0, endAt: 0 }; }
function send(p, m) { if (p.ws.readyState === 1) p.ws.send(JSON.stringify(m)); }
function bcast(m, except) { const s = JSON.stringify(m); for (const p of players.values()) if (p !== except && p.ws.readyState === 1) p.ws.send(s); }
function lobbyMsg() { return { t: 'lobby', phase: G.phase, players: [...players.values()].map(p => ({ id: p.id, name: p.name, alive: p.alive, kills: p.kills, inGame: p.inGame })) }; }
function addLoot(type, k, n, x, y, z) { const id = G.lootId++; const it = { id, type, k, n, x: +x.toFixed(2), y: +y.toFixed(2), z: +z.toFixed(2) }; G.loot.set(id, it); return it; }
const L = it => [it.id, it.type, it.k, it.n, it.x, it.y, it.z];

function begin() {
  G.map = genMap(G.seed); const R = rng(G.seed ^ 0x5bd1e995);
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
  const half = MAP.half; G.zone = { cx: 0, cz: 0, r: half * 1.5, ncx: 0, ncz: 0, nr: half * 1.5, ph: 0, st: 'wait', tl: ZONE[0][0], dps: 0, fromR: 0, fromX: 0, fromZ: 0 };
  nextZone();
  G.phase = 'live'; G.t0 = Date.now(); G.startN = 0;
  const SR = rng(Date.now() & 0xffffff);
  for (const p of players.values()) {
    p.inGame = true; p.alive = true; p.hp = 100; p.kills = 0; p.inv = []; p.armor = null; G.startN++;
    const sp = spawnPoint(G.map, SR); p.pos = sp; p.yaw = 0; p.pitch = 0; p.s = 0; p.w = ''; p.a = 0;
    send(p, { t: 'begin', seed: G.seed, spawn: sp, loot: [...G.loot.values()].map(L), n: G.startN });
  }
  bcast(lobbyMsg()); console.log(`[게임 시작] ${G.startN}명, 시드 ${G.seed}`);
}
function nextZone() { const z = G.zone, ph = ZONE[z.ph]; if (!ph) return; const nr = ph[2]; const maxOff = Math.max(0, Math.min(z.r, MAP.half) - nr); const a = Math.random() * Math.PI * 2, d = Math.sqrt(Math.random()) * maxOff * .8;
  let ncx = z.cx + Math.cos(a) * d, ncz = z.cz + Math.sin(a) * d; const lim = MAP.half - nr - 5; ncx = Math.max(-lim, Math.min(lim, ncx)); ncz = Math.max(-lim, Math.min(lim, ncz));
  if (z.ph === 0) { ncx = (Math.random() - .5) * MAP.half; ncz = (Math.random() - .5) * MAP.half; }
  Object.assign(z, { ncx, ncz, nr, st: 'wait', tl: ph[0], dps: ZONE[Math.max(0, z.ph - 1)][3] * (z.ph ? 1 : .6) }); }
function tickZone(dt) { const z = G.zone; if (!z) return; z.tl -= dt; const ph = ZONE[z.ph];
  if (!ph) return;
  if (z.st === 'wait' && z.tl <= 0) { z.st = 'shrink'; z.tl = ph[1]; z.fromR = z.r; z.fromX = z.cx; z.fromZ = z.cz; z.dps = ph[3]; }
  else if (z.st === 'shrink') { const u = Math.min(1, 1 - z.tl / ph[1]); z.r = z.fromR + (z.nr - z.fromR) * u; z.cx = z.fromX + (z.ncx - z.fromX) * u; z.cz = z.fromZ + (z.ncz - z.fromZ) * u;
    if (z.tl <= 0) { z.r = z.nr; z.cx = z.ncx; z.cz = z.ncz; z.ph++; if (ZONE[z.ph]) nextZone(); else { z.st = 'final'; z.tl = 0; } } } }

function damage(p, dmg, byId, w, head) {
  if (!p.alive || G.phase !== 'live') return;
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
function checkEnd() { if (G.phase !== 'live') return; const alive = [...players.values()].filter(p => p.inGame && p.alive);
  if ((G.startN >= 2 && alive.length <= 1) || alive.length === 0) { G.phase = 'end'; G.endAt = Date.now() + 12000; const w = alive[0]; bcast({ t: 'win', id: w ? w.id : 0, name: w ? w.name : '', kills: w ? w.kills : 0 }); console.log('[게임 끝]', w ? w.name + ' 우승' : '생존자 없음'); } }

wss.on('connection', ws => {
  const p = { id: nextId++, ws, name: '플레이어', armor: null, alive: false, inGame: false, hp: 100, pos: [0, 0, 0], yaw: 0, pitch: 0, s: 0, w: '', a: 0, kills: 0, inv: [] }; players.set(p.id, p);
  send(p, { t: 'hello', id: p.id, phase: G.phase, seed: G.seed });
  ws.on('message', raw => { let m; try { m = JSON.parse(raw); } catch (e) { return; }
    switch (m.t) {
      case 'join': p.name = String(m.name || '플레이어').slice(0, 14) || '플레이어'; bcast(lobbyMsg()); break;
      case 'start': if (G.phase === 'lobby' && players.size > 0) begin(); break;
      case 'st': if (!p.alive) break; if (Array.isArray(m.p) && m.p.length === 3 && m.p.every(Number.isFinite)) p.pos = m.p.map(v => Math.max(-MAP.half - 5, Math.min(MAP.half + 5, v))); p.yaw = +m.y || 0; p.pitch = +m.pi || 0; p.s = m.s | 0; p.w = String(m.w || '').slice(0, 24); p.a = m.a ? 1 : 0; break;
      case 'shot': if (p.alive) bcast({ t: 'shot', id: p.id, w: m.w, o: m.o, d: m.d, q: m.q ? 1 : 0 }, p); break;
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
  ws.on('close', () => { players.delete(p.id); if (p.alive && G.phase === 'live') { p.alive = false; die(p, null, 'leave', false); } bcast(lobbyMsg()); if (!players.size) G = newRound(); });
  bcast(lobbyMsg());
});

let last = Date.now(), dmgAcc = 0;
setInterval(() => {
  const now = Date.now(), dt = (now - last) / 1000; last = now;
  if (G.phase === 'live') {
    tickZone(dt); dmgAcc += dt;
    if (dmgAcc >= 1) { dmgAcc -= 1; const z = G.zone; for (const p of players.values()) if (p.alive && z.dps > 0 && Math.hypot(p.pos[0] - z.cx, p.pos[2] - z.cz) > z.r) damage(p, z.dps, 0, 'zone', false); }
  }
  if (G.phase === 'end' && now > G.endAt) { G = newRound(); for (const p of players.values()) { p.inGame = false; p.alive = false; } bcast({ t: 'reset', seed: G.seed }); bcast(lobbyMsg()); }
  if (G.phase !== 'lobby') {
    const z = G.zone; const ps = []; for (const p of players.values()) if (p.inGame) ps.push([p.id, +p.pos[0].toFixed(2), +p.pos[1].toFixed(2), +p.pos[2].toFixed(2), +p.yaw.toFixed(3), +p.pitch.toFixed(3), p.s, p.w, p.alive ? 1 : 0, p.a, p.armor ? ARMOR[p.armor.k].lvl : 0]);
    bcast({ t: 'snap', ps, z: z && [+z.cx.toFixed(1), +z.cz.toFixed(1), +z.r.toFixed(1), +z.ncx.toFixed(1), +z.ncz.toFixed(1), z.nr, z.st, Math.max(0, Math.ceil(z.tl)), z.dps, z.ph], alive: ps.filter(x => x[8]).length });
  }
}, 50);

server.listen(PORT, () => {
  console.log(`배틀로얄 서버 실행 중: http://localhost:${PORT}`);
  import('os').then(os => { for (const l of Object.values(os.networkInterfaces()).flat()) if (l && l.family === 'IPv4' && !l.internal) console.log(`  같은 와이파이 친구: http://${l.address}:${PORT}`); });
});
