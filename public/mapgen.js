// 시드 하나로 서버와 모든 클라이언트가 같은 맵을 만듦 (three.js 없이 순수 데이터).
export const MAP = { half: 250 };
export function rng(seed) { let a = seed >>> 0; return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

export function genMap(seed) {
  const R = rng(seed), rr = (a, b) => a + R() * (b - a), H = MAP.half;
  const boxes = [], rocks = [], trees = [], loot = [], foot = [], names = [];
  const free = (x, z, w, d, m = 2) => foot.every(f => Math.abs(f.x - x) > (f.w + w) / 2 + m || Math.abs(f.z - z) > (f.d + d) / 2 + m) && Math.abs(x) < H - w / 2 - 6 && Math.abs(z) < H - d / 2 - 6;
  const B = (x, y, z, w, h, d, m) => boxes.push([+x.toFixed(2), +y.toFixed(2), +z.toFixed(2), +w.toFixed(2), +h.toFixed(2), +d.toFixed(2), m]);
  // 벽 한 면: 문 구멍(door)이 있으면 둘로 나누고 위에 상인방
  function wall(x0, z0, x1, z1, h, mat, door) {
    const t = .3, horiz = Math.abs(z1 - z0) < .01, L = horiz ? x1 - x0 : z1 - z0;
    const seg = (a, b, y0, y1) => { const c = (a + b) / 2, len = b - a; if (len < .05) return; if (horiz) B(c, (y0 + y1) / 2, z0, len, y1 - y0, t, mat); else B(x0, (y0 + y1) / 2, c, t, y1 - y0, len, mat); };
    const s = horiz ? x0 : z0;
    if (!door) { seg(s, s + L, 0, h); return; }
    const dc = s + L * door, dw = .7; seg(s, dc - dw, 0, h); seg(dc + dw, s + L, 0, h); seg(dc - dw, dc + dw, 2.3, h);
  }
  function house(x, z, w, d, h, mat, two) {
    foot.push({ x, z, w, d }); const x0 = x - w / 2, x1 = x + w / 2, z0 = z - d / 2, z1 = z + d / 2;
    const doors = [R() < .5 ? rr(.3, .7) : 0, R() < .7 ? rr(.3, .7) : 0, R() < .5 ? rr(.3, .7) : 0, 0]; if (!doors.some(Boolean)) doors[1] = .5;
    if (two) doors[3] = rr(.3, .7);
    wall(x0, z0, x1, z0, h, mat, doors[0]); wall(x0, z1, x1, z1, h, mat, doors[1]); wall(x0, z0, x0, z1, h, mat, doors[2]); wall(x1, z0, x1, z1, h, mat, doors[3]);
    B(x, h + .15, z, w + .4, .3, d + .4, 'roof');
    if (w > 9 && R() < .6) wall(x0 + .3, z, x - 1, z, h, mat, 0); // 안쪽 칸막이
    const n = Math.round(w * d / 30) + 1; for (let i = 0; i < n; i++) loot.push([+rr(x0 + 1, x1 - 1).toFixed(2), 0, +rr(z0 + 1, z1 - 1).toFixed(2)]);
  }
  const towns = []; for (let i = 0; i < 6; i++) { let t, k = 0; do { t = { x: rr(-H + 50, H - 50), z: rr(-H + 50, H - 50) }; k++; } while (k < 40 && towns.some(o => Math.hypot(o.x - t.x, o.z - t.z) < 120)); towns.push(t); }
  const TN = ['포치키', '야스나야', '밀리타', '로족', '스쿨', '조르지'];
  towns.forEach((t, ti) => { names.push([TN[ti % TN.length], +t.x.toFixed(1), +t.z.toFixed(1)]);
    const cnt = 5 + Math.floor(R() * 5); for (let i = 0; i < cnt; i++) { const big = R() < .25; const w = big ? rr(14, 20) : rr(7, 11), d = big ? rr(10, 14) : rr(7, 10), h = big ? rr(5, 6.5) : rr(3, 3.4);
      for (let k = 0; k < 20; k++) { const x = t.x + rr(-45, 45), z = t.z + rr(-45, 45); if (free(x, z, w, d, 4)) { house(x, z, w, d, h, big ? 'metal' : R() < .5 ? 'brick' : 'plaster', big); break; } } } });
  // 컨테이너와 상자
  for (let i = 0; i < 40; i++) { const rot = R() < .5; const w = rot ? 2.4 : 6, d = rot ? 6 : 2.4; const x = rr(-H + 10, H - 10), z = rr(-H + 10, H - 10); if (!free(x, z, w, d, 3)) continue; foot.push({ x, z, w, d }); B(x, 1.3, z, w, 2.6, d, R() < .5 ? 'cont1' : 'cont2'); loot.push([+(x + (rot ? 2 : 0)).toFixed(2), 0, +(z + (rot ? 0 : 2)).toFixed(2)]);
    if (R() < .3) { B(x, 3.9, z, w, 2.6, d, 'cont2'); } }
  for (let i = 0; i < 70; i++) { const x = rr(-H + 8, H - 8), z = rr(-H + 8, H - 8); if (!free(x, z, 1.2, 1.2, 1)) continue; foot.push({ x, z, w: 1.2, d: 1.2 }); B(x, .55, z, 1.1, 1.1, 1.1, 'crate'); if (R() < .4) B(x + .2, 1.6, z - .1, 1, 1, 1, 'crate'); if (R() < .5) loot.push([+(x + 1.2).toFixed(2), 0, +z.toFixed(2)]); }
  // 바위 (구 모양이지만 충돌은 상자로)
  for (let i = 0; i < 90; i++) { const s = rr(.8, 3), x = rr(-H + 5, H - 5), z = rr(-H + 5, H - 5); if (!free(x, z, s * 1.6, s * 1.6, 1)) continue; foot.push({ x, z, w: s * 1.6, d: s * 1.6 }); rocks.push([+x.toFixed(2), +z.toFixed(2), +s.toFixed(2), +(R() * 6).toFixed(2)]); }
  // 나무
  for (let i = 0; i < 260; i++) { const x = rr(-H + 3, H - 3), z = rr(-H + 3, H - 3); if (!free(x, z, .6, .6, 1.2)) continue; foot.push({ x, z, w: .6, d: .6 }); trees.push([+x.toFixed(2), +z.toFixed(2), +rr(6, 11).toFixed(2), R() < .3 ? 1 : 0]); }
  // 들판 아이템
  for (let i = 0; i < 40; i++) { const x = rr(-H + 10, H - 10), z = rr(-H + 10, H - 10); if (free(x, z, 1, 1, .5)) loot.push([+x.toFixed(2), 0, +z.toFixed(2)]); }
  return { seed, boxes, rocks, trees, loot, towns: names, free };
}
// 스폰 지점: 벽에 안 끼는 빈 자리
export function spawnPoint(map, R) { for (let k = 0; k < 200; k++) { const x = (R() * 2 - 1) * (MAP.half - 20), z = (R() * 2 - 1) * (MAP.half - 20); if (map.free(x, z, 1.5, 1.5, 1)) return [x, 0, z]; } return [0, 0, 0]; }

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
  return { seed: 0, boxes, rocks: [[60, 20, 2, 1], [-60, 10, 2.4, 2]], trees: [[25, 40, 8, 0], [-25, 44, 9, 1], [70, -60, 10, 0], [-70, -70, 9, 0]], loot: [], towns: [['사로', 0, -150], ['무기 테이블', 0, 46], ['허수아비', 45, -10], ['실내 교전', -40, -32]], free: () => true,
    spawn: [0, 0, 32], tables: { z1: 37, z2: 41 }, targets: [[10, .35], [25, .4], [50, .5], [100, .6], [150, .7], [200, .8], [300, 1]], dummies: [[34, -8, null], [40, -18, 'v1'], [46, -6, 'v2'], [54, -16, 'v3'], [42, -36, null, 1], [31, -24, null, 0, 1]] };
}
