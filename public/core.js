// 공용 1인칭 엔진: 무기 데이터, 모델, 조준경, 이동·반동·조준·장전, 탄도, 투척물.
// 사격장 페이지와 배틀로얄 클라이언트가 같이 씀.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { clone as skClone } from 'three/addons/utils/SkeletonUtils.js';
import { ZONE_MUL, falloff } from './mapgen.js';

export const H = Math.PI / 2, D2R = Math.PI / 180;
/* yaw: 총구가 +X를 보게 돌리는 각, len: 실제 길이(m)
   vr: 한 발당 수직 반동(도), hr: 수평 반동 폭(도), vel: 탄속(m/s), zoom: 가늠쇠 배율
   rt: 전술 재장전(초), act: auto | semi | pump | bolt, opt: 달 수 있는 조준경, def: 기본 조준경 */
const RIFLE_OPT = ['none', 'reddot', 'holo', 'x2', 'x4', 'x8'];
export const W = [
 {k:'akm',grp:'돌격소총',cat:'ASSAULT RIFLE',name:'AKM',ko:'AKM 돌격소총',yaw:Math.PI,len:.88,cal:'7.62mm',dmg:49,rpm:600,mag:30,rec:.62,rng:.62,modes:['자동','단발'],vr:1.15,hr:.55,vel:715,zoom:1.3,rt:2.4,act:'auto',opt:RIFLE_OPT,by:'J-Toastie',id:'ZBBoDqAn0A',lic:'CC-BY',d:'반동이 크지만 한 발이 묵직해요. 탄은 흔하고 정비가 쉬워 서바이벌 초반 주력.'},
 {k:'assault_rifle_q',grp:'돌격소총',cat:'ASSAULT RIFLE',name:'M4',ko:'M4 카빈',yaw:0,len:.84,cal:'5.56mm',dmg:41,rpm:780,mag:30,rec:.38,rng:.66,modes:['자동','점사','단발'],vr:.7,hr:.35,vel:880,zoom:1.3,rt:2.1,act:'auto',opt:RIFLE_OPT,by:'Quaternius',id:'Bgvuu4CUMV',lic:'CC0',d:'반동이 낮고 빨라요. 중거리 교전 기본기.'},
 {k:'rifle_west',grp:'돌격소총',cat:'ASSAULT RIFLE',name:'AR-15 PATROL',ko:'AR 계열 돌격소총',yaw:-H,len:.86,cal:'5.56mm',dmg:41,rpm:720,mag:30,rec:.34,rng:.7,modes:['자동','점사','단발'],vr:.65,hr:.32,vel:900,zoom:1.3,rt:2.1,act:'auto',opt:RIFLE_OPT,by:'Pichuliru',id:'ss1nz3gJnx',lic:'CC0',d:'레일과 광학장비를 달기 좋은 순찰용 소총.'},
 {k:'rifle_east',grp:'돌격소총',cat:'ASSAULT RIFLE',name:'AK-12',ko:'AK 계열 신형 소총',yaw:-H,len:.94,cal:'5.45mm',dmg:44,rpm:700,mag:30,rec:.46,rng:.68,modes:['자동','점사','단발'],vr:.85,hr:.42,vel:880,zoom:1.3,rt:2.3,act:'auto',opt:RIFLE_OPT,by:'Pichuliru',id:'xrJfQgAuDL',lic:'CC0',d:'AK 손맛에 반동을 줄인 신형.'},
 {k:'mp7',grp:'기관단총',cat:'SUBMACHINE GUN',name:'MP7',ko:'MP7 기관단총',yaw:-H,len:.64,cal:'4.6mm',dmg:29,rpm:950,mag:40,rec:.28,rng:.38,modes:['자동','단발'],vr:.5,hr:.38,vel:735,zoom:1.25,rt:1.9,act:'auto',opt:['none','reddot','holo','x2'],by:'Dark',id:'goyOzONDIr',lic:'CC-BY',d:'연사가 매우 빨라 실내 근접전에 강해요.'},
 {k:'mpx',grp:'기관단총',cat:'SUBMACHINE GUN',name:'MPX',ko:'MPX 기관단총',yaw:-H,len:.7,cal:'9mm',dmg:33,rpm:850,mag:30,rec:.3,rng:.42,modes:['자동','단발'],vr:.55,hr:.36,vel:400,zoom:1.25,rt:1.9,act:'auto',opt:['none','reddot','holo','x2'],by:'austincford',id:'p7sAqeuUWR',lic:'CC-BY',d:'권총탄을 써서 탄 구하기가 쉬운 기관단총.'},
 {k:'smg_west',grp:'기관단총',cat:'SUBMACHINE GUN',name:'UMP',ko:'UMP 계열 기관단총',yaw:-H,len:.69,cal:'.45 ACP',dmg:39,rpm:650,mag:25,rec:.36,rng:.4,modes:['자동','점사','단발'],vr:.6,hr:.3,vel:360,zoom:1.25,rt:2.0,act:'auto',opt:['none','reddot','holo','x2','x4'],by:'Pichuliru',id:'7Dh5JSbZcp',lic:'CC0',d:'느리지만 한 발이 센 기관단총.'},
 {k:'mossberg_590a1',grp:'산탄총',cat:'SHOTGUN',name:'MOSSBERG 590A1',ko:'모스버그 펌프 산탄총',yaw:0,len:1.0,cal:'12게이지',dmg:26,pel:9,rpm:70,mag:8,rec:.9,rng:.2,modes:['펌프'],vr:3.2,hr:.8,vel:400,zoom:1.15,rt:.5,act:'pump',opt:['none','reddot','holo'],by:'J-Toastie',id:'eAh1oHY32T',lic:'CC-BY',d:'펠릿 9개, 근거리에서 한 방. 한 발씩 장전해요.'},
 {k:'shotgun_pump_west',grp:'산탄총',cat:'SHOTGUN',name:'FIELD PUMP',ko:'목재 펌프 산탄총',yaw:-H,len:1.0,cal:'12게이지',dmg:24,pel:9,rpm:65,mag:6,rec:.85,rng:.22,modes:['펌프'],vr:3.0,hr:.8,vel:400,zoom:1.15,rt:.5,act:'pump',opt:['none','reddot','holo'],by:'Pichuliru',id:'NfQETBKOiw',lic:'CC0',d:'시골 창고에서 주울 수 있는 사냥용 산탄총.'},
 {k:'mk14',grp:'저격·지정사수',cat:'MARKSMAN RIFLE',name:'MK14 EBR',ko:'MK14 지정사수 소총',yaw:-H,len:.89,cal:'7.62mm',dmg:61,rpm:300,mag:20,rec:.7,rng:.84,modes:['단발','자동'],vr:1.9,hr:.5,vel:853,zoom:1.3,rt:2.6,act:'auto',opt:RIFLE_OPT,def:'x4',by:'austincford',id:'lNGPW2NGPZ',lic:'CC-BY',d:'반자동 장거리 소총.'},
 {k:'sniper_west',grp:'저격·지정사수',cat:'MARKSMAN RIFLE',name:'SCAR-H DMR',ko:'SCAR 계열 지정사수 소총',yaw:-H,len:1.0,cal:'7.62mm',dmg:58,rpm:400,mag:20,rec:.6,rng:.8,modes:['단발'],vr:1.7,hr:.45,vel:850,zoom:1.3,rt:2.5,act:'semi',opt:RIFLE_OPT,def:'x4',by:'Pichuliru',id:'kwJawENuvA',lic:'CC0',d:'연사와 사거리의 균형이 좋은 지정사수 소총.'},
 {k:'awp',grp:'저격·지정사수',cat:'SNIPER RIFLE',name:'AWM',ko:'AWM 볼트액션 저격총',yaw:-H,len:1.2,cal:'.300 매그넘',dmg:105,rpm:40,mag:5,rec:.95,rng:1,modes:['볼트'],vr:3.5,hr:.6,vel:945,zoom:1.3,rt:3.0,act:'bolt',opt:['x8'],def:'x8',builtin:true,by:'Kyler Swanson',id:'fKsTWWhSkqt',lic:'CC-BY',d:'한 발에 끝내는 대신 노리쇠 조작이 느려요. 8배율 조준경이 붙어 있어요.'},
 {k:'kar98k',grp:'저격·지정사수',cat:'SNIPER RIFLE',name:'KAR98K',ko:'Kar98k 볼트액션 소총',yaw:0,len:1.11,cal:'7.62mm',dmg:75,rpm:45,mag:5,rec:.85,rng:.9,modes:['볼트'],vr:3,hr:.5,vel:760,zoom:1.4,rt:3.2,act:'bolt',opt:['none','reddot','x2','x4','x8'],strip:'^(clip|bullet\\d)$',clipLoad:1,by:'AdamKokrito',id:'ntijptIGIw',lic:'CC-BY',d:'오래된 군용 소총. 클립으로 5발을 한 번에 채워요.'},
 {k:'glock',grp:'권총',cat:'PISTOL',name:'GLOCK 17',ko:'글록 17',yaw:0,len:.2,cal:'9mm',dmg:30,rpm:400,mag:17,rec:.22,rng:.3,modes:['단발'],vr:1.1,hr:.5,vel:375,zoom:1.15,rt:1.6,act:'semi',pistol:1,opt:['none','reddot'],by:'J-Toastie',id:'q3lsX3tSta',lic:'CC-BY',d:'가볍고 장탄수가 많은 기본 권총.'},
 {k:'glock19_rigged',grp:'권총',cat:'PISTOL',name:'GLOCK 19',ko:'글록 19',yaw:H,len:.19,cal:'9mm',dmg:30,rpm:420,mag:15,rec:.24,rng:.28,modes:['단발'],vr:1.1,hr:.5,vel:375,zoom:1.15,rt:1.6,act:'semi',pistol:1,opt:['none','reddot'],by:'PuKkBuMXDD',id:'gDhOo5jkNX',lic:'CC-BY',d:'쏠 때 슬라이드가 실제로 뒤로 젖혀져요.'},
 {k:'sig_p228_rigged',grp:'권총',cat:'PISTOL',name:'SIG P228',ko:'SIG P228',yaw:-H,len:.18,cal:'9mm',dmg:31,rpm:380,mag:13,rec:.24,rng:.28,modes:['단발'],vr:1.15,hr:.5,vel:360,zoom:1.15,rt:1.6,act:'semi',pistol:1,opt:['none','reddot'],by:'PuKkBuMXDD',id:'xce5OmcO43',lic:'CC-BY',d:'쏠 때 슬라이드가 실제로 뒤로 젖혀져요.'},
 {k:'pistol_9mm_q',grp:'권총',cat:'PISTOL',name:'M9',ko:'M9 베레타',yaw:Math.PI,len:.22,cal:'9mm',dmg:31,rpm:380,mag:15,rec:.26,rng:.3,modes:['단발'],vr:1.2,hr:.5,vel:380,zoom:1.15,rt:1.7,act:'semi',pistol:1,opt:['none','reddot'],by:'Quaternius',id:'BoZWhFdsj4',lic:'CC-BY',d:'군에서 쓰던 표준 권총.'},
 {k:'pistol_west',grp:'권총',cat:'PISTOL',name:'P320',ko:'P320 계열 권총',yaw:-H,len:.2,cal:'9mm',dmg:32,rpm:360,mag:17,rec:.25,rng:.3,modes:['단발'],vr:1.2,hr:.5,vel:375,zoom:1.15,rt:1.6,act:'semi',pistol:1,opt:['none','reddot'],by:'Pichuliru',id:'r8RjoAwN5A',lic:'CC0',d:'튼튼한 현대식 권총.'},
 {k:'frag_west',grp:'투척',cat:'THROWABLE',name:'M67',ko:'세열 수류탄',yaw:0,len:.1,thr:1,hgt:1,cal:'투척',dmg:150,rpm:0,mag:1,rec:0,rng:.25,modes:['던지기'],opt:[],by:'Pichuliru',id:'1aIZys4mhg',lic:'CC0',d:'3초 뒤 반경 7m 폭발.'},
 {k:'flashbang_west',grp:'투척',cat:'THROWABLE',name:'M84',ko:'섬광탄',yaw:0,len:.15,thr:1,hgt:1,cal:'투척',dmg:0,rpm:0,mag:1,rec:0,rng:.25,modes:['던지기'],opt:[],by:'Pichuliru',id:'fiJvXydZUg',lic:'CC0',d:'바라보고 있던 사람의 시야를 몇 초 날려요.'},
 {k:'smoke_west',grp:'투척',cat:'THROWABLE',name:'M18',ko:'연막탄',yaw:0,len:.15,thr:1,hgt:1,cal:'투척',dmg:0,rpm:0,mag:1,rec:0,rng:.25,modes:['던지기'],opt:[],by:'Pichuliru',id:'GbhfKcTiF9',lic:'CC0',d:'20초 동안 연막. 후퇴·구조용.'},
 {k:'incendiary_east',grp:'투척',cat:'THROWABLE',name:'MOLOTOV',ko:'화염병',yaw:0,len:.25,thr:1,hgt:1,cal:'투척',dmg:40,rpm:0,mag:1,rec:0,rng:.22,modes:['던지기'],opt:[],by:'Pichuliru',id:'cxEdXVya7s',lic:'CC0',d:'바닥에 불을 깔아 길을 막아요.'},
 {k:'fps_rig_akm',grp:'1인칭 팔 리그',cat:'FIRST-PERSON RIG',name:'ARMS + AKM',ko:'팔 + AKM',yaw:0,len:1.3,rig:true,cal:'7.62mm',dmg:49,rpm:600,mag:30,rec:.5,rng:.62,modes:['자동','단발'],vr:1.15,hr:.55,vel:715,zoom:1.25,rt:2.4,act:'auto',opt:['none'],by:'J-Toastie',id:'U6l6wjxFhC',lic:'CC-BY',d:'팔과 총이 함께 움직이는 1인칭 모델. 대기·사격·재장전 동작이 모델에 들어 있어요.'},
 {k:'fps_rig',grp:'1인칭 팔 리그',cat:'FIRST-PERSON RIG',name:'ARMS + PISTOL',ko:'팔 + 권총',yaw:0,len:.9,rig:true,cal:'9mm',dmg:30,rpm:400,mag:15,rec:.25,rng:.3,modes:['단발'],vr:1.1,hr:.5,vel:375,zoom:1.15,rt:1.6,act:'semi',pistol:1,opt:['none'],by:'J-Toastie',id:'uxko5LkGia',lic:'CC-BY',d:'두 손으로 권총을 쥔 1인칭 모델. 사격·재장전 동작 포함.'},
];
export const WK = Object.fromEntries(W.map(w => [w.k, w]));
export const PAINTS = [['기본', null], ['사막 탠', '#b59a6d'], ['올리브', '#5d6b3f'], ['스노우', '#d9dcd6'], ['녹슨 철', '#8a4f2e'], ['혈흔', '#7a1f1a']];
// 조준경: type dot/holo = 총이 보이고 가운데 점, scope = 화면 전체가 조준경
export const OPTICS = {
  none: { name: '가늠쇠', zoom: 0 },
  reddot: { name: '레드닷', zoom: 1.3, type: 'dot', len: .065, h: .042 },
  holo: { name: '홀로그램', zoom: 1.3, type: 'holo', len: .075, h: .05 },
  x2: { name: '2배율', zoom: 2, type: 'scope', ret: 'dot', len: .12, h: .045, r: .016 },
  x4: { name: '4배율', zoom: 4, type: 'scope', ret: 'chev', len: .17, h: .05, r: .018 },
  x8: { name: '8배율', zoom: 8, type: 'scope', ret: 'mil', len: .28, h: .055, r: .02 },
};

/* ---------- 키 설정 ----------
   동작마다 키 하나. 마우스 버튼은 Mouse0(좌) Mouse1(휠) Mouse2(우) Mouse3·Mouse4(측면). localStorage에 저장 */
export const ACTIONS = [['fwd', '앞으로', 'KeyW'], ['back', '뒤로', 'KeyS'], ['left', '왼쪽', 'KeyA'], ['right', '오른쪽', 'KeyD'], ['sprint', '달리기 · 숨 참기', 'ShiftLeft'], ['jump', '점프', 'Space'],
  ['crouch', '앉기 (달리면서 누르면 슬라이딩)', 'KeyC'], ['prone', '엎드리기', 'KeyZ'], ['leanL', '왼쪽 기울이기', 'KeyQ'], ['leanR', '오른쪽 기울이기', 'KeyE'], ['fire', '사격', 'Mouse0'], ['ads', '조준', 'Mouse2'],
  ['reload', '재장전', 'KeyR'], ['mode', '사격 방식', 'KeyB'], ['s1', '주무기 1', 'Digit1'], ['s2', '주무기 2', 'Digit2'], ['s3', '권총', 'Digit3'], ['s4', '투척', 'Digit4'], ['knife', '단검', 'KeyV'],
  ['holster', '무기 집어넣기 (주먹)', 'KeyX'], ['inv', '인벤토리', 'KeyH'], ['pick', '줍기', 'KeyF'], ['drop', '버리기', 'KeyG'], ['map', '큰 지도', 'KeyM'], ['heal1', '붕대', 'Digit7'], ['heal2', '구급상자', 'Digit8'], ['heal3', '의료용 키트', 'Digit9']];
const DEF_BIND = Object.fromEntries(ACTIONS.map(a => [a[0], a[2]]));
export const BIND = Object.assign({}, DEF_BIND); try { Object.assign(BIND, JSON.parse(localStorage.getItem('fps_keys') || '{}')); } catch (e) {}
export function saveBinds() { try { localStorage.setItem('fps_keys', JSON.stringify(BIND)); } catch (e) {} }
export function actsOf(code) { const r = []; for (const k in BIND) if (BIND[k] === code) r.push(k); return r; }
export function codeName(c) { if (!c) return '없음'; const M = { Mouse0: '좌클릭', Mouse1: '휠 클릭', Mouse2: '우클릭', Mouse3: '마우스 측면 (뒤)', Mouse4: '마우스 측면 (앞)', Space: 'Space', ShiftLeft: '왼쪽 Shift', ShiftRight: '오른쪽 Shift', ControlLeft: '왼쪽 Ctrl', ControlRight: '오른쪽 Ctrl', AltLeft: '왼쪽 Alt', Tab: 'Tab', CapsLock: 'CapsLock', Backquote: '`', Enter: 'Enter', Backspace: 'Backspace' };
  return M[c] || c.replace(/^Key/, '').replace(/^Digit/, '').replace(/^Numpad/, '숫자패드 ').replace(/^Arrow/, '방향키 '); }
// 키 설정 화면: container 안에 표를 그림. 버튼을 누르고 원하는 키나 마우스 버튼을 누르면 바뀜 (Esc는 취소)
export function keyPanel(container) { let wait = null;
  const draw = () => { container.innerHTML = '<div class="kp">' + ACTIONS.map(([a, n]) => `<div class="kr"><span>${n}</span><button class="kb${wait === a ? ' w' : ''}" data-a="${a}">${wait === a ? '키를 누르세요…' : codeName(BIND[a])}</button></div>`).join('') + '</div><div class="kf"><button class="kb" data-reset="1">기본값으로</button><span>같은 키를 두 동작에 넣으면 앞의 것이 비워져요. 마우스 측면 버튼도 돼요.</span></div>';
    container.querySelectorAll('button[data-a]').forEach(b => b.onclick = ev => { ev.stopPropagation(); wait = b.dataset.a; draw(); }); container.querySelector('[data-reset]').onclick = () => { Object.assign(BIND, DEF_BIND); saveBinds(); wait = null; draw(); }; };
  const set = code => { if (!wait) return false; if (code !== 'Escape') { for (const k in BIND) if (BIND[k] === code && k !== wait) BIND[k] = ''; BIND[wait] = code; saveBinds(); } wait = null; draw(); return true; };
  addEventListener('keydown', e => { if (wait && container.isConnected && container.offsetParent !== null) { e.preventDefault(); e.stopImmediatePropagation(); set(e.code); } }, true);
  addEventListener('mousedown', e => { if (wait && container.isConnected && container.offsetParent !== null && !(e.target.dataset && e.target.dataset.a)) { e.preventDefault(); e.stopImmediatePropagation(); set('Mouse' + e.button); } }, true);
  addEventListener('mouseup', e => { if (e.button === 3 || e.button === 4) e.preventDefault(); }, true);
  draw(); return { draw }; }
export const KEY_CSS = `.kp{display:grid;grid-template-columns:repeat(auto-fill,minmax(250px,1fr));gap:4px 16px}.kr{display:flex;justify-content:space-between;align-items:center;gap:8px;font-size:13px;border-bottom:1px solid #ffffff14;padding:3px 0}
.kb{appearance:none;border:1px solid #ffffff33;background:#00000055;color:#eee;font:600 12px var(--mono,monospace);padding:4px 8px;min-width:96px;cursor:pointer}.kb:hover{border-color:var(--accent,#e0902c)}.kb.w{background:var(--accent,#e0902c);color:#1a1205}
.kf{display:flex;gap:10px;align-items:center;margin-top:10px;font-size:12px;color:#aaa;flex-wrap:wrap}`;

