/* ============================================================
   健身达人小工具 · 云端版
   会员：用教练发的专属链接打开 → 填餐食/运动 → 看报告
   教练：打开网址 → 输口令 → 看所有人 → 写指导
   数据：Supabase（免费）
   ============================================================ */

/* ---------------- 常量 ---------------- */
const MEALS = [
  { key: 'breakfast', label: '早餐' },
  { key: 'lunch', label: '午餐' },
  { key: 'dinner', label: '晚餐' },
  { key: 'snack', label: '加餐' }
];

const WORKOUT_PRESETS = ['跑步', '快走', '力量训练', '游泳', '骑行', '跳绳', '瑜伽', '球类', '其他'];

const ACT = {
  sedentary: { label: '久坐少动', f: 1.2 },
  light: { label: '轻度活动', f: 1.375 },
  moderate: { label: '中度活动', f: 1.55 },
  active: { label: '高强度', f: 1.725 },
  veryActive: { label: '极高强度', f: 1.9 }
};
const GOALS = { lose: '减脂', gain: '增肌', keep: '保持' };

/* 内置食物库（客户端静态，不占数据库）
   unit 一律用大白话的量词（碗/个/片/块…），数字是「这么一份」的营养，不用克 */
const FOODS = [
  { id: 'f01', name: '鸡胸肉', cat: '肉蛋类', unit: '块', kcal: 200, p: 36, c: 4, f: 5 },
  { id: 'f02', name: '水煮蛋', cat: '肉蛋类', unit: '个', kcal: 78, p: 6.5, c: 0.6, f: 5.3 },
  { id: 'f03', name: '三文鱼', cat: '肉蛋类', unit: '块', kcal: 230, p: 24, c: 0, f: 15 },
  { id: 'f04', name: '瘦牛肉', cat: '肉蛋类', unit: '小盘', kcal: 130, p: 24, c: 1.4, f: 3 },
  { id: 'f05', name: '白米饭', cat: '主食', unit: '碗', kcal: 230, p: 5, c: 52, f: 0.5 },
  { id: 'f06', name: '燕麦片', cat: '主食', unit: '小碗', kcal: 150, p: 5, c: 26, f: 3 },
  { id: 'f07', name: '红薯', cat: '主食', unit: '个', kcal: 175, p: 3, c: 40, f: 0.5 },
  { id: 'f08', name: '全麦面包', cat: '主食', unit: '片', kcal: 82, p: 3, c: 14, f: 1.2 },
  { id: 'f09', name: '西兰花', cat: '蔬菜', unit: '小盘', kcal: 60, p: 4, c: 10, f: 0.5 },
  { id: 'f10', name: '牛油果', cat: '水果', unit: '个', kcal: 234, p: 2.9, c: 12, f: 21 },
  { id: 'f11', name: '香蕉', cat: '水果', unit: '根', kcal: 105, p: 1.3, c: 27, f: 0.4 },
  { id: 'f12', name: '苹果', cat: '水果', unit: '个', kcal: 95, p: 0.5, c: 25, f: 0.3 },
  { id: 'f13', name: '蓝莓', cat: '水果', unit: '小盒', kcal: 80, p: 1, c: 18, f: 0.5 },
  { id: 'f14', name: '牛奶', cat: '奶制品', unit: '盒', kcal: 155, p: 8, c: 12, f: 8 },
  { id: 'f15', name: '无糖酸奶', cat: '奶制品', unit: '杯', kcal: 90, p: 5, c: 6, f: 5 },
  { id: 'f16', name: '巴旦木', cat: '坚果', unit: '小把', kcal: 120, p: 4, c: 4, f: 10 },
  { id: 'f17', name: '拿铁咖啡', cat: '饮品', unit: '杯', kcal: 135, p: 7, c: 13, f: 6 },
  { id: 'f18', name: '乳清蛋白粉', cat: '补剂', unit: '勺', kcal: 120, p: 24, c: 3, f: 1.5 }
];
const CATS = ['全部', '主食', '肉蛋类', '蔬菜', '水果', '奶制品', '坚果', '饮品', '补剂', '我的'];

/** 按关键词 + 分类过滤食物 */
function filterFoods() {
  const q = state.foodQuery.trim();
  const cat = state.foodCat;
  return allFoods().filter((f) => {
    const okQ = !q || f.name.includes(q) || (f.cat || '').includes(q);
    let okC = true;
    if (cat === '我的') okC = state.myFoods.some((x) => x.id === f.id);
    else if (cat !== '全部') okC = f.cat === cat;
    return okQ && okC;
  });
}

