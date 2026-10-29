// 시드 하나로 서버와 모든 클라이언트가 같은 맵을 만듦 (three.js 없이 순수 데이터).
export const MAP = { half: 250 };
export function rng(seed) { let a = seed >>> 0; return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

/* 맵 5종: 장식은 빼고 엄폐물(건물·모래주머니·방벽·컨테이너·바위·폐벽) 위주. 언덕은 고지대 교전용.
   hills: [개수, 높이 범위, 반지름 범위], mesa: 꼭대기가 평평한 언덕, towns: 마을 수, look: 색 */
export const MAPS = {
  farm: { name: '초원 마을', half: 220, hills: [11, [4, 13], [25, 60]], towns: 5, houses: [5, 9], cover: 1, rocks: 60,
    look: { g1: '#55663a', g2: '#7d7a50', g3: '#8c8a80', sky: ['#5b7fa8', '#a9bccb', '#d8cdb8', '#6d6a5c'], fog: 0xb4b8b4, sun: 0xfff0d8, hemi: [0xc7d6e8, 0x4a4434], wall: { brick: 0x8a4c3c, plaster: 0xb9ad97 } } },
  desert: { name: '사막 협곡', half: 230, hills: [15, [6, 20], [22, 50]], mesa: 1, towns: 4, houses: [4, 7], cover: 1.1, rocks: 80,
    look: { g1: '#c4a56c', g2: '#b0824f', g3: '#9a6a44', sky: ['#4f86c0', '#9cc2dc', '#f0dcb4', '#b08860'], fog: 0xe0cca4, sun: 0xfff0d0, hemi: [0xd8e4f0, 0x8a6a40], wall: { brick: 0xc89a6a, plaster: 0xd8c4a0 } } },
  snow: { name: '설원 고지', half: 210, hills: [14, [6, 24], [24, 55]], towns: 4, houses: [4, 7], cover: 1, rocks: 70,
    look: { g1: '#e6ebee', g2: '#c8d0d6', g3: '#7c848c', sky: ['#7a90a8', '#b8c6d4', '#e4e8ec', '#9aa4ae'], fog: 0xdfe6ec, sun: 0xf2f6ff, hemi: [0xe8eef6, 0x7a8088], wall: { brick: 0x6a5a50, plaster: 0xa8a49c } } },
  ruins: { name: '폐허 도시', half: 150, hills: [4, [2, 6], [20, 40]], towns: 0, grid: 1, cover: 1.4, rocks: 30,
    look: { g1: '#6b6862', g2: '#57544e', g3: '#45423e', sky: ['#4a5260', '#8a8e94', '#b8b2a6', '#5a5650'], fog: 0x9a9790, sun: 0xffe8cc, hemi: [0xb0b8c4, 0x403c36], wall: { brick: 0x7a5a4a, plaster: 0x9a968c } } },
  island: { name: '바위섬', half: 170, hills: [6, [5, 14], [20, 40]], island: 1, towns: 3, houses: [4, 7], cover: 1, rocks: 70,
    look: { g1: '#6a8a44', g2: '#d8c890', g3: '#8a8478', sky: ['#3f7fc4', '#9cd0ec', '#e8f0ec', '#5a8aa0'], fog: 0xbfd8e4, sun: 0xfff4dc, hemi: [0xcfe4f4, 0x4a5a3a], wall: { brick: 0x9a5a44, plaster: 0xe0d8c4 }, water: 1 } },
};
export const MAP_IDS = Object.keys(MAPS);

export function genMap(seed, id = 'farm') {
  const M = MAPS[id] || MAPS.farm, H = M.half;
  const R = rng(seed), rr = (a, b) => a + R() * (b - a);
  const boxes = [], rocks = [], loot = [], foot = [], names = [];
  /* ---- 지형 높이 ---- */
  const hills = []; for (let i = 0; i < M.hills[0]; i++) hills.push([rr(-H * .85, H * .85), rr(-H * .85, H * .85), rr(...M.hills[2]), rr(...M.hills[1])]);
  const raw = (x, z) => { let h = 0; for (const [cx, cz, r, a] of hills) { const d2 = ((x - cx) ** 2 + (z - cz) ** 2) / (r * r); h += M.mesa ? a / (1 + d2 ** 3) : a * Math.exp(-d2); }
    const cap = M.hills[1][1] * 1.25; h = cap * Math.tanh(h / cap);
    h += Math.sin(x * .021 + seed) * Math.cos(z * .017 - seed) * 1.2;
    const e = Math.max(Math.abs(x), Math.abs(z)) / H;
    if (M.island) { const d = Math.hypot(x, z) / H; h = h * Math.max(0, 1 - d * d) + 6 * (1 - d * 1.15) ; } else if (e > .9) h *= Math.max(0, (1 - e) / .1);
    return h; };
  const towns = []; const TN = ['포치키', '야스나야', '밀리타', '로족', '스쿨', '조르지'];
  for (let i = 0; i < (M.towns || 0); i++) { let t, k = 0; do { t = { x: rr(-H + 55, H - 55), z: rr(-H + 55, H - 55) }; k++; } while (k < 60 && (towns.some(o => Math.hypot(o.x - t.x, o.z - t.z) < 110) || (M.island && Math.hypot(t.x, t.z) > H * .6))); t.lv = raw(t.x, t.z); towns.push(t); }
  const hAt = (x, z) => { let h = raw(x, z); for (const t of towns) { const d = Math.hypot(x - t.x, z - t.z); const k = Math.max(0, Math.min(1, 1 - (d - 38) / 26)); if (k > 0) h += (t.lv - h) * k * k * (3 - 2 * k); } return M.island ? h : Math.max(0, h); };
  if (M.grid) { const lv = raw(0, 0); towns.push({ x: 0, z: 0, lv, grid: 1 }); }
  const hAt2 = M.grid ? (x, z) => { const r0 = raw(x, z), d = Math.max(Math.abs(x), Math.abs(z)); const k = Math.max(0, Math.min(1, 1 - (d - H * .62) / 20)); return Math.max(0, r0 + (towns[0].lv - r0) * k); } : hAt;
  const h = hAt2;
  const baseOf = (x, z, w, d) => Math.min(h(x - w / 2, z - d / 2), h(x + w / 2, z - d / 2), h(x - w / 2, z + d / 2), h(x + w / 2, z + d / 2), h(x, z));
  const slopeOk = (x, z, w, d, lim) => { const a = [h(x - w / 2, z - d / 2), h(x + w / 2, z - d / 2), h(x - w / 2, z + d / 2), h(x + w / 2, z + d / 2)]; return Math.max(...a) - Math.min(...a) < lim; };
  const inside = (x, z, w, d) => Math.abs(x) < H - w / 2 - 6 && Math.abs(z) < H - d / 2 - 6 && (!M.island || (Math.hypot(x, z) < H * .9 && h(x, z) > .6));
  const free = (x, z, w, d, m = 2) => foot.every(f => Math.abs(f.x - x) > (f.w + w) / 2 + m || Math.abs(f.z - z) > (f.d + d) / 2 + m) && inside(x, z, w, d);
  const B = (x, y, z, w, hh, d, m) => boxes.push([+x.toFixed(2), +y.toFixed(2), +z.toFixed(2), +w.toFixed(2), +hh.toFixed(2), +d.toFixed(2), m]);
  // 경사진 곳에 놓는 상자: 바닥을 낮은 쪽에 맞추고 위로 높이를 더해 묻히게
  const BG = (x, z, w, hh, d, m, y0 = 0) => { const b = baseOf(x, z, w, d), t = Math.max(h(x - w / 2, z - d / 2), h(x + w / 2, z - d / 2), h(x - w / 2, z + d / 2), h(x + w / 2, z + d / 2), h(x, z)); const extra = Math.min(1.5, t - b); B(x, b + y0 + (hh + extra) / 2 - extra * 0 , z, w, hh + extra, d, m); return b; };
  function wall(x0, z0, x1, z1, hh, mat, door, base, win) {
    const t = .3, horiz = Math.abs(z1 - z0) < .01, L = horiz ? x1 - x0 : z1 - z0;
    const seg = (a, b, y0, y1) => { const c = (a + b) / 2, len = b - a; if (len < .05 || y1 - y0 < .05) return; if (horiz) B(c, base + (y0 + y1) / 2, z0, len, y1 - y0, t, mat); else B(x0, base + (y0 + y1) / 2, c, t, y1 - y0, len, mat); };
    const s0 = horiz ? x0 : z0;
    if (!door && !win) { seg(s0, s0 + L, 0, hh); return; }
    if (door) { const dc = s0 + L * door, dw = .7; seg(s0, dc - dw, 0, hh); seg(dc + dw, s0 + L, 0, hh); seg(dc - dw, dc + dw, 2.3, hh); return; }
    const wc = s0 + L * win, ww = .8; seg(s0, wc - ww, 0, hh); seg(wc + ww, s0 + L, 0, hh); seg(wc - ww, wc + ww, 0, 1.1); seg(wc - ww, wc + ww, 2.1, hh); }
  function house(x, z, w, d, hh, mat, two) {
    foot.push({ x, z, w, d }); const base = baseOf(x, z, w, d); const x0 = x - w / 2, x1 = x + w / 2, z0 = z - d / 2, z1 = z + d / 2;
    const doors = [R() < .5 ? rr(.3, .7) : 0, R() < .7 ? rr(.3, .7) : 0, R() < .5 ? rr(.3, .7) : 0, 0]; if (!doors.some(Boolean)) doors[1] = .5; if (two) doors[3] = rr(.3, .7);
    const wins = doors.map(dd => dd ? 0 : rr(.3, .7));
    wall(x0, z0, x1, z0, hh, mat, doors[0], base, wins[0]); wall(x0, z1, x1, z1, hh, mat, doors[1], base, wins[1]); wall(x0, z0, x0, z1, hh, mat, doors[2], base, wins[2]); wall(x1, z0, x1, z1, hh, mat, doors[3], base, wins[3]);
    B(x, base - .5, z, w, 1, d, 'found'); B(x, base + hh + .15, z, w + .4, .3, d + .4, 'roof');
    if (w > 9 && R() < .6) wall(x0 + .3, z, x - 1, z, hh, mat, 0, base);
    const n = Math.round(w * d / 30) + 1; for (let i = 0; i < n; i++) loot.push([+rr(x0 + 1, x1 - 1).toFixed(2), +base.toFixed(2), +rr(z0 + 1, z1 - 1).toFixed(2)]); }
  // 엄폐물 조각들
  const sandbag = (x, z, ang, n) => { for (let i = 0; i < n; i++) { const a = ang + (i - (n - 1) / 2) * .0; const px = x + Math.cos(ang) * (i - (n - 1) / 2) * 1.2, pz = z + Math.sin(ang) * (i - (n - 1) / 2) * 1.2; const hor = Math.abs(Math.cos(ang)) > .7; BG(px, pz, hor ? 1.2 : .6, 1, hor ? .6 : 1.2, 'sand'); } };
  const nest = (x, z) => { const b = baseOf(x, z, 4, 4); sandbag(x, z - 1.8, 0, 3); sandbag(x - 1.8, z, H, 3); sandbag(x + 1.8, z, H, 3); loot.push([x, +b.toFixed(2), z]); };
  const W = M.look.wall, wallMats = ['brick', 'plaster'];
  /* ---- 마을 ---- */
  towns.forEach((t, ti) => { if (t.grid) return; names.push([TN[ti % TN.length], +t.x.toFixed(1), +t.z.toFixed(1)]);
    const cnt = M.houses[0] + Math.floor(R() * (M.houses[1] - M.houses[0] + 1)); for (let i = 0; i < cnt; i++) { const big = R() < .25; const w = big ? rr(14, 20) : rr(7, 11), d = big ? rr(10, 14) : rr(7, 10), hh = big ? rr(5, 6.5) : rr(3, 3.4);
      for (let k = 0; k < 25; k++) { const x = t.x + rr(-42, 42), z = t.z + rr(-42, 42); if (free(x, z, w, d, 4) && slopeOk(x, z, w, d, 1.2)) { house(x, z, w, d, hh, big ? 'metal' : wallMats[Math.floor(R() * 2)], big); break; } } }
    for (let i = 0; i < 6; i++) { const x = t.x + rr(-45, 45), z = t.z + rr(-45, 45); if (free(x, z, 4, 1, 1)) { foot.push({ x, z, w: 4, d: 1 }); sandbag(x, z, R() < .5 ? 0 : H, 3); } } });
  /* ---- 폐허 도시: 격자 블록, 무너진 건물, 폐벽 ---- */
  if (M.grid) { names.push(['도심', 0, 0]); const step = 30; for (let gx = -H + 30; gx <= H - 30; gx += step) for (let gz = -H + 30; gz <= H - 30; gz += step) { if (R() < .12) continue; const w = rr(12, 20), d = rr(10, 18);
      const x = gx + rr(-3, 3), z = gz + rr(-3, 3); if (!free(x, z, w, d, 3)) continue;
      if (R() < .7) house(x, z, w, d, R() < .4 ? rr(6, 8) : rr(3.2, 3.6), wallMats[Math.floor(R() * 2)], w > 15);
      else { foot.push({ x, z, w, d }); const base = baseOf(x, z, w, d); for (let i = 0; i < 4; i++) { const len = rr(4, 9), hh = rr(1.2, 3), hor = R() < .5; B(x + rr(-w / 3, w / 3), base + hh / 2, z + rr(-d / 3, d / 3), hor ? len : .4, hh, hor ? .4 : len, 'brick'); } loot.push([x, +base.toFixed(2), z]); } }
    for (let i = 0; i < 50; i++) { const x = rr(-H + 8, H - 8), z = rr(-H + 8, H - 8); if (!free(x, z, 3, 3, 1)) continue; foot.push({ x, z, w: 3, d: 3 }); BG(x, z, rr(2, 4), rr(.6, 1.4), rr(1, 2.5), 'rubble'); } }
  /* ---- 들판 엄폐물 ---- */
  const C = M.cover; const along = (n, f) => { for (let i = 0; i < n * C; i++) f(); };
  along(28, () => { const rot = R() < .5; const w = rot ? 2.4 : 6, d = rot ? 6 : 2.4; const x = rr(-H + 10, H - 10), z = rr(-H + 10, H - 10); if (!free(x, z, w, d, 3) || !slopeOk(x, z, w, d, 1.5)) return; foot.push({ x, z, w, d }); const b = BG(x, z, w, 2.6, d, R() < .5 ? 'cont1' : 'cont2'); loot.push([+(x + (rot ? 2 : 0)).toFixed(2), +b.toFixed(2), +(z + (rot ? 0 : 2)).toFixed(2)]); if (R() < .25) B(x, b + 3.9, z, w, 2.6, d, 'cont2'); });
  along(45, () => { const x = rr(-H + 8, H - 8), z = rr(-H + 8, H - 8); if (!free(x, z, 1.2, 1.2, 1)) return; foot.push({ x, z, w: 1.2, d: 1.2 }); const b = BG(x, z, 1.1, 1.1, 1.1, 'crate'); if (R() < .4) B(x + .2, b + 1.6, z - .1, 1, 1, 1, 'crate'); if (R() < .5) loot.push([+(x + 1.2).toFixed(2), +h(x + 1.2, z).toFixed(2), +z.toFixed(2)]); });
  along(30, () => { const x = rr(-H + 10, H - 10), z = rr(-H + 10, H - 10); if (!free(x, z, 4, 4, 1.5)) return; foot.push({ x, z, w: 4, d: 4 }); sandbag(x, z, R() < .5 ? 0 : H, 2 + Math.floor(R() * 3)); if (R() < .4) loot.push([+(x + 1).toFixed(2), +h(x + 1, z + 1).toFixed(2), +(z + 1).toFixed(2)]); });
  along(25, () => { const x = rr(-H + 10, H - 10), z = rr(-H + 10, H - 10); const hor = R() < .5; const n = 2 + Math.floor(R() * 3); if (!free(x, z, hor ? n * 2.1 : .6, hor ? .6 : n * 2.1, 1.5)) return; foot.push({ x, z, w: hor ? n * 2.1 : .6, d: hor ? .6 : n * 2.1 });
    for (let i = 0; i < n; i++) { const o2 = (i - (n - 1) / 2) * 2.1; BG(x + (hor ? o2 : 0), z + (hor ? 0 : o2), hor ? 2 : .55, 1.15, hor ? .55 : 2, 'barrier'); } });
  along(16, () => { const x = rr(-H + 10, H - 10), z = rr(-H + 10, H - 10); const hor = R() < .5, len = rr(5, 10); if (!free(x, z, hor ? len : .4, hor ? .4 : len, 2)) return; foot.push({ x, z, w: hor ? len : .4, d: hor ? .4 : len }); const b = baseOf(x, z, hor ? len : .4, hor ? .4 : len);
    const hh = rr(2, 3); const gap = rr(.3, .7); const L1 = len * gap - .6, L2 = len * (1 - gap) - .6; const s0 = -len / 2;
    if (hor) { B(x + s0 + L1 / 2, b + hh / 2, z, L1, hh, .4, 'brick'); B(x + len / 2 - L2 / 2, b + hh / 2, z, L2, hh, .4, 'brick'); B(x + s0 + L1 + .6, b + .45, z, 1.2, .9, .4, 'brick'); }
    else { B(x, b + hh / 2, z + s0 + L1 / 2, .4, hh, L1, 'brick'); B(x, b + hh / 2, z + len / 2 - L2 / 2, .4, hh, L2, 'brick'); B(x, b + .45, z + s0 + L1 + .6, .4, .9, 1.2, 'brick'); } loot.push([x + (hor ? 0 : 1), +h(x, z).toFixed(2), z + (hor ? 1 : 0)]); });
  // 언덕 꼭대기: 저격 진지
  hills.forEach(([cx, cz, r, a]) => { if (a < 7 || !free(cx, cz, 5, 5, 1)) return; foot.push({ x: cx, z: cz, w: 5, d: 5 }); nest(cx, cz); });
  // 바위 (구 모양이지만 충돌은 상자로)
  for (let i = 0; i < M.rocks; i++) { const sz = rr(.8, 3), x = rr(-H + 5, H - 5), z = rr(-H + 5, H - 5); if (!free(x, z, sz * 1.6, sz * 1.6, 1)) continue; foot.push({ x, z, w: sz * 1.6, d: sz * 1.6 }); rocks.push([+x.toFixed(2), +z.toFixed(2), +sz.toFixed(2), +(R() * 6).toFixed(2), +baseOf(x, z, sz, sz).toFixed(2)]); }
  for (let i = 0; i < 30; i++) { const x = rr(-H + 10, H - 10), z = rr(-H + 10, H - 10); if (free(x, z, 1, 1, .5)) loot.push([+x.toFixed(2), +h(x, z).toFixed(2), +z.toFixed(2)]); }
  return { seed, id, name: M.name, half: H, look: M.look, boxes, rocks, trees: [], loot, towns: names, free, h, hills };
}
// 스폰 지점: 벽에 안 끼는 빈 자리 (높이 포함)
export function spawnPoint(map, R) { const Hf = map.half || MAP.half; for (let k = 0; k < 300; k++) { const x = (R() * 2 - 1) * (Hf - 20), z = (R() * 2 - 1) * (Hf - 20); if (map.free(x, z, 1.5, 1.5, 1)) return [x, map.h ? map.h(x, z) : 0, z]; } return [0, map.h ? map.h(0, 0) : 0, 0]; }
// 선분이 지형이나 상자에 막히는지 (봇 시야용)
export function losBlocked(map, a, b, aabbs) { const dx = b[0] - a[0], dy = b[1] - a[1], dz = b[2] - a[2], L = Math.hypot(dx, dy, dz); if (map.h) { const n = Math.ceil(L / 3); for (let i = 1; i < n; i++) { const t = i / n; if (a[1] + dy * t < map.h(a[0] + dx * t, a[2] + dz * t) + .2) return true; } }
  for (const q of aabbs) { let t0 = 0, t1 = 1; let ok = true; for (let k = 0; k < 3; k++) { const o = a[k], d = [dx, dy, dz][k], mn = q[k], mx = q[k + 3]; if (Math.abs(d) < 1e-9) { if (o < mn || o > mx) { ok = false; break; } continue; } let ta = (mn - o) / d, tb = (mx - o) / d; if (ta > tb) [ta, tb] = [tb, ta]; t0 = Math.max(t0, ta); t1 = Math.min(t1, tb); if (t0 > t1) { ok = false; break; } } if (ok) return true; } return false; }
export function mapAabbs(map) { const a = map.boxes.filter(b => b[6] !== 'roof' && b[6] !== 'found').map(([x, y, z, w, h, d]) => [x - w / 2, y - h / 2, z - d / 2, x + w / 2, y + h / 2, z + d / 2]); for (const [x, z, s, r, b] of map.rocks) a.push([x - s * .75, b, z - s * .75, x + s * .75, b + s * .95, z + s * .75]); return a; }

// 자기장 단계: [대기 초, 줄어드는 초, 목표 반지름, 초당 피해]
export const ZONE = [[60, 40, 190, 1], [50, 35, 115, 2], [40, 30, 60, 4], [35, 25, 28, 7], [25, 25, 10, 10], [15, 20, 0, 14]];

// 아이템 종류
export const AMMO_PACK = { '7.62mm': 30, '5.56mm': 30, '5.45mm': 30, '4.6mm': 40, '9mm': 30, '.45 ACP': 25, '12게이지': 10, '.300 매그넘': 10 };
export const MEDS = { bandage: { name: '붕대', key: 'Digit7', heal: 10, cap: 75, t: 4 }, kit: { name: '구급상자', key: 'Digit8', heal: 75, cap: 75, t: 6 }, med: { name: '의료용 키트', key: 'Digit9', heal: 100, cap: 100, t: 8 } };

// 방탄복: 몸통 피해를 줄이고, 받은 만큼 내구도가 닳음 (머리는 못 막음)
export const ARMOR = { v1: { name: '방탄복 1레벨', lvl: 1, red: .3, dur: 200, col: 0x7a7458 }, v2: { name: '방탄복 2레벨', lvl: 2, red: .4, dur: 220, col: 0x4a5638 }, v3: { name: '방탄복 3레벨', lvl: 3, red: .55, dur: 250, col: 0x23282a } };
export function armorHit(armor, dmg) { if (!armor || armor.dur <= 0) return { dmg, armor }; const A = ARMOR[armor.k]; const absorbed = dmg * A.red; const left = Math.max(0, armor.dur - dmg); return { dmg: dmg - absorbed, armor: left > 0 ? { k: armor.k, dur: left } : null, broke: left <= 0 }; }

// 훈련장: 무기 테이블, 거리별 사로, 허수아비 구역, 실내 교전용 건물
export function trainingMap() {
  const boxes = [], B = (x, y, z, w, h, d, m) => boxes.push([x, y, z, w, h, d, m]);
  const wall = (x0, z0, x1, z1, h, mat, door) => { const t = .3, horiz = Math.abs(z1 - z0) < .01, L = horiz ? x1 - x0 : z1 - z0, s0 = horiz ? x0 : z0;
    const seg = (a, b, y0, y1) => { const c = (a + b) / 2, len = b - a; if (len < .05) return; if (horiz) B(c, (y0 + y1) / 2, z0, len, y1 - y0, t, mat); else B(x0, (y0 + y1) / 2, c, t, y1 - y0, len, mat); };
    if (!door) { seg(s0, s0 + L, 0, h); return; } const dc = s0 + L * door; seg(s0, dc - .7, 0, h); seg(dc + .7, s0 + L, 0, h); seg(dc - .7, dc + .7, 2.3, h); };
  // 사로 경계 (낮은 벽)
  for (let z = 28; z > -320; z -= 12) { B(-12, .6, z - 6, .4, 1.2, 11.6, 'plaster'); B(12, .6, z - 6, .4, 1.2, 11.6, 'plaster'); }
  // 사격 위치 엄폐물
  B(-6, .45, 26, 3, .9, .5, 'crate'); B(6, .45, 26, 3, .9, .5, 'crate'); B(-9, 1.1, 20, 1.2, 2.2, 1.2, 'cont1');
  // 무기 테이블 두 줄
  const items = [];
  // 실내 교전 건물 (방 4개, 문 여러 개)
  const hx = -40, hz = -20, hw = 18, hd = 14, hh = 3.2;
  wall(hx - hw / 2, hz - hd / 2, hx + hw / 2, hz - hd / 2, hh, 'brick', .3); wall(hx - hw / 2, hz + hd / 2, hx + hw / 2, hz + hd / 2, hh, 'brick', .7);
  wall(hx - hw / 2, hz - hd / 2, hx - hw / 2, hz + hd / 2, hh, 'brick', .5); wall(hx + hw / 2, hz - hd / 2, hx + hw / 2, hz + hd / 2, hh, 'brick', .5);
  wall(hx - hw / 2 + .3, hz, hx + hw / 2 - .3, hz, hh, 'plaster', .25); wall(hx, hz - hd / 2 + .3, hx, hz + hd / 2 - .3, hh, 'plaster', .7);
  B(hx, hh + .15, hz, hw + .4, .3, hd + .4, 'roof');
  // 허수아비 구역 엄폐물
  B(40, .5, -12, 2, 1, .5, 'crate'); B(48, 1.3, -28, 6, 2.6, 2.4, 'cont2'); B(36, .55, -40, 1.1, 1.1, 1.1, 'crate');
  return { seed: 0, id: 'train', half: 250, look: MAPS.farm.look, h: () => 0, boxes, rocks: [[60, 20, 2, 1, 0], [-60, 10, 2.4, 2, 0]], trees: [], loot: [], towns: [['사로', 0, -150], ['무기 테이블', 0, 46], ['허수아비', 45, -10], ['실내 교전', -40, -32]], free: () => true,
    spawn: [0, 0, 32], tables: { z1: 37, z2: 41 }, targets: [[10, .35], [25, .4], [50, .5], [100, .6], [150, .7], [200, .8], [300, 1]], dummies: [[34, -8, null], [40, -18, 'v1'], [46, -6, 'v2'], [54, -16, 'v3'], [42, -36, null, 1], [31, -24, null, 0, 1]] };
}

// 머리·몸통·팔다리 배율 (배그와 비슷하게) [머리, 몸통, 팔다리]
export const ZONE_MUL = { AR: [2.35, 1, .9], SMG: [2.1, 1, 1.05], DMR: [2.35, 1.05, .95], SR: [2.5, 1.3, .95], SG: [1.5, .9, 1.05], P: [2.1, 1, 1.05] };
// 거리에 따른 피해 감소: 산탄총은 8m부터 급감, 기관단총·권총은 20~25m, 소총 60m, 저격 150m부터 천천히
export function falloff(cls, d) { const T = { SG: [8, 32, .12], SMG: [25, 150, .55], P: [20, 120, .5], AR: [60, 400, .65], DMR: [150, 800, .8], SR: [150, 900, .85] }[cls] || [60, 400, .65]; return d <= T[0] ? 1 : Math.max(T[2], 1 - (d - T[0]) / T[1]); }
