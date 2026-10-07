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

/* 内置食物库（客户端静态，不占数据库） */
const FOODS = [
  { id: 'f01', name: '鸡胸肉', cat: '肉蛋类', unit: '100g', kcal: 133, p: 24, c: 2.5, f: 3.5 },
  { id: 'f02', name: '水煮蛋', cat: '肉蛋类', unit: '1个', kcal: 78, p: 6.5, c: 0.6, f: 5.3 },
  { id: 'f03', name: '三文鱼', cat: '肉蛋类', unit: '100g', kcal: 208, p: 20, c: 0, f: 13 },
  { id: 'f04', name: '瘦牛肉', cat: '肉蛋类', unit: '100g', kcal: 106, p: 20.2, c: 1.2, f: 2.3 },
  { id: 'f05', name: '白米饭', cat: '主食', unit: '100g', kcal: 116, p: 2.6, c: 25.9, f: 0.3 },
  { id: 'f06', name: '燕麦片', cat: '主食', unit: '100g', kcal: 377, p: 13, c: 66, f: 7 },
  { id: 'f07', name: '红薯', cat: '主食', unit: '100g', kcal: 86, p: 1.6, c: 20, f: 0.2 },
  { id: 'f08', name: '全麦面包', cat: '主食', unit: '1片', kcal: 82, p: 3, c: 14, f: 1.2 },
  { id: 'f09', name: '西兰花', cat: '蔬菜', unit: '100g', kcal: 34, p: 2.8, c: 6.6, f: 0.4 },
  { id: 'f10', name: '牛油果', cat: '水果', unit: '1个', kcal: 234, p: 2.9, c: 12, f: 21 },
  { id: 'f11', name: '香蕉', cat: '水果', unit: '1根', kcal: 105, p: 1.3, c: 27, f: 0.4 },
  { id: 'f12', name: '苹果', cat: '水果', unit: '1个', kcal: 95, p: 0.5, c: 25, f: 0.3 },
  { id: 'f13', name: '蓝莓', cat: '水果', unit: '100g', kcal: 57, p: 0.7, c: 14.5, f: 0.3 },
  { id: 'f14', name: '牛奶', cat: '奶制品', unit: '250ml', kcal: 155, p: 8, c: 12, f: 8 },
  { id: 'f15', name: '无糖酸奶', cat: '奶制品', unit: '100g', kcal: 60, p: 3.5, c: 4, f: 3.3 },
  { id: 'f16', name: '巴旦木', cat: '坚果', unit: '30g', kcal: 174, p: 6.4, c: 6, f: 15 },
  { id: 'f17', name: '拿铁咖啡', cat: '饮品', unit: '1杯', kcal: 135, p: 7, c: 13, f: 6 },
  { id: 'f18', name: '乳清蛋白粉', cat: '补剂', unit: '1勺', kcal: 120, p: 24, c: 3, f: 1.5 }
];
const CATS = ['全部', '主食', '肉蛋类', '蔬菜', '水果', '奶制品', '坚果', '饮品', '补剂'];

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
function qs(k) { return new URLSearchParams(location.search).get(k) || ''; }

/* ---------------- 云端调用 ---------------- */
const CFG = window.FIT_CONFIG || {};
function configured() { return !!(CFG.SUPABASE_URL && CFG.SUPABASE_ANON_KEY); }