/* ---------- 파츠 (배그식 부착물) ----------
   총 종류마다 달 수 있는 전용 파츠가 다름. fx: vr 수직반동 배수, hr 수평반동 배수, rec 반동 회복 배수, ads 조준 속도 배수, sway 흔들림 배수, mag 탄창 추가, rt 장전시간 배수, spread 산탄 퍼짐 배수 */
export const ATT = {
  comp_ar: { slot: 'muzzle', name: '보정기 (소총)', fx: { vr: .85, hr: .75 } }, flash_ar: { slot: 'muzzle', name: '소염기 (소총)', fx: { vr: .9, hr: .9, noFlash: 1 } }, sup_ar: { slot: 'muzzle', name: '소음기 (소총)', fx: { hr: .95, quiet: 1, noFlash: 1 } },
  comp_smg: { slot: 'muzzle', name: '보정기 (기관단총)', fx: { vr: .85, hr: .75 } }, flash_smg: { slot: 'muzzle', name: '소염기 (기관단총)', fx: { vr: .9, hr: .9, noFlash: 1 } }, sup_smg: { slot: 'muzzle', name: '소음기 (기관단총)', fx: { hr: .95, quiet: 1, noFlash: 1 } },
  comp_sr: { slot: 'muzzle', name: '보정기 (저격총)', fx: { vr: .8, hr: .8 } }, flash_sr: { slot: 'muzzle', name: '소염기 (저격총)', fx: { vr: .9, hr: .9, noFlash: 1 } }, sup_sr: { slot: 'muzzle', name: '소음기 (저격총)', fx: { quiet: 1, noFlash: 1 } },
  sup_p: { slot: 'muzzle', name: '소음기 (권총)', fx: { quiet: 1, noFlash: 1 } }, choke: { slot: 'muzzle', name: '초크', fx: { spread: .6 } }, duck: { slot: 'muzzle', name: '덕빌', fx: { spread: .75, spreadY: .4 } },
  grip_v: { slot: 'grip', name: '수직 손잡이', fx: { vr: .8 } }, grip_a: { slot: 'grip', name: '앵글 손잡이', fx: { hr: .8, ads: 1.25 } }, grip_h: { slot: 'grip', name: '하프 손잡이', fx: { vr: .9, hr: .9, rec: 1.3 } },
  grip_t: { slot: 'grip', name: '엄지 손잡이', fx: { vr: .92, ads: 1.35 } }, grip_l: { slot: 'grip', name: '라이트 손잡이', fx: { vr: .93, hr: .88, sway: .85 } },
  mag_e_ar: { slot: 'mag', name: '대용량 탄창 (소총)', fx: { mag: 10 } }, mag_q_ar: { slot: 'mag', name: '퀵드로우 탄창 (소총)', fx: { rt: .7 } }, mag_eq_ar: { slot: 'mag', name: '대용량 퀵드로우 (소총)', fx: { mag: 10, rt: .7 } },
  mag_e_smg: { slot: 'mag', name: '대용량 탄창 (기관단총)', fx: { mag: 10 } }, mag_q_smg: { slot: 'mag', name: '퀵드로우 탄창 (기관단총)', fx: { rt: .7 } }, mag_eq_smg: { slot: 'mag', name: '대용량 퀵드로우 (기관단총)', fx: { mag: 10, rt: .7 } },
  mag_e_sr: { slot: 'mag', name: '대용량 탄창 (저격총)', fx: { mag: 5 } }, mag_q_sr: { slot: 'mag', name: '퀵드로우 탄창 (저격총)', fx: { rt: .7 } }, mag_eq_sr: { slot: 'mag', name: '대용량 퀵드로우 (저격총)', fx: { mag: 5, rt: .7 } },
  mag_e_p: { slot: 'mag', name: '대용량 탄창 (권총)', fx: { mag: 8 } },
  stock_t: { slot: 'stock', name: '전술 개머리판', fx: { vr: .92, sway: .8 } }, cheek: { slot: 'stock', name: '칙패드', fx: { vr: .85, sway: .7 } }, loops: { slot: 'stock', name: '탄띠', fx: { rt: .75 } },
};
export { ZONE_MUL, falloff };
export const ATT_SLOTS = ['muzzle', 'grip', 'mag', 'stock'];
export const SLOT_NAME = { optic: '조준경', muzzle: '총구', grip: '손잡이', mag: '탄창', stock: '개머리판' };
export function wclass(w) { return w.thr || w.rig ? null : w.pistol ? 'P' : w.pel ? 'SG' : w.grp === '기관단총' ? 'SMG' : w.act === 'bolt' ? 'SR' : w.grp === '저격·지정사수' ? 'DMR' : 'AR'; }
const GRIPS = ['grip_v', 'grip_a', 'grip_h', 'grip_t', 'grip_l'];
const ALLOW = { AR: { muzzle: ['comp_ar', 'flash_ar', 'sup_ar'], grip: GRIPS, mag: ['mag_e_ar', 'mag_q_ar', 'mag_eq_ar'], stock: ['stock_t'] },
  SMG: { muzzle: ['comp_smg', 'flash_smg', 'sup_smg'], grip: GRIPS, mag: ['mag_e_smg', 'mag_q_smg', 'mag_eq_smg'], stock: ['stock_t'] },
  DMR: { muzzle: ['comp_sr', 'flash_sr', 'sup_sr', 'comp_ar', 'flash_ar', 'sup_ar'], grip: GRIPS, mag: ['mag_e_sr', 'mag_q_sr', 'mag_eq_sr'], stock: ['cheek'] },
  SR: { muzzle: ['comp_sr', 'flash_sr', 'sup_sr'], grip: [], mag: ['mag_e_sr', 'mag_q_sr', 'mag_eq_sr'], stock: ['cheek', 'loops'] },
  SG: { muzzle: ['choke', 'duck'], grip: [], mag: [], stock: ['loops'] }, P: { muzzle: ['sup_p'], grip: [], mag: ['mag_e_p'], stock: [] } };
export function attAllowed(w, slot) { const c = wclass(w); if (!c) return []; const a = (ALLOW[c][slot] || []).slice(); if (slot === 'mag' && (w.clipLoad || w.act === 'pump')) return []; if (slot === 'mag' && w.k === 'kar98k') return []; return a; }
const attSel = {}; // 무기별 {muzzle, grip, mag, stock}
export function getAtts(w) { return attSel[w.k] || (attSel[w.k] = {}); }
export function attFx(w) { const f = { vr: 1, hr: 1, rec: 1, ads: 1, sway: 1, mag: 0, rt: 1, spread: 1, spreadY: 1 }; const a = attSel[w.k]; if (!a) return f;
  for (const sl in a) { const d = a[sl] && ATT[a[sl]]; if (!d) continue; for (const k in d.fx) { if (k === 'mag') f.mag += d.fx.mag; else if (typeof d.fx[k] === 'number' && k in f) f[k] *= d.fx[k]; else f[k] = d.fx[k]; } } return f; }
const pm = { dark: new THREE.MeshStandardMaterial({ color: 0x1e1f1d, roughness: .5, metalness: .55 }), mid: new THREE.MeshStandardMaterial({ color: 0x3a3b37, roughness: .6, metalness: .4 }), tan: new THREE.MeshStandardMaterial({ color: 0x8b7a5a, roughness: .8 }), brass: new THREE.MeshStandardMaterial({ color: 0xc9a043, metalness: .8, roughness: .3 }), lens: new THREE.MeshBasicMaterial({ color: 0xfff6d0 }) };
const bx = (w, h, d, m) => new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
const cy = (r1, r2, l, m, seg = 16) => { const c = new THREE.Mesh(new THREE.CylinderGeometry(r1, r2, l, seg), m); c.rotation.z = H; return c; };
// 파츠 모양 (총 좌표계: +X가 총구 방향, 원점이 부착 지점)
export function buildAtt(k) { const g = new THREE.Group(); const d = ATT[k]; if (!d) return g;
  if (k.startsWith('comp')) { const c = cy(.014, .014, .06, pm.dark); c.position.x = .03; g.add(c); for (let i = 0; i < 3; i++) { const sl = bx(.006, .006, .03, pm.mid); sl.position.set(.02 + i * .012, .013, 0); g.add(sl); } }
  else if (k.startsWith('flash')) { const c = cy(.013, .013, .03, pm.dark); c.position.x = .015; g.add(c); for (let i = 0; i < 4; i++) { const pr = bx(.04, .004, .004, pm.dark); const a = i * H + .4; pr.position.set(.05, Math.sin(a) * .01, Math.cos(a) * .01); g.add(pr); } }
  else if (k.startsWith('sup')) { const L = k === 'sup_p' ? .12 : k === 'sup_sr' ? .22 : .18, r = k === 'sup_p' ? .014 : .019; const c = cy(r, r, L, pm.dark, 20); c.position.x = L / 2; g.add(c); const e = cy(r * .5, r * .5, .004, pm.mid); e.position.x = L; g.add(e); }
  else if (k === 'choke') { const c = cy(.015, .013, .05, pm.mid); c.position.x = .025; g.add(c); }
  else if (k === 'duck') { const c = bx(.07, .008, .04, pm.dark); c.position.x = .035; g.add(c); }
  else if (k === 'grip_v') { const c = bx(.024, .085, .026, pm.dark); c.position.y = -.042; g.add(c); }
  else if (k === 'grip_a') { const c = bx(.06, .03, .024, pm.dark); c.position.set(-.01, -.02, 0); c.rotation.z = -.5; g.add(c); }
  else if (k === 'grip_h') { const c = bx(.04, .04, .024, pm.dark); c.position.y = -.02; c.rotation.z = .3; g.add(c); }
  else if (k === 'grip_t') { const c = bx(.03, .022, .03, pm.dark); c.position.set(.01, -.012, 0); g.add(c); }
  else if (k === 'grip_l') { const c = bx(.05, .028, .028, pm.dark); c.position.y = -.016; g.add(c); const l = cy(.009, .009, .004, pm.lens); l.position.set(.026, -.016, 0); g.add(l); }
  else if (k.startsWith('mag')) { const ext = k.includes('_e'), q = k.includes('q'); if (ext) { const c = bx(.03, .06, .022, pm.dark); c.position.y = -.03; g.add(c); } if (q) { const t = bx(.008, .03, .024, new THREE.MeshStandardMaterial({ color: 0xd2622a, roughness: .7 })); t.position.set(-.02, ext ? -.05 : -.015, 0); g.add(t); } if (!ext && !q) g.add(bx(.03, .03, .022, pm.dark)); }
  else if (k === 'stock_t') { const c = bx(.07, .09, .036, pm.dark); c.position.x = -.035; g.add(c); const p = bx(.014, .1, .04, pm.mid); p.position.x = -.07; g.add(p); }
  else if (k === 'cheek') { const c = bx(.12, .022, .04, pm.tan); c.position.y = .011; g.add(c); }
  else if (k === 'loops') { const c = bx(.1, .03, .006, new THREE.MeshStandardMaterial({ color: 0x4a3d2a, roughness: .9 })); g.add(c); for (let i = 0; i < 5; i++) { const b = new THREE.Mesh(new THREE.CylinderGeometry(.004, .004, .028, 8), pm.brass); b.position.set(-.04 + i * .02, 0, .005); g.add(b); } }
  g.traverse(m => { if (m.isMesh) { m.castShadow = true; m.frustumCulled = false; } }); return g; }
// 총에 파츠 모양을 붙임 (부착 지점은 모델을 읽어서 계산해 둔 위치)
export function applyAtts(model, w) { const U = model.userData; U.attG.clear(); U.gripHand = null; if (U.extMag) { U.extMag.parent && U.extMag.parent.remove(U.extMag); U.extMag = null; }
  const a = attSel[w.k] || {}; const S = U.size;
  if (a.muzzle) { const g = buildAtt(a.muzzle); g.position.copy(U.muzzle.position); U.attG.add(g); }
  if (a.grip && U.hands && U.hands.l) { const g = buildAtt(a.grip); g.position.set(U.hands.l.x, U.hands.l.y + .008, 0); U.attG.add(g); U.gripHand = new THREE.Vector3(U.hands.l.x, U.hands.l.y - (a.grip === 'grip_v' ? .05 : .02), 0); }
  if (a.mag) { const g = buildAtt(a.mag); const mp = U.parts.mag; if (mp) { model.updateMatrixWorld(true); const bb = new THREE.Box3().setFromObject(mp.n, true); const inv = model.matrixWorld.clone().invert(); bb.applyMatrix4(inv); const c = bb.getCenter(new THREE.Vector3()); const bot = new THREE.Vector3(c.x, bb.min.y + .005, 0);
      const wpt = model.localToWorld(bot.clone()); mp.n.worldToLocal(wpt); g.position.copy(wpt); const ws = mp.n.getWorldScale(new THREE.Vector3()), ms = model.getWorldScale(new THREE.Vector3()); g.scale.set(ms.x / ws.x, ms.y / ws.y, ms.z / ws.z); mp.n.add(g); U.extMag = g; }
    else { g.position.copy(U.magPt); g.position.y += .005; U.attG.add(g); } }
  if (a.stock) { const g = buildAtt(a.stock); if (a.stock === 'cheek') { const x = -S.x * .36; g.position.set(x, (U.topAt(x) ?? 0), 0); } else if (a.stock === 'loops') g.position.set(-S.x * .33, 0, S.z / 2 + .004); else g.position.set(-S.x / 2 + .02, 0, 0); U.attG.add(g); } }
export function setAtt(w, slot, k) { const a = getAtts(w); if (k) a[slot] = k; else delete a[slot]; const m = cache[w.k]; if (m) applyAtts(m, w); }

/* ---------- 모델 ---------- */
const loader = new GLTFLoader(); const cache = {}; let BASE = 'models/';
export function setModelBase(b) { BASE = b; }
const PART_RX = { mag: /^(magazine|mag|magazine_standard|clip)$/i, slide: /^(slide|slider|gun_slider|slide_gun)$/i, bolt: /^(bolt|charging handle|charging_handle|bolt_firing)$/i, pump: /^(pump|fr)$/i };
export async function getModel(w) {
  if (cache[w.k]) return cache[w.k];
  if (!cache['_p' + w.k]) cache['_p' + w.k] = (async () => {
    const j = await fetch(BASE + w.k + '.json').then(r => r.json()); const bin = Uint8Array.from(atob(j.glb), c => c.charCodeAt(0)).buffer; const g = await loader.parseAsync(bin, '');
    const src = g.scene;
    if (w.strip) { const rx = new RegExp(w.strip, 'i'), del = []; src.traverse(n => { if (rx.test(n.name.trim())) del.push(n); }); del.forEach(n => n.parent && n.parent.remove(n)); } // 모델 옆에 따로 놓인 클립·탄 제거
    src.traverse(m => { if (m.isMesh) { m.frustumCulled = false; m.castShadow = true; m.receiveShadow = true; m.userData.base = [].concat(m.material).map(x => x.color ? x.color.clone() : null); } });
    const yawG = new THREE.Group(); yawG.rotation.y = w.yaw; yawG.add(src); const piv = new THREE.Group(); piv.add(yawG);
    piv.updateMatrixWorld(true); const b = new THREE.Box3().setFromObject(piv, true); const sz = b.getSize(new THREE.Vector3()), ce = b.getCenter(new THREE.Vector3());
    const L = w.hgt ? sz.y : Math.max(sz.x, sz.z); const s = w.len / L;
    const norm = new THREE.Group(); norm.add(piv); piv.position.copy(ce).multiplyScalar(-1); norm.scale.setScalar(s);
    const out = new THREE.Group(); out.add(norm);
    const S = sz.clone().multiplyScalar(s);
    const mz = new THREE.Object3D(); mz.position.set(S.x / 2, S.y * .22, 0); out.add(mz);
    out.updateMatrixWorld(true); const parts = {};
    if (!w.rig) src.traverse(n => { for (const k in PART_RX) { if (!parts[k] && PART_RX[k].test(n.name.trim())) {
      const par = n.parent; const wp = n.getWorldPosition(new THREE.Vector3()); const a = par.worldToLocal(wp.clone());
      const dir = v => par.worldToLocal(wp.clone().add(v)).sub(a);
      parts[k] = { n, p0: n.position.clone(), down: dir(new THREE.Vector3(0, -1, 0)), back: dir(new THREE.Vector3(-1, 0, 0)), fwd: dir(new THREE.Vector3(.35, -1, 0).normalize()) }; } } });
    const proxy = new THREE.Mesh(new THREE.BoxGeometry(.035, .13, .025), new THREE.MeshStandardMaterial({ color: 0x222222, roughness: .6, metalness: .4 })); proxy.position.set(w.pistol ? -S.x * .25 : -S.x * .04, -S.y * .15, 0); proxy.visible = false; out.add(proxy);
    // 조준경 받침 높이: 장착 위치에서 위에서 아래로 광선을 쏴 총 윗면을 찾음
    let railY = S.y / 2; { const rc = new THREE.Raycaster(); const mx = w.pistol ? -S.x * .05 : -S.x * .06; let best = -1e9; for (const dx of [-.03, 0, .03]) for (const dz of [-.01, 0, .01]) { rc.set(new THREE.Vector3(mx + dx, S.y + 1, dz), new THREE.Vector3(0, -1, 0)); const h = rc.intersectObject(norm, true)[0]; if (h) best = Math.max(best, h.point.y); } if (best > -1e9) railY = best; }
    // 손 위치: 총 아래쪽을 위로 쏘는 광선으로 손잡이(가장 낮게 튀어나온 곳)와 총열 덮개 아랫면을 찾음
    const hands = (() => { const rc = new THREE.Raycaster(); const UP = new THREE.Vector3(0, 1, 0);
      const under = x => { let best = null; for (const z of [-.008, 0, .008]) { rc.set(new THREE.Vector3(x, -S.y - 1, z), UP); const h = rc.intersectObject(norm, true)[0]; if (h && (best === null || h.point.y < best)) best = h.point.y; } return best; };
      if (w.thr) return { r: new THREE.Vector3(0, 0, 0), l: null };
      if (w.pistol) { let gx = -S.x * .25, gy = under(gx); for (let i = 0; i <= 8; i++) { const x = -S.x * (.05 + i * .05), y = under(x); if (y !== null && (gy === null || y < gy)) { gy = y; gx = x; } } gy = gy ?? -S.y / 2; return { r: new THREE.Vector3(gx + .01, gy + .055, 0), l: new THREE.Vector3(gx + .02, gy + .035, -.012) }; }
      let gx = -S.x * .2, gy = null; for (let i = 0; i <= 10; i++) { const x = -S.x * (.08 + i * .03), y = under(x); if (y !== null && (gy === null || y < gy - .005)) { gy = y; gx = x; } }
      gy = gy ?? -S.y * .3; const fx = parts.pump ? null : S.x * .2; let ly = fx !== null ? under(fx) : null;
      let l = new THREE.Vector3(S.x * .2, (ly ?? -S.y * .05) - .01, 0);
      if (parts.pump) { const wp = parts.pump.n.getWorldPosition(new THREE.Vector3()); l = new THREE.Vector3(wp.x, (under(wp.x) ?? wp.y) - .01, 0); }
      return { r: new THREE.Vector3(gx + .015, Math.min(gy + .06, railY - .03), 0), l }; })();
    // 클립 장전 총: 놋쇠 탄 5발짜리 클립을 직접 만들어 노리쇠 위에서 꽂음
    let clipObj = null; if (w.clipLoad) { clipObj = new THREE.Group(); const bm = new THREE.MeshStandardMaterial({ color: 0xc9a043, metalness: .8, roughness: .3 }); for (let i = 0; i < 5; i++) { const c = new THREE.Mesh(new THREE.CylinderGeometry(.0045, .0045, .055, 8).rotateZ(H), bm); c.position.y = -i * .009; clipObj.add(c); } const plate = new THREE.Mesh(new THREE.BoxGeometry(.012, .05, .006), new THREE.MeshStandardMaterial({ color: 0x55534d, metalness: .6, roughness: .5 })); plate.position.set(-.025, -.018, 0); clipObj.add(plate);
      const bw = parts.bolt ? parts.bolt.n.getWorldPosition(new THREE.Vector3()) : new THREE.Vector3(-S.x * .12, 0, 0); clipObj.position.set(bw.x + .03, railY + .02, 0); clipObj.userData.p0 = clipObj.position.clone(); clipObj.visible = false; out.add(clipObj); }
    // 가늠자·가늠쇠 높이: 위에서 아래로 광선을 쏴 뒤쪽(기관부)과 앞쪽(총구 근처) 윗면을 찾음
    const prof = (() => { const rc = new THREE.Raycaster(), DN = new THREE.Vector3(0, -1, 0), UP = new THREE.Vector3(0, 1, 0);
      const top = x => { let b = null; for (const z of [-.006, 0, .006]) { rc.set(new THREE.Vector3(x, S.y + 1, z), DN); const h = rc.intersectObject(norm, true)[0]; if (h && (b === null || h.point.y > b)) b = h.point.y; } return b; };
      const under = x => { let b = null; for (const z of [-.006, 0, .006]) { rc.set(new THREE.Vector3(x, -S.y - 1, z), UP); const h = rc.intersectObject(norm, true)[0]; if (h && (b === null || h.point.y < b)) b = h.point.y; } return b; };
      const mx = (a, b2, f) => { let best = null, bx = a; for (let i = 0; i <= 12; i++) { const x = S.x * (a + (b2 - a) * i / 12), y = f(x); if (y !== null && (best === null || (f === top ? y > best : y < best))) { best = y; bx = x; } } return [best, bx]; };
      const [rear] = mx(-.22, .12, top), [front] = mx(.3, .48, top), [mb, mbx] = mx(-.12, .16, under);
      let iron = S.y / 2 + .012; if (rear !== null) iron = (front !== null && front > rear - .015 ? Math.max(rear, front) + .004 : rear + .008);
      return { iron, magPt: new THREE.Vector3(mbx, mb ?? -S.y / 2, 0), top }; })();
    const attG = new THREE.Group(); out.add(attG);
    out.userData = { muzzle: mz, size: S, gltf: g, parts, proxy, norm, optic: null, opticKey: 'none', railY, hands, clip: !!clipObj, clipObj, iron: prof.iron, magPt: prof.magPt, topAt: prof.top, attG };
    if (w.def && !w.builtin) attachOptic(out, w, w.def);
    if (w.builtin) out.userData.opticKey = w.def;
    cache[w.k] = out; return out;
  })();
  return cache['_p' + w.k];
}
export function cachedModel(k) { return cache[k]; }
export function paint(model, hex) { model.traverse(m => { if (!m.isMesh || !m.userData.base) return; [].concat(m.material).forEach((mt, i) => { const base = m.userData.base[i]; if (!base || !mt.color) return;
  if (!hex) { mt.color.copy(base); return; } const t = new THREE.Color(hex); const l = base.r * .3 + base.g * .59 + base.b * .11; const k = Math.min(1, .35 + l * 1.4); mt.color.copy(base).lerp(t.clone().multiplyScalar(.35 + l * .9), k * .8); }); }); }