/* ---------------- 工具 ---------------- */
function dstr(d) { const p = (n) => String(n).padStart(2, '0'); return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`; }
function todayStr() { return dstr(new Date()); }
function shiftDate(s, n) { const d = new Date(s + 'T00:00:00'); d.setDate(d.getDate() + n); return dstr(d); }
function fmtDate(s) { const [, m, d] = s.split('-'); return `${+m}月${+d}日`; }
function fmtShort(s) { const [, m, d] = s.split('-'); return `${+m}.${+d}`; }
function friendly(s) {
  const t = todayStr();
  if (s === t) return '今天';
  if (s === shiftDate(t, -1)) return '昨天';
  if (s === shiftDate(t, 1)) return '明天';
  return fmtDate(s);
}
function esc(v) { return String(v == null ? '' : v).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
function num(v, d) { const n = Number(v); return isFinite(n) ? n : (d || 0); }
function round1(n) { return Math.round(n * 10) / 10; }

/** 份量显示：新的量词直接拼（1.5碗），老的带数字单位（100g / 照片）仍显示成 1.5 × 100g */
function qty(amount, unit) {
  const u = String(unit == null ? '' : unit).trim();
  const a = round1(num(amount, 1));
  if (!u) return `${a} 份`;
  if (/^[\d一二三四五六七八九十]/.test(u)) return `${a} × ${esc(u)}`;
  return `${a}${esc(u)}`;
}
function qs(k) { return new URLSearchParams(location.search).get(k) || ''; }

/* ---------------- 云端调用 ---------------- */
const CFG = window.FIT_CONFIG || {};
function configured() { return !!(CFG.SUPABASE_URL && CFG.SUPABASE_ANON_KEY); }

async function rpc(fn, params) {
  if (!configured()) throw new Error('还没配置云数据库（见 config.js）');
  let res;
  try {
    res = await fetch(`${CFG.SUPABASE_URL}/rest/v1/rpc/${fn}`, {
      method: 'POST',
      headers: {
        apikey: CFG.SUPABASE_ANON_KEY,
        Authorization: 'Bearer ' + CFG.SUPABASE_ANON_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(params || {})
    });
  } catch (err) {
    console.error('[rpc] ' + fn + ' 网络异常', err);
    throw new Error('连不上服务器，请检查手机网络后重试');
  }
  if (!res.ok) {
    const t = await res.text();
    console.error('[rpc] ' + fn + ' 失败', res.status, t);
    if (res.status === 401 || res.status === 403) throw new Error('访问密钥无效，请联系教练');
    if (res.status === 404) throw new Error('接口不存在，数据库可能还没初始化');
    if (res.status === 429) throw new Error('操作太频繁，稍等几秒再试');
    if (res.status >= 500) throw new Error('云数据库暂时不可用（免费项目长期闲置会被暂停，需要教练登录 Supabase 恢复）');
    throw new Error('请求失败（' + res.status + '），请稍后重试');
  }
  const data = await res.json();
  if (data && data.ok === false) throw new Error(data.error || '操作失败');
  return data;
}

/* ---------------- 照片相关 ---------------- */
function rndStr(n) {
  const c = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let s = '';
  for (let i = 0; i < n; i++) s += c[Math.floor(Math.random() * c.length)];
  return s;
}

/** 把手机拍的几 MB 大图压到 ~100KB：省流量、省存储、AI 也够看 */
function compressImage(file, maxSide) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const objUrl = URL.createObjectURL(file);
    const done = (fn) => { URL.revokeObjectURL(objUrl); fn(); };
    img.onload = () => done(() => {
      try {
        let w = img.naturalWidth, h = img.naturalHeight;
        const scale = Math.min(1, (maxSide || 1024) / Math.max(w, h));
        w = Math.max(1, Math.round(w * scale));
        h = Math.max(1, Math.round(h * scale));
        const cv = document.createElement('canvas');
        cv.width = w; cv.height = h;
        cv.getContext('2d').drawImage(img, 0, 0, w, h);
        cv.toBlob((blob) => {
          blob ? resolve(blob) : reject(new Error('图片处理失败，换一张试试'));
        }, 'image/jpeg', 0.72);
      } catch (e) { reject(new Error('图片处理失败，换一张试试')); }
    });
    img.onerror = () => done(() => reject(new Error('这张图读不出来，换一张试试')));
    img.src = objUrl;
  });
}

async function uploadPhoto(blob) {
  const path = state.date + '/' + rndStr(14) + '.jpg';
  let res;
  try {
    res = await fetch(`${CFG.SUPABASE_URL}/storage/v1/object/meal-photos/${path}`, {
      method: 'POST',
      headers: {
        apikey: CFG.SUPABASE_ANON_KEY,
        Authorization: 'Bearer ' + CFG.SUPABASE_ANON_KEY,
        'Content-Type': 'image/jpeg',
        'x-upsert': 'true'
      },
      body: blob
    });
  } catch (e) {
    console.error('[upload] 网络异常', e);
    throw new Error('照片上传失败，请检查网络后重试');
  }
  if (!res.ok) {
    const t = await res.text();
    console.error('[upload] 失败', res.status, t);
    throw new Error('照片上传失败（' + res.status + '），请重试');
  }
  return `${CFG.SUPABASE_URL}/storage/v1/object/public/meal-photos/${path}`;
}

/** 调后端 AI 识别（真正的模型 key 藏在服务端，前端拿不到） */
async function analyzePhoto(photoUrl, meal) {
  let res;
  try {
    res = await fetch(`${CFG.SUPABASE_URL}/functions/v1/analyze-meal`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: CFG.SUPABASE_ANON_KEY,
        Authorization: 'Bearer ' + CFG.SUPABASE_ANON_KEY
      },
      body: JSON.stringify({ photo_url: photoUrl, meal })
    });
  } catch (e) {
    console.error('[ai] 网络异常', e);
    throw new Error('AI 识别连不上，请重试');
  }
  if (!res.ok) {
    const t = await res.text();
    console.error('[ai] 失败', res.status, t);
    throw new Error('AI 识别暂时不可用（' + res.status + '）');
  }
  const data = await res.json();
  if (data && data.ok === false) throw new Error(data.error || 'AI 没识别出来，换张更清楚的图试试');
  return data;
}

/** 选好图之后的完整流程：压缩 → 上传 → AI 识别 → 出结果 */
async function runPhotoFlow(file) {
  const s = state.sheet;
  if (!s || s.type !== 'photo') return;
  const meal = s.meal;
  const base = { type: 'photo', meal };
  try {
    state.sheet = Object.assign({}, base, { phase: 'busy', msg: '正在上传照片…' });
    render();
    const blob = await compressImage(file, 1024);
    const photoUrl = await uploadPhoto(blob);

    state.sheet = Object.assign({}, base, { phase: 'busy', msg: 'AI 正在识别…', photoUrl });
    render();

    let ai = null;
    try {
      ai = await analyzePhoto(photoUrl, meal);
    } catch (e) {
      console.warn('[photo] AI 不可用，转手动填热量', e);
      state.sheet = Object.assign({}, base, { phase: 'done', photoUrl, ai: null });
      render();
      toast('AI 暂时不可用，可以自己填个大概热量');
      return;
    }

    state.sheet = Object.assign({}, base, { phase: 'done', photoUrl, ai });
    render();
  } catch (err) {
    console.error('[photo] 流程失败', err);
    state.sheet = Object.assign({}, base, { phase: 'pick' });
    render();
    toast(err.message || '失败了，重试一下');
  }
}

/* ---------------- 状态 ---------------- */
const MY_FOODS_KEY = 'fit_my_foods';

function loadMyFoods() {
  try {
    const v = JSON.parse(localStorage.getItem(MY_FOODS_KEY) || '[]');
    return Array.isArray(v) ? v : [];
  } catch (e) { console.warn('[myFoods] 读取失败', e); return []; }
}

const state = {
  mode: '',            // member / coach
  token: '',           // 会员凭证
  date: todayStr(),
  mtab: 'today',
  home: null,          // member_home 返回
  loading: false,
  busy: false,         // 防重复提交
  sheet: null,
  foodQuery: '', foodCat: '全部',
  myFoods: loadMyFoods(),
  coachPass: localStorage.getItem('fit_coach_pass') || '',
  coachDate: todayStr(),
  coachList: null,
  coachMemberId: '',
  coachDetail: null,
  coachFilter: 'all',
  coachBusy: false,
  zoom: '',           // 放大看照片
  aiDraft: null,      // AI 起草的建议草稿
  aiBusy: false,
  /* 教练 ↔ 会员 对话 */
  chatOpen: false,    // 会员端是否打开对话页
  msgs: [],           // 会员端对话
  msgUnread: 0,       // 教练发来的未读数
  msgBusy: false,
  lastMsg: null,      // 最新一条（用于今日页卡片）
  coachMsgs: [],      // 教练端当前会员的对话
  coachMsgBusy: false
};
let temp = {};

/** 内置食物库 + 会员自己加过的 */
function allFoods() { return FOODS.concat(state.myFoods); }
function saveMyFood(food) {
  state.myFoods = state.myFoods.filter((x) => x.name !== food.name).concat([food]).slice(-50);
  try { localStorage.setItem(MY_FOODS_KEY, JSON.stringify(state.myFoods)); }
  catch (e) { console.warn('[myFoods] 保存失败', e); }
}

const app = document.getElementById('app');

/* ---------------- 入口路由 ---------------- */
async function boot() {
  if (!configured()) { state.mode = 'landing'; render(); return; }
  const t = qs('token');
  if (t) {
    state.mode = 'member';
    state.token = t;
    await loadMember();
    await refreshMsgPeek();
    render();
    return;
  }
  if (qs('coach') || state.coachPass) {
    state.mode = 'coach';
    if (state.coachPass) {
      try {
        await loadCoachList();
      } catch (e) {
        // 口令失效（比如在数据库里改过）→ 清掉本地记录，回到登录页
        console.warn('[boot] 口令失效，回到登录页', e);
        state.coachPass = '';
        state.coachList = null;
        try { localStorage.removeItem('fit_coach_pass'); } catch (_) { /* ignore */ }
        render();
        toast('口令已失效，请重新输入');
        return;
      }
    }
    render();
    return;
  }
  state.mode = 'landing';
  render();
}

/* ---------------- 渲染 ---------------- */
function render() {
  if (!configured()) { app.innerHTML = renderSetupHint(); return; }
  if (state.mode === 'landing') { app.innerHTML = renderLanding(); return; }
  if (state.mode === 'member') {
    if (state.chatOpen) {
      app.innerHTML = renderMemberChat() + renderToast();
      scrollChat('chatList');
      return;
    }
    app.innerHTML = renderMemberTop() + renderMemberBody() + renderSheet() + renderToast() + renderTabbar();
    const inp = document.getElementById('foodSearch');
    if (inp && state.foodQuery) { /* 保持值即可 */ }
    return;
  }
  app.innerHTML = renderCoach();
}
function renderToast() { return '<div class="toast" id="toast"></div>'; }

function renderSetupHint() {
  return `<div class="wrap" style="padding-top:60px">
    <div class="card">
      <h1 style="margin:0 0 8px;font-size:20px">还差一步</h1>
      <div class="muted" style="line-height:1.9">
        这个页面还没连上云数据库。<br>
        打开 <b>web/config.js</b>，把 <b>SUPABASE_URL</b> 和 <b>SUPABASE_ANON_KEY</b> 填进去再上传即可。
      </div>
    </div>
  </div>`;
}

function renderLanding() {
  return `<div class="wrap" style="padding-top:56px">
    <div class="phead" style="text-align:center">
      <h1 style="font-size:26px">健身达人小工具</h1>
      <p>会员记录饮食运动 · 教练实时查看并指导</p>
    </div>
    <div class="card">
      <b style="font-size:15px">我是会员</b>
      <div class="muted" style="margin:8px 0 0;line-height:1.8">
        请用教练发给你的<b>专属链接</b>打开，不用注册、不用登录，点开就能记录。
      </div>
    </div>
    <div class="card">
      <b style="font-size:15px">我是教练</b>
      <div class="muted" style="margin:8px 0 14px;line-height:1.8">
        进入后台看所有会员的今日餐食、运动与打卡，并下发指导。
      </div>
      <button class="btn primary" data-act="toCoach">进入教练后台</button>
    </div>
  </div>`;
}

/* ---------------- 会员端 ---------------- */
function renderMemberTop() {
  const m = state.home && state.home.member;
  return `<div class="topbar"><div class="row">
      <div>
        <div class="brand">健身<em>达人</em></div>
        <div class="who">${m ? esc(m.name) + ' · ' + GOALS[m.goal] : '加载中'}</div>
      </div>
      <div class="dateswitch">
        <button data-act="mPrev">‹</button>
        <span>${friendly(state.date)}</span>
        <button data-act="mNext">›</button>
      </div>
    </div></div>`;
}

function renderMemberBody() {
  if (state.loading || !state.home) {
    return '<div class="wrap"><div class="card"><div class="empty">加载中…</div></div></div>';
  }
  if (state.mtab === 'today') return renderToday();
  if (state.mtab === 'add') return renderAdd();
  if (state.mtab === 'workout') return renderWorkout();
  return renderMe();
}

function renderTabbar() {
  const tabs = [
    { k: 'today', t: '今日', d: 'M3.5 9.6 12 3l8.5 6.6V20a1.5 1.5 0 0 1-1.5 1.5H5A1.5 1.5 0 0 1 3.5 20z M9.5 21.5v-7h5v7' },
    { k: 'add', t: '加餐食', d: 'M9 3.5h6a1 1 0 0 1 1 1V6H8V4.5a1 1 0 0 1 1-1z M16 4.5h2A1.5 1.5 0 0 1 19.5 6v14a1.5 1.5 0 0 1-1.5 1.5H6A1.5 1.5 0 0 1 4.5 20V6A1.5 1.5 0 0 1 6 4.5h2 M8 11h8 M8 15.5h5' },
    { k: 'workout', t: '运动', d: 'M6.5 8.5v7 M17.5 8.5v7 M4 10.5v3 M20 10.5v3 M6.5 12h11' },
    { k: 'me', t: '我的', d: 'M12 4.2a3.8 3.8 0 1 0 0 7.6 3.8 3.8 0 0 0 0-7.6z M4.6 20.5a7.4 7.4 0 0 1 14.8 0' }
  ];
  return `<div class="tabbar">${tabs.map((x) => `
    <button data-act="mtab" data-v="${x.k}" class="${state.mtab === x.k ? 'on' : ''}">
      <svg viewBox="0 0 24 24" stroke-linecap="round" stroke-linejoin="round"><path d="${x.d}"></path></svg>
      <span>${x.t}</span>
    </button>`).join('')}</div>`;
}

function tot(list) {
  return list.reduce((a, x) => ({ kcal: a.kcal + (+x.kcal || 0), p: a.p + (+x.p || 0), c: a.c + (+x.c || 0), f: a.f + (+x.f || 0) }),
    { kcal: 0, p: 0, c: 0, f: 0 });
}

function renderToday() {
  const h = state.home;
  const m = h.member, plan = h.plan;
  const intake = tot(h.meals);
  const workoutMin = h.workouts.reduce((a, w) => a + (+w.minutes || 0), 0);
  const CIRC = 402;
  const ratio = Math.min(intake.kcal / (plan.kcal || 1), 1);
  const over = intake.kcal > plan.kcal;

  const macro = (label, now, targetV, color) => `<div>
      <div class="m-top"><span>${label}</span><em>${Math.round(now)} / ${targetV} g</em></div>
      <div class="bar-track"><i style="width:${Math.min((now / (targetV || 1)) * 100, 100)}%;background:${color}"></i></div>
    </div>`;

  const groups = MEALS.map((meal) => {
    const items = h.meals.filter((x) => x.meal === meal.key);
    const total = Math.round(tot(items).kcal);
    return `<div class="card">
      <div class="row" style="margin-bottom:6px">
        <b style="font-size:14.5px">${meal.label}</b><span class="muted">${total} kcal</span>
      </div>
      ${items.length ? items.map((x) => {
        const isPhoto = x.source === 'photo';
        return `<div class="frow">
          ${isPhoto && x.photo_url ? `<img class="thumb" src="${esc(x.photo_url)}" alt="" data-act="zoom" data-src="${esc(x.photo_url)}">` : ''}
          <div class="fmeta">
            <div class="n">${esc(x.name)}${isPhoto ? '<span class="tagai">AI 估</span>' : ''}</div>
            <div class="s">${isPhoto ? (x.ai_note ? esc(x.ai_note) : '照片识别') : `${qty(x.amount, x.unit)}`}</div>
          </div>
          <div class="fkcal">${Math.round(x.kcal)}<em>kcal</em></div>
          <button class="del" data-act="delMeal" data-id="${x.id}">删</button>
        </div>`;
      }).join('') : '<div class="empty" style="padding:14px 0">还没记录</div>'}
      <button class="btn ghost" style="margin-top:10px;padding:10px" data-act="openAdd" data-meal="${meal.key}">+ 添加${meal.label}</button>
    </div>`;
  }).join('');

  return `<div class="wrap">
    <div class="card" style="padding-top:18px">
      <div class="ringwrap">
        <div class="ring">
          <svg width="148" height="148">
            <circle cx="74" cy="74" r="64" fill="none" stroke="#eef1f6" stroke-width="13"></circle>
            <circle cx="74" cy="74" r="64" fill="none" stroke="${over ? '#f53f3f' : '#00b96b'}"
              stroke-width="13" stroke-linecap="round" stroke-dasharray="${CIRC}" stroke-dashoffset="${CIRC - CIRC * ratio}"></circle>
          </svg>
          <div class="center">
            <div class="big">${Math.round(intake.kcal)}</div>
            <div class="lbl">${over ? '已超 ' + Math.round(intake.kcal - plan.kcal) : '还可摄入 ' + Math.round(plan.kcal - intake.kcal)}</div>
          </div>
        </div>
        <div class="macro">
          ${macro('蛋白质', intake.p, plan.target.p, '#3d7eff')}
          ${macro('碳水', intake.c, plan.target.c, '#ff9f43')}
          ${macro('脂肪', intake.f, plan.target.f, '#9b6bff')}
        </div>
      </div>
    </div>

    ${renderReportCard(intake, workoutMin)}

    <button class="btn photo" data-act="openPhoto" data-meal="${suggestMeal()}">
      <span class="cam">📷</span>
      <span class="ptxt"><b>拍照记录这一餐</b><em>拍一张就行，不用称克数</em></span>
    </button>

    <div class="card tight chatentry" data-act="openChat">
      <div class="row"><b style="font-size:13.5px">教练消息</b>
        <span class="muted">${state.msgUnread ? `<i class="dotred">${state.msgUnread}</i> 条新消息` : '点开和教练聊'}</span></div>
      <div class="lastmsg">${state.lastMsg ? `<span class="who2">${state.lastMsg.sender === 'coach' ? '教练' : '我'}：</span>${esc(state.lastMsg.body)}` : '还没有消息，可以在这里给教练留言'}</div>
    </div>

    <div class="sec"><div class="l"><div class="bar"></div><b>${friendly(state.date)}的餐食</b></div>
      <span class="muted">${h.meals.length} 项</span></div>
    ${groups}

    <div class="sec"><div class="l"><div class="bar"></div><b>运动</b></div><span class="muted">${workoutMin} 分钟</span></div>
    <div class="card">
      ${h.workouts.length ? h.workouts.map((w) => `<div class="frow">
          <div class="fmeta"><div class="n">${esc(w.name)}</div><div class="s">${w.note ? esc(w.note) : '—'}</div></div>
          <div class="fkcal">${w.minutes}<em>分钟</em></div>
          <button class="del" data-act="delWorkout" data-id="${w.id}">删</button>
        </div>`).join('') : '<div class="empty">今天还没有运动记录</div>'}
      <button class="btn ghost" style="margin-top:10px;padding:10px" data-act="mtab" data-v="workout">+ 记一次运动</button>
    </div>
  </div>`;
}

function renderReportCard(intake, workoutMin) {
  const plan = state.home.plan;
  const rows = [];
  const kcalR = plan.kcal ? intake.kcal / plan.kcal : 0;
  rows.push(kcalR > 1.1 ? ['bad', `热量超了 ${Math.round(intake.kcal - plan.kcal)} kcal`]
    : kcalR >= 0.9 ? ['ok', '热量达标']
    : ['warn', `热量还差 ${Math.round(plan.kcal - intake.kcal)} kcal`]);
  const pR = plan.target.p ? intake.p / plan.target.p : 0;
  rows.push(pR >= 0.9 ? ['ok', '蛋白质达标'] : ['warn', `蛋白质还差 ${Math.round(plan.target.p - intake.p)} g`]);
  rows.push(workoutMin >= 30 ? ['ok', `运动 ${workoutMin} 分钟，很好`] : ['warn', workoutMin > 0 ? `运动 ${workoutMin} 分钟，再加一点` : '今天还没有运动']);
  const ck = state.home.checkins.find((x) => x.date === state.date);
  rows.push(ck ? ['ok', '体重已打卡'] : ['warn', '今天还没称体重']);

  return `<div class="card">
    <div class="row" style="margin-bottom:10px">
      <b style="font-size:14.5px">${friendly(state.date)}的报告</b>
      <span class="pill ${rows.some((r) => r[0] === 'bad') ? 'bad' : rows.some((r) => r[0] === 'warn') ? 'warn' : 'ok'}">
        ${rows.filter((r) => r[0] === 'ok').length}/${rows.length} 项达标</span>
    </div>
    ${rows.map((r) => `<div class="reprow"><span class="dot ${r[0]}"></span><span>${r[1]}</span></div>`).join('')}
  </div>`;
}

function renderAdd() {
  const list = filterFoods();
  return `<div class="wrap">
    <div class="phead"><h1>加餐食</h1><p>拍照最省事，选食物最精确</p></div>
    <button class="btn photo" data-act="openPhoto">
      <span class="cam">📷</span>
      <span class="ptxt"><b>拍照记录</b><em>拍一张，AI 估个大概，教练复核</em></span>
    </button>
    <div class="search">
      <span>🔍</span>
      <input id="foodSearch" placeholder="或搜索食物，如：鸡胸肉" value="${esc(state.foodQuery)}">
    </div>
    <div class="cats">${CATS.map((c) => `<button data-act="cat" data-v="${c}" class="${state.foodCat === c ? 'on' : ''}">${c}</button>`).join('')}</div>
    <div class="card" id="foodList">${foodRows(list)}</div>
    <button class="btn ghost" style="margin-top:4px" data-act="openCustomFood">菜单里没有？手动填一个</button>
    <div class="hint">手动填过的食物会记住，下次在「我的」分类里直接选</div>
  </div>`;
}
function foodRows(list) {
  if (!list.length) return '<div class="empty">没找到，换个词试试<br>也可以点下面「手动填一个」</div>';
  return list.map((f) => `<div class="frow">
    <div class="fmeta"><div class="n">${esc(f.name)}</div>
      <div class="s">${qty(1, f.unit)} · 蛋${Math.round(f.p)} 碳${Math.round(f.c)} 脂${Math.round(f.f)}${f.cat === '我的' ? ' · 我加的' : ''}</div></div>
    <div class="fkcal" style="margin-right:8px">${f.kcal}<em>kcal</em></div>
    <button class="addbtn" data-act="pickFood" data-id="${f.id}">+</button>
  </div>`).join('');
}

function renderWorkout() {
  const h = state.home;
  const min = h.workouts.reduce((a, w) => a + (+w.minutes || 0), 0);
  return `<div class="wrap">
    <div class="phead"><h1>运动</h1><p>今天练了什么？记一笔</p></div>
    <div class="card">
      <b style="font-size:14.5px">选一个</b>
      <div class="chips">${WORKOUT_PRESETS.map((w) => `<button data-act="pickWorkout" data-v="${w}" class="${temp.workout === w ? 'on' : ''}">${w}</button>`).join('')}</div>
      <div class="field" style="margin-top:14px"><label>时长（分钟）</label>
        <input id="wkMinutes" type="number" value="${temp.workoutMin || 30}"></div>
      <div class="field"><label>备注（选填）</label><input id="wkNote" placeholder="例如：练腿，教练带练"></div>
      <button class="btn primary" data-act="saveWorkout">加入今日运动</button>
    </div>
    <div class="sec"><div class="l"><div class="bar"></div><b>${friendly(state.date)}的运动</b></div><span class="muted">${min} 分钟</span></div>
    <div class="card">
      ${h.workouts.length ? h.workouts.map((w) => `<div class="frow">
          <div class="fmeta"><div class="n">${esc(w.name)}</div><div class="s">${w.note ? esc(w.note) : '—'}</div></div>
          <div class="fkcal">${w.minutes}<em>分钟</em></div>
          <button class="del" data-act="delWorkout" data-id="${w.id}">删</button>
        </div>`).join('') : '<div class="empty">还没有运动记录</div>'}
    </div>
  </div>`;
}

function renderMe() {
  const h = state.home;
  const m = h.member;
  const cks = h.checkins || [];
  const trend = cks.length > 1 ? round1(cks[cks.length - 1].weight - cks[0].weight) : 0;
  return `<div class="wrap">
    <div class="phead"><h1>我的</h1><p>身体数据与进度</p></div>
    <div class="card">
      <div class="row"><b style="font-size:14.5px">体重趋势</b>
        <span class="pill ${trend <= 0 ? 'ok' : 'warn'}">近${cks.length}次 ${trend > 0 ? '+' : ''}${trend}kg</span></div>
      ${renderSpark(cks)}
      <div class="muted" style="display:flex;justify-content:space-between;margin-top:4px">
        <span>${cks.length ? fmtShort(cks[0].date) : ''}</span><span>${cks.length ? fmtShort(cks[cks.length - 1].date) : ''}</span>
      </div>
      <button class="btn primary" style="margin-top:14px" data-act="openCheckin">记录今天的体重</button>
    </div>
    <div class="card">
      <b style="font-size:14.5px">我的档案</b>
      <div class="muted" style="margin:6px 0 4px">档案由教练维护，需要修改请找教练</div>
      <div class="kv"><span>身高 / 体重</span><b>${m.height}cm / ${m.weight}kg</b></div>
      <div class="kv"><span>体脂率</span><b>${m.body_fat}%</b></div>
      <div class="kv"><span>性别 / 年龄</span><b>${m.gender === 'male' ? '男' : '女'} · ${m.age}岁</b></div>
      <div class="kv"><span>活动量</span><b>${(ACT[m.activity] || ACT.sedentary).label}</b></div>
      <div class="kv"><span>目标</span><b>${GOALS[m.goal]}</b></div>
    </div>
  </div>`;
}

function renderSpark(list) {
  if (!list || list.length < 2) return '<div class="empty" style="padding:18px 0">记录两次以上就能看到趋势</div>';
  const ws = list.map((x) => +x.weight);
  const max = Math.max(...ws), min = Math.min(...ws);
  const span = Math.max(max - min, 0.6);
  const pts = list.map((x, i) => {
    const px = 6 + (i / (list.length - 1)) * 288;
    const py = 62 - ((x.weight - min) / span) * 52;
    return `${px.toFixed(1)},${py.toFixed(1)}`;
  }).join(' ');
  return `<svg class="spark" viewBox="0 0 300 74" preserveAspectRatio="none">
    <polyline fill="none" stroke="#00b96b" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" points="${pts}"></polyline>
  </svg>`;
}

/* ---------------- 教练 ↔ 会员 对话 ---------------- */
function hhmm(sec) {
  const d = new Date((+sec || 0) * 1000);
  if (isNaN(d.getTime())) return '';
  const p = (n) => String(n).padStart(2, '0');
  const t = `${p(d.getHours())}:${p(d.getMinutes())}`;
  return dstr(d) === todayStr() ? t : `${d.getMonth() + 1}/${d.getDate()} ${t}`;
}

/** 谁在右边：me = 当前这个人自己发的 */
function msgRows(list, meIs) {
  if (!list.length) {
    return '<div class="empty" style="padding:30px 0">还没有消息<br>直接在下边说一句就行</div>';
  }
  return list.map((x) => {
    const me = x.sender === meIs;
    return `<div class="msgrow${me ? ' me' : ''}">
      <div class="bubble">${esc(x.body)}</div>
      <div class="mtime">${hhmm(x.at)}</div>
    </div>`;
  }).join('');
}

/** 打开对话页后滚到底部（新消息在下面） */
function scrollChat(id) {
  const el = document.getElementById(id);
  if (el) el.scrollTop = el.scrollHeight;
}

function renderMemberChat() {
  return `<div class="chatpage">
    <div class="topbar"><div class="row">
      <button class="del" data-act="closeChat">← 返回</button>
      <div class="brand" style="font-size:15px">和教练的对话</div>
      <button class="del" data-act="reloadChat">刷新</button>
    </div></div>
    <div class="chatlist" id="chatList">${msgRows(state.msgs, 'member')}</div>
    <div class="chatbar">
      <input id="chatInput" placeholder="给教练留言…" maxlength="500" autocomplete="off">
      <button class="btn primary" data-act="sendMsg"${state.msgBusy ? ' disabled' : ''}>${state.msgBusy ? '发送中…' : '发送'}</button>
    </div>
  </div>`;
}

/* ---------------- 教练端 ---------------- */
function renderCoach() {
  if (!state.coachPass) return renderCoachLogin();
  if (state.coachMemberId) return renderCoachDetail();
  return renderCoachList();
}

function renderCoachLogin() {
  return `<div class="topbar"><div class="brand">健身<em>达人</em> · 教练后台</div></div>
  <div class="wrap">
    <div class="card">
      <b style="font-size:15px">输入教练口令</b>
      <div class="muted" style="margin:8px 0 12px">口令存在数据库里，忘了可以重置（见交付说明）</div>
      <div class="field"><input id="coachPass" type="password" placeholder="教练口令"></div>
      <button class="btn primary" data-act="coachLogin">进入</button>
      <button class="btn ghost" style="margin-top:8px" data-act="toLanding">返回</button>
    </div>
  </div>`;
}

function renderCoachList() {
  const list = state.coachList || [];
  const withAlert = (x) => alertOf(x);
  const done = list.filter((x) => x.meal_count >= 3).length;
  const bad = list.filter((x) => !!withAlert(x)).length;
  const filtered = list.filter((x) => {
    if (state.coachFilter === 'bad') return !!withAlert(x);
    if (state.coachFilter === 'done') return x.meal_count >= 3;
    if (state.coachFilter === 'none') return !x.meal_count;
    return true;
  });

  const cards = filtered.map((x) => `<div class="mcard" data-act="openMember" data-id="${x.id}">
      <div class="top">
        <div class="avatar" style="background:linear-gradient(135deg,#00b96b,#009a58)">${esc(x.name.slice(0, 1))}</div>
        <div class="info">
          <div class="n">${esc(x.name)} <span class="muted" style="font-weight:500">${GOALS[x.goal]}</span>${x.unread ? `<i class="dotred">${x.unread}</i>` : ''}</div>
          <div class="s">今日 ${Math.round(x.intake)} / ${x.plan.kcal} kcal · 运动 ${Math.round(x.workout_minutes)} 分钟 · ${x.checked_in ? '已打卡' : '未打卡'}${x.unread ? ' · 有新消息' : ''}</div>
        </div>
        <span class="pill ${withAlert(x) ? 'bad' : x.meal_count >= 3 ? 'ok' : x.meal_count ? 'warn' : 'idle'}">
          ${withAlert(x) ? '待跟进' : x.meal_count >= 3 ? '正常' : x.meal_count ? '进行中' : '未记录'}</span>
      </div>
      ${withAlert(x) ? `<div class="alert">${esc(withAlert(x))}</div>` : ''}
    </div>`).join('');

  return `<div class="topbar">
    <div class="row">
      <div><div class="brand">教练后台</div><div class="who">${list.length} 位会员 · 点会员看详情</div></div>
      <div class="dateswitch">
        <button data-act="cPrev">‹</button>
        <span>${friendly(state.coachDate)}</span>
        <button data-act="cNext">›</button>
      </div>
    </div>
    <div class="row" style="margin-top:8px">
      <button class="del" data-act="coachExport">导出备份</button>
      <button class="del" data-act="coachExit">退出</button>
    </div>
  </div>
  <div class="wrap">
    <div class="dash">
      <h2>${friendly(state.coachDate)}的会员看板</h2>
      <div class="sub">摄入 / 运动 / 打卡，异常自动标红</div>
      <div class="stats">
        <div class="stat"><b>${list.length}</b><span>在带会员</span></div>
        <div class="stat"><b>${done}</b><span>记满三餐</span></div>
        <div class="stat bad"><b>${bad}</b><span>需关注</span></div>
      </div>
    </div>
    <div class="filters">
      ${[['all', '全部'], ['bad', '待跟进'], ['done', '记满三餐'], ['none', '未记录']].map(([k, t]) =>
        `<button data-act="cFilter" data-v="${k}" class="${state.coachFilter === k ? 'on' : ''}">${t}</button>`).join('')}
    </div>
    <div class="sec"><div class="l"><div class="bar"></div><b>会员列表</b></div>
      <button class="del" data-act="openAddMember">+ 加会员</button></div>
    ${cards || '<div class="card"><div class="empty">还没有会员，点右上角「+ 加会员」</div></div>'}
  </div>`;
}

function alertOf(x) {
  const kcal = x.plan.kcal || 0;
  if (!x.meal_count) return '这一天还没有记录饮食';
  if (kcal && x.intake < kcal * 0.6) return `只吃了 ${Math.round(x.intake)} kcal，明显偏低（目标 ${kcal}）`;
  if (kcal && x.intake > kcal * 1.15) return `已超目标 ${Math.round(x.intake - kcal)} kcal`;
  if (x.weight_delta <= -0.8) return `最近掉秤 ${Math.abs(x.weight_delta)}kg，偏快，注意别掉肌肉`;
  if (!x.checked_in) return '这一天还没称体重';
  return '';
}

function renderCoachDetail() {
  const d = state.coachDetail;
  if (!d) return '<div class="wrap"><div class="card"><div class="empty">加载中…</div></div></div>';
  const m = d.member, plan = d.plan;
  const link = `${location.origin}${location.pathname}?token=${d.token}`;
  const workoutMin = d.workouts.reduce((a, w) => a + (+w.minutes || 0), 0);

  return `<div class="topbar"><div class="row">
      <button class="del" data-act="coachBack">← 返回</button>
      <div class="brand" style="font-size:15px">${esc(m.name)}</div>
      <span class="pill idle">${GOALS[m.goal]}</span>
    </div></div>
  <div class="wrap">
    <div class="card">
      <div class="kv"><span>身高 / 体重</span><b>${m.height}cm / ${m.weight}kg</b></div>
      <div class="kv"><span>体脂率 / 年龄</span><b>${m.body_fat}% · ${m.age}岁</b></div>
      <div class="kv"><span>活动量</span><b>${(ACT[m.activity] || ACT.sedentary).label}</b></div>
    </div>

    <div class="card">
      <b style="font-size:14.5px">系统测算</b>
      <div class="calcbox">
        BMR（基础代谢）：<code>${plan.bmr} kcal</code><br>
        TDEE（每日消耗）：<code>${plan.tdee} kcal</code><br>
        建议热量：<code>${plan.autoKcal} kcal</code>${plan.isCustom ? `　教练已调为 <code>${plan.kcal} kcal</code>` : ''}<br>
        配比 · 蛋白 ${Math.round(plan.ratio.p * 100)}% / 碳水 ${Math.round(plan.ratio.c * 100)}% / 脂肪 ${Math.round(plan.ratio.f * 100)}%
      </div>
    </div>

    <div class="card">
      <div class="row" style="margin-bottom:10px"><b style="font-size:14.5px">和会员的对话</b>
        <span class="muted">${state.coachMsgs.length ? state.coachMsgs.length + ' 条' : '还没聊过'}</span></div>
      <div class="chatlist inline" id="coachChatList">${msgRows(state.coachMsgs, 'coach')}</div>
      <button class="btn ai" style="margin-top:12px" data-act="aiDraft" data-id="${m.id}">
        <span class="cam">🤖</span>
        <span class="ptxt"><b>${state.aiBusy ? 'AI 正在起草…' : '让 AI 先起草一段建议'}</b><em>结合今天的照片和记录生成，你改完再发</em></span>
      </button>
      <div class="chatbar">
        <input id="coachChatInput" placeholder="回一句…（回车发送）" maxlength="500" value="${esc(state.aiDraft || '')}" autocomplete="off">
        <button class="btn primary" data-act="sendCoachMsg"${state.coachMsgBusy ? ' disabled' : ''}>${state.coachMsgBusy ? '发送中…' : '发送'}</button>
      </div>
      <div class="field" style="margin-top:12px"><label>每日目标热量（建议 ${plan.autoKcal}）</label>
        <div class="krow"><input id="dKcal" type="number" step="50" value="${plan.kcal}">
          <button class="btn ghost" data-act="saveKcal" data-id="${m.id}">保存目标</button></div></div>
    </div>

    <div class="card">
      <div class="row" style="margin-bottom:8px"><b style="font-size:14.5px">会员专属链接</b>
        <button class="del" data-act="copyLink" data-v="${esc(link)}">复制</button></div>
      <div class="linkbox">${esc(link)}</div>
      <div class="muted" style="margin-top:8px;line-height:1.7">把这个链接发给该会员，他点开就能记录，不用注册。</div>
    </div>

    <div class="sec"><div class="l"><div class="bar"></div><b>${friendly(state.coachDate)}的餐食</b></div><span class="muted">${Math.round(tot(d.meals).kcal)} kcal</span></div>
    <div class="card">
      ${d.meals.length ? MEALS.map((meal) => {
        const items = d.meals.filter((x) => x.meal === meal.key);
        if (!items.length) return '';
        return `<div class="row" style="margin:6px 0 2px"><b style="font-size:13px">${meal.label}</b>
          <span class="muted">${Math.round(tot(items).kcal)} kcal</span></div>` +
          items.map((x) => {
            const isPhoto = x.source === 'photo';
            return `<div class="frow">
              ${isPhoto && x.photo_url ? `<img class="thumb" src="${esc(x.photo_url)}" alt="" data-act="zoom" data-src="${esc(x.photo_url)}">` : ''}
              <div class="fmeta"><div class="n">${esc(x.name)}${isPhoto ? '<span class="tagai">AI 估</span>' : ''}</div>
                <div class="s">${isPhoto ? (x.ai_note ? esc(x.ai_note) : '照片识别') : `${qty(x.amount, x.unit)}`}</div></div>
              <div class="fkcal">${Math.round(x.kcal)}<em>kcal</em></div></div>`;
          }).join('');
      }).join('') : '<div class="empty">今天还没有记录</div>'}
    </div>

    <div class="sec"><div class="l"><div class="bar"></div><b>${friendly(state.coachDate)}的运动</b></div><span class="muted">${workoutMin} 分钟</span></div>
    <div class="card">
      ${d.workouts.length ? d.workouts.map((w) => `<div class="frow">
          <div class="fmeta"><div class="n">${esc(w.name)}</div><div class="s">${w.note ? esc(w.note) : '—'}</div></div>
          <div class="fkcal">${w.minutes}<em>分钟</em></div></div>`).join('')
        : '<div class="empty">今天还没有运动</div>'}
    </div>

    <div class="sec"><div class="l"><div class="bar"></div><b>体重打卡</b></div></div>
    <div class="card">
      ${d.checkins.length ? d.checkins.map((c) => `<div class="kv"><span>${fmtDate(c.date)}</span>
        <b>${c.weight} kg${c.body_fat ? ' · 体脂 ' + c.body_fat + '%' : ''}</b></div>`).join('')
        : '<div class="empty">还没有打卡</div>'}
    </div>

    <div class="card">
      <b style="font-size:14px">停用该会员</b>
      <div class="muted" style="margin:6px 0 12px;line-height:1.7">
        停用后他的专属链接会失效，历史数据保留。用来清理不再跟的会员或测试账号。
      </div>
      <button class="btn ghost" data-act="coachSetActive" data-id="${m.id}">停用这个会员</button>
    </div>
  </div>`;
}

/* ---------------- 弹层 ---------------- */
function renderSheet() {
  if (state.zoom) {
    return `<div class="lightbox" data-act="closeZoom">
      <img src="${esc(state.zoom)}" alt="">
      <div class="lbtip">点任意处关闭</div>
    </div>`;
  }
  const s = state.sheet;
  if (!s) return '';
  if (s.type === 'pickFood') {
    const f = allFoods().find((x) => x.id === s.foodId);
    if (!f) return '';
    const kcal = Math.round(f.kcal * s.amount);
    return `<div class="mask" data-act="closeSheet"><div class="sheet">
      <h3>${esc(f.name)}</h3>
      <div class="sub">${qty(1, f.unit)} 约 ${f.kcal} kcal</div>
      <div class="stepper">
        <button data-act="amt" data-v="-0.5">−</button><div class="v">${qty(s.amount, f.unit)}</div>
        <button data-act="amt" data-v="0.5">+</button>
      </div>
      <div class="muted" style="text-align:center;margin-bottom:14px">
        合计 <b style="color:var(--green-d);font-size:16px">${kcal}</b> kcal ·
        蛋 ${round1(f.p * s.amount)} 碳 ${round1(f.c * s.amount)} 脂 ${round1(f.f * s.amount)}</div>
      <div class="field"><label>记到哪一餐</label>
        <div class="seg">${MEALS.map((x) => `<button data-act="sheetMeal" data-v="${x.key}" class="${s.meal === x.key ? 'on' : ''}">${x.label}</button>`).join('')}</div></div>
      <button class="btn primary" data-act="confirmFood">加入${(MEALS.find((x) => x.key === s.meal) || MEALS[0]).label}</button>
      <button class="btn ghost" style="margin-top:8px" data-act="closeSheet">取消</button>
    </div></div>`;
  }
  if (s.type === 'customFood') {
    return `<div class="mask" data-act="closeSheet"><div class="sheet">
      <h3>手动填一个食物</h3>
      <div class="sub">按「你吃的那一份」填就行，不用称克数</div>
      <div style="height:14px"></div>
      <div class="field"><label>食物名称</label><input id="cfName" placeholder="例如：楼下那家牛肉面"></div>
      <div class="grid2">
        <div class="field"><label>怎么算一份</label><input id="cfUnit" placeholder="如：碗 / 盘 / 个"></div>
        <div class="field"><label>一份的热量 kcal</label><input id="cfKcal" type="number" placeholder="如 650"></div>
      </div>
      <div class="grid2">
        <div class="field"><label>蛋白质 g</label><input id="cfP" type="number" placeholder="选填"></div>
        <div class="field"><label>碳水 g</label><input id="cfC" type="number" placeholder="选填"></div>
      </div>
      <div class="grid2">
        <div class="field"><label>脂肪 g</label><input id="cfF" type="number" placeholder="选填"></div>
        <div class="field"><label>吃了几份</label><input id="cfAmount" type="number" step="0.5" value="1"></div>
      </div>
      <div class="field"><label>记到哪一餐</label>
        <div class="seg">${MEALS.map((x) => `<button data-act="sheetMeal" data-v="${x.key}" class="${s.meal === x.key ? 'on' : ''}">${x.label}</button>`).join('')}</div></div>
      <button class="btn primary" data-act="confirmCustomFood">加入${(MEALS.find((x) => x.key === s.meal) || MEALS[0]).label}</button>
      <button class="btn ghost" style="margin-top:8px" data-act="closeSheet">取消</button>
    </div></div>`;
  }
  if (s.type === 'photo') {
    const mealBtns = `<div class="seg">${MEALS.map((x) => `<button data-act="photoMeal" data-v="${x.key}" class="${s.meal === x.key ? 'on' : ''}">${x.label}</button>`).join('')}</div>`;
    const mealLabel = (MEALS.find((x) => x.key === s.meal) || MEALS[0]).label;

    if (s.phase === 'pick') {
      return `<div class="mask" data-act="closeSheet"><div class="sheet">
        <h3>拍照记录</h3>
        <div class="sub">拍一张这餐的照片，AI 帮你估个大概</div>
        <div style="height:16px"></div>
        <div class="field"><label>这是哪一餐</label>${mealBtns}</div>
        <label class="photopick">
          <span class="cam">📷</span>
          <b>点这里拍照 / 从相册选</b>
          <em>拍你自己要吃的那一份就行</em>
          <input id="photoFile" type="file" accept="image/*" capture="environment">
        </label>
        <div class="hint">看不准份量的话，AI 会问你一句，点一下就行。</div>
        <button class="btn ghost" style="margin-top:14px" data-act="closeSheet">取消</button>
      </div></div>`;
    }

    if (s.phase === 'busy') {
      return `<div class="mask"><div class="sheet">
        <h3>${esc(s.msg || '处理中…')}</h3>
        <div class="sub">大概几秒，别关页面</div>
        <div class="loadingbar"><i></i></div>
        ${s.photoUrl ? `<img class="preview" src="${esc(s.photoUrl)}" alt="">` : ''}
      </div></div>`;
    }

    const a = s.ai;
    const q0 = (a && Array.isArray(a.questions) && a.questions[0]) ? a.questions[0] : null;
    let pick = 0;
    if (q0) {
      pick = (typeof s.pick === 'number') ? s.pick : Math.floor(q0.opts.length / 2);
      pick = Math.max(0, Math.min(pick, q0.opts.length - 1));
    }
    const cur = q0 ? q0.opts[pick] : a;

    return `<div class="mask" data-act="closeSheet"><div class="sheet">
      <h3>${esc(a ? (a.summary || '照片记录') : '照片已上传')}</h3>
      <div class="sub">${a ? 'AI 识别 · 教练还会复核' : 'AI 暂时没识别出来，可以自己填个大概'}</div>
      <img class="preview" src="${esc(s.photoUrl)}" alt="">
      ${q0 ? `<div class="askbox">
          <div class="askq">${esc(q0.q)}</div>
          <div class="askopts">${q0.opts.map((o, i) => `<button data-act="photoPick" data-v="${i}" class="${i === pick ? 'on' : ''}">${esc(o.t)}</button>`).join('')}</div>
        </div>` : ''}
      ${a ? `<div class="aibox">
          <div class="airow"><span>热量</span><b>${Math.round(cur.kcal || 0)} kcal</b></div>
          <div class="airow"><span>蛋白质</span><b>${round1(cur.p || 0)} g</b></div>
          <div class="airow"><span>碳水</span><b>${round1(cur.c || 0)} g</b></div>
          <div class="airow"><span>脂肪</span><b>${round1(cur.f || 0)} g</b></div>
        </div>${a.note ? `<div class="muted" style="line-height:1.75;font-size:13px;margin-top:10px">${esc(a.note)}</div>` : ''}`
      : `<div class="field" style="margin-top:12px"><label>大概多少热量（可留空）</label>
           <input id="photoKcal" type="number" placeholder="例如 650"></div>`}
      <div class="field" style="margin-top:12px"><label>记到哪一餐</label>${mealBtns}</div>
      <button class="btn primary" data-act="confirmPhoto">确认加入${mealLabel}</button>
      <button class="btn ghost" style="margin-top:8px" data-act="photoRetry">重拍一张</button>
    </div></div>`;
  }
  if (s.type === 'checkin') {
    const last = state.home.checkins[state.home.checkins.length - 1];
    return `<div class="mask" data-act="closeSheet"><div class="sheet">
      <h3>记录今天的体重</h3>
      <div class="sub">建议每天固定时间（早上空腹）称</div>
      <div style="height:14px"></div>
      <div class="grid2">
        <div class="field"><label>体重 kg</label><input id="ckWeight" type="number" step="0.1" value="${last ? last.weight : state.home.member.weight}"></div>
        <div class="field"><label>体脂率 %（可空）</label><input id="ckFat" type="number" step="0.1" value="${last && last.body_fat ? last.body_fat : ''}"></div>
      </div>
      <div class="field"><label>腰围 cm（可空）</label><input id="ckWaist" type="number" step="0.1" placeholder="选填"></div>
      <div class="field"><label>备注</label><input id="ckNote" placeholder="今天的状态"></div>
      <button class="btn primary" data-act="saveCheckin">保存打卡</button>
      <button class="btn ghost" style="margin-top:8px" data-act="closeSheet">取消</button>
    </div></div>`;
  }
  if (s.type === 'addMember') {
    return `<div class="mask" data-act="closeSheet"><div class="sheet">
      <h3>新增会员</h3>
      <div class="sub">建好后会生成一个专属链接给他</div>
      <div style="height:14px"></div>
      <div class="field"><label>姓名</label><input id="nmName" placeholder="会员姓名"></div>
      <div class="grid2">
        <div class="field"><label>身高 cm</label><input id="nmHeight" type="number" value="170"></div>
        <div class="field"><label>体重 kg</label><input id="nmWeight" type="number" step="0.1" value="65"></div>
      </div>
      <div class="grid2">
        <div class="field"><label>年龄</label><input id="nmAge" type="number" value="30"></div>
        <div class="field"><label>体脂率 %</label><input id="nmFat" type="number" value="22"></div>
      </div>
      <div class="field"><label>性别</label><div class="seg">
        <button data-act="nmGender" data-v="male" class="${(temp.gender || 'male') === 'male' ? 'on' : ''}">男</button>
        <button data-act="nmGender" data-v="female" class="${temp.gender === 'female' ? 'on' : ''}">女</button></div></div>
      <div class="field"><label>目标</label><div class="seg">
        <button data-act="nmGoal" data-v="lose" class="${(temp.goal || 'lose') === 'lose' ? 'on' : ''}">减脂</button>
        <button data-act="nmGoal" data-v="gain" class="${temp.goal === 'gain' ? 'on' : ''}">增肌</button>
        <button data-act="nmGoal" data-v="keep" class="${temp.goal === 'keep' ? 'on' : ''}">保持</button></div></div>
      <button class="btn primary" data-act="saveNewMember">创建会员</button>
      <button class="btn ghost" style="margin-top:8px" data-act="closeSheet">取消</button>
    </div></div>`;
  }
  return '';
}

/* ---------------- 数据加载 ---------------- */
async function loadMember() {
  state.loading = true; render();
  try {
    state.home = await rpc('member_home', { p_token: state.token, p_date: state.date });
  } catch (e) {
    console.error('[member] 加载失败', e);
    state.home = null;
    app.innerHTML = `<div class="wrap" style="padding-top:48px"><div class="card">
      <b style="font-size:16px">暂时打不开</b>
      <div class="muted" style="margin:10px 0 18px;line-height:1.8">${esc(e.message)}</div>
      <button class="btn primary" data-act="retry">重试</button>
      <div class="muted" style="margin-top:16px;line-height:1.7">
        如果还是不行：① 确认用的是教练发给你的专属链接；② 把这句话截图发给教练。
      </div>
    </div></div>`;
    return;
  } finally { state.loading = false; }
  render();
}
async function loadCoachList() {
  const r = await rpc('coach_list', { p_pass: state.coachPass, p_date: state.coachDate });
  state.coachList = r.members || [];
}
async function loadCoachDetail(id) {
  state.coachDetail = await rpc('coach_member', { p_pass: state.coachPass, p_member: id, p_date: state.coachDate });
  await loadCoachMsgs(true);
}

/* ---------------- 对话数据 ---------------- */
/** 会员端：只取最新一条 + 未读数，用于今日页卡片（不标记已读） */
async function refreshMsgPeek() {
  if (!state.token) return;
  try {
    const r = await rpc('member_messages', { p_token: state.token, p_limit: 1, p_mark: false });
    state.msgUnread = r.unread || 0;
    state.lastMsg = (r.list && r.list.length) ? r.list[r.list.length - 1] : null;
  } catch (e) {
    console.warn('[msg] 预览失败', e);
  }
}
/** 会员端：拉整段对话（mark=true 时把教练发来的标记为已读） */
async function loadChat(mark) {
  const r = await rpc('member_messages', { p_token: state.token, p_limit: 100, p_mark: mark !== false });
  state.msgs = r.list || [];
  state.msgUnread = r.unread || 0;
  state.lastMsg = state.msgs.length ? state.msgs[state.msgs.length - 1] : null;
}
/** 教练端：拉当前会员的对话 */
async function loadCoachMsgs(mark) {
  if (!state.coachMemberId) { state.coachMsgs = []; return; }
  const r = await rpc('coach_messages', {
    p_pass: state.coachPass, p_member: state.coachMemberId, p_limit: 100, p_mark: mark !== false
  });
  state.coachMsgs = r.list || [];
}

/** 对话页开着的时候每 20 秒自动拉一次（静态网页没有推送，靠轮询兜底） */
let chatPoll = null;
function startChatPoll() {
  stopChatPoll();
  chatPoll = setInterval(async () => {
    if (!state.chatOpen || !state.token) { stopChatPoll(); return; }
    const el = document.getElementById('chatInput');
    if (el && el.value.trim()) return;   // 正在打字，别把输入框内容冲掉
    try { await loadChat(true); render(); } catch (e) { /* 网络抖动就跳过 */ }
  }, 20000);
}
function stopChatPoll() {
  if (chatPoll) { clearInterval(chatPoll); chatPoll = null; }
}

/* ---------------- 交互 ---------------- */
function toast(msg) {
  const t = document.getElementById('toast');
  if (!t) return;
  t.textContent = msg; t.classList.add('show');
  clearTimeout(toast._t);
  toast._t = setTimeout(() => t.classList.remove('show'), 1700);
}
function val(id) { const el = document.getElementById(id); return el ? el.value.trim() : ''; }
function markOn(el) { Array.from(el.parentElement.children).forEach((c) => c.classList.remove('on')); el.classList.add('on'); }
function suggestMeal() { const h = new Date().getHours(); return h < 10 ? 'breakfast' : h < 15 ? 'lunch' : h < 21 ? 'dinner' : 'snack'; }

document.addEventListener('click', async (e) => {
  const el = e.target.closest('[data-act]');
  if (!el) return;
  const act = el.dataset.act, id = el.dataset.id, v = el.dataset.v;

  try {
    switch (act) {
      /* --- 会员端 --- */
      case 'mtab': state.mtab = v; render(); break;
      case 'mPrev': state.date = shiftDate(state.date, -1); await loadMember(); break;
      case 'mNext': state.date = shiftDate(state.date, 1); await loadMember(); break;
      case 'cat':
        state.foodCat = v;
        render();
        break;
      case 'openAdd':
        state.mtab = 'add'; temp.meal = el.dataset.meal || suggestMeal(); render(); break;
      case 'pickFood':
        state.sheet = { type: 'pickFood', foodId: id, amount: 1, meal: temp.meal || suggestMeal() }; render(); break;
      case 'amt':
        state.sheet.amount = Math.max(0.5, Math.min(10, round1(state.sheet.amount + Number(v)))); render(); break;
      case 'sheetMeal': state.sheet.meal = v; render(); break;
      case 'confirmFood': {
        if (state.busy) return;
        const s = state.sheet, f = allFoods().find((x) => x.id === s.foodId);
        if (!f) return toast('食物不存在');
        const n = Math.max(0.5, Math.min(20, round1(s.amount)));
        state.busy = true;
        try {
          await rpc('member_add_meal', {
            p_token: state.token, p_date: state.date, p_meal: s.meal, p_name: f.name,
            p_amount: n, p_unit: f.unit, p_kcal: Math.round(f.kcal * n),
            p_p: round1(f.p * n), p_c: round1(f.c * n), p_f: round1(f.f * n)
          });
          state.sheet = null; state.mtab = 'today';
          await loadMember();
          toast(`已加入${(MEALS.find((x) => x.key === s.meal) || MEALS[0]).label}`);
        } finally { state.busy = false; }
        break;
      }
      case 'openCustomFood':
        state.sheet = { type: 'customFood', meal: temp.meal || suggestMeal() };
        render(); break;
      case 'confirmCustomFood': {
        if (state.busy) return;
        const s = state.sheet;
        const name = val('cfName');
        if (!name) return toast('请填食物名称');
        const unitKcal = num(val('cfKcal'), 0);
        if (!unitKcal) return toast('请填热量');
        const n = Math.max(0.5, Math.min(20, num(val('cfAmount'), 1)));
        const unit = val('cfUnit') || '份';
        const mcP = num(val('cfP'), 0), mcC = num(val('cfC'), 0), mcF = num(val('cfF'), 0);
        state.busy = true;
        try {
          await rpc('member_add_meal', {
            p_token: state.token, p_date: state.date, p_meal: s.meal, p_name: name,
            p_amount: n, p_unit: unit, p_kcal: Math.round(unitKcal * n),
            p_p: round1(mcP * n), p_c: round1(mcC * n), p_f: round1(mcF * n)
          });
          saveMyFood({
            id: 'my_' + Date.now(), name: name.slice(0, 20), cat: '我的', unit,
            kcal: Math.round(unitKcal), p: mcP, c: mcC, f: mcF
          });
          state.sheet = null; state.mtab = 'today';
          await loadMember();
          toast('已加入，并记到「我的」里');
        } finally { state.busy = false; }
        break;
      }
      case 'openPhoto':
        state.sheet = { type: 'photo', meal: el.dataset.meal || temp.meal || suggestMeal(), phase: 'pick' };
        render(); break;
      case 'photoMeal':
        state.sheet.meal = v; render(); break;
      case 'photoRetry':
        state.sheet = { type: 'photo', meal: (state.sheet && state.sheet.meal) || suggestMeal(), phase: 'pick' };
        render(); break;
      case 'photoPick':
        state.sheet.pick = Number(v) || 0; render(); break;
      case 'confirmPhoto': {
        if (state.busy) return;
        const s = state.sheet;
        const a = s.ai || null;
        const q0 = (a && Array.isArray(a.questions) && a.questions[0]) ? a.questions[0] : null;
        let chosen = a;
        let picked = '';
        if (q0) {
          const idx = Math.max(0, Math.min(typeof s.pick === 'number' ? s.pick : Math.floor(q0.opts.length / 2), q0.opts.length - 1));
          chosen = q0.opts[idx];
          picked = chosen.t;
        }
        const kcal = a ? Math.round((chosen && chosen.kcal) || 0) : num(val('photoKcal'), 0);
        let note = (a && a.note) || '';
        if (q0) note = q0.q + ' → ' + picked + (note ? '｜' + note : '');
        if (!a) note = '照片待教练评估';
        state.busy = true;
        try {
          await rpc('member_add_photo_meal', {
            p_token: state.token,
            p_date: state.date,
            p_meal: s.meal,
            p_photo_url: s.photoUrl,
            p_summary: (a && a.summary) || '照片记录',
            p_kcal: Math.max(0, kcal),
            p_p: a ? round1((chosen && chosen.p) || 0) : 0,
            p_c: a ? round1((chosen && chosen.c) || 0) : 0,
            p_f: a ? round1((chosen && chosen.f) || 0) : 0,
            p_ai_note: note
          });
          state.sheet = null; state.mtab = 'today';
          await loadMember();
          toast('已加入，教练会复核');
        } finally { state.busy = false; }
        break;
      }
      case 'zoom': state.zoom = el.dataset.src || ''; render(); break;
      case 'closeZoom': state.zoom = ''; render(); break;
      case 'closeSheet':
        if (el.classList.contains('mask') && e.target !== el) break;
        state.sheet = null; temp = {}; render(); break;
      case 'delMeal':
        await rpc('member_del_meal', { p_token: state.token, p_id: id });
        await loadMember(); toast('已删除'); break;

      /* --- 运动 --- */
      case 'pickWorkout': temp.workout = v; render(); break;
      case 'saveWorkout': {
        if (state.busy) return;
        if (!temp.workout) return toast('先选一个运动');
        const minutes = Math.max(1, Math.min(600, num(val('wkMinutes'), 0)));
        if (!minutes) return toast('填一下时长（分钟）');
        state.busy = true;
        try {
          await rpc('member_add_workout', {
            p_token: state.token, p_date: state.date, p_name: temp.workout, p_minutes: minutes, p_note: val('wkNote')
          });
          temp.workout = ''; temp.workoutMin = minutes;
          await loadMember(); toast('已记录');
        } finally { state.busy = false; }
        break;
      }
      case 'delWorkout':
        await rpc('member_del_workout', { p_token: state.token, p_id: id });
        await loadMember(); toast('已删除'); break;

      /* --- 打卡 --- */
      case 'openCheckin': state.sheet = { type: 'checkin' }; render(); break;
      case 'saveCheckin': {
        if (state.busy) return;
        const w = num(val('ckWeight'));
        if (!w) return toast('请填体重');
        if (w < 20 || w > 300) return toast('体重请填 20~300 kg');
        state.busy = true;
        try {
          await rpc('member_add_checkin', {
            p_token: state.token, p_date: todayStr(), p_weight: w,
            p_body_fat: num(val('ckFat')), p_waist: num(val('ckWaist')), p_note: val('ckNote')
          });
          state.sheet = null; state.date = todayStr();
          await loadMember(); toast('打卡成功');
        } finally { state.busy = false; }
        break;
      }

      /* --- 通用 --- */
      case 'retry':
        if (state.mode === 'member') await loadMember();
        else render();
        break;

      /* --- 教练端 --- */
      case 'toCoach': state.mode = 'coach'; render(); break;
      case 'toLanding': state.mode = 'landing'; render(); break;
      case 'coachLogin': {
        const pass = val('coachPass');
        if (!pass) return toast('请输入口令');
        if (state.coachBusy) return;
        state.coachBusy = true;
        try {
          const r = await rpc('coach_list', { p_pass: pass, p_date: state.coachDate });
          state.coachPass = pass;
          state.coachList = r.members || [];
          try { localStorage.setItem('fit_coach_pass', pass); } catch (_) { /* ignore */ }
          render(); toast('欢迎回来');
        } finally { state.coachBusy = false; }
        break;
      }
      case 'coachExit':
        state.coachPass = ''; state.coachList = null; state.coachMemberId = '';
        localStorage.removeItem('fit_coach_pass'); state.mode = 'landing'; render(); break;
      case 'cFilter': state.coachFilter = v; render(); break;
      case 'cPrev':
      case 'cNext': {
        state.coachDate = shiftDate(state.coachDate, act === 'cPrev' ? -1 : 1);
        if (state.coachMemberId) { await loadCoachDetail(state.coachMemberId); render(); }
        else { await loadCoachList(); render(); }
        break;
      }
      case 'coachExport': {
        if (state.coachBusy) return;
        state.coachBusy = true;
        toast('正在导出…');
        try {
          const data = await rpc('coach_export', { p_pass: state.coachPass });
          const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
          const a = document.createElement('a');
          a.href = URL.createObjectURL(blob);
          a.download = '健身小工具备份_' + todayStr() + '.json';
          a.click();
          setTimeout(() => URL.revokeObjectURL(a.href), 3000);
          console.info('[coach] 已导出备份');
          toast('备份已下载，请妥善保存');
        } finally { state.coachBusy = false; }
        break;
      }
      case 'coachSetActive': {
        const mm = (state.coachList || []).find((x) => x.id === id)
          || (state.coachDetail && state.coachDetail.member) || null;
        const nm = mm ? mm.name : '该会员';
        if (!confirm('确定停用「' + nm + '」吗？\n停用后他的专属链接会失效，历史数据保留。')) break;
        await rpc('coach_set_active', { p_pass: state.coachPass, p_member: id, p_active: false });
        state.coachMemberId = ''; state.coachDetail = null;
        await loadCoachList(); render();
        toast('已停用');
        break;
      }
      case 'aiDraft': {
        if (state.aiBusy) return;
        const d = state.coachDetail;
        if (!d || !d.member) return toast('先打开会员详情');
        state.aiBusy = true; render();
        try {
          const mm = d.member;
          const meals = d.meals || [];
          const sum = (k) => meals.reduce((a, x) => a + (+x[k] || 0), 0);
          const payload = {
            date: state.coachDate,
            member: {
              name: mm.name, goal: mm.goal, weight: mm.weight, height: mm.height,
              body_fat: mm.body_fat, age: mm.age, activity: mm.activity
            },
            target_kcal: Number(val('dKcal')) || (d.plan && d.plan.kcal) || 0,
            intake_kcal: Math.round(sum('kcal')),
            macros: { p: Math.round(sum('p')), c: Math.round(sum('c')), f: Math.round(sum('f')) },
            meals: meals.map((x) => ({ meal: x.meal, name: x.name, kcal: Math.round(x.kcal), source: x.source })),
            photo_urls: meals.filter((x) => x.source === 'photo' && x.photo_url).map((x) => x.photo_url).slice(0, 3),
            workouts: (d.workouts || []).map((x) => ({ name: x.name, minutes: x.minutes }))
          };
          let res;
          try {
            res = await fetch(`${CFG.SUPABASE_URL}/functions/v1/draft-advice`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                apikey: CFG.SUPABASE_ANON_KEY,
                Authorization: 'Bearer ' + CFG.SUPABASE_ANON_KEY
              },
              body: JSON.stringify(payload)
            });
          } catch (e) {
            throw new Error('连不上 AI 服务，请检查网络');
          }
          if (!res.ok) {
            const t = await res.text();
            console.error('[aiDraft] 失败', res.status, t);
            throw new Error('AI 起草失败（' + res.status + '），可以自己手写');
          }
          const r = await res.json();
          if (!r.text) throw new Error('AI 没给出内容，稍后再试');
          state.aiDraft = r.text;
          toast('AI 草稿已生成，改完点「发送」');
        } catch (e) {
          console.error('[aiDraft]', e);
          toast(e.message || 'AI 起草失败');
        } finally {
          state.aiBusy = false; render();
        }
        break;
      }
      case 'openMember':
        state.coachMemberId = id; state.aiDraft = null; state.coachMsgs = []; render();
        await loadCoachDetail(id); render(); break;
      case 'coachBack': state.coachMemberId = ''; state.coachDetail = null; state.aiDraft = null; state.coachMsgs = []; render(); break;

      /* --- 教练 ↔ 会员 对话 --- */
      case 'sendCoachMsg': {
        if (state.coachMsgBusy) return;
        const mid = state.coachMemberId;
        if (!mid) return toast('先打开会员详情');
        const body = val('coachChatInput');
        if (!body) return toast('说点什么再发');
        state.coachMsgBusy = true; render();
        try {
          await rpc('coach_send_message', { p_pass: state.coachPass, p_member: mid, p_body: body });
          state.aiDraft = null;
          await loadCoachMsgs(true);
          await loadCoachList();
          render();
        } finally { state.coachMsgBusy = false; render(); }
        break;
      }
      case 'reloadCoachChat': {
        await loadCoachMsgs(true); render(); toast('已刷新');
        break;
      }
      case 'saveKcal': {
        const d = state.coachDetail;
        const mid = state.coachMemberId || id;
        await rpc('coach_save_plan', {
          p_pass: state.coachPass, p_member: mid,
          p_kcal: num(val('dKcal')), p_note: (d && d.member && d.member.plan_note) || ''
        });
        await loadCoachDetail(mid); render(); toast('目标热量已保存');
        break;
      }
      case 'copyLink':
        try { await navigator.clipboard.writeText(v); toast('链接已复制'); }
        catch (err) { console.error(err); toast('复制失败，请手动长按选择'); }
        break;

      /* --- 会员端：和教练的对话 --- */
      case 'openChat':
        state.chatOpen = true; state.msgBusy = false;
        render();
        try { await loadChat(true); } catch (e) { toast(e.message || '加载失败'); }
        render(); startChatPoll();
        break;
      case 'closeChat':
        state.chatOpen = false; stopChatPoll();
        await refreshMsgPeek(); render();
        break;
      case 'reloadChat':
        try { await loadChat(true); render(); toast('已刷新'); } catch (e) { toast(e.message || '刷新失败'); }
        break;
      case 'sendMsg': {
        if (state.msgBusy) return;
        const body = val('chatInput');
        if (!body) return toast('说点什么再发');
        state.msgBusy = true; render();
        try {
          await rpc('member_send_message', { p_token: state.token, p_body: body });
          await loadChat(true);
        } finally { state.msgBusy = false; render(); scrollChat('chatList'); }
        break;
      }
      case 'openAddMember': state.sheet = { type: 'addMember' }; temp = {}; render(); break;
      case 'nmGender': temp.gender = v; markOn(el); break;
      case 'nmGoal': temp.goal = v; markOn(el); break;
      case 'saveNewMember': {
        const name = val('nmName');
        if (!name) return toast('请填姓名');
        const r = await rpc('coach_add_member', {
          p_pass: state.coachPass,
          p: {
            name, height: num(val('nmHeight'), 170), weight: num(val('nmWeight'), 65),
            age: num(val('nmAge'), 30), body_fat: num(val('nmFat'), 22),
            gender: temp.gender || 'male', goal: temp.goal || 'lose'
          }
        });
        state.sheet = null; temp = {};
        await loadCoachList(); await loadCoachDetail(r.id);
        state.coachMemberId = r.id;
        render(); toast('已创建，把专属链接发给他');
        break;
      }
    }
  } catch (err) {
    console.error('[action] ' + act + ' 失败', err);
    toast(err.message || '操作失败');
  }
});

document.addEventListener('input', (e) => {
  if (e.target.id !== 'foodSearch') return;
  state.foodQuery = e.target.value;
  const box = document.getElementById('foodList');
  if (box) box.innerHTML = foodRows(filterFoods());
});

/* 对话输入框：回车发送 */
document.addEventListener('keydown', (e) => {
  if (e.key !== 'Enter') return;
  if (e.target.id === 'chatInput') {
    e.preventDefault();
    const btn = document.querySelector('[data-act="sendMsg"]');
    if (btn) btn.click();
  } else if (e.target.id === 'coachChatInput') {
    e.preventDefault();
    const btn = document.querySelector('[data-act="sendCoachMsg"]');
    if (btn) btn.click();
  }
});

document.addEventListener('change', (e) => {
  if (e.target.id !== 'photoFile') return;
  const f = e.target.files && e.target.files[0];
  if (!f) return;
  runPhotoFlow(f);
});

/* ---------------- 启动 ---------------- */
boot();