async function rpc(fn, params) {
  if (!configured()) throw new Error('还没配置云数据库（见 config.js）');
  const res = await fetch(`${CFG.SUPABASE_URL}/rest/v1/rpc/${fn}`, {
    method: 'POST',
    headers: {
      apikey: CFG.SUPABASE_ANON_KEY,
      Authorization: 'Bearer ' + CFG.SUPABASE_ANON_KEY,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(params || {})
  });
  if (!res.ok) {
    const t = await res.text();
    console.error('[rpc] ' + fn + ' 失败', res.status, t);
    throw new Error('网络请求失败（' + res.status + '）');
  }
  const data = await res.json();
  if (data && data.ok === false) throw new Error(data.error || '操作失败');
  return data;
}

/* ---------------- 状态 ---------------- */
const state = {
  mode: '',            // member / coach
  token: '',           // 会员凭证
  date: todayStr(),
  mtab: 'today',
  home: null,          // member_home 返回
  loading: false,
  sheet: null,
  foodQuery: '', foodCat: '全部',
  coachPass: localStorage.getItem('fit_coach_pass') || '',
  coachList: null,
  coachMemberId: '',
  coachDetail: null,
  coachFilter: 'all'
};
let temp = {};

const app = document.getElementById('app');

/* ---------------- 入口路由 ---------------- */
async function boot() {
  const t = qs('token');
  if (t) {
    state.mode = 'member';
    state.token = t;
    await loadMember();
    return;
  }
  if (qs('coach') || state.coachPass) {
    state.mode = 'coach';
    if (state.coachPass) await loadCoachList();
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
      ${items.length ? items.map((x) => `<div class="frow">
          <div class="fmeta"><div class="n">${esc(x.name)}</div><div class="s">${x.amount} × ${esc(x.unit)}</div></div>
          <div class="fkcal">${Math.round(x.kcal)}<em>kcal</em></div>
          <button class="del" data-act="delMeal" data-id="${x.id}">删</button>
        </div>`).join('') : '<div class="empty" style="padding:14px 0">还没记录</div>'}
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

    ${m.plan_note ? `<div class="card tight">
      <div class="row"><b style="font-size:13.5px">教练指导</b><span class="muted">实时同步</span></div>
      <div style="font-size:13.5px;line-height:1.85;color:var(--ink2);margin-top:8px">${esc(m.plan_note)}</div>
    </div>` : ''}

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
  const q = state.foodQuery.trim();
  const list = FOODS.filter((f) => (!q || f.name.includes(q) || f.cat.includes(q)) && (state.foodCat === '全部' || f.cat === state.foodCat));
  return `<div class="wrap">
    <div class="phead"><h1>加餐食</h1><p>选食物 → 自动算热量与三大营养素</p></div>
    <div class="search">
      <span>🔍</span>
      <input id="foodSearch" placeholder="搜索食物，如：鸡胸肉" value="${esc(state.foodQuery)}">
    </div>
    <div class="cats">${CATS.map((c) => `<button data-act="cat" data-v="${c}" class="${state.foodCat === c ? 'on' : ''}">${c}</button>`).join('')}</div>
    <div class="card" id="foodList">${foodRows(list)}</div>
  </div>`;
}
function foodRows(list) {
  if (!list.length) return '<div class="empty">没找到，换个词试试</div>';
  return list.map((f) => `<div class="frow">
    <div class="fmeta"><div class="n">${esc(f.name)}</div>
      <div class="s">${esc(f.unit)} · 蛋${Math.round(f.p)} 碳${Math.round(f.c)} 脂${Math.round(f.f)}</div></div>
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
      <div class="muted" style="margin:8px 0 12px">默认口令 888888，可在数据库里改</div>
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
          <div class="n">${esc(x.name)} <span class="muted" style="font-weight:500">${GOALS[x.goal]}</span></div>
          <div class="s">今日 ${Math.round(x.intake)} / ${x.plan.kcal} kcal · 运动 ${Math.round(x.workout_minutes)} 分钟 · ${x.checked_in ? '已打卡' : '未打卡'}</div>
        </div>
        <span class="pill ${withAlert(x) ? 'bad' : x.meal_count >= 3 ? 'ok' : x.meal_count ? 'warn' : 'idle'}">
          ${withAlert(x) ? '待跟进' : x.meal_count >= 3 ? '正常' : x.meal_count ? '进行中' : '未记录'}</span>
      </div>
      ${withAlert(x) ? `<div class="alert">${esc(withAlert(x))}</div>` : ''}
    </div>`).join('');

  return `<div class="topbar"><div class="row">
      <div><div class="brand">教练后台</div><div class="who">${todayStr()} · ${list.length} 位会员</div></div>
      <button class="del" data-act="coachExit">退出</button>
    </div></div>
  <div class="wrap">
    <div class="dash">
      <h2>今日会员看板</h2>
      <div class="sub">点会员可看详情、写指导</div>
      <div class="stats">
        <div class="stat"><b>${list.length}</b><span>在带会员</span></div>
        <div class="stat"><b>${done}</b><span>已记录</span></div>
        <div class="stat bad"><b>${bad}</b><span>需关注</span></div>
      </div>
    </div>
    <div class="filters">
      ${[['all', '全部'], ['bad', '待跟进'], ['done', '已记录'], ['none', '未记录']].map(([k, t]) =>
        `<button data-act="cFilter" data-v="${k}" class="${state.coachFilter === k ? 'on' : ''}">${t}</button>`).join('')}
    </div>
    <div class="sec"><div class="l"><div class="bar"></div><b>会员列表</b></div>
      <button class="del" data-act="openAddMember">+ 加会员</button></div>
    ${cards || '<div class="card"><div class="empty">还没有会员，点右上角「+ 加会员」</div></div>'}
  </div>`;
}

function alertOf(x) {
  const kcal = x.plan.kcal || 0;
  if (!x.meal_count) return '今天还没有记录饮食';
  if (kcal && x.intake < kcal * 0.6) return `今天只吃了 ${Math.round(x.intake)} kcal，明显偏低（目标 ${kcal}）`;
  if (kcal && x.intake > kcal * 1.15) return `今天已超目标 ${Math.round(x.intake - kcal)} kcal`;
  if (x.weight_delta <= -0.8) return `最近掉秤 ${Math.abs(x.weight_delta)}kg，偏快，注意别掉肌肉`;
  if (!x.checked_in) return '今天还没称体重';
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
      <div class="row" style="margin-bottom:10px"><b style="font-size:14.5px">下发指导</b><span class="muted">会员端立刻可见</span></div>
      <div class="field"><label>每日目标热量（建议 ${plan.autoKcal}）</label>
        <input id="dKcal" type="number" step="50" value="${plan.kcal}"></div>
      <div class="field"><label>给会员的指导</label>
        <textarea id="dNote" placeholder="例如：今天蛋白够了，晚餐主食减半；明天记得加 30 分钟快走">${esc(m.plan_note || '')}</textarea></div>
      <button class="btn primary" data-act="savePlan" data-id="${m.id}">保存并下发</button>
    </div>

    <div class="card">
      <div class="row" style="margin-bottom:8px"><b style="font-size:14.5px">会员专属链接</b>
        <button class="del" data-act="copyLink" data-v="${esc(link)}">复制</button></div>
      <div class="linkbox">${esc(link)}</div>
      <div class="muted" style="margin-top:8px;line-height:1.7">把这个链接发给该会员，他点开就能记录，不用注册。</div>
    </div>

    <div class="sec"><div class="l"><div class="bar"></div><b>今日餐食</b></div><span class="muted">${Math.round(tot(d.meals).kcal)} kcal</span></div>
    <div class="card">
      ${d.meals.length ? MEALS.map((meal) => {
        const items = d.meals.filter((x) => x.meal === meal.key);
        if (!items.length) return '';
        return `<div class="row" style="margin:6px 0 2px"><b style="font-size:13px">${meal.label}</b>
          <span class="muted">${Math.round(tot(items).kcal)} kcal</span></div>` +
          items.map((x) => `<div class="frow"><div class="fmeta"><div class="n">${esc(x.name)}</div>
            <div class="s">${x.amount} × ${esc(x.unit)}</div></div>
            <div class="fkcal">${Math.round(x.kcal)}<em>kcal</em></div></div>`).join('');
      }).join('') : '<div class="empty">今天还没有记录</div>'}
    </div>

    <div class="sec"><div class="l"><div class="bar"></div><b>今日运动</b></div><span class="muted">${workoutMin} 分钟</span></div>
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
  </div>`;
}

/* ---------------- 弹层 ---------------- */
function renderSheet() {
  const s = state.sheet;
  if (!s) return '';
  if (s.type === 'pickFood') {
    const f = FOODS.find((x) => x.id === s.foodId);
    if (!f) return '';
    const kcal = Math.round(f.kcal * s.amount);
    return `<div class="mask" data-act="closeSheet"><div class="sheet">
      <h3>${esc(f.name)}</h3>
      <div class="sub">${esc(f.unit)} · 每单位 ${f.kcal} kcal</div>
      <div class="stepper">
        <button data-act="amt" data-v="-0.5">−</button><div class="v">${s.amount} 份</div>
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
    app.innerHTML = `<div class="wrap" style="padding-top:60px"><div class="card">
      <b>打不开</b><div class="muted" style="margin-top:8px;line-height:1.8">${esc(e.message)}<br>请确认用的是教练发给你的专属链接。</div></div></div>`;
    return;
  } finally { state.loading = false; }
  render();
}
async function loadCoachList() {
  state.coachList = await rpc('coach_list', { p_pass: state.coachPass, p_date: todayStr() });
  state.coachList = state.coachList.members || [];
}
async function loadCoachDetail(id) {
  state.coachDetail = await rpc('coach_member', { p_pass: state.coachPass, p_member: id, p_date: todayStr() });
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
        const s = state.sheet, f = FOODS.find((x) => x.id === s.foodId);
        const n = s.amount;
        await rpc('member_add_meal', {
          p_token: state.token, p_date: state.date, p_meal: s.meal, p_name: f.name,
          p_amount: n, p_unit: f.unit, p_kcal: Math.round(f.kcal * n),
          p_p: round1(f.p * n), p_c: round1(f.c * n), p_f: round1(f.f * n)
        });
        state.sheet = null; state.mtab = 'today';
        await loadMember();
        toast(`已加入${(MEALS.find((x) => x.key === s.meal) || MEALS[0]).label}`);
        break;
      }
      case 'closeSheet':
        if (el.classList.contains('mask') && e.target !== el) break;
        state.sheet = null; temp = {}; render(); break;
      case 'delMeal':
        await rpc('member_del_meal', { p_token: state.token, p_id: id });
        await loadMember(); toast('已删除'); break;

      /* --- 运动 --- */
      case 'pickWorkout': temp.workout = v; render(); break;
      case 'saveWorkout': {
        if (!temp.workout) return toast('先选一个运动');
        const minutes = num(val('wkMinutes'), 0);
        if (!minutes) return toast('填一下时长');
        await rpc('member_add_workout', {
          p_token: state.token, p_date: state.date, p_name: temp.workout, p_minutes: minutes, p_note: val('wkNote')
        });
        temp.workout = ''; temp.workoutMin = minutes;
        await loadMember(); toast('已记录');
        break;
      }
      case 'delWorkout':
        await rpc('member_del_workout', { p_token: state.token, p_id: id });
        await loadMember(); toast('已删除'); break;

      /* --- 打卡 --- */
      case 'openCheckin': state.sheet = { type: 'checkin' }; render(); break;
      case 'saveCheckin': {
        const w = num(val('ckWeight'));
        if (!w) return toast('请填体重');
        await rpc('member_add_checkin', {
          p_token: state.token, p_date: todayStr(), p_weight: w,
          p_body_fat: num(val('ckFat')), p_waist: num(val('ckWaist')), p_note: val('ckNote')
        });
        state.sheet = null; state.date = todayStr();
        await loadMember(); toast('打卡成功');
        break;
      }

      /* --- 教练端 --- */
      case 'toCoach': state.mode = 'coach'; render(); break;
      case 'toLanding': state.mode = 'landing'; render(); break;
      case 'coachLogin': {
        const pass = val('coachPass');
        if (!pass) return toast('请输入口令');
        state.coachPass = pass;
        await loadCoachList();
        localStorage.setItem('fit_coach_pass', pass);
        render(); toast('欢迎回来');
        break;
      }
      case 'coachExit':
        state.coachPass = ''; state.coachList = null; state.coachMemberId = '';
        localStorage.removeItem('fit_coach_pass'); state.mode = 'landing'; render(); break;
      case 'cFilter': state.coachFilter = v; render(); break;
      case 'openMember':
        state.coachMemberId = id; render();
        await loadCoachDetail(id); render(); break;
      case 'coachBack': state.coachMemberId = ''; state.coachDetail = null; render(); break;
      case 'savePlan': {
        await rpc('coach_save_plan', { p_pass: state.coachPass, p_member: id, p_kcal: num(val('dKcal')), p_note: val('dNote') });
        await loadCoachDetail(id); render(); toast('已下发，会员端立刻可见');
        break;
      }
      case 'copyLink':
        try { await navigator.clipboard.writeText(v); toast('链接已复制'); }
        catch (err) { console.error(err); toast('复制失败，请手动长按选择'); }
        break;
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
  const q = state.foodQuery.trim();
  const list = FOODS.filter((f) => (!q || f.name.includes(q) || f.cat.includes(q)) && (state.foodCat === '全部' || f.cat === state.foodCat));
  const box = document.getElementById('foodList');
  if (box) box.innerHTML = foodRows(list);
});

/* ---------------- 启动 ---------------- */
boot();