// 3인칭(다른 플레이어 손)에 쥐여 줄 가벼운 복제본
export function thirdPersonGun(w) { const m = cache[w.k]; if (!m) return null; const g = new THREE.Group(); const c = skClone(m.userData.norm); c.traverse(x => { if (x.isMesh) { x.frustumCulled = !x.isSkinnedMesh; x.castShadow = false; } }); g.add(c); return g; }

/* ---------- 리그 애니메이션 ---------- */
const mixers = {};
function mixerOf(m) { const g = m.userData.gltf; if (!g.animations.length) return null; if (!mixers[g.scene.uuid]) { const mx = new THREE.AnimationMixer(g.scene); const clips = {}; g.animations.forEach(a => { clips[a.name.split('|').pop().toLowerCase()] = mx.clipAction(a); }); mixers[g.scene.uuid] = { mx, clips }; } return mixers[g.scene.uuid]; }
export function playIdle(m) { const M = mixerOf(m); if (!M) return; Object.values(M.clips).forEach(a => a.stop()); const a = M.clips.idle || M.clips.grip; if (a) a.play(); }
export function playOnce(m, name) { const M = mixerOf(m); if (!M || !M.clips[name]) return 0; const a = M.clips[name]; a.reset().setLoop(THREE.LoopOnce, 1); a.clampWhenFinished = false; a.play(); return a.getClip().duration; }
export function tickMixers(dt) { for (const k in mixers) mixers[k].mx.update(dt); }
export function resetParts(m) { const pr = m.userData.parts; for (const k in pr) pr[k].n.position.copy(pr[k].p0); if (pr.mag) pr.mag.n.visible = true; m.userData.proxy.visible = false; if (m.userData.clipObj) m.userData.clipObj.visible = false; }

/* ---------- 조준경 메시 ---------- */
const optMat = new THREE.MeshStandardMaterial({ color: 0x1d1f1e, roughness: .45, metalness: .6 });
const lensMat = new THREE.MeshStandardMaterial({ color: 0x3b6a8a, roughness: .05, metalness: .2, transparent: true, opacity: .35, depthWrite: false });
const redMat = new THREE.MeshBasicMaterial({ color: 0xff2a2a });
const optTubeMat = new THREE.MeshStandardMaterial({ color: 0x1d1f1e, roughness: .45, metalness: .6, side: THREE.DoubleSide });
const dotGlassMat = new THREE.MeshBasicMaterial({ color: 0xffb070, transparent: true, opacity: .08, depthWrite: false, side: THREE.DoubleSide });
function cyl(r1, r2, len, mat) { const m = new THREE.Mesh(new THREE.CylinderGeometry(r1, r2, len, 20, 1, mat === lensMat), mat); m.rotation.z = H; m.castShadow = true; return m; }
export function buildOptic(key) {
  const o = OPTICS[key]; const g = new THREE.Group(); if (!o || key === 'none') return g;
  const mount = new THREE.Mesh(new THREE.BoxGeometry(o.len * .8, .012, .026), optMat); mount.position.y = .006; g.add(mount);
  if (o.type === 'dot') {
    const tube = new THREE.Mesh(new THREE.CylinderGeometry(.019, .019, o.len, 24, 1, true), optTubeMat); tube.rotation.z = H; tube.position.y = o.h; g.add(tube);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(.0185, .0025, 8, 24), optMat); rim.rotation.y = H; rim.position.set(o.len / 2, o.h, 0); g.add(rim);
    const rim2 = rim.clone(); rim2.position.x = -o.len / 2; g.add(rim2);
    const glass = new THREE.Mesh(new THREE.CircleGeometry(.017, 24), dotGlassMat); glass.rotation.y = H; glass.position.set(o.len / 2 - .002, o.h, 0); g.add(glass);
    const leg = new THREE.Mesh(new THREE.BoxGeometry(o.len * .5, o.h - .01, .02), optMat); leg.position.y = (o.h) / 2; g.add(leg);
    const knob = cyl(.006, .006, .012, optMat); knob.rotation.set(H, 0, 0); knob.position.set(0, o.h, .022); g.add(knob);
  } else if (o.type === 'holo') {
    const base = new THREE.Mesh(new THREE.BoxGeometry(o.len, .022, .036), optMat); base.position.y = .02; g.add(base);
    for (const s of [-1, 1]) { const side = new THREE.Mesh(new THREE.BoxGeometry(.012, .046, .005), optMat); side.position.set(o.len / 2 - .01, o.h, s * .019); g.add(side); }
    const top = new THREE.Mesh(new THREE.BoxGeometry(.012, .005, .043), optMat); top.position.set(o.len / 2 - .01, o.h + .023, 0); g.add(top);
    const glass = new THREE.Mesh(new THREE.PlaneGeometry(.036, .04), lensMat); glass.rotation.y = H; glass.position.set(o.len / 2 - .01, o.h, 0); g.add(glass);
  } else {
    const tube = cyl(o.r, o.r, o.len * .7, optMat); tube.position.y = o.h; g.add(tube);
    const obj = cyl(o.r * 1.45, o.r, o.len * .22, optMat); obj.position.set(o.len * .42, o.h, 0); g.add(obj);
    const eye = cyl(o.r * 1.15, o.r * 1.3, o.len * .16, optMat); eye.position.set(-o.len * .42, o.h, 0); g.add(eye);
    const lens = cyl(o.r * 1.35, o.r * 1.35, .003, lensMat); lens.position.set(o.len * .53, o.h, 0); g.add(lens);
    const t1 = cyl(.007, .007, .016, optMat); t1.rotation.z = 0; t1.position.set(0, o.h + o.r + .006, 0); g.add(t1);
    const t2 = cyl(.007, .007, .016, optMat); t2.rotation.set(H, 0, 0); t2.position.set(0, o.h, o.r + .006); g.add(t2);
    for (const x of [-.25, .25]) { const ring = cyl(o.r * 1.1, o.r * 1.1, .012, optMat); ring.position.set(o.len * x, o.h, 0); g.add(ring); const leg = new THREE.Mesh(new THREE.BoxGeometry(.012, o.h - o.r, .02), optMat); leg.position.set(o.len * x, (o.h - o.r) / 2, 0); g.add(leg); }
  }
  return g;
}
export function attachOptic(model, w, key) {
  const U = model.userData; if (U.optic) { model.remove(U.optic); U.optic = null; }
  U.opticKey = w.builtin ? w.def : key || 'none';
  if (w.builtin || !key || key === 'none') return;
  const g = buildOptic(key); const S = U.size; g.position.set(w.pistol ? -S.x * .05 : -S.x * .06, U.railY - .003, 0); model.add(g); U.optic = g;
}

/* ---------- 사운드 ---------- */
let actx = null; export function ac() { try { actx = actx || new (window.AudioContext || window.webkitAudioContext)(); if (actx.state === 'suspended') actx.resume(); } catch (e) {} return actx; }
function noise(len, lp, gain, decay) { const a = ac(); if (!a || gain < .003) return; const t = a.currentTime, n = a.createBufferSource(), b = a.createBuffer(1, Math.max(1, a.sampleRate * len), a.sampleRate), d = b.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, decay); n.buffer = b; const f = a.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = lp; const g = a.createGain(); g.gain.value = gain; n.connect(f).connect(g).connect(a.destination); n.start(t); }
function tone(fr, len, gain, type = 'square') { const a = ac(); if (!a) return; const o = a.createOscillator(), g = a.createGain(); o.type = type; o.frequency.value = fr; g.gain.setValueAtTime(gain, a.currentTime); g.gain.exponentialRampToValueAtTime(.0001, a.currentTime + len); o.connect(g).connect(a.destination); o.start(); o.stop(a.currentTime + len + .02); }
export const snd = { shot: (w, vol = 1, far = 0) => noise(w.act === 'bolt' ? .6 : w.pel ? .5 : .32, (w.pistol ? 2600 : w.act === 'bolt' ? 1800 : 2200) * (1 - far * .8), .6 * vol, w.pistol ? 6 : 3.5), click: () => tone(2200, .04, .05), mag: () => { tone(700, .05, .06); noise(.08, 1800, .15, 6); }, bolt: () => { tone(420, .06, .08, 'sawtooth'); noise(.1, 2500, .15, 5); },
  ding: () => tone(1750, .35, .08, 'sine'), step: (v = 1) => noise(.07, 300, .12 * v, 4), boom: (v = 1) => noise(1.2, 700, .9 * v, 2), hit: () => tone(900, .08, .06, 'triangle'), hurt: () => noise(.15, 500, .3, 3), noise, tone };

/* ---------- 1인칭 엔진 ---------- */
const ease = x => x < 0 ? 0 : x > 1 ? 1 : x * x * (3 - 2 * x);
export function createFP(o) {
  // o: {scene, cam, hitables, solids, targets, bounds, el, slots, onHitPlayer, onShot, onThrow, onBoomSelf, onPick, canControl, startAmmo}
  const S2 = o.scene, cam2 = o.cam, hitables = o.hitables, solids = o.solids, targets = o.targets || [];
  const $ = id => document.getElementById(id);
  const el = { fp: $('fp'), start: $('start'), scope: $('scope'), cross: $('cross'), hitm: $('hitm'), dist: $('dist'), state: $('stateTxt'), breath: $('breath'), breathI: $('breathI'), stance: $('stanceTxt'), ammoN: $('ammoN'), ammoR: $('ammoR'), mode: $('modeTxt'), slots: $('slotsEl'), strip: $('strip'), flash: $('flashbang'), dotRet: $('dotRet'), zoomTxt: $('zoomTxt'), thrUi: $('thrUi'), thrBar: $('thrBar'), thrTxt: $('thrTxt'), fuses: $('fuses'), burn: $('burnv') };
  const vmRoot = new THREE.Group(); cam2.add(vmRoot); const vm = new THREE.Group(); vmRoot.add(vm);
  const flashTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d'); const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(255,240,200,1)'); gr.addColorStop(.3, 'rgba(255,170,60,.9)'); gr.addColorStop(1, 'rgba(255,90,0,0)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 64); return new THREE.CanvasTexture(c); })();
  const FLASH = new THREE.SpriteMaterial({ map: flashTex, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true });
  const flash = new THREE.Sprite(FLASH); flash.visible = false; const flashLight = new THREE.PointLight(0xffa040, 0, 8, 2);
  const slots = o.slots; // [k|null, k|null, k|null, k|null]
  const inv = {}; const ammoPool = o.ammoPool || null; // 배틀로얄: 구경별 공용 탄약
  const optSel = {}; // 무기별 조준경
  function invOf(w) { return inv[w.k] || (inv[w.k] = { ammo: o.startFull === false ? 0 : w.mag, reserve: w.thr ? (o.startThrow ?? 2) : w.mag * 4, mode: 0 }); }
  const magOf = w => w.mag + (attFx(w).mag || 0), rtOf = w => w.rt * attFx(w).rt;
  function reserveOf(w) { return ammoPool && !w.thr ? (ammoPool[w.cal] || 0) : invOf(w).reserve; }
  function takeReserve(w, n) { if (ammoPool && !w.thr) { const t = Math.min(n, ammoPool[w.cal] || 0); ammoPool[w.cal] = (ammoPool[w.cal] || 0) - t; return t; } const v = invOf(w); const t = Math.min(n, v.reserve); v.reserve -= t; return t; }
  const P = { pos: new THREE.Vector3().copy(o.spawn || new THREE.Vector3(0, 0, 6)), vel: new THREE.Vector3(), yaw: 0, pitch: 0, stance: 'stand', eye: 1.65, onG: true, lean: 0, breath: 1, stepT: 0, bob: 0, sprinting: false, holding: false, dead: false };
  let cur = null, curSlot = -1, ws = null, locked = false, dragLook = null, keys = {}, fireHeld = false, ads = false, adsHoldStart = 0, adsT = 0, hipT = 1, recPool = 0, recAcc = 0, lastShot = -9, shotIdx = 0, bloom = 0, kick = 0, kickR = 0, shake = 0, flashT = 0, swayX = 0, swayY = 0, mdx = 0, mdy = 0, burstLeft = 0, blow = 0, enabled = false, hitmT = 0, stateT = 0, blind = 0;
  const bullets = [], decals = [], sparks = [], casings = [], thrown = [], booms = [];
  function bounceSnd(c, sp) { const d = c.position.distanceTo(cam2.position); if (d < 40) snd.tone(1400 + Math.random() * 600, .04, .05 * Math.min(1, sp / 8) * (1 - d / 40), 'square'); }
  const ray = new THREE.Raycaster();
  const tracerGeo = new THREE.CylinderGeometry(.006, .006, 1, 4).rotateX(H), bulletGeo = new THREE.CylinderGeometry(.0035, .0035, 1, 4).rotateX(H);
  const casingGeo = new THREE.CylinderGeometry(.005, .005, .022, 6), casingMat = new THREE.MeshStandardMaterial({ color: 0xc9a043, metalness: .8, roughness: .3 }), shellMat = new THREE.MeshStandardMaterial({ color: 0xa02a1c, roughness: .6 }), proxyMat = new THREE.MeshStandardMaterial({ color: 0x222222, roughness: .6, metalness: .4 });
  const tracerMat = new THREE.MeshBasicMaterial({ color: 0xffc070, transparent: true, opacity: .9 });
  const bulletMat = new THREE.MeshBasicMaterial({ color: 0xfff0c8, transparent: true, opacity: .4, depthWrite: false });
  const holeTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d'); const gr = g.createRadialGradient(32, 32, 0, 32, 32, 30); gr.addColorStop(0, 'rgba(5,5,5,1)'); gr.addColorStop(.22, 'rgba(15,12,10,1)'); gr.addColorStop(.32, 'rgba(60,55,50,.85)'); gr.addColorStop(.6, 'rgba(40,36,32,.35)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
    g.strokeStyle = 'rgba(20,18,16,.7)'; g.lineWidth = 1.2; for (let i = 0; i < 7; i++) { const a = Math.random() * 6.28, r1 = 8, r2 = 16 + Math.random() * 12; g.beginPath(); g.moveTo(32 + Math.cos(a) * r1, 32 + Math.sin(a) * r1); g.lineTo(32 + Math.cos(a + .2) * r2, 32 + Math.sin(a + .2) * r2); g.stroke(); } const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; })();
  const holeMat = new THREE.MeshBasicMaterial({ map: holeTex, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4 });
  const bloodTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d'); g.fillStyle = 'rgba(110,8,8,.9)'; for (let i = 0; i < 26; i++) { const a = Math.random() * 6.28, r = Math.random() * 40, s = 4 + Math.random() * (22 - r / 3); g.beginPath(); g.arc(64 + Math.cos(a) * r, 64 + Math.sin(a) * r, s, 0, 7); g.fill(); }
    g.fillStyle = 'rgba(70,4,4,.95)'; g.beginPath(); g.arc(64, 64, 20, 0, 7); g.fill(); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; })();
  const bloodDecalMat = new THREE.MeshBasicMaterial({ map: bloodTex, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -3 });
  const puffTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d'); const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(255,255,255,.9)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 64); return new THREE.CanvasTexture(c); })();
  const puffs = []; const chipGeo = new THREE.BoxGeometry(.025, .025, .025), chipMat = new THREE.MeshBasicMaterial({ color: 0xb89a70 }), chipMatT = new THREE.MeshBasicMaterial({ color: 0xffd27a }), dropGeo = new THREE.SphereGeometry(.014, 5, 4), dropMat = new THREE.MeshBasicMaterial({ color: 0x7a0606 }), decalGeo = new THREE.PlaneGeometry(1, 1);
  function puff(p, col, size, life, vel) { const m = new THREE.Sprite(new THREE.SpriteMaterial({ map: puffTex, color: col, transparent: true, depthWrite: false, opacity: .8 })); m.position.copy(p); m.scale.setScalar(size * .4); m.userData = { t: 0, life, size, v: vel || new THREE.Vector3(0, .3, 0) }; S2.add(m); puffs.push(m); }
  function decal(p, n, mat, size) { const d = new THREE.Mesh(decalGeo, mat); d.scale.setScalar(size); d.position.copy(p).addScaledVector(n, .006); d.lookAt(d.position.clone().add(n)); d.rotateZ(Math.random() * 6.28); S2.add(d); decals.push(d); if (decals.length > 220) S2.remove(decals.shift()); return d; }
  // 피: 튀는 방울 + 피 안개 + 뒤쪽 벽이나 바닥에 묻는 자국
  function blood(p, dir, head) { const n = head ? 18 : 12;
    for (let i = 0; i < n; i++) { const s = new THREE.Mesh(dropGeo, dropMat); s.scale.setScalar(.6 + Math.random() * 1.2); s.position.copy(p); s.userData = { v: dir.clone().multiplyScalar(1.5 + Math.random() * 2.5).add(new THREE.Vector3((Math.random() - .5) * 2.4, Math.random() * 1.8, (Math.random() - .5) * 2.4)), t: 0, blood: 1 }; S2.add(s); sparks.push(s); }
    puff(p, 0x8a0a0a, head ? 1.1 : .8, .45, dir.clone().multiplyScalar(.8));
    const back = o.rayStatic ? o.rayStatic(p, dir.clone().normalize(), 2.8) : null;
    if (back) decal(back.point, back.normal, bloodDecalMat, .35 + Math.random() * .3);
    const gy = o.groundAt ? o.groundAt(p.x, p.z) : 0; decal(new THREE.Vector3(p.x + dir.x * .6, gy + .005, p.z + dir.z * .6), new THREE.Vector3(0, 1, 0), bloodDecalMat, .5 + Math.random() * .4); }

  function optic() { return ws && cur ? OPTICS[cur.userData.opticKey] || OPTICS.none : OPTICS.none; }
  function adsZoom() { const w = ws && ws.w; if (!w || !w.zoom) return 1; const op = optic(); return op.zoom || w.zoom; }
  function scopedOptic() { return optic().type === 'scope'; }

  async function equip(s) {
    if (!slots[s]) return; if (ws && ws.w.thr && thr.pulled) { const k = ws.w.k; const p = handWorld(); spawnThrown(k, p, P.vel.clone(), true, undefined, thr.fuse); o.onThrow && o.onThrow(k, p, P.vel.clone(), thr.fuse); invOf(ws.w).reserve--; setState('핀 뽑은 수류탄을 떨어뜨렸어요'); } resetThr(); curSlot = s; const w = WK[slots[s]];
    const m = await getModel(w); if (slots[curSlot] !== w.k || curSlot !== s) return;
    vm.clear(); resetParts(m); m.position.set(0, 0, 0); m.rotation.set(0, H, 0); m.visible = true; vm.add(m); m.userData.muzzle.add(flash); cur = m;
    if (optSel[w.k] !== undefined) attachOptic(m, w, optSel[w.k]); applyAtts(m, w);
    playIdle(m); ws = { w, draw: 0, reload: null, cycle: null }; ads = false; burstLeft = 0; updHud(); renderSlots(); o.onEquip && o.onEquip(w);
  }
  function setOptic(w, key) { optSel[w.k] = key; const m = cache[w.k]; if (m) attachOptic(m, w, key); updHud(); }

  /* ----- 1인칭 팔과 손 ----- */
  const sleeveM = new THREE.MeshStandardMaterial({ color: 0x4d5a3b, roughness: .92 }), gloveM = new THREE.MeshStandardMaterial({ color: 0x1c1b19, roughness: .85 }), skinM = new THREE.MeshStandardMaterial({ color: 0xc69873, roughness: .7 });
  const segGeo = new THREE.CylinderGeometry(1, 1, 1, 10);
  function makeArm(side) { const g = new THREE.Group(); const up = new THREE.Mesh(segGeo, sleeveM), fo = new THREE.Mesh(segGeo, sleeveM), wrist = new THREE.Mesh(segGeo, skinM);
    const hand = new THREE.Group(); const palm = new THREE.Mesh(new THREE.BoxGeometry(.038, .072, .068), gloveM); hand.add(palm); const fing = new THREE.Mesh(new THREE.BoxGeometry(.024, .06, .064), gloveM); fing.position.set(side * -.021, -.01, -.006); hand.add(fing); const thumb = new THREE.Mesh(new THREE.BoxGeometry(.016, .016, .04), gloveM); thumb.position.set(side * .016, .024, -.028); hand.add(thumb);
    g.add(up, fo, wrist, hand); [up, fo, wrist, palm, fing, thumb].forEach(m => { m.frustumCulled = false; m.renderOrder = 1; }); vmRoot.add(g); return { g, up, fo, wrist, hand, side, fing }; }
  const AR = makeArm(1), AL = makeArm(-1);
  const _q = new THREE.Quaternion(), _Y = new THREE.Vector3(0, 1, 0);
  function seg(m, a, b, r0) { const d = b.clone().sub(a), L = d.length(); m.position.copy(a).addScaledVector(d, .5); m.quaternion.setFromUnitVectors(_Y, d.normalize()); m.scale.set(r0, Math.max(.001, L), r0); }
  function poseArm(A, target, shoulder, fist) { const elbow = shoulder.clone().lerp(target, .52).add(new THREE.Vector3(A.side * .07, -.1, .02));
    const wristP = target.clone().lerp(elbow, .18);
    seg(A.up, shoulder, elbow, .045); seg(A.fo, elbow, wristP, .034); seg(A.wrist, wristP.clone().lerp(target, .3), wristP, .024);
    A.hand.position.copy(target); A.hand.quaternion.setFromUnitVectors(_Y, wristP.clone().sub(target).normalize()); A.hand.rotateY(A.side * .3); A.fing.scale.set(1, fist ? .6 : 1, 1); A.fing.position.y = fist ? .01 : -.012; A.hand.scale.setScalar(fist ? .78 : 1); }
  const medProp = new THREE.Group(); { const tc = document.createElement('canvas'); tc.width = tc.height = 64; const g2 = tc.getContext('2d'); g2.fillStyle = '#eee'; g2.fillRect(0, 0, 64, 64); g2.fillStyle = '#c22'; g2.fillRect(26, 10, 12, 44); g2.fillRect(10, 26, 44, 12); const t = new THREE.CanvasTexture(tc); t.colorSpace = THREE.SRGBColorSpace;
    medProp.userData.kit = new THREE.Mesh(new THREE.BoxGeometry(.16, .1, .12), new THREE.MeshStandardMaterial({ map: t, roughness: .6 })); medProp.userData.med = new THREE.Mesh(new THREE.BoxGeometry(.24, .14, .16), new THREE.MeshStandardMaterial({ map: t, roughness: .6 })); medProp.userData.bandage = new THREE.Mesh(new THREE.CylinderGeometry(.04, .04, .07, 14).rotateZ(H), new THREE.MeshStandardMaterial({ color: 0xf2efe6, roughness: .9 }));
    ['kit', 'med', 'bandage'].forEach(k => { medProp.add(medProp.userData[k]); medProp.userData[k].renderOrder = 1; }); vmRoot.add(medProp); medProp.visible = false; }
  const SH_R = new THREE.Vector3(.26, -.4, .12), SH_L = new THREE.Vector3(-.26, -.4, .08);
  let punchT = 9, punchSide = 1, punchDone = true; const _w = new THREE.Vector3();
  function toCam(v) { return vmRoot.worldToLocal(v); }
  function partWorld(k) { const p = cur && cur.userData.parts[k]; return p ? p.n.getWorldPosition(new THREE.Vector3()) : null; }
  function partDelta(k) { const p = cur && cur.userData.parts[k]; if (!p) return null; const par = p.n.parent; const a = par.localToWorld(p.p0.clone()), b = par.localToWorld(p.n.position.clone()); return b.sub(a); }
  function punch() { const t = performance.now() / 1000; if (punchT < .42) return; punchT = 0; punchSide = -punchSide; punchDone = false; snd.noise(.12, 900, .12, 4); }
  function punchHit() { cam2.updateMatrixWorld(); const og = cam2.getWorldPosition(new THREE.Vector3()), f = new THREE.Vector3(0, 0, -1).applyQuaternion(cam2.quaternion); ray.set(og, f); ray.far = 1.8;
    const h = ray.intersectObjects((o.playerHitboxes ? o.playerHitboxes() : []).concat(hitables), false)[0]; const st = o.rayStatic ? o.rayStatic(og, f, 1.8) : null;
    if (h && h.object.userData.player && (!st || h.distance < st.distance)) { const head = !!h.object.userData.head; blood(h.point, f, head); snd.hit(); snd.noise(.1, 500, .4, 3); showHit(''); o.onHitPlayer && o.onHitPlayer(h.object.userData.player, head ? 15 : 11, head, 'fist', h.point, f); shake += .15; }
    else if (st || (h && !h.object.userData.player)) { const hp = st || h; puff(hp.point, 0xb8a68a, .3, .4); snd.noise(.08, 400, .35, 4); shake += .2; if (h && h.object.userData.target) { h.object.userData.target.userData.av += 1.5; snd.ding(); } } }
  // 단검: 휘두르고 0.12초 뒤 2.2m 앞까지 판정. 몸통 42, 머리 65, 팔다리 34
  const knifeM = (() => { const g = new THREE.Group(); const steel = new THREE.MeshStandardMaterial({ color: 0xb8bcc0, metalness: .9, roughness: .25 }), dk = new THREE.MeshStandardMaterial({ color: 0x1c1b19, roughness: .8 });
    const blade = new THREE.Mesh(new THREE.BoxGeometry(.006, .03, .16), steel); blade.position.z = -.1; g.add(blade); const tip = new THREE.Mesh(new THREE.ConeGeometry(.016, .045, 4).rotateX(-H), steel); tip.scale.set(.38, 1, 1); tip.position.z = -.2; g.add(tip);
    const guard = new THREE.Mesh(new THREE.BoxGeometry(.012, .06, .012), dk); guard.position.z = -.015; g.add(guard); const hd = new THREE.Mesh(new THREE.CylinderGeometry(.013, .015, .1, 10).rotateX(H), dk); hd.position.z = .04; g.add(hd);
    g.traverse(m => { if (m.isMesh) { m.frustumCulled = false; m.renderOrder = 1; } }); g.visible = false; vmRoot.add(g); return g; })();
  function slash() { if (slashT < .55) return; slashT = 0; slashDone = false; punchSide = -punchSide; snd.noise(.18, 5000, .14, 2.5); }
  function slashHit() { cam2.updateMatrixWorld(); const og = cam2.getWorldPosition(new THREE.Vector3()), f = new THREE.Vector3(0, 0, -1).applyQuaternion(cam2.quaternion); ray.set(og, f); ray.far = 2.2;
    const h = ray.intersectObjects((o.playerHitboxes ? o.playerHitboxes() : []).concat(hitables), false)[0]; const st = o.rayStatic ? o.rayStatic(og, f, 2.2) : null;
    if (h && h.object.userData.player && (!st || h.distance < st.distance)) { const head = !!h.object.userData.head, limb = !!h.object.userData.limb; blood(h.point, f, head); snd.hit(); snd.noise(.12, 700, .45, 3); showHit(head ? '헤드샷' : ''); o.onHitPlayer && o.onHitPlayer(h.object.userData.player, head ? 65 : limb ? 34 : 42, head, 'knife', h.point, f); }
    else if (st || (h && !h.object.userData.player)) { const hp = st || h; puff(hp.point, 0xb8a68a, .25, .35); snd.tone(2600, .05, .05, 'square'); if (h && h.object.userData.target) { h.object.userData.target.userData.av += 1; snd.ding(); } } }
  function updArms(dt) {
    const w = ws && ws.w; const healK = o.healing && o.healing(); const showArms = enabled && !P.dead && !(w && w.rig) && !(cur && !cur.visible && !(ws && ws.reload && ws.reload.kind === 'throw'));
    AR.g.visible = AL.g.visible = showArms; medProp.visible = false; knifeM.visible = false; if (!showArms) return;
    cam2.updateMatrixWorld(true); vmRoot.updateMatrixWorld(true);
    const tnow = performance.now() / 1000, bob = Math.sin(P.bob) * .01, br = Math.sin(tnow * 1.6) * .004;
    if (healK && healK.k) { const u = Math.min(1, healK.t / healK.dur), wig = Math.sin(tnow * 9) * .02; medProp.visible = true; ['kit', 'med', 'bandage'].forEach(k => medProp.userData[k].visible = k === healK.k);
      medProp.position.set(0, -.2 + br, -.36); medProp.rotation.set(.5, Math.sin(tnow * 2) * .2, 0);
      poseArm(AR, new THREE.Vector3(.07 + wig, -.21, -.34), SH_R, false); poseArm(AL, new THREE.Vector3(-.07, -.22 - wig, -.35), SH_L, false); return; }
    if (!cur && knifeOut) { slashT += dt; if (!slashDone && slashT > .12) { slashDone = true; slashHit(); }
      const u = Math.min(1, slashT / .32), e2 = slashT < .32 ? Math.sin(u * Math.PI) : 0, sd = punchSide; const run = P.sprinting ? 1 : 0;
      const r = new THREE.Vector3(.17 + (-.24 * u) * e2 * (sd > 0 ? 1 : -1) * 0 + (sd > 0 ? .1 - .3 * u : -.2 + .3 * u) * e2, -.24 + bob + br - run * .05 + .1 * e2 * (1 - u), -.44 - .2 * e2);
      poseArm(AR, r, SH_R, true); poseArm(AL, new THREE.Vector3(-.19, -.27 - bob + br - run * .05, -.46), SH_L, true);
      knifeM.visible = true; knifeM.position.copy(r).add(new THREE.Vector3(0, .02, -.03)); knifeM.rotation.set(.35 - .5 * e2, .15 + (sd > 0 ? .9 : -.9) * e2 * (u - .5), (sd > 0 ? -.7 : .7) * e2); return; }
    if (!cur) { punchT += dt; if (!punchDone && punchT > .09) { punchDone = true; punchHit(); }
      const pe = punchT < .32 ? Math.sin(Math.min(1, punchT / .32) * Math.PI) : 0; const run = P.sprinting ? 1 : 0; const sw = Math.sin(P.bob) * .03 * (run ? 2 : 1);
      const r = new THREE.Vector3(.19, -.25 + bob + br - run * .05 + sw, -.5), l = new THREE.Vector3(-.19, -.26 - bob + br - run * .05 - sw, -.48);
      if (punchSide > 0) r.add(new THREE.Vector3(-.13 * pe, .07 * pe, -.28 * pe)); else l.add(new THREE.Vector3(.13 * pe, .07 * pe, -.28 * pe));
      poseArm(AR, r, SH_R, true); poseArm(AL, l, SH_L, true); return; }
    const U = cur.userData, Hd = U.hands; if (!Hd) return;
    const rW = cur.localToWorld(Hd.r.clone()); let lW = Hd.l ? cur.localToWorld((U.gripHand || Hd.l).clone()) : null;
    if (Hd.l && U.parts.pump) { const d = partDelta('pump'); if (d) lW.add(d); }
    const R = ws.reload;
    if (R && R.kind === 'throw') { const u = Math.min(1, R.t / .3), sw = Math.sin(u * Math.PI * .5); poseArm(AR, new THREE.Vector3(.2 - .22 * sw, -.05 - .2 * sw, -.35 - .3 * sw), SH_R, true); poseArm(AL, new THREE.Vector3(-.2, -.3, -.3), SH_L, true); AR.g.visible = R.t < .45; return; }
    if (w.thr) { const rc0 = toCam(rW).add(new THREE.Vector3(0, -.02, .01)); poseArm(AR, rc0, SH_R, true);
      if (thr.pinT < .4) { const u = thr.pinT / .4; const top = rc0.clone().add(new THREE.Vector3(-.01, .07, -.01)); const out2 = new THREE.Vector3(-.16, -.15, -.38); poseArm(AL, u < .45 ? new THREE.Vector3(-.18, -.27, -.34).lerp(top, ease(u / .45)) : top.clone().lerp(out2, ease((u - .45) / .55)), SH_L, false); }
      else if (thr.charging) poseArm(AL, new THREE.Vector3(-.17, -.1 - .04 * thr.power, -.52), SH_L, false); else poseArm(AL, new THREE.Vector3(-.18, -.27 + br, -.34), SH_L, true); return; }
    let lc = lW ? toCam(lW.clone()) : null; const rc = toCam(rW.clone());
    if (R && R.kind === 'mag' && lc) { const T = R.t, mOut = .3, slap = w.rt * .62, boltS = w.rt * .68; const mg = U.clip ? U.clipObj : U.parts.mag ? U.parts.mag.n : U.proxy;
      const wgt = Math.min(ease((T - .05) / .25), 1 - ease((T - slap - .05) / .2)); if (wgt > 0 && mg.visible !== false) { const mp = toCam(mg.getWorldPosition(new THREE.Vector3())).add(new THREE.Vector3(0, -.035, 0)); lc.lerp(mp, wgt); }
      if (R.empty && T > boltS - .1 && T < boltS + .6) { const bp = partWorld(w.pistol ? 'slide' : 'bolt') || partWorld('slide'); const ww = Math.min(ease((T - boltS + .1) / .15), 1 - ease((T - boltS - .45) / .15)); const tp = bp ? toCam(bp) : rc.clone().add(new THREE.Vector3(0, .06, 0)); lc.lerp(tp.add(new THREE.Vector3(-.02, .02, .02)), ww); } }
    if (R && R.kind === 'shell' && lc) { const sh = U.shell || U.proxy; if (sh.visible) lc.lerp(toCam(sh.getWorldPosition(new THREE.Vector3())).add(new THREE.Vector3(0, -.03, 0)), .85); else lc.add(new THREE.Vector3(0, -.05, .04)); }
    let rcc = rc; if (ws.cycle && ws.cycle.kind === 'bolt') { const u = ws.cycle.t / ws.cycle.dur; const ww = Math.sin(Math.min(1, Math.max(0, (u - .05) / .85)) * Math.PI); const bp = partWorld('bolt'); const tp = bp ? toCam(bp).add(new THREE.Vector3(.03, 0, .02)) : rc.clone().add(new THREE.Vector3(.04, .07, .05)); rcc = rc.clone().lerp(tp, ww); }
    poseArm(AR, rcc, SH_R, false);
    if (lc) poseArm(AL, lc, SH_L, false); else poseArm(AL, new THREE.Vector3(-.18, -.3 + br, -.3), SH_L, true);
  }
  function setPart(k, dir, amt) { const p = cur && cur.userData.parts[k]; if (!p) return false; p.n.position.copy(p.p0).addScaledVector(p[dir], amt); return true; }


  /* ----- 입력 ----- */
  let invOpen = false, scopeBob = 0, recQ = 0, knifeOut = false, slashT = 9, slashDone = true;
  const ctrl = () => enabled && !P.dead && !invOpen && (!o.canControl || o.canControl());
  // 클릭 순간에 바로 잠가야 브라우저가 허락함 (비동기로 다시 시도하면 막힘)
  function lockNow() { try { const r = o.canvas.requestPointerLock(); if (r && r.catch) r.catch(() => {}); } catch (e) {} }
  el.start && el.start.addEventListener('click', () => { ac(); lockNow(); el.start.hidden = true; });
  document.addEventListener('pointerlockchange', () => { locked = document.pointerLockElement === o.canvas; if (locked && el.start) el.start.hidden = true; if (!locked && invOpen) return; if (!locked && enabled) { el.start && (el.start.hidden = false); fireHeld = false; ads = false; for (const k in keys) keys[k] = false; } });
  document.addEventListener('pointerlockerror', () => { el.start && (el.start.hidden = true); setState('화면을 한 번 더 클릭하면 마우스가 잠겨요'); });
  document.addEventListener('mousemove', e => { if (!enabled) return; let dx = 0, dy = 0; if (locked) { dx = e.movementX; dy = e.movementY; } else if (dragLook) { dx = e.clientX - dragLook.x; dy = e.clientY - dragLook.y; dragLook = { x: e.clientX, y: e.clientY }; } else return;
    if (P.dead) { o.onDeadLook && o.onDeadLook(dx, dy); return; }
    const z = adsT > .5 ? adsZoom() : 1; const sens = (o.sens ? o.sens() : 1) * .0021 / Math.pow(z, .85); P.yaw -= dx * sens; P.pitch = Math.max(-1.45, Math.min(1.45, P.pitch - dy * sens)); mdx += dx; mdy += dy; });
  o.canvas.addEventListener('contextmenu', e => e.preventDefault());
  const held = a => !!keys[BIND[a]];
  // 키·마우스 버튼 공통 처리: code를 눌렀을 때 그 키에 묶인 동작들을 실행
  function press(code, e) { if (keys[code]) return; keys[code] = true; const acts = actsOf(code);
    if (acts.includes('inv') && enabled && !P.dead && (!o.canControl || o.canControl())) { toggleInv(); return; }
    if (!ctrl()) return;
    for (const a of acts) act(a, true, e); }
  function release(code) { keys[code] = false; for (const a of actsOf(code)) act(a, false); }
  function act(a, down, e) {
    if (!down) { if (a === 'fire') fireHeld = false; if (a === 'ads') { ads = false; thr.charging = false; thr.power = 0; } o.onAction && o.onAction(a, false); return; }
    switch (a) {
      case 'fire': if (ws && ws.w.thr) { if (canFire()) throwIt(thr.charging ? .2 + .8 * thr.power : .5); break; } fireHeld = true; tryFire(true); break;
      case 'ads': if (ws && ws.w.thr) { if (ws.draw >= 1 && !(ws.reload && ws.reload.kind === 'throw') && invOf(ws.w).reserve > 0) { pullPin(); thr.charging = true; thr.power = 0; } break; } ads = true; break;
      case 'reload': startReload(); break;
      case 'mode': if (ws) { const v = invOf(ws.w); if (ws.w.modes.length < 2) setState(ws.w.name + '은(는) ' + ws.w.modes[0] + '만 돼요'); else { v.mode = (v.mode + 1) % ws.w.modes.length; snd.click(); setState(ws.w.modes[v.mode]); } updHud(); } break;
      case 'crouch': if (P.sprinting && P.onG && slideCd <= 0) startSlide(); else P.stance = P.stance === 'crouch' ? 'stand' : 'crouch'; break;
      case 'prone': slideT = 0; P.stance = P.stance === 'prone' ? 'stand' : 'prone'; break;
      case 'jump': if (slideT > 0) { slideT = 0; P.stance = 'stand'; if (P.onG) { P.vel.y = 4.3; P.onG = false; } } else if (P.stance !== 'stand') P.stance = 'stand'; else if (P.onG) { P.vel.y = 4.3; P.onG = false; } break;
      case 's1': case 's2': case 's3': case 's4': { const n = +a[1] - 1; if (n === 3 && curSlot === 3 && o.onCycleThrow) { o.onCycleThrow(); break; } if (n !== curSlot && slots[n]) { knifeOut = false; equip(n); } break; }
      case 'knife': if (knifeOut) { knifeOut = false; snd.click(); } else { holster(); knifeOut = true; snd.noise(.15, 4000, .08, 3); } renderSlots(); updHud(); break;
      case 'holster': if (ws || knifeOut) { knifeOut = false; holster(); } break;
      default: o.onAction && o.onAction(a, true, e); }
  }
  document.addEventListener('mousedown', e => { if (!enabled || (el.start && !el.start.hidden)) return; if (e.target !== o.canvas && !locked) return; ac();
    if (e.button === 3 || e.button === 4) e.preventDefault();
    if (!locked && e.target === o.canvas) lockNow();
    if (!locked && e.button === 0 && ctrl()) dragLook = { x: e.clientX, y: e.clientY };
    press('Mouse' + e.button, e); });
  document.addEventListener('mouseup', e => { if (e.button === 3 || e.button === 4) e.preventDefault(); if (!enabled) return; if (e.button === 0) dragLook = null; release('Mouse' + e.button); });
  addEventListener('auxclick', e => { if (enabled && (e.button === 3 || e.button === 4)) e.preventDefault(); });
  addEventListener('keydown', e => { if (!enabled) return; if (o.onKey && o.onKey(e)) return; if (e.target && e.target.tagName === 'INPUT') return;
    if (e.code === 'Escape' && invOpen) { toggleInv(false); return; }
    if (actsOf(e.code).length || e.code === 'Tab') e.preventDefault();
    if (keys[e.code]) return; press(e.code, e); });
  addEventListener('keyup', e => release(e.code));
  addEventListener('blur', () => { for (const k in keys) keys[k] = false; fireHeld = false; });
  function holster() { vm.clear(); cur = null; ws = null; curSlot = -1; renderSlots(); updHud(); }
  /* ----- 슬라이딩 ----- */
  let slideT = 0, slideCd = 0; const slideDir = new THREE.Vector3();
  function startSlide() { slideT = .8; slideCd = 1.1; slideDir.set(P.vel.x, 0, P.vel.z).normalize(); P.stance = 'crouch'; snd.noise(.6, 900, .25, 1.5); shake += .1; }

  /* ----- 사격 ----- */
  function canFire() { if (!ws || !cur) return false; if (ws.draw < 1 || ws.cycle) return false; if (P.sprinting || (o.healing && o.healing())) return false; if (ws.reload) { if (ws.reload.kind === 'shell' && invOf(ws.w).ammo > 0) ws.reload.cancel = true; return false; } return true; }
  function tryFire(press) { const w = ws && ws.w; if (!ctrl()) return; if (!w) { if (!cur) { if (knifeOut) slash(); else punch(); } return; } if (!canFire()) return; const v = invOf(w); const t = performance.now() / 1000; const iv = 60 / Math.max(30, w.rpm); if (t - lastShot < iv) return;
    const mode = w.modes[v.mode]; if (!press && !(mode === '자동' || (mode === '점사' && burstLeft > 0))) return;
    if (w.thr) { throwIt(); return; }
    if (v.ammo <= 0) { if (press) { snd.click(); if (reserveOf(w) > 0) startReload(); else setState('탄약 없음'); } return; }
    if (press && mode === '점사') burstLeft = 3; if (mode === '점사') burstLeft--;
    v.ammo--; lastShot = t; shotIdx++; fireOne(w); updHud();
    if (w.act === 'pump') ws.cycle = { t: 0, dur: .55, kind: 'pump' };
    if (w.act === 'bolt') ws.cycle = { t: 0, dur: 1.05, kind: 'bolt' }; }
  function fireOne(w) {
    const moving = Math.hypot(P.vel.x, P.vel.z) > .5, stM = P.stance === 'crouch' ? .8 : P.stance === 'prone' ? .55 : 1, airM = P.onG ? 1 : 2.2;
    const F = attFx(w); const grow = 1 + Math.min(14, shotIdx) * .04; const vk = F.vr * w.vr * D2R * (adsT > .5 ? .85 : 1) * stM * (moving ? 1.25 : 1) * airM * grow * (.85 + Math.random() * .3);
    recQ += vk; recAcc += vk * .55; P.yaw += (Math.random() * 2 - 1) * F.hr * w.hr * D2R * stM * (.6 + Math.min(1, shotIdx / 6) * .6);
    const scopedFire = scopedOptic() && adsT > .5, adsK = scopedFire ? 0 : 1 - .8 * ease(adsT); kick += (.025 + w.rec * .05) * (1 - .5 * adsT); kickR += (.04 + w.rec * .08) * adsK; shake = Math.min(1, shake + (.25 + w.rec * .4) * adsK * .6); flashT = F.noFlash ? 0 : .045; snd.shot(w, F.quiet ? .3 : 1, F.quiet ? .7 : 0);
    if (w.rig) playOnce(cur, 'shoot'); else blow = .001;
    const hip = (w.pistol ? .03 : w.pel ? 0 : w.act === 'bolt' ? .07 : w.grp === '기관단총' ? .028 : .038);
    const scopedNow = adsT > .6;
    let spread = (scopedNow ? (scopedOptic() ? .0006 : .003) : hip) * (moving ? (scopedNow ? 1.6 : 2) : 1) * airM * stM * (slideT > 0 ? 1.7 : 1) + bloom; bloom = Math.min(.03, bloom + .004 * (w.rec + .3));
    if (scopedOptic() && scopedNow && P.holding) spread *= .5;
    const n = w.pel || 1; cam2.updateMatrixWorld();
    const og = new THREE.Vector3(); cam2.getWorldPosition(og); const fwd = new THREE.Vector3(0, 0, -1).applyQuaternion(cam2.quaternion);
    const right = new THREE.Vector3(1, 0, 0).applyQuaternion(cam2.quaternion), up = new THREE.Vector3(0, 1, 0).applyQuaternion(cam2.quaternion);
    const tz = 100 / w.vel, lift = (9.8 * tz * tz / 2) / 100; const dirs = [];
    for (let i = 0; i < n; i++) { const a = Math.random() * Math.PI * 2, r = (w.pel ? .045 * F.spread : spread) * Math.sqrt(Math.random());
      const d = fwd.clone().addScaledVector(right, Math.cos(a) * r).addScaledVector(up, Math.sin(a) * r * (w.pel ? F.spreadY : 1) + lift).normalize(); dirs.push(d.clone());
      const tr = (w.act === 'bolt' || shotIdx % 3 === 0) && !w.pel; bullets.push({ p: og.clone(), v: d.multiplyScalar(w.vel), t: 0, tr, mesh: null, start: og.clone(), w, mine: true, n: 0 }); }
    o.onShot && o.onShot(w, og, dirs, !!F.quiet);
    if (!w.pel && w.act !== 'bolt') eject(casingMat); }
  function eject(mat) { if (!cur) return; const c = new THREE.Mesh(casingGeo, mat); const p = new THREE.Vector3(); cur.getWorldPosition(p); c.position.copy(p);
    const right = new THREE.Vector3(1, 0, 0).applyQuaternion(cam2.quaternion), up = new THREE.Vector3(0, 1, 0).applyQuaternion(cam2.quaternion), back = new THREE.Vector3(0, 0, 1).applyQuaternion(cam2.quaternion);
    c.userData = { v: right.multiplyScalar(2 + Math.random()).addScaledVector(up, 1.6 + Math.random()).addScaledVector(back, .4).add(P.vel.clone().multiplyScalar(.9)), t: 0, s: new THREE.Vector3(Math.random() * 20, Math.random() * 20, 0) }; S2.add(c); casings.push(c); if (casings.length > 40) S2.remove(casings.shift()); }
  // 다른 사람이 쏜 탄(눈으로만 보이는 예광탄)
  function remoteShot(w, og, dirs, muzzleWorld, quiet) {
    dirs.forEach((d, i) => bullets.push({ p: og.clone(), v: d.clone().multiplyScalar(w.vel), t: 0, tr: w.act === 'bolt' || (!w.pel && Math.random() < .35), mesh: null, start: (muzzleWorld || og).clone(), w, mine: false, n: 0 }));
    const dist = og.distanceTo(cam2.position); snd.shot(w, Math.max(.05, 1 - dist / (quiet ? 120 : 400)) * (quiet ? .35 : 1), Math.min(1, dist / 300 + (quiet ? .6 : 0))); }
  function stepBullets(dt) { for (let i = bullets.length - 1; i >= 0; i--) { const b = bullets[i]; b.t += dt; const p0 = b.p.clone(); b.v.y -= 9.8 * dt; b.p.addScaledVector(b.v, dt);
    const seg = b.p.clone().sub(p0), len = seg.length(); ray.set(p0, seg.normalize()); ray.far = len;
    const list = b.mine ? hitables.concat(o.playerHitboxes ? o.playerHitboxes() : []) : hitables; let hit = ray.intersectObjects(list, false)[0];
    if (o.rayStatic) { const sh = o.rayStatic(p0, ray.ray.direction, len); if (sh && (!hit || sh.distance < hit.distance)) hit = sh; }
    // 모든 탄이 보임: 예광탄은 밝고 길게, 일반탄은 흐리고 짧게 (첫 프레임은 총구 근처라 건너뜀)
    b.n++; if (b.n > 1) { if (!b.mesh) { b.mesh = new THREE.Mesh(b.tr ? tracerGeo : bulletGeo, b.tr ? tracerMat : bulletMat); S2.add(b.mesh); }
      const a = b.p.clone(); const L = b.tr ? Math.min(len * .9, 30) : Math.min(len * .45, 5); b.mesh.position.copy(a).addScaledVector(seg, -L / 2); b.mesh.lookAt(a); b.mesh.scale.set(1, 1, L); }
    if (hit) { onHit(hit, b); if (b.mesh) S2.remove(b.mesh); bullets.splice(i, 1); continue; }
    if (b.t > 2.5 || b.p.y < -5) { if (b.mesh) S2.remove(b.mesh); bullets.splice(i, 1); } } }
  function onHit(hit, b) { const nrm = hit.normal ? hit.normal.clone() : hit.face ? hit.face.normal.clone().transformDirection(hit.object.matrixWorld) : new THREE.Vector3(0, 1, 0);
    const tg = hit.object.userData.target, pl = hit.object.userData.player;
    const bdir = b.v.clone().normalize();
    if (pl) blood(hit.point, bdir, !!hit.object.userData.head);
    else { if (!tg) { decal(hit.point, nrm, holeMat, (b.w.pel ? .035 : .05) + Math.random() * .025); puff(hit.point.clone().addScaledVector(nrm, .05), 0xb8a68a, .5, .7, nrm.clone().multiplyScalar(.6)); }
      for (let i = 0; i < (tg ? 6 : 4); i++) { const s = new THREE.Mesh(chipGeo, tg ? chipMatT : chipMat); s.position.copy(hit.point); s.userData = { v: nrm.clone().multiplyScalar(1.5 + Math.random() * 2).add(new THREE.Vector3((Math.random() - .5) * 2, Math.random() * 2, (Math.random() - .5) * 2)), t: 0 }; S2.add(s); sparks.push(s); }
      if (b.mine && !tg) snd.tone(300 + Math.random() * 200, .04, .02, 'triangle'); }
    if (tg && b.mine) { tg.userData.av += 3 + Math.random() * 2; tg.userData.hits++; snd.ding(); showHit(Math.round(hit.point.distanceTo(b.start)) + 'm'); }
    if (pl && b.mine) { const head = !!hit.object.userData.head, limb = !!hit.object.userData.limb; const dist = hit.point.distanceTo(b.start); const cls = wclass(b.w) || 'AR', fall = falloff(cls, dist); const M = ZONE_MUL[cls] || ZONE_MUL.AR;
      snd.hit(); showHit(head ? '헤드샷' : ''); o.onHitPlayer && o.onHitPlayer(pl, Math.round(b.w.dmg * fall * (head ? M[0] : limb ? M[2] : M[1])), head, b.w.k, hit.point, bdir); } }
  function showHit(t) { hitmT = .25; el.dist.textContent = t; }
  /* ----- 투척물: 우클릭을 누르는 동안 게이지가 차고 좌클릭으로 던짐. 수류탄·섬광탄은 우클릭할 때 핀을 뽑고 그때부터 시간이 감 ----- */
  const FUSE = { frag_west: 4.2, flashbang_west: 2.4, smoke_west: 2.2, incendiary_east: 0 }, PIN = { frag_west: 1, flashbang_west: 1 };
  let thr = { pulled: false, fuse: 0, charging: false, power: 0, pinT: 9 };
  function resetThr() { thr = { pulled: false, fuse: 0, charging: false, power: 0, pinT: 9 }; }
  const pinMat = new THREE.MeshStandardMaterial({ color: 0xb0b4b8, metalness: .9, roughness: .3 }), pinGeo = new THREE.TorusGeometry(.012, .0025, 6, 14);
  function handWorld() { const p = new THREE.Vector3(); (cur || vm).getWorldPosition(p); return p; }
  function pullPin() { if (!ws || !ws.w.thr || thr.pulled || !PIN[ws.w.k]) return; thr.pulled = true; thr.fuse = FUSE[ws.w.k]; thr.pinT = 0;
    snd.tone(2400, .05, .06, 'triangle'); setTimeout(() => snd.tone(1800, .08, .05, 'triangle'), 90); snd.noise(.06, 7000, .1, 6);
    const pin = new THREE.Mesh(pinGeo, pinMat); pin.position.copy(handWorld()).add(new THREE.Vector3(0, .05, 0)); const right = new THREE.Vector3(-1, 0, 0).applyQuaternion(cam2.quaternion);
    pin.userData = { v: right.multiplyScalar(1.6).add(new THREE.Vector3(0, 1.8, 0)).add(P.vel.clone().multiplyScalar(.8)), t: 0, s: new THREE.Vector3(14, 9, 0) }; S2.add(pin); casings.push(pin); }
  function throwIt(power = .5) { if (!cur || (ws.reload && ws.reload.kind === 'throw')) return; const k = ws.w.k, v = invOf(ws.w); if (v.reserve <= 0) { setState('투척물 없음'); return; }
    if (PIN[k] && !thr.pulled) { thr.pulled = true; thr.fuse = FUSE[k]; snd.tone(2400, .05, .05, 'triangle'); }
    const p = handWorld(); const dir = new THREE.Vector3(0, .16 + .14 * (1 - power), -1).applyQuaternion(cam2.quaternion).normalize();
    const vel = dir.multiplyScalar(6 + 18 * power).add(P.vel.clone().multiplyScalar(.8)); const fuse = PIN[k] ? thr.fuse : FUSE[k];
    spawnThrown(k, p, vel, true, undefined, fuse); o.onThrow && o.onThrow(k, p, vel, fuse); snd.noise(.2, 1500, .12, 3);
    cur.visible = false; ws.reload = { t: 0, dur: .85, kind: 'throw' }; v.reserve--; resetThr(); updHud(); }
  const arcMat = new THREE.LineDashedMaterial({ color: 0xffffff, dashSize: .25, gapSize: .2, transparent: true, opacity: .75, depthTest: false }); const arcGeo = new THREE.BufferGeometry().setFromPoints(Array.from({ length: 60 }, () => new THREE.Vector3()));
  const arcLine = new THREE.Line(arcGeo, arcMat); arcLine.frustumCulled = false; arcLine.renderOrder = 5; arcLine.visible = false; S2.add(arcLine);
  const arcEnd = new THREE.Mesh(new THREE.RingGeometry(.35, .45, 24).rotateX(-H), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: .7, depthTest: false })); arcEnd.renderOrder = 5; arcEnd.visible = false; S2.add(arcEnd);
  function updArc() { const on = !!(ws && ws.w.thr && thr.charging && enabled && !P.dead); arcLine.visible = arcEnd.visible = on; if (!on) return; const power = .2 + .8 * thr.power;
    const p = handWorld(), v = new THREE.Vector3(0, .16 + .14 * (1 - power), -1).applyQuaternion(cam2.quaternion).normalize().multiplyScalar(6 + 18 * power).add(P.vel.clone().multiplyScalar(.8)); const pos = arcGeo.attributes.position; let last = p.clone(), hit = false;
    for (let i = 0; i < 60; i++) { if (!hit) { const n = p.clone().addScaledVector(v, .05); v.y -= 9.8 * .05; const gy = o.groundAt ? o.groundAt(n.x, n.z) : 0; const st = o.rayStatic ? o.rayStatic(p, n.clone().sub(p).normalize(), n.distanceTo(p)) : null;
        if (st) { p.copy(st.point); hit = true; } else if (n.y < gy + .05) { p.set(n.x, gy + .05, n.z); hit = true; } else p.copy(n); last = p.clone(); } pos.setXYZ(i, last.x, last.y, last.z); }
    pos.needsUpdate = true; arcLine.computeLineDistances(); arcEnd.position.copy(last).add(new THREE.Vector3(0, .03, 0)); }
  function cookOff() { const k = ws.w.k, v = invOf(ws.w); const p = handWorld(); resetThr(); v.reserve--; setState('손에서 터졌어요'); o.onThrow && o.onThrow(k, p, new THREE.Vector3(), 0); boom(p, k, true); if (cur) cur.visible = false; ws.reload = { t: 0, dur: .85, kind: 'throw' }; updHud(); }
  function spawnThrown(k, p, vel, mine, owner, fuse) { const m = cache[k]; const c = new THREE.Group(); if (m) c.add(skClone(m.userData.norm)); c.position.copy(p); S2.add(c);
    c.userData = { v: vel.clone(), t: 0, k, mine, owner, fuse: fuse ?? (FUSE[k] || 3), spin: new THREE.Vector3(6 + Math.random() * 6, Math.random() * 4, Math.random() * 3), bounce: 0 }; thrown.push(c);
    if (mine && PIN[k] && el.fuses) { const d = document.createElement('div'); d.className = 'fuse'; el.fuses.appendChild(d); c.userData.lbl = d; } if ((fuse ?? 1) <= 0 && k !== 'incendiary_east') c.userData.t = 1e9; }
  /* ----- 폭발·불 효과 (스프라이트 입자) ----- */
  const radial = (stops) => { const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d'); const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32); stops.forEach(([o2, col]) => gr.addColorStop(o2, col)); g.fillStyle = gr; g.fillRect(0, 0, 64, 64); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; };
  const fireTex = radial([[0, 'rgba(255,255,230,1)'], [.25, 'rgba(255,210,90,.95)'], [.55, 'rgba(255,110,20,.6)'], [1, 'rgba(120,20,0,0)']]);
  const flameTex = (() => { const c = document.createElement('canvas'); c.width = 64; c.height = 128; const g = c.getContext('2d'); const gr = g.createRadialGradient(32, 96, 2, 32, 80, 60); gr.addColorStop(0, 'rgba(255,250,210,1)'); gr.addColorStop(.3, 'rgba(255,190,60,.9)'); gr.addColorStop(.65, 'rgba(240,80,10,.45)'); gr.addColorStop(1, 'rgba(120,20,0,0)'); g.fillStyle = gr; g.beginPath(); g.moveTo(32, 2); g.bezierCurveTo(60, 50, 62, 110, 32, 126); g.bezierCurveTo(2, 110, 4, 50, 32, 2); g.fill(); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; })();
  const smokeTex = radial([[0, 'rgba(60,58,55,.95)'], [.5, 'rgba(50,48,46,.55)'], [1, 'rgba(40,40,40,0)']]);
  const scorchTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d'); for (let i = 0; i < 40; i++) { const a = Math.random() * 6.28, r = Math.random() * 46, sz = 6 + Math.random() * (30 - r / 2); g.fillStyle = `rgba(14,12,10,${.25 + Math.random() * .35})`; g.beginPath(); g.arc(64 + Math.cos(a) * r, 64 + Math.sin(a) * r, sz, 0, 7); g.fill(); } const gr = g.createRadialGradient(64, 64, 0, 64, 64, 60); gr.addColorStop(0, 'rgba(8,6,5,.9)'); gr.addColorStop(1, 'rgba(8,6,5,0)'); g.fillStyle = gr; g.fillRect(0, 0, 128, 128); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; })();
  const scorchMat = new THREE.MeshBasicMaterial({ map: scorchTex, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -3 });
  const fxs = [], ringGeo2 = new THREE.RingGeometry(.8, 1, 40).rotateX(-H), debrisMat = new THREE.MeshStandardMaterial({ color: 0x2a2622, roughness: .9 });
  function fx(tex, color, pos, vel, life, s0, s1, op, add, grav = 0, drag = 0, rise = 0) { const m = new THREE.SpriteMaterial({ map: tex, color, transparent: true, depthWrite: false, blending: add ? THREE.AdditiveBlending : THREE.NormalBlending, opacity: op, rotation: Math.random() * 6.28 });
    const sp = new THREE.Sprite(m); sp.position.copy(pos); sp.scale.setScalar(s0); S2.add(sp); fxs.push({ o: sp, v: vel, t: 0, life, s0, s1, op, grav, drag, rot: (Math.random() - .5) * 1.2 }); return sp; }
  function updFx(dt) { for (let i = fxs.length - 1; i >= 0; i--) { const f = fxs[i]; f.t += dt; const k = Math.min(1, f.t / f.life); if (f.v) { f.v.y -= f.grav * dt; f.v.multiplyScalar(Math.max(0, 1 - f.drag * dt)); f.o.position.addScaledVector(f.v, dt); }
      const ek = 1 - Math.pow(1 - k, 2.2); if (f.o.isSprite) { f.o.scale.setScalar(f.s0 + (f.s1 - f.s0) * ek); f.o.material.rotation += f.rot * dt; } else f.o.scale.setScalar(f.s0 + (f.s1 - f.s0) * ek);
      f.o.material.opacity = f.op * Math.min(1, f.t / .05) * Math.pow(1 - k, 1.4); if (f.t >= f.life) { S2.remove(f.o); f.o.material.dispose(); fxs.splice(i, 1); } } }
  const rv = (a, b2) => a + Math.random() * (b2 - a), rdir = (up = 1) => new THREE.Vector3(rv(-1, 1), rv(0, up), rv(-1, 1)).normalize();
  // 수류탄: 섬광 → 불덩어리 → 파편·불꽃 → 땅 흙먼지 고리 → 검은 연기 기둥, 바닥에 그을음
  function fxFrag(p) { const gy = o.groundAt ? o.groundAt(p.x, p.z) : 0, g0 = new THREE.Vector3(p.x, Math.max(p.y, gy + .1), p.z);
    fx(fireTex, 0xffffff, g0, null, .14, 4, 13, 1, true); fx(fireTex, 0xffe0a0, g0, null, .3, 3, 9, .95, true);
    for (let i = 0; i < 16; i++) fx(fireTex, new THREE.Color().setHSL(.06 + Math.random() * .05, 1, .55), g0.clone().add(rdir(.8).multiplyScalar(rv(.2, 1.2))), rdir(1.2).multiplyScalar(rv(3, 8)), rv(.4, .8), rv(1.2, 2.2), rv(3.5, 6), .95, true, -1, 4);
    for (let i = 0; i < 22; i++) fx(smokeTex, new THREE.Color().setHSL(0, 0, rv(.12, .3)), g0.clone().add(rdir(.6).multiplyScalar(rv(0, 1.5))), rdir(1).multiplyScalar(rv(.5, 2.5)).add(new THREE.Vector3(0, rv(1, 2.6), 0)), rv(2.5, 5), rv(1.2, 2), rv(4, 7), .8, false, -.15, 1.2);
    for (let i = 0; i < 18; i++) fx(fireTex, 0xffd070, g0.clone(), rdir(1.3).multiplyScalar(rv(9, 22)), rv(.25, .55), .25, .08, 1, true, 9, 1);
    for (let i = 0; i < 26; i++) { const d = new THREE.Mesh(chipGeo, debrisMat); d.scale.setScalar(rv(.8, 2.5)); d.position.copy(g0); d.userData = { v: rdir(1.4).multiplyScalar(rv(5, 14)), t: 0, life: rv(1, 1.8) }; S2.add(d); sparks.push(d); }
    const ring = new THREE.Mesh(ringGeo2, new THREE.MeshBasicMaterial({ color: 0xb8a68a, transparent: true, opacity: .7, depthWrite: false })); ring.position.set(p.x, gy + .15, p.z); S2.add(ring); fxs.push({ o: ring, v: null, t: 0, life: .9, s0: .5, s1: 9, op: .7, grav: 0, drag: 0, rot: 0 });
    for (let i = 0; i < 12; i++) { const a = i / 12 * 6.28; fx(puffTex, 0xc8b89a, new THREE.Vector3(p.x, gy + .3, p.z), new THREE.Vector3(Math.cos(a) * 9, .6, Math.sin(a) * 9), 1.4, 1, 3.5, .55, false, 0, 2.2); }
    decal(new THREE.Vector3(p.x, gy + .01, p.z), new THREE.Vector3(0, 1, 0), scorchMat, 4.2); }
  function fxFlash(p) { fx(fireTex, 0xffffff, p, null, .18, 4, 14, 1, true); for (let i = 0; i < 14; i++) fx(fireTex, 0xfff4d0, p.clone(), rdir(1.2).multiplyScalar(rv(6, 15)), rv(.2, .4), .2, .05, 1, true, 6); for (let i = 0; i < 6; i++) fx(smokeTex, 0x8a8884, p.clone(), rdir(1).multiplyScalar(.8).add(new THREE.Vector3(0, .8, 0)), rv(1.5, 2.5), .6, 2.2, .5, false); }
  // 화염병: 유리가 깨지며 불이 바닥에 퍼짐. 불꽃 입자가 계속 일렁이고 위로 검은 연기
  const fires = [];
  function fxMolotov(p, owner, mine) { const gy = o.groundAt ? o.groundAt(p.x, p.z) : 0, c0 = new THREE.Vector3(p.x, gy, p.z);
    for (let i = 0; i < 16; i++) fx(fireTex, 0xd8eaff, new THREE.Vector3(p.x, gy + .2, p.z), rdir(1).multiplyScalar(rv(2, 5)), rv(.3, .6), .08, .04, .9, true, 9);
    fx(fireTex, 0xffb050, new THREE.Vector3(p.x, gy + .4, p.z), null, .35, 1.5, 4.5, 1, true);
    const flames = []; for (let i = 0; i < 34; i++) { const a = Math.random() * 6.28, r = Math.sqrt(Math.random()) * 3.4; const x = p.x + Math.cos(a) * r, z = p.z + Math.sin(a) * r, y = o.groundAt ? o.groundAt(x, z) : 0;
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: flameTex, color: 0xffffff, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0 })); sp.position.set(x, y + .4, z); sp.userData = { x, y, z, ph: Math.random() * 6.28, s: rv(.7, 1.5), d: r / 3.4 * .5 }; S2.add(sp); flames.push(sp); }
    decal(new THREE.Vector3(p.x, gy + .01, p.z), new THREE.Vector3(0, 1, 0), scorchMat, 7.5);
    fires.push({ p: c0, t: 0, life: 8, r: 3.5, flames, owner, mine, acc: 0, smokeT: 0, snd: 0 }); snd.noise(.3, 6000, .25, 3); snd.noise(1.2, 900, .3, 1.5); }
  function updFires(dt) { for (let i = fires.length - 1; i >= 0; i--) { const f = fires[i]; f.t += dt; const fade = Math.min(1, f.t / .4, (f.life - f.t) / 1.5), tt = f.t;
      f.flames.forEach(sp => { const u = sp.userData; const on = Math.max(0, Math.min(1, (tt - u.d) * 4)) * fade; const fl = .75 + .25 * Math.sin(tt * 13 + u.ph) + .15 * Math.sin(tt * 31 + u.ph * 2); sp.scale.set(u.s * .7 * fl, u.s * 1.6 * fl, 1); sp.position.y = u.y + u.s * .7 * fl; sp.material.opacity = .9 * on; });
      f.smokeT -= dt; if (f.smokeT <= 0 && fade > .2) { f.smokeT = .12; const a = Math.random() * 6.28, r = Math.random() * 2.8; fx(smokeTex, 0x2a2826, new THREE.Vector3(f.p.x + Math.cos(a) * r, f.p.y + 1.5, f.p.z + Math.sin(a) * r), new THREE.Vector3(rv(-.3, .3), rv(1.5, 2.6), rv(-.3, .3)), rv(2, 3.5), 1, 4, .45 * fade, false);
        if (Math.random() < .5) fx(fireTex, 0xffa040, new THREE.Vector3(f.p.x + Math.cos(a) * r, f.p.y + .6, f.p.z + Math.sin(a) * r), new THREE.Vector3(rv(-.5, .5), rv(2, 4), rv(-.5, .5)), rv(.6, 1.2), .12, .03, 1, true, -1); }
      f.snd -= dt; if (f.snd <= 0) { f.snd = .25 + Math.random() * .3; const d = f.p.distanceTo(cam2.position); if (d < 40) snd.noise(.2, 1800, .06 * (1 - d / 40), 3); }
      // 불 속에 있으면 화상 시작 (나가도 3초 동안 계속 탐)
      if (o.selfDamage && !P.dead && Math.hypot(P.pos.x - f.p.x, P.pos.z - f.p.z) < f.r && Math.abs(P.pos.y - f.p.y) < 1.6 && fade > .3) { if (burnT <= 0) burnAcc = .45; burnT = 3; burnOwner = f.owner; inFire = true; }
      f.acc += dt; if (f.acc > .5) { f.acc = 0; if (f.mine && o.onFireTick) o.onFireTick(f.p, f.r); }
      if (f.t > f.life) { f.flames.forEach(sp => { S2.remove(sp); sp.material.dispose(); }); fires.splice(i, 1); } } }
  let burnT = 0, burnAcc = 0, burnOwner = 0, inFire = false;
  function updBurn(dt) { if (burnT <= 0 || P.dead) { burnT = 0; if (el.burn) el.burn.style.opacity = 0; inFire = false; return; } burnAcc += dt; if (!inFire) burnT -= dt;
    if (burnAcc >= .5) { burnAcc = 0; o.selfDamage && o.selfDamage(inFire ? 7 : 4, 'incendiary_east', burnOwner); snd.noise(.15, 700, .2, 3); } inFire = false;
    if (el.burn) el.burn.style.opacity = Math.min(1, .45 + .25 * Math.sin(performance.now() / 90)); }
  const smokes = [];
  function smokeCloud(p) { const parts2 = []; for (let i = 0; i < 46; i++) { const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: puffTex, color: new THREE.Color().setHSL(0, 0, .62 + Math.random() * .2), transparent: true, depthWrite: false, opacity: 0, rotation: Math.random() * 6.28 }));
      const a = Math.random() * 6.28, r = Math.sqrt(Math.random()); sp.userData = { a, r, h: Math.random(), s: 2.6 + Math.random() * 2.6, rs: (Math.random() - .5) * .3, d: Math.random() * 1.2 }; sp.position.copy(p); S2.add(sp); parts2.push(sp); }
    smokes.push({ p: p.clone().setY(Math.max(0, p.y - .05)), t: 0, life: 22, parts: parts2 }); }
  function updSmoke(dt) { for (let i = smokes.length - 1; i >= 0; i--) { const s0 = smokes[i]; s0.t += dt; const grow = Math.min(1, s0.t / 4), fade = Math.min(1, (s0.life - s0.t) / 5);
      s0.parts.forEach(sp => { const u = sp.userData; const T = Math.max(0, s0.t - u.d); const R = (1.2 + 5.8 * Math.min(1, T / 4)) * u.r; const wob = Math.sin(s0.t * .4 + u.a * 3) * .4;
        sp.position.set(s0.p.x + Math.cos(u.a + s0.t * .03) * R + wob, s0.p.y + .6 + u.h * (1.2 + 2.6 * Math.min(1, T / 5)) + s0.t * .015, s0.p.z + Math.sin(u.a + s0.t * .03) * R);
        sp.scale.setScalar(u.s * (.35 + .65 * Math.min(1, T / 3)) * (1 + s0.t * .015)); sp.material.rotation += u.rs * dt; sp.material.opacity = .9 * Math.min(1, T / .6) * fade; });
      if (s0.t > s0.life) { s0.parts.forEach(sp => { S2.remove(sp); sp.material.dispose(); }); smokes.splice(i, 1); } } }
  function boom(p, k, mine, owner) { const d = p.distanceTo(cam2.position); const later = (f2, extra = 0) => setTimeout(f2, Math.min(600, d / 340 * 1000) + extra);
    if (k === 'smoke_west') { smokeCloud(p); snd.noise(2.5, 1200, .25, 1.5); return; }
    if (k === 'frag_west') { fxFrag(p); later(() => { snd.noise(.25, 6000, .9 * Math.max(.1, 1 - d / 160), 3); snd.boom(Math.max(.1, 1 - d / 220)); snd.noise(2.2, 260, .7 * Math.max(.1, 1 - d / 260), 1.4); });
      if (d < 30) shake = Math.min(1.8, shake + (30 - d) / 10); targets.forEach(t => { if (t.position.distanceTo(p) < 7) t.userData.av += 6; }); if (mine && o.onBoom) o.onBoom(k, p);
      if (o.selfDamage && !P.dead) { const dd = p.distanceTo(P.pos.clone().setY(P.pos.y + .8)); if (dd < 7) { const cover = o.rayStatic ? o.rayStatic(p.clone().add(new THREE.Vector3(0, .3, 0)), P.pos.clone().setY(P.pos.y + 1).sub(p).normalize(), Math.max(0, dd - .4)) : null; o.selfDamage(Math.round(150 * (1 - dd / 7) * (cover ? .25 : 1)), 'frag_west', owner); } } }
    if (k === 'incendiary_east') fxMolotov(p, owner, mine);
    if (k === 'flashbang_west') { fxFlash(p); later(() => snd.noise(.35, 8000, .8 * Math.max(.1, 1 - d / 120), 4)); if (mine && o.onBoom) o.onBoom(k, p);
      const dirTo = p.clone().sub(cam2.position).normalize(), f = new THREE.Vector3(0, 0, -1).applyQuaternion(cam2.quaternion); const look = Math.max(0, dirTo.dot(f)); const amt = d < 20 ? Math.max(.3, look) * (1 - d / 22) : 0;
      if (amt > 0 && el.flash) { el.flash.style.transition = 'none'; el.flash.style.opacity = Math.min(1, amt * 1.3); requestAnimationFrame(() => { el.flash.style.transition = 'opacity ' + (1 + amt * 3) + 's ease-in'; el.flash.style.opacity = 0; }); snd.tone(3200, 2.5 * amt, .05, 'sine'); } } }

  /* ----- 재장전 ----- */
  function startReload() { if (!ws || ws.reload || ws.draw < 1) return; const w = ws.w; if (w.thr) return; const v = invOf(w); if (v.ammo >= magOf(w) || reserveOf(w) <= 0) return;
    burstLeft = 0; const empty = v.ammo === 0; const RT = rtOf(w);
    if (w.rig) { const d = playOnce(cur, 'reload') || w.rt; ws.reload = { t: 0, dur: d + (empty ? .3 : 0), kind: 'rig', empty }; }
    else if (w.act === 'pump') ws.reload = { t: 0, dur: .42 * attFx(w).rt, kind: 'shell', empty, phase: empty ? 'port' : 'in', n: 0 };
    else ws.reload = { t: 0, dur: RT + (empty ? .55 : 0), kind: 'mag', empty, ev: {}, rt: RT };
    setState(empty ? '재장전 (빈 탄창)' : '재장전'); o.onReload && o.onReload(); }
  function refill() { const w = ws.w, v = invOf(w); const need = magOf(w) - v.ammo; v.ammo += takeReserve(w, need); updHud(); }
  function reloadPose(dt) { const r = ws.reload, w = ws.w; r.t += dt; const T = r.t, D = r.dur; const out = { x: 0, y: 0, z: 0, rx: 0, ry: 0, rz: 0 };
    if (r.kind === 'throw') { if (T >= D) { ws.reload = null; ws.draw = 0; if (invOf(w).reserve <= 0) { const k = slots[curSlot]; if (o.onEmptyThrow) o.onEmptyThrow(curSlot, k); } } return out; }
    if (r.kind === 'rig') { if (T >= D) { refill(); ws.reload = null; setState(''); } return out; }
    if (r.kind === 'shell') {
      const U = cur.userData, S = U.size, sh = shellObj(U);
      const tilt = ease(Math.min(1, (r.tt = (r.tt || 0) + dt) / .22)); out.rz = -.62 * tilt; out.rx = .22 * tilt; out.y = -.035 * tilt; out.x = -.015 * tilt;
      if (r.phase === 'port') { // 빈 총: 노리쇠 열고 옆 배출구로 한 발
        const u = T / D; const a = Math.min(ease(u / .3), 1 - ease((u - .75) / .25)); setPart('pump', 'back', .09 * a); out.rz = -.25 * tilt; out.rx = .05;
        sh.visible = u > .25 && u < .8; sh.position.set(-S.x * .05, U.railY - .02 + .1 * (1 - ease((u - .25) / .45)), S.z * .7 * (1 - ease((u - .25) / .45))); sh.rotation.set(0, 0, 0);
        if (u > .45 && !r.p1) { r.p1 = 1; snd.mag(); const v = invOf(w); if (reserveOf(w) > 0) { v.ammo += takeReserve(w, 1); updHud(); } }
        if (u > .8 && !r.p2) { r.p2 = 1; snd.bolt(); shake += .12; }
        if (T >= D) { sh.visible = false; resetParts(cur); const v = invOf(w); if (r.cancel || v.ammo >= magOf(w) || reserveOf(w) <= 0) { r.phase = 'out'; r.t = 0; r.dur = .25; } else { r.phase = 'in'; r.t = 0; r.dur = .42 * attFx(w).rt; } } return out; }
      if (r.phase === 'in') { const u = T / D; const lx = -S.x * .04, ly = U.hands.l ? -S.y * .3 : -S.y * .3;
        // 탄을 아래에서 들어 올려(0~0.55) 엄지로 밀어 넣음(0.55~0.85), 밀 때 총이 살짝 들썩
        const up = ease(Math.min(1, u / .55)), push = ease(Math.max(0, Math.min(1, (u - .55) / .3)));
        sh.visible = u < .85; sh.rotation.set(0, 0, 0); sh.position.set(lx - .06 * (1 - up) + .05 * push, ly - .14 * (1 - up), .03 * (1 - up));
        out.y += -.012 * Math.sin(push * Math.PI); out.rx += .03 * Math.sin(push * Math.PI);
        if (u >= .8 && !r.ins) { r.ins = 1; const v = invOf(w); if (reserveOf(w) > 0 && v.ammo < magOf(w)) { v.ammo += takeReserve(w, 1); updHud(); } snd.tone(900, .03, .06, 'square'); snd.noise(.05, 3000, .12, 6); }
        if (T >= D) { r.ins = 0; sh.visible = false; const v = invOf(w);
          if (r.cancel || v.ammo >= magOf(w) || reserveOf(w) <= 0) { r.phase = r.empty && !r.p2 ? 'pump' : 'out'; r.t = 0; r.dur = r.phase === 'pump' ? .5 : .25; } else { r.t = 0; r.n++; } } }
      else if (r.phase === 'pump') { const u = T / r.dur; const a = u < .5 ? ease(u * 2) : 1 - ease((u - .5) * 2); if (!setPart('pump', 'back', .09 * a)) out.z += .03 * a; if (u > .45 && !r.sn) { r.sn = 1; snd.bolt(); } if (T >= r.dur) { r.phase = 'out'; r.t = 0; r.dur = .2; } }
      else { const u = 1 - ease(T / r.dur); out.rz = -.62 * u; out.rx = .22 * u; out.y = -.035 * u; if (T >= r.dur) { ws.reload = null; setState(''); resetParts(cur); sh.visible = false; } }
      return out; }
    const RT = r.rt || w.rt, pistol = w.pistol, mOut = .3 * RT / w.rt, mIn = RT * .42, slap = RT * .62, boltS = RT * .68, end = D - .28;
    const tl = Math.min(ease(Math.min(1, T / .28)), 1 - ease((T - end) / .28));
    out.rz = (pistol ? .3 : .38) * tl; out.rx = (pistol ? .2 : .1) * tl; out.y = -.04 * tl; out.x = -.02 * tl; out.ry = -.08 * tl;
    const pr = cur.userData.parts;
    if (cur.userData.clip) { const cl = cur.userData.clipObj; const u = ease((T - mOut) / (slap - mOut)); cl.visible = T > mOut && T < slap + .05; cl.position.copy(cl.userData.p0); cl.position.y += .14 * (1 - u);
      if (T > mOut && !r.ev.out) { r.ev.out = 1; snd.bolt(); } if (T >= slap && !r.ev.in) { r.ev.in = 1; snd.mag(); refill(); shake += .1; }
      if (T > .15 && T < D - .2) { const a = Math.min(ease((T - .15) / .25), 1 - ease((T - D + .45) / .25)); setPart('bolt', 'back', .09 * a); }
      if (T >= D) { ws.reload = null; resetParts(cur); setState(''); updHud(); } return out; }
    const useP = !pr.mag, mg = useP ? cur.userData.proxy : pr.mag.n; if (useP) { mg.material = proxyMat; mg.scale.set(1, 1, 1); }
    const drop = u => (pistol ? .12 : .22) * u; const px0 = pistol ? -cur.userData.size.x * .25 : -cur.userData.size.x * .04, py0 = -cur.userData.size.y * .15;
    if (T < mIn) { const u = ease((T - mOut) / (mIn - mOut - .05)); if (T > mOut && !r.ev.out) { r.ev.out = 1; snd.mag(); }
      if (useP) { mg.visible = T > mOut; mg.position.set(px0, py0 - drop(u), 0); } else { setPart('mag', 'down', drop(Math.max(0, u))); pr.mag.n.visible = u < .95; } }
    else if (T < slap) { const u = 1 - ease((T - mIn) / (slap - mIn)); if (useP) { mg.visible = true; mg.position.set(px0 - u * .04, py0 - drop(u) * 1.2, 0); } else { pr.mag.n.visible = true; setPart('mag', 'fwd', drop(u) * 1.2); } }
    else { if (!r.ev.in) { r.ev.in = 1; snd.mag(); refill(); if (useP) mg.visible = false; else resetParts(cur); shake += .15; }
      out.y += .012 * Math.max(0, 1 - (T - slap) / .12);
      if (r.empty && T > boltS && T < boltS + .5) { const u = (T - boltS) / .5; const a = u < .4 ? ease(u / .4) : 1 - ease((u - .4) / .6); const k = pistol ? 'slide' : 'bolt'; if (!setPart(k, 'back', (pistol ? .035 : .07) * a) && !setPart('slide', 'back', .035 * a)) out.z += .02 * a; out.rz -= .25 * a * (pistol ? 0 : 1); if (!r.ev.b && u > .35) { r.ev.b = 1; snd.bolt(); } } }
    if (T >= D) { ws.reload = null; resetParts(cur); setState(''); updHud(); }
    return out; }
  // 산탄 한 발 모양 (빨간 플라스틱 + 놋쇠 바닥)
  function shellObj(U) { if (U.shell) return U.shell; const g = new THREE.Group(); const b = new THREE.Mesh(new THREE.CylinderGeometry(.0095, .0095, .055, 12).rotateZ(H), shellMat); b.position.x = .006; g.add(b); const base = new THREE.Mesh(new THREE.CylinderGeometry(.0105, .0105, .014, 12).rotateZ(H), casingMat); base.position.x = -.026; g.add(base); g.visible = false; cur.add(g); U.shell = g; return g; }
  function cyclePose(dt) { const c = ws.cycle; c.t += dt; const u = c.t / c.dur; const out = { x: 0, y: 0, z: 0, rx: 0, ry: 0, rz: 0 };
    if (c.kind === 'pump') { const a = u < .25 ? 0 : u < .6 ? ease((u - .25) / .35) : 1 - ease((u - .6) / .4); if (!setPart('pump', 'back', .09 * a)) out.z += .04 * a; out.rx = -.05 * a; if (u > .5 && !c.e) { c.e = 1; snd.bolt(); eject(shellMat); } }
    else { const tl = Math.sin(Math.min(1, u) * Math.PI) * (1 - .75 * adsT); out.rz = .35 * tl; out.y = -.02 * tl; const a = u < .3 ? 0 : u < .6 ? ease((u - .3) / .3) : 1 - ease((u - .6) / .3); if (!setPart('bolt', 'back', .09 * a)) out.z += .03 * a; if (u > .55 && !c.e) { c.e = 1; snd.bolt(); eject(casingMat); } scopeBob = scopedOptic() ? Math.sin(Math.min(1, u) * Math.PI) : 0; }
    if (c.t >= c.dur) { ws.cycle = null; resetParts(cur); }
    return out; }

  /* ----- 인벤토리 (H): 총마다 조준경·총구·손잡이·탄창·개머리판 ----- */
  // o.invApi: { owned(slot, w) -> 가진 파츠 목록, equip(w, slot, k), unequip(w, slot) }. 없으면 전부 무제한(사격장).
  const api = o.invApi || { owned: (slot, w) => slot === 'optic' ? (w.opt || []).filter(k => k !== 'none') : attAllowed(w, slot), equip: (w, slot, k) => slot === 'optic' ? setOptic(w, k) : setAtt(w, slot, k), unequip: (w, slot) => slot === 'optic' ? setOptic(w, 'none') : setAtt(w, slot, null) };
  function curPart(w, slot) { if (slot === 'optic') { const m = cache[w.k]; return m && m.userData.opticKey !== 'none' ? m.userData.opticKey : null; } return getAtts(w)[slot] || null; }
  function partName(slot, k) { return slot === 'optic' ? OPTICS[k].name : ATT[k].name; }
  function renderInv() { const box = document.getElementById('invPanel'); if (!box) return; let h = '<div class="ih"><b>인벤토리</b><span>H 또는 Esc로 닫기 · 칩을 누르면 바로 달거나 바꿔요</span></div><div class="ig">';
    for (let i = 0; i < 3; i++) { const k = slots[i]; if (!k) { h += `<div class="ic empty"><div class="in"><em>${i + 1}</em>비어 있음</div></div>`; continue; } const w = WK[k];
      h += `<div class="ic"><div class="in"><em>${i + 1}</em>${w.name}<small>${w.cal} · 탄창 ${magOf(w)}발</small></div>`;
      for (const slot of ['optic', ...ATT_SLOTS]) { const allowed = slot === 'optic' ? (w.builtin ? [] : (w.opt || []).filter(x => x !== 'none')) : attAllowed(w, slot); if (!allowed.length) continue; const on = curPart(w, slot); const own = api.owned(slot, w).filter(x => x !== on && allowed.includes(x));
        h += `<div class="is"><span>${SLOT_NAME[slot]}</span><div>` + (on ? `<button class="chip on" data-w="${k}" data-s="${slot}" data-k="">${partName(slot, on)} ✕</button>` : '<i>비어 있음</i>') + own.map(x => `<button class="chip" data-w="${k}" data-s="${slot}" data-k="${x}">${partName(slot, x)}</button>`).join('') + '</div></div>'; }
      h += '</div>'; }
    h += '</div>'; const bag = o.invBag ? o.invBag() : ''; if (bag) h += `<div class="ibag">${bag}</div>`; box.innerHTML = h;
    box.querySelectorAll('button[data-w]').forEach(b => b.onclick = () => { const w = WK[b.dataset.w], sl = b.dataset.s, k = b.dataset.k; if (k) api.equip(w, sl, k); else api.unequip(w, sl); snd.mag(); updHud(); renderInv(); }); }
  function toggleInv(force) { const box = document.getElementById('invPanel'); if (!box) return; invOpen = force ?? !invOpen; box.hidden = !invOpen; fireHeld = false; ads = false; o.onInvToggle && o.onInvToggle(invOpen);
    if (invOpen) { renderInv(); if (document.pointerLockElement) document.exitPointerLock(); if (el.start) el.start.hidden = true; }
    else { lockNow(); if (el.start && !locked) el.start.hidden = false; } }

  /* ----- HUD ----- */
  function setState(s) { if (!el.state) return; el.state.textContent = s; stateT = s ? 2.5 : 0; }
  function updHud() { if (!el.ammoN) return; if (!ws) { el.ammoN.textContent = '-'; el.ammoR.textContent = ''; el.mode.textContent = knifeOut ? '단검' : '맨손'; return; } const w = ws.w, v = invOf(w); el.ammoN.textContent = w.thr ? v.reserve : v.ammo; el.ammoR.textContent = w.thr ? '' : reserveOf(w); el.mode.textContent = w.modes[v.mode] + (cur && cur.userData.opticKey !== 'none' ? ' · ' + OPTICS[cur.userData.opticKey].name : ''); }
  function renderSlots() { if (!el.slots) return; el.slots.innerHTML = slots.map((k, i) => `<div class="${i === curSlot ? 'on' : ''}"><b>${i + 1}</b>${k ? WK[k].name + (WK[k].thr ? ' ×' + invOf(WK[k]).reserve : '') : '<span style="opacity:.5">비어 있음</span>'}</div>`).join(''); }
  if (el.strip) { const ppd = 3; let h = ''; for (let rep = -1; rep <= 1; rep++) for (let d = 0; d < 360; d += 5) { const x = (d + rep * 360) * ppd + 1200; const lab = { 0: 'N', 45: 'NE', 90: 'E', 135: 'SE', 180: 'S', 225: 'SW', 270: 'W', 315: 'NW' }[d];
    if (d % 15 === 0) h += `<span class="${lab && lab.length === 1 ? 'big' : ''}" style="left:${x}px">${lab || d}</span>`; h += `<i style="left:${x}px;height:${d % 15 ? 4 : 8}px"></i>`; } el.strip.innerHTML = h; el.strip.style.width = '4000px'; }
  const cr = el.cross ? [...el.cross.children] : [];

  /* ----- 이동 · 충돌 ----- */
  function collide() { for (const b of solids) { const r = .32, top = P.pos.y + P.eye * .95; if (P.pos.y > b.max.y - .4 || top < b.min.y) continue;
    const cx = Math.max(b.min.x, Math.min(P.pos.x, b.max.x)), cz = Math.max(b.min.z, Math.min(P.pos.z, b.max.z)); const dx = P.pos.x - cx, dz = P.pos.z - cz, d = Math.hypot(dx, dz);
    if (d < r) { if (d > 1e-4) { P.pos.x = cx + dx / d * r; P.pos.z = cz + dz / d * r; } else P.pos.x = b.max.x + r; } } }
  function groundY() { let g = o.groundAt ? o.groundAt(P.pos.x, P.pos.z) : 0; for (const b of solids) { if (P.pos.x > b.min.x - .2 && P.pos.x < b.max.x + .2 && P.pos.z > b.min.z - .2 && P.pos.z < b.max.z + .2 && P.pos.y >= b.max.y - .4) g = Math.max(g, b.max.y); } return g; }

  /* ----- 매 프레임 ----- */
  function update(dt) {
    tickMixers(dt);
    const w = ws && ws.w; const tnow = performance.now() / 1000; const can = ctrl();
    const fwd = can ? (held('fwd') ? 1 : 0) - (held('back') ? 1 : 0) : 0, str = can ? (held('right') ? 1 : 0) - (held('left') ? 1 : 0) : 0;
    slideCd -= dt; if (slideT > 0) slideT -= dt;
    P.sprinting = can && slideT <= 0 && held('sprint') && fwd > 0 && adsT < .3 && P.stance !== 'prone' && !(ws && ws.reload && ws.reload.kind !== 'shell') && !(o.healing && o.healing());
    if (P.sprinting && P.stance === 'crouch') P.stance = 'stand';
    P.holding = can && held('sprint') && adsT > .6 && scopedOptic() && P.breath > 0;
    let spd = P.stance === 'prone' ? 1.1 : P.stance === 'crouch' ? 2.6 : P.sprinting ? 6.4 : 4.7; if (adsT > .5) spd *= .6; if (o.healing && o.healing()) spd *= .5;
    const dir = new THREE.Vector3(str, 0, -fwd); if (dir.lengthSq() > 0) dir.normalize().applyAxisAngle(new THREE.Vector3(0, 1, 0), P.yaw);
    const acc = P.onG ? 14 : 3;
    if (slideT > 0) { const k = slideT / .8, v = 2.6 + 6.6 * k; P.vel.x = slideDir.x * v + dir.x * .8; P.vel.z = slideDir.z * v + dir.z * .8; if (slideT - dt <= 0) P.stance = 'crouch'; }
    else { P.vel.x += (dir.x * spd - P.vel.x) * Math.min(1, dt * acc); P.vel.z += (dir.z * spd - P.vel.z) * Math.min(1, dt * acc); }
    if (!P.dead) { P.vel.y -= 13 * dt; P.pos.addScaledVector(P.vel, dt); collide(); const gy = groundY(); if (P.pos.y <= gy) { if (!P.onG && P.vel.y < -4) shake += .2; P.pos.y = gy; P.vel.y = 0; P.onG = true; }
      else if (P.onG && P.vel.y <= 0 && P.pos.y - gy < .45) { P.pos.y = gy; P.vel.y = 0; } else if (P.pos.y > gy + .05) P.onG = false; }
    const B = o.bounds; P.pos.x = Math.max(B.minX, Math.min(B.maxX, P.pos.x)); P.pos.z = Math.max(B.minZ, Math.min(B.maxZ, P.pos.z));
    const eyeT = slideT > 0 ? .9 : P.stance === 'prone' ? .42 : P.stance === 'crouch' ? 1.12 : 1.65; P.eye += (eyeT - P.eye) * Math.min(1, dt * 8);
    const leanT = can ? (held('leanL') ? -1 : 0) + (held('leanR') ? 1 : 0) : 0; P.lean += (leanT * (P.stance === 'prone' ? 0 : 1) - P.lean) * Math.min(1, dt * 9);
    const sp = Math.hypot(P.vel.x, P.vel.z); if (P.onG && sp > .5) { P.bob += dt * sp * 1.9; P.stepT -= dt * sp; if (P.stepT <= 0) { P.stepT = 2.2; snd.step(P.stance === 'crouch' ? .4 : 1); } }
    if (P.holding) P.breath = Math.max(0, P.breath - dt / 5); else P.breath = Math.min(1, P.breath + dt / 6);
    if (el.breath) { el.breath.hidden = !(scopedOptic() && adsT > .6); el.breathI.style.width = (P.breath * 100) + '%'; }
    if (el.stance) el.stance.textContent = (P.dead ? '사망' : P.stance === 'prone' ? '엎드리기' : P.stance === 'crouch' ? '앉기' : P.sprinting ? '달리기' : '서기') + (Math.abs(P.lean) > .3 ? (P.lean < 0 ? ' · 왼쪽 기울임' : ' · 오른쪽 기울임') : '');
    if (fireHeld) tryFire(false); if (burstLeft > 0 && !fireHeld) tryFire(false);
    if (tnow - lastShot > .18) { if (recAcc > 0) { recPool += recAcc; recAcc = 0; } shotIdx = 0; }
    if (recPool > 0) { const d = recPool * Math.min(1, dt * 7 * (w ? attFx(w).rec : 1)); P.pitch -= d; recPool -= d; if (recPool < 1e-4) recPool = 0; }
    bloom *= Math.pow(.02, dt);
    if (recQ > 0) { const d = Math.min(recQ, Math.max(recQ * Math.min(1, dt * 28), .0004)); P.pitch += d; recQ -= d; } // 반동을 한 프레임에 확 올리지 않고 짧게 나눠 올림
    const canAds = ws && !(ws.reload && ws.reload.kind !== 'shell') && !P.sprinting && !w.thr && ws.draw >= 1 && can;
    adsT += (((ads && canAds) ? 1 : 0) - adsT) * Math.min(1, dt * (scopedOptic() ? 9 : 13) * (w ? attFx(w).ads : 1));
    const zoom = 1 + (adsZoom() - 1) * ease(adsT); cam2.fov = (o.fov || 72) / zoom; cam2.updateProjectionMatrix();
    const scopeOn = scopedOptic() && !w.rig;
    const swayAmp = (w ? attFx(w).sway : 1) * (scopeOn ? 1 : .25) * (P.holding ? .08 : 1) * (P.stance === 'prone' ? .35 : P.stance === 'crouch' ? .7 : 1) * adsT;
    const sx = (Math.sin(tnow * .9) * .6 + Math.sin(tnow * 2.3) * .25) * .0035 * swayAmp, sy = (Math.sin(tnow * 1.3 + 1) * .6 + Math.sin(tnow * .5) * .3) * .003 * swayAmp;
    shake *= Math.pow(.004, dt); const sh = (scopedOptic() && adsT > .6) ? 0 : shake * .006;
    const bobY = Math.sin(P.bob * 2) * .03 * (1 - adsT * .8) * (P.sprinting ? 1.6 : 1), bobX = Math.cos(P.bob) * .025 * (1 - adsT * .8);
    const side = new THREE.Vector3(Math.cos(P.yaw), 0, -Math.sin(P.yaw));
    if (!P.dead) { cam2.position.set(P.pos.x, P.pos.y + P.eye + bobY, P.pos.z).addScaledVector(side, P.lean * .38 + bobX * .2); cam2.rotation.set(P.pitch + sy + (Math.random() - .5) * sh, P.yaw + sx + (Math.random() - .5) * sh, -P.lean * .22 + (slideT > 0 ? .06 * Math.min(1, slideT * 3) : 0), 'YXZ'); }
    vm.visible = !P.dead;
    if (cur && ws) { const s = cur.userData.size, len = Math.max(s.x, s.z); ws.draw = Math.min(1, ws.draw + dt * 2.6); const op = optic();
      let hip, ad;
      if (w.rig) { hip = w.k === 'fps_rig' ? [0, -.2, -.42] : [.06, -.27, -.62]; ad = w.k === 'fps_rig' ? [0, -.165, -.36] : [0, -.205, -.5]; }
      else if (w.thr) { const pw = thr.charging ? ease(thr.power) : 0; hip = [.2 + .05 * pw, -.2 + .12 * pw, -.38 + .16 * pw]; ad = hip; }
      else if (w.pistol) { hip = [.15, -.16, -.4]; ad = [0, op.type && cur.userData.optic ? -(cur.userData.railY - .003 + op.h) : -s.y / 2 - .008, -.36]; }
      else { hip = [.16, -.13 - s.y * .3, -.22 - len * .3]; const mounted = op.type && cur.userData.optic; ad = [0, mounted ? -(cur.userData.railY - .003 + op.h) : cur.userData.clip ? -(cur.userData.railY + .03) : -(cur.userData.iron ?? s.y / 2 + .012), -len * .5 - .03 + (mounted && op.type !== 'scope' ? .05 : 0)]; }
      const a = ease(adsT); let px = hip[0] + (ad[0] - hip[0]) * a, py = hip[1] + (ad[1] - hip[1]) * a, pz = hip[2] + (ad[2] - hip[2]) * a;
      let rx = 0, ry = 0, rz = 0;
      hipT += ((P.sprinting ? 1 : 0) - hipT) * Math.min(1, dt * 8); const sp2 = ease(hipT); px += -.04 * sp2; py += -.06 * sp2; pz += .04 * sp2; ry += .75 * sp2; rz += .25 * sp2; rx += -.25 * sp2;
      if (o.healing && o.healing()) { py -= .25; rx -= .6; }
      swayX += (-mdx * .00025 - swayX) * Math.min(1, dt * 10); swayY += (mdy * .00025 - swayY) * Math.min(1, dt * 10); mdx = 0; mdy = 0;
      px += Math.max(-.03, Math.min(.03, swayX)) * (1 - a * .7); py += Math.max(-.03, Math.min(.03, swayY)) * (1 - a * .7);
      px += Math.cos(P.bob) * .006 * (1 - a * .85); py += Math.abs(Math.sin(P.bob)) * .008 * (1 - a * .85);
      kick *= Math.pow(.0006, dt); kickR *= Math.pow(.0006, dt); pz += kick * (1 - a * .5); rx += kickR * (1 - a * .6);
      if (ws.reload) { const r = reloadPose(dt); px += r.x; py += r.y; pz += r.z; rx += r.rx; ry += r.ry; rz += r.rz; }
      if (ws && ws.cycle) { const r = cyclePose(dt); px += r.x; py += r.y; pz += r.z; rx += r.rx; ry += r.ry; rz += r.rz; }
      if (blow > 0 && ws) { blow += dt; const u = blow / .09; const b = u < .3 ? u / .3 : 1 - (u - .3) / .7; const v = invOf(w); const lock = w.pistol && v.ammo === 0;
        if (!setPart('slide', 'back', .028 * (lock ? 1 : Math.max(0, b)))) setPart('bolt', 'back', .03 * Math.max(0, b)); if (u >= 1) { blow = 0; if (!lock) resetParts(cur); } }
      if (ws) { const dr = 1 - ease(ws.draw); py -= .35 * dr; rx -= .9 * dr; }
      vm.position.set(px, py, pz); vm.rotation.set(rx, ry, rz);
      const scoped = scopeOn && adsT > .86; cur.visible = !scoped && !(ws && ws.reload && ws.reload.kind === 'throw');
      if (!(ws && ws.cycle)) scopeBob *= Math.pow(.001, dt);
      if (el.scope) { el.scope.style.transform = scopeBob > .01 ? `translate(${scopeBob * -6}px, ${scopeBob * 16}px) rotate(${scopeBob * -1.2}deg)` : ''; el.scope.style.opacity = scoped ? 1 : 0; el.scope.dataset.ret = op.ret || 'mil'; if (el.zoomTxt) el.zoomTxt.textContent = (op.zoom || 8) + '×'; }
      if (el.dotRet) { el.dotRet.style.opacity = (op.type === 'dot' || op.type === 'holo') && adsT > .85 ? 1 : 0; el.dotRet.dataset.t = op.type || ''; }
      flashT -= dt; flash.visible = flashT > 0 && !scoped; flash.scale.setScalar(.1 + Math.random() * .06);
    } else { if (el.scope) el.scope.style.opacity = 0; if (el.dotRet) el.dotRet.style.opacity = 0; }
    if (el.cross) { const moving = sp > .5; const gap = 6 + (moving ? 10 : 0) + (P.onG ? 0 : 14) + bloom * 900 + (P.stance === 'crouch' ? -2 : P.stance === 'prone' ? -3 : 0);
      el.cross.style.opacity = adsT > .4 || P.sprinting || P.dead ? 0 : 1; if (cr.length) { cr[0].style.top = (-gap - 9) + 'px'; cr[1].style.top = gap + 'px'; cr[2].style.left = (-gap - 9) + 'px'; cr[3].style.left = gap + 'px'; } }
    hitmT -= dt; if (el.hitm) { el.hitm.style.opacity = Math.max(0, hitmT * 4); el.dist.style.opacity = Math.max(0, hitmT * 4); }
    stateT -= dt; if (stateT <= 0 && el.state && el.state.textContent) el.state.textContent = '';
    if (el.strip) { const deg = ((-cam2.rotation.y * 180 / Math.PI) % 360 + 360) % 360; el.strip.style.transform = `translateX(${-(deg * 3 + 1200) + el.strip.parentNode.clientWidth / 2}px)`; }
    stepBullets(dt);
    sparks.forEach(p => { p.userData.t += dt; p.userData.v.y -= 9 * dt; p.position.addScaledVector(p.userData.v, dt); const gy0 = o.groundAt ? o.groundAt(p.position.x, p.position.z) : 0; if (p.position.y < gy0 + .01) { p.position.y = gy0 + .01; p.userData.v.set(0, 0, 0); } }); for (let i = sparks.length - 1; i >= 0; i--) if (sparks[i].userData.t > (sparks[i].userData.life || (sparks[i].userData.blood ? .9 : .5))) { S2.remove(sparks[i]); sparks.splice(i, 1); }
    puffs.forEach(m => { const u = m.userData; u.t += dt; const k = u.t / u.life; m.position.addScaledVector(u.v, dt); m.scale.setScalar(u.size * (.4 + k * .9)); m.material.opacity = .8 * (1 - k); }); for (let i = puffs.length - 1; i >= 0; i--) if (puffs[i].userData.t > puffs[i].userData.life) { S2.remove(puffs[i]); puffs[i].material.dispose(); puffs.splice(i, 1); }
    updArms(dt); updSmoke(dt);
    casings.forEach(c => { const u = c.userData; u.t += dt; const cg = (u.gy ??= o.groundAt ? o.groundAt(c.position.x, c.position.z) : 0); if (c.position.y > cg + .02) { u.v.y -= 9.8 * dt; c.position.addScaledVector(u.v, dt); c.rotation.x += u.s.x * dt; c.rotation.y += u.s.y * dt; } else { c.position.y = cg + .02; if (!u.land) { u.land = 1; snd.tone(4200 + Math.random() * 800, .05, .015, 'sine'); } } });
    targets.forEach(t => { const u = t.userData; u.av -= u.ang * 40 * dt; u.av *= Math.pow(.15, dt); u.ang += u.av * dt; t.rotation.x = -u.ang * .6; });
    thrown.forEach(c => { const u = c.userData; u.t += dt; u.v.y -= 9.8 * dt; const prev = c.position.clone(); const sp0 = u.v.length(); c.position.addScaledVector(u.v, dt); c.rotation.x += u.spin.x * dt * Math.min(1, sp0 / 6); c.rotation.y += u.spin.y * dt * Math.min(1, sp0 / 6);
      for (const b of solids) { const q = c.position; if (q.x > b.min.x - .05 && q.x < b.max.x + .05 && q.y > b.min.y - .05 && q.y < b.max.y + .05 && q.z > b.min.z - .05 && q.z < b.max.z + .05) {
        const inX = prev.x <= b.min.x - .05 || prev.x >= b.max.x + .05, inY = prev.y <= b.min.y - .05 || prev.y >= b.max.y + .05;
        if (inY) { u.v.y *= -.3; u.v.x *= .5; u.v.z *= .5; } else if (inX) u.v.x *= -.4; else u.v.z *= -.4; c.position.copy(prev); if (u.k === 'incendiary_east') u.t = 99; else if (sp0 > 2) bounceSnd(c, sp0); break; } }
      const gy = o.groundAt ? o.groundAt(c.position.x, c.position.z) : 0;
      if (c.position.y < gy + .06) { c.position.y = gy + .06; if (Math.abs(u.v.y) > 2 && u.k !== 'incendiary_east') bounceSnd(c, Math.abs(u.v.y)); u.v.multiplyScalar(.45); u.v.y *= -.3; if (u.k === 'incendiary_east') u.t = 99; }
      if (u.lbl) { const left = Math.max(0, u.fuse - u.t); const v = c.position.clone().add(new THREE.Vector3(0, .35, 0)).project(cam2); u.lbl.style.display = v.z < 1 ? '' : 'none'; u.lbl.style.left = ((v.x + 1) / 2 * 100) + '%'; u.lbl.style.top = ((1 - v.y) / 2 * 100) + '%'; u.lbl.textContent = left.toFixed(1); u.lbl.classList.toggle('r', left < 1.2); } });
    for (let i = thrown.length - 1; i >= 0; i--) { const c = thrown[i], u = c.userData; if ((u.k === 'incendiary_east' ? u.t > 6 : u.t >= u.fuse)) { const p = c.position.clone(); S2.remove(c); thrown.splice(i, 1); if (u.lbl) u.lbl.remove(); boom(p, u.k, u.mine, u.owner); } }
    // 손에 든 수류탄: 핀을 뽑았으면 시간이 줄고, 우클릭 중이면 게이지가 참
    if (ws && ws.w.thr) { if (thr.pulled && !(ws.reload && ws.reload.kind === 'throw')) { thr.fuse -= dt; if (thr.fuse <= 0) cookOff(); } if (thr.charging) thr.power = Math.min(1, thr.power + dt / 1.1); thr.pinT += dt;
      if (el.thrUi) { el.thrUi.hidden = false; el.thrBar.style.width = (thr.charging ? thr.power * 100 : 0) + '%'; const nm = ws.w.ko; el.thrTxt.className = thr.pulled && thr.fuse < 1.5 ? 'r' : '';
        el.thrTxt.textContent = PIN[ws.w.k] ? (thr.pulled ? `핀 뽑음 · ${thr.fuse.toFixed(1)}초 뒤 폭발` : `${nm} · 우클릭: 핀 뽑고 힘 모으기`) : (thr.charging ? `${nm} · 힘 ${Math.round(thr.power * 100)}%` : `${nm} · 우클릭: 힘 모으기`); } }
    else if (el.thrUi) el.thrUi.hidden = true;
    updFx(dt); updFires(dt); updBurn(dt); updArc();
    if (false) booms.forEach(b => { b.userData.t += dt; const k = b.userData.t / b.userData.life; const sm = b.userData.k === 'smoke_west'; b.scale.setScalar(b.userData.r * (sm ? Math.min(1, .2 + k * 4) : b.userData.k === 'incendiary_east' ? 1 : (.3 + k))); if (b.userData.k === 'incendiary_east') b.scale.y = .15 + Math.random() * .05; b.material.opacity = Math.max(0, b.userData.o * (sm ? Math.min(1, (1 - k) * 3) : b.userData.k === 'incendiary_east' ? Math.min(1, (1 - k) * 3) * .7 : (1 - k))); });
    for (let i = booms.length - 1; i >= 0; i--) if (booms[i].userData.t > booms[i].userData.life) { S2.remove(booms[i]); booms.splice(i, 1); }
  }
  function setEnabled(v) { enabled = v; vmRoot.visible = v; if (!v) { fireHeld = false; ads = false; } }
  return { get burning() { return burnT > 0 }, get knifeOut() { return knifeOut }, get sliding() { return slideT > 0 }, toggleInv, get invOpen() { return invOpen }, renderInv, magOf, get firing() { return fireHeld }, get locked() { return locked }, update, blood, equip, setOptic, setEnabled, P, slots, invOf, reserveOf, renderSlots, updHud, remoteShot, spawnThrown, boom, setState, startReload, holster, keys, vm, get cur() { return cur }, get ws() { return ws }, get adsT() { return adsT }, get curSlot() { return curSlot }, setAds: v => { ads = v }, fire: () => { fireHeld = true; tryFire(true); }, stopFire: () => { fireHeld = false; }, punchShake: v => { shake += v; } };
}

/* ---------- HUD (사격장·배틀로얄 공용) ---------- */
const HUD_CSS = `
.fp{position:absolute;inset:0;pointer-events:none;font-family:var(--body,system-ui);--acc:var(--accent,#e0902c)}
.compass{position:absolute;left:50%;top:12px;width:min(520px,60%);height:30px;transform:translateX(-50%);overflow:hidden;mask-image:linear-gradient(90deg,transparent,#000 18%,#000 82%,transparent);-webkit-mask-image:linear-gradient(90deg,transparent,#000 18%,#000 82%,transparent)}
.compass .strip{position:absolute;top:0;left:0;height:100%;white-space:nowrap;font:600 12px var(--mono,monospace);color:#fffc}
.compass .strip span{position:absolute;top:2px;transform:translateX(-50%);text-shadow:0 1px 2px #000}
.compass .strip span.big{font-size:15px;color:#fff}
.compass .strip i{position:absolute;bottom:2px;width:1px;height:6px;background:#fff9}
.compass .mark{position:absolute;left:50%;bottom:0;width:0;height:0;border:5px solid transparent;border-bottom-color:var(--acc);transform:translateX(-50%)}
.cross{position:absolute;left:50%;top:50%;width:0;height:0}
.cross i{position:absolute;background:#fffd;box-shadow:0 0 1px #000}
.cross i:nth-child(1),.cross i:nth-child(2){width:2px;height:9px;left:-1px}
.cross i:nth-child(3),.cross i:nth-child(4){height:2px;width:9px;top:-1px}
.cross i:nth-child(5){width:2px;height:2px;left:-1px;top:-1px}
.hitm{position:absolute;left:50%;top:50%;width:26px;height:26px;transform:translate(-50%,-50%) rotate(45deg);opacity:0}
.hitm::before,.hitm::after{content:"";position:absolute;background:#fff;left:12px;top:0;width:2px;height:26px;clip-path:polygon(0 0,100% 0,100% 35%,0 35%,0 65%,100% 65%,100% 100%,0 100%)}
.hitm::after{transform:rotate(90deg)}
.dist{position:absolute;left:50%;top:calc(50% + 26px);transform:translateX(-50%);font:600 13px var(--mono,monospace);color:#fff;text-shadow:0 1px 2px #000;opacity:0}
.dotret{position:absolute;left:50%;top:50%;opacity:0;width:0;height:0}
.dotret::before{content:"";position:absolute;width:5px;height:5px;left:-2.5px;top:-2.5px;border-radius:50%;background:#ff3030;box-shadow:0 0 6px 1px #ff2020aa}
.dotret[data-t=holo]::after{content:"";position:absolute;width:38px;height:38px;left:-20px;top:-20px;border-radius:50%;border:2px solid #ff3030cc;box-shadow:0 0 6px #ff202088}
.scope{position:absolute;inset:0;opacity:0;--d:min(86vh,86vw)}
.scope .ring{position:absolute;left:50%;top:50%;width:var(--d);height:var(--d);transform:translate(-50%,-50%);border-radius:50%;box-shadow:0 0 0 200vmax #000,inset 0 0 40px 18px #000c}
.scope .h,.scope .v{position:absolute;background:#000}
.scope .h{left:0;right:0;top:50%;height:2px;margin-top:-1px}
.scope .v{top:0;bottom:0;left:50%;width:2px;margin-left:-1px}
.scope .thin{position:absolute;left:50%;top:50%;background:#000}
.scope .dot{position:absolute;left:50%;top:50%;width:4px;height:4px;margin:-2px 0 0 -2px;background:#d22;border-radius:50%}
.scope .chv{position:absolute;left:50%;top:50%;width:18px;height:18px;margin-left:-9px;border-left:2px solid #c11;border-top:2px solid #c11;transform:rotate(45deg);transform-origin:0 0;display:none}
.scope .circ{position:absolute;left:50%;top:50%;width:calc(var(--d)*.12);height:calc(var(--d)*.12);transform:translate(-50%,-50%);border:2px solid #c11;border-radius:50%;display:none}
.scope .mils{position:absolute;left:50%;top:50%;width:0;height:0;display:none}
.scope .mils i{position:absolute;width:5px;height:5px;margin:-2.5px;background:#000;border-radius:50%}
.scope .zt{position:absolute;left:50%;top:calc(50% + var(--d)*.42);font:700 12px var(--mono,monospace);color:#fff6;transform:translateX(-50%)}
/* 2배율: 원 + 빨간 점, 가는 십자 / 4배율: 빨간 쉐브론 + 아래 기둥 / 8배율: 굵은 듀플렉스 + 밀 도트 */
.scope[data-ret=dot] .h,.scope[data-ret=dot] .v{opacity:.35}
.scope[data-ret=dot] .circ{display:block}
.scope[data-ret=chev] .h{-webkit-mask-image:linear-gradient(90deg,#000 calc(50% - 40px),transparent 0 calc(50% + 40px),#000 0);mask-image:linear-gradient(90deg,#000 calc(50% - 40px),transparent 0 calc(50% + 40px),#000 0)}
.scope[data-ret=chev] .dot{display:none}
.scope[data-ret=chev] .chv{display:block}
.scope[data-ret=chev] .v{top:calc(50% + 22px)}
.scope[data-ret=mil] .h,.scope[data-ret=mil] .v{box-shadow:0 0 0 1px #000}
.scope[data-ret=mil] .mils{display:block}
.bot{position:absolute;left:50%;bottom:16px;transform:translateX(-50%);display:grid;justify-items:center;gap:6px;width:min(340px,70%)}
.ammo{display:flex;align-items:baseline;gap:10px;font-family:var(--display,system-ui);font-weight:700;color:#fff;text-shadow:0 1px 3px #000;font-variant-numeric:tabular-nums}
.ammo b{font-size:38px;line-height:1}
.ammo small{font-size:18px;color:#ddd}
.ammo em{font:600 11px var(--mono,monospace);font-style:normal;letter-spacing:.12em;color:var(--acc);border:1px solid #fff4;padding:2px 6px;background:#0006}
.hp{width:100%;height:8px;background:#0008;border:1px solid #fff4;position:relative}
.hp i{display:block;height:100%;width:100%;background:#eee;transition:width .15s}
.hp i.low{background:#d65a3a}
.hp u{position:absolute;inset:0;background:#7fd07f55;width:0}
.state{font:600 11px var(--mono,monospace);letter-spacing:.14em;color:#fff;text-shadow:0 1px 2px #000;min-height:1em}
.slots{position:absolute;right:16px;bottom:16px;display:grid;gap:4px;justify-items:end}
.slots div{font:600 13px var(--display,system-ui);letter-spacing:.06em;color:#fff9;background:#0007;padding:4px 10px;border-right:3px solid transparent;text-shadow:0 1px 2px #000}
.slots div.on{color:#fff;border-right-color:var(--acc);background:#000b}
.slots div b{font-family:var(--mono,monospace);font-size:11px;margin-right:8px;color:var(--acc)}
.stance{position:absolute;left:16px;bottom:16px;font:600 12px var(--mono,monospace);color:#fff;text-shadow:0 1px 2px #000;display:grid;gap:4px}
.stance .k{color:var(--dim,#999);font-size:11px;line-height:1.7;max-width:46ch}
.stance .k b{color:#fff;border:1px solid #fff5;padding:0 4px;margin-right:2px;background:#0006;font-weight:500}
.breath{width:120px;height:4px;background:#0008}
.breath i{display:block;height:100%;background:#9cd2ff}
.start{position:absolute;inset:0;display:grid;place-items:center;background:#0009;pointer-events:auto;cursor:pointer}
.start div{text-align:center;display:grid;gap:8px}
.start b{font-family:var(--display,system-ui);font-size:34px;letter-spacing:.04em}
.start span{font-size:13px;color:#ddd}
.flash{position:absolute;inset:0;background:#fff;opacity:0;pointer-events:none}
.burnv{position:absolute;inset:0;pointer-events:none;box-shadow:inset 0 0 160px 50px #ff5a10aa;opacity:0;transition:opacity .2s}
.fuses{position:absolute;inset:0;pointer-events:none}.fuses .fuse{position:absolute;transform:translate(-50%,-100%);font:700 13px var(--mono,monospace);color:#fff;background:#000a;padding:1px 6px;border:1px solid #fff5}.fuses .fuse.r{color:#ff6a4a;border-color:#ff6a4a}
.thr{position:absolute;left:50%;top:calc(50% + 44px);transform:translateX(-50%);display:grid;gap:4px;justify-items:center;width:220px;font:600 12px var(--body,system-ui);color:#fff;text-shadow:0 1px 2px #000}
.thr .tb{width:100%;height:6px;background:#0009;border:1px solid #fff4}.thr .tb i{display:block;height:100%;width:0;background:linear-gradient(90deg,#9cc46a,#e0902c,#d65a3a)}.thr span.r{color:#ff6a4a}
.dmgv{position:absolute;inset:0;pointer-events:none;box-shadow:inset 0 0 120px 30px #b0101099;opacity:0;transition:opacity .4s}
.inv{position:absolute;inset:6% 8%;background:#0d0e0cee;border:1px solid #fff2;pointer-events:auto;overflow:auto;padding:16px;display:grid;gap:12px;align-content:start;font-family:var(--body,system-ui);z-index:6}
.inv .ih{display:flex;gap:14px;align-items:baseline;flex-wrap:wrap}.inv .ih b{font:700 22px var(--display,system-ui);letter-spacing:.04em}.inv .ih span{font-size:12px;color:#aaa}
.inv .ig{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:10px}
.inv .ic{border:1px solid #fff2;background:#ffffff08;padding:10px;display:grid;gap:8px;align-content:start}.inv .ic.empty{opacity:.5}
.inv .in{font:700 17px var(--display,system-ui);display:grid;grid-template-columns:auto 1fr;column-gap:8px}.inv .in em{font:600 11px var(--mono,monospace);color:var(--acc);font-style:normal;grid-row:span 2;align-self:center;border:1px solid var(--acc);padding:2px 6px}.inv .in small{font:500 11px var(--mono,monospace);color:#999}
.inv .is{display:grid;grid-template-columns:62px 1fr;gap:6px;align-items:start;font-size:12px}.inv .is>span{color:#aaa;padding-top:5px}.inv .is div{display:flex;flex-wrap:wrap;gap:4px}.inv .is i{color:#666;font-style:normal;padding-top:5px}
.inv .chip{appearance:none;border:1px solid #fff3;background:transparent;color:#eee;font:600 12px var(--body,system-ui);padding:4px 8px;cursor:pointer}.inv .chip:hover{border-color:var(--acc)}.inv .chip.on{background:var(--acc);color:#1a1205;border-color:var(--acc)}
.inv .ibag{font-size:12px;color:#bbb;line-height:1.7;border-top:1px solid #fff2;padding-top:8px}
@media (max-width:820px){.stance .k{display:none}.inv{inset:2%}}
`;
export function mountHud(container, keysHtml) {
  if (!document.getElementById('core-hud-css')) { const st = document.createElement('style'); st.id = 'core-hud-css'; st.textContent = HUD_CSS; document.head.appendChild(st); }
  const mils = []; for (let i = -4; i <= 4; i++) if (i) { mils.push(`<i style="left:calc(var(--d)*${i * .045});top:0"></i>`, `<i style="top:calc(var(--d)*${i * .045});left:0"></i>`); }
  const d = document.createElement('div'); d.className = 'fp'; d.id = 'fp'; d.hidden = true;
  d.innerHTML = `<div class="scope" id="scope" data-ret="mil"><div class="ring"></div><div class="h"></div><div class="v"></div><div class="circ"></div><div class="chv"></div><div class="mils">${mils.join('')}</div><div class="dot"></div><div class="zt" id="zoomTxt">8×</div></div>
  <div class="dotret" id="dotRet"></div>
  <div class="compass"><div class="strip" id="strip"></div><div class="mark"></div></div>
  <div class="cross" id="cross"><i></i><i></i><i></i><i></i><i></i></div>
  <div class="hitm" id="hitm"></div><div class="dist" id="dist"></div>
  <div class="dmgv" id="dmgv"></div><div class="burnv" id="burnv"></div><div class="flash" id="flashbang"></div>
  <div class="fuses" id="fuses"></div>
  <div class="thr" id="thrUi" hidden><div class="tb"><i id="thrBar"></i></div><span id="thrTxt"></span></div>
  <div class="stance"><span id="stanceTxt">서기</span><div class="breath" id="breath" hidden><i id="breathI"></i></div><div class="k">${keysHtml || ''}</div></div>
  <div class="bot"><div class="state" id="stateTxt"></div><div class="ammo"><b id="ammoN">30</b><small id="ammoR">90</small><em id="modeTxt">자동</em></div><div class="hp"><i id="hpI"></i><u id="hpHeal"></u></div></div>
  <div class="slots" id="slotsEl"></div>
  <div class="inv" id="invPanel" hidden></div>
  <div class="start" id="start"><div><button class="kbtn" id="keysOpen">키 설정</button><div class="kin" id="keysIn" hidden></div><b>클릭해서 시작</b><span>마우스로 시선, 좌클릭 사격, 우클릭을 누르고 있는 동안 조준, H 인벤토리</span><span>Esc를 누르면 마우스가 풀려요</span></div></div>`;
  container.appendChild(d);
  { const st = document.createElement('style'); st.textContent = KEY_CSS + `.kbtn{appearance:none;justify-self:center;border:1px solid #fff5;background:#0008;color:#eee;font:600 12px var(--body,system-ui);padding:5px 12px;cursor:pointer;margin-bottom:6px}.kin{background:#0d0e0cf2;border:1px solid #fff3;padding:12px;max-height:56vh;overflow:auto;text-align:left;width:min(820px,90vw);cursor:default}`; document.head.appendChild(st);
    let kp = null; const kin = d.querySelector('#keysIn'); d.querySelector('#keysOpen').addEventListener('click', e => { e.stopPropagation(); kin.hidden = !kin.hidden; if (!kp) kp = keyPanel(kin); else kp.draw(); }); kin.addEventListener('click', e => e.stopPropagation()); }
  return d;
}
