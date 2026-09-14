const PLAN_VALUES = new Set(["基础方案", "标准方案", "定制方案", "待沟通方案"]);
const TIMELINE_VALUES = new Set([
  "先沟通评估",
  "一周内",
  "两周内",
  "一个月内",
  "时间灵活",
]);
const BUDGET_VALUES = new Set([
  "先沟通评估",
  "¥300–800",
  "¥800–1500",
  "¥1500–3000",
  "¥3000 以上",
]);
const STATUS_VALUES = new Set([
  "new",
  "quoted",
  "awaiting_payment",
  "paid",
  "in_progress",
  "completed",
  "cancelled",
]);

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (request.method === "OPTIONS")
      return corsResponse(request, env, null, 204);
    try {
      if (url.pathname === "/admin" && request.method === "GET")
        return new Response(ADMIN_HTML, { headers: htmlHeaders() });
      if (url.pathname === "/admin.js" && request.method === "GET")
        return new Response(ADMIN_JS_V2, {
          headers: {
            "Content-Type": "text/javascript; charset=utf-8",
            "Cache-Control": "no-store",
            "X-Content-Type-Options": "nosniff",
          },
        });
      if (url.pathname === "/api/health" && request.method === "GET")
        return json(request, env, { ok: true });
      if (url.pathname === "/api/orders" && request.method === "POST")
        return await createOrder(request, env);
      if (url.pathname === "/api/pageview" && request.method === "POST")
        return await recordPageview(request, env);
      if (url.pathname === "/api/order-status" && request.method === "POST")
        return await getOrderStatus(request, env);
      if (url.pathname === "/api/admin/login" && request.method === "POST")
        return await login(request, env);
      if (url.pathname === "/api/admin/logout" && request.method === "POST")
        return await logout(request, env);
      if (url.pathname === "/api/admin/orders" && request.method === "GET")
        return await listOrders(request, env, url);
      if (url.pathname === "/api/admin/stats" && request.method === "GET")
        return await getAdminStats(request, env);
      const match = url.pathname.match(
        /^\/api\/admin\/orders\/([0-9a-f-]{36})$/i,
      );
      if (match && request.method === "PATCH")
        return await updateOrder(request, env, match[1]);
      return json(request, env, { error: "Not found" }, 404);
    } catch (error) {
      if (
        Number.isInteger(error?.status) &&
        error.status >= 400 &&
        error.status < 500
      )
        return json(request, env, { error: error.message }, error.status);
      console.error("request_failed", {
        path: url.pathname,
        message: error?.message,
      });
      return json(request, env, { error: "Request failed" }, 500);
    }
  },
};

async function createOrder(request, env) {
  assertAllowedOrigin(request, env);
  assertJson(request);
  const fingerprint = await sha256(
    request.headers.get("CF-Connecting-IP") || "unknown",
  );
  const rateNow = Date.now();
  const rateRow = await env.DB.prepare(
    "SELECT window_started_at, submissions FROM submission_limits WHERE fingerprint = ?",
  )
    .bind(fingerprint)
    .first();
  const rateActive =
    rateRow && rateNow - rateRow.window_started_at < 15 * 60 * 1000;
  if (rateActive && rateRow.submissions >= 10)
    return json(request, env, { error: "提交过于频繁，请稍后再试" }, 429);
  const body = await readJson(request, 5000);
  const turnstileToken = clean(body.turnstileToken, 2048, true);
  if (!turnstileToken) throw new HttpError(403, "请先完成安全验证");
  await verifyTurnstile(turnstileToken, request, env);
  const customerName = clean(body.customerName, 30, true);
  const contact = clean(body.contact, 60, true);
  const need = clean(body.need, 600);
  const plan = enumValue(body.plan, PLAN_VALUES, "待沟通方案");
  const timeline = enumValue(body.timeline, TIMELINE_VALUES, "先沟通评估");
  const budget = enumValue(body.budget, BUDGET_VALUES, "先沟通评估");
  if (need.length < 10)
    return json(request, env, { error: "请至少填写 10 个字的需求说明" }, 400);
  const now = new Date().toISOString();
  const id = crypto.randomUUID();
  const lookupToken = randomToken();
  const lookupHash = await sha256(lookupToken);
  await env.DB.prepare(
    "INSERT INTO orders (id, created_at, updated_at, customer_name, contact, plan, timeline, budget, need, lookup_hash) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
  )
    .bind(
      id,
      now,
      now,
      customerName || "未填写",
      contact || "未填写",
      plan,
      timeline,
      budget,
      need,
      lookupHash,
    )
    .run();
  const rateStart = rateActive ? rateRow.window_started_at : rateNow;
  const rateCount = rateActive ? rateRow.submissions + 1 : 1;
  await env.DB.prepare(
    "INSERT INTO submission_limits (fingerprint, window_started_at, submissions) VALUES (?, ?, ?) ON CONFLICT(fingerprint) DO UPDATE SET window_started_at = excluded.window_started_at, submissions = excluded.submissions",
  )
    .bind(fingerprint, rateStart, rateCount)
    .run();
  return json(
    request,
    env,
    { id, lookupToken, createdAt: now, status: "new" },
    201,
  );
}

async function getOrderStatus(request, env) {
  assertAllowedOrigin(request, env);
  assertJson(request);
  const fingerprint = `query:${await sha256(request.headers.get("CF-Connecting-IP") || "unknown")}`;
  const now = Date.now();
  const row = await env.DB.prepare(
    "SELECT window_started_at, submissions FROM submission_limits WHERE fingerprint = ?",
  )
    .bind(fingerprint)
    .first();
  const active = row && now - row.window_started_at < 15 * 60 * 1000;
  if (active && row.submissions >= 30)
    return json(request, env, { error: "查询过于频繁，请稍后再试" }, 429);
  const body = await readJson(request, 1500);
  const id = clean(body.id, 36);
  const lookupToken = clean(body.lookupToken, 128);
  const lookupHash = await sha256(lookupToken);
  const order = /^[0-9a-f-]{36}$/i.test(id)
    ? await env.DB.prepare(
        "SELECT id, created_at, updated_at, plan, status, public_note, quoted_amount FROM orders WHERE id = ? AND lookup_hash = ?",
      )
        .bind(id.toLowerCase(), lookupHash)
        .first()
    : null;
  await env.DB.prepare(
    "INSERT INTO submission_limits (fingerprint, window_started_at, submissions) VALUES (?, ?, ?) ON CONFLICT(fingerprint) DO UPDATE SET window_started_at = excluded.window_started_at, submissions = excluded.submissions",
  )
    .bind(
      fingerprint,
      active ? row.window_started_at : now,
      active ? row.submissions + 1 : 1,
    )
    .run();
  if (!order)
    return json(request, env, { error: "订单编号或查询凭证不正确" }, 404);
  return json(request, env, { order });
}

async function recordPageview(request, env) {
  assertAllowedOrigin(request, env);
  assertJson(request);
  const body = await readJson(request, 500);
  const path = clean(body.path, 80, true) || "/";
  const device = ["mobile", "desktop"].includes(body.device) ? body.device : "other";
  if (!/^\/[a-z0-9._\/-]*$/i.test(path)) return json(request, env, { error: "Invalid path" }, 400);
  const date = new Date().toISOString().slice(0, 10);
  await env.DB.prepare("INSERT INTO pageviews (view_date, path, device, views) VALUES (?, ?, ?, 1) ON CONFLICT(view_date, path, device) DO UPDATE SET views = views + 1").bind(date, path, device).run();
  return json(request, env, { ok: true }, 201);
}

async function getAdminStats(request, env) {
  await requireAdmin(request, env);
  const result = await env.DB.prepare("SELECT COALESCE(SUM(views),0) AS views FROM pageviews WHERE view_date >= date('now','-29 days')").first();
  return json(request, env, { views30d: result?.views || 0 });
}

async function verifyTurnstile(token, request, env) {
  if (!env.TURNSTILE_SECRET)
    throw new HttpError(503, "安全验证暂不可用，请稍后再试");
  const form = new FormData();
  form.set("secret", env.TURNSTILE_SECRET);
  form.set("response", token);
  form.set("remoteip", request.headers.get("CF-Connecting-IP") || "");
  form.set("idempotency_key", crypto.randomUUID());
  let verification;
  try {
    const response = await fetch(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      { method: "POST", body: form },
    );
    verification = await response.json();
  } catch {
    throw new HttpError(503, "安全验证暂不可用，请稍后再试");
  }
  const validHostname =
    verification.hostname === "www.yidianqibu.online" ||
    verification.hostname === "yidianqibu.online";
  if (
    !verification.success ||
    !validHostname ||
    verification.action !== "submit_order"
  )
    throw new HttpError(403, "安全验证未通过，请刷新后重试");
}

async function login(request, env) {
  assertAllowedOrigin(request, env);
  assertJson(request);
  if (!env.ADMIN_PASSWORD || !env.SESSION_SECRET)
    return json(request, env, { error: "Admin is not configured" }, 503);
  const fingerprint = await sha256(
    request.headers.get("CF-Connecting-IP") || "unknown",
  );
  const now = Date.now();
  const row = await env.DB.prepare(
    "SELECT window_started_at, attempts FROM login_attempts WHERE fingerprint = ?",
  )
    .bind(fingerprint)
    .first();
  const inWindow = row && now - row.window_started_at < 15 * 60 * 1000;
  if (inWindow && row.attempts >= 5)
    return json(request, env, { error: "登录尝试过多，请稍后再试" }, 429);
  const body = await readJson(request, 1000);
  if (!constantTimeEqual(String(body.password || ""), env.ADMIN_PASSWORD)) {
    const start = inWindow ? row.window_started_at : now;
    const attempts = inWindow ? row.attempts + 1 : 1;
    await env.DB.prepare(
      "INSERT INTO login_attempts (fingerprint, window_started_at, attempts) VALUES (?, ?, ?) ON CONFLICT(fingerprint) DO UPDATE SET window_started_at = excluded.window_started_at, attempts = excluded.attempts",
    )
      .bind(fingerprint, start, attempts)
      .run();
    return json(request, env, { error: "密码错误" }, 401);
  }
  await env.DB.prepare("DELETE FROM login_attempts WHERE fingerprint = ?")
    .bind(fingerprint)
    .run();
  const token = await signSession(
    env.SESSION_SECRET,
    Math.floor(Date.now() / 1000) + 8 * 60 * 60,
  );
  return json(request, env, { ok: true }, 200, {
    "Set-Cookie": `zj_admin=${token}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=28800`,
  });
}

async function logout(request, env) {
  assertAllowedOrigin(request, env);
  return json(request, env, { ok: true }, 200, {
    "Set-Cookie":
      "zj_admin=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0",
  });
}

async function listOrders(request, env, url) {
  await requireAdmin(request, env);
  const status = url.searchParams.get("status");
  const limit = Math.min(
    Math.max(Number(url.searchParams.get("limit")) || 50, 1),
    100,
  );
  const query =
    status && STATUS_VALUES.has(status)
      ? env.DB.prepare(
          "SELECT * FROM orders WHERE status = ? ORDER BY created_at DESC LIMIT ?",
        ).bind(status, limit)
      : env.DB.prepare(
          "SELECT * FROM orders ORDER BY created_at DESC LIMIT ?",
        ).bind(limit);
  const result = await query.all();
  return json(request, env, { orders: result.results });
}

async function updateOrder(request, env, id) {
  assertAllowedOrigin(request, env);
  await requireAdmin(request, env);
  assertJson(request);
  const body = await readJson(request, 3000);
  const status = enumValue(body.status, STATUS_VALUES, null);
  const note = clean(body.adminNote, 1000, true);
  const publicNote = clean(body.publicNote, 500, true);
  const quotedAmount =
    body.quotedAmount === "" || body.quotedAmount == null
      ? null
      : Number(body.quotedAmount);
  if (!status) return json(request, env, { error: "Invalid status" }, 400);
  if (
    quotedAmount !== null &&
    (!Number.isInteger(quotedAmount) ||
      quotedAmount < 0 ||
      quotedAmount > 10000000)
  )
    return json(request, env, { error: "Invalid amount" }, 400);
  const result = await env.DB.prepare(
    "UPDATE orders SET status = ?, admin_note = ?, public_note = ?, quoted_amount = ?, updated_at = ? WHERE id = ?",
  )
    .bind(status, note, publicNote, quotedAmount, new Date().toISOString(), id)
    .run();
  return result.meta.changes
    ? json(request, env, { ok: true })
    : json(request, env, { error: "Order not found" }, 404);
}

function assertAllowedOrigin(request, env) {
  const origin = request.headers.get("Origin");
  const workerOrigin = new URL(request.url).origin;
  if (origin !== env.PUBLIC_ORIGIN && origin !== workerOrigin)
    throw new HttpError(403, "Origin denied");
}
function assertJson(request) {
  if (
    !(request.headers.get("Content-Type") || "")
      .toLowerCase()
      .startsWith("application/json")
  )
    throw new HttpError(415, "JSON required");
}
async function readJson(request, maxBytes) {
  const length = Number(request.headers.get("Content-Length") || 0);
  if (length > maxBytes) throw new HttpError(413, "Payload too large");
  const text = await request.text();
  if (new TextEncoder().encode(text).length > maxBytes)
    throw new HttpError(413, "Payload too large");
  try {
    return JSON.parse(text);
  } catch {
    throw new HttpError(400, "Invalid JSON");
  }
}
function clean(value, max, optional = false) {
  const text = String(value || "")
    .replace(/[\u0000-\u001F\u007F]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!optional && !text) throw new HttpError(400, "Required field missing");
  if (text.length > max) throw new HttpError(400, "Field too long");
  return text;
}
function enumValue(value, allowed, fallback) {
  return allowed.has(String(value || "")) ? String(value) : fallback;
}
async function requireAdmin(request, env) {
  const cookie = request.headers.get("Cookie") || "";
  const token = cookie
    .split(";")
    .map((v) => v.trim())
    .find((v) => v.startsWith("zj_admin="))
    ?.slice(9);
  if (!token || !(await verifySession(token, env.SESSION_SECRET)))
    throw new HttpError(401, "Unauthorized");
}
async function signSession(secret, exp) {
  const payload = btoa(JSON.stringify({ role: "admin", exp }));
  return `${payload}.${await hmac(secret, payload)}`;
}
async function verifySession(token, secret) {
  if (!secret) return false;
  const [payload, signature] = token.split(".");
  if (
    !payload ||
    !signature ||
    !constantTimeEqual(signature, await hmac(secret, payload))
  )
    return false;
  try {
    const data = JSON.parse(atob(payload));
    return data.role === "admin" && data.exp > Date.now() / 1000;
  } catch {
    return false;
  }
}
async function hmac(secret, value) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(value),
  );
  return [...new Uint8Array(sig)]
    .map((v) => v.toString(16).padStart(2, "0"))
    .join("");
}
async function sha256(value) {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(value),
  );
  return [...new Uint8Array(digest)]
    .map((v) => v.toString(16).padStart(2, "0"))
    .join("");
}
function randomToken() {
  const bytes = crypto.getRandomValues(new Uint8Array(24));
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}
function constantTimeEqual(a, b) {
  const left = new TextEncoder().encode(String(a));
  const right = new TextEncoder().encode(String(b));
  let diff = left.length ^ right.length;
  const length = Math.max(left.length, right.length);
  for (let i = 0; i < length; i++)
    diff |= (left[i % left.length] || 0) ^ (right[i % right.length] || 0);
  return diff === 0;
}
function corsResponse(request, env, body, status, extra = {}) {
  const origin = request.headers.get("Origin");
  const headers = new Headers({
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "no-referrer",
    "Content-Security-Policy": "default-src 'none'; frame-ancestors 'none'",
    ...extra,
  });
  if (origin === env.PUBLIC_ORIGIN) {
    headers.set("Access-Control-Allow-Origin", origin);
    headers.set("Vary", "Origin");
    headers.set("Access-Control-Allow-Credentials", "true");
    headers.set("Access-Control-Allow-Headers", "Content-Type");
    headers.set("Access-Control-Allow-Methods", "GET, POST, PATCH, OPTIONS");
  }
  return new Response(body, { status, headers });
}
function json(request, env, data, status = 200, extra = {}) {
  return corsResponse(request, env, JSON.stringify(data), status, extra);
}
class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

const ADMIN_JS_V2 = `
const q=s=>document.querySelector(s), labels={new:'待沟通',quoted:'已报价',awaiting_payment:'待付款',paid:'已付款',in_progress:'制作中',completed:'已完成',cancelled:'已取消'};
let cached=[];
const toolbar=q('.toolbar'), search=document.createElement('input'), stats=document.createElement('p');
search.placeholder='搜索订单号、称呼或联系方式';search.maxLength=80;search.addEventListener('input',render);toolbar.prepend(search);toolbar.after(stats);
q('#loginForm').addEventListener('submit',async e=>{e.preventDefault();q('#loginError').textContent='';const r=await fetch('/api/admin/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({password:q('#password').value})});if(!r.ok){q('#loginError').textContent=(await r.json()).error||'登录失败';return}q('#password').value='';q('#login').classList.add('hidden');q('#dashboard').classList.remove('hidden');load()});
q('#refresh').onclick=load;q('#filter').onchange=load;q('#logout').onclick=async()=>{await fetch('/api/admin/logout',{method:'POST'});location.reload()};
async function load(){const [r,sr]=await Promise.all([fetch('/api/admin/orders?limit=100&status='+encodeURIComponent(q('#filter').value)),fetch('/api/admin/stats')]);if(r.status===401){q('#login').classList.remove('hidden');q('#dashboard').classList.add('hidden');return}const data=await r.json(),sd=sr.ok?await sr.json():{};cached=data.orders||[];stats.dataset.views=sd.views30d||0;render()}
function field(tag,text){const el=document.createElement(tag);el.textContent=text;return el}
function render(){const term=search.value.trim().toLowerCase(),orders=cached.filter(o=>!term||[o.id,o.customer_name,o.contact].some(v=>String(v||'').toLowerCase().includes(term))),box=q('#orders');box.textContent='';stats.textContent='当前 '+orders.length+' 条｜待沟通 '+cached.filter(o=>o.status==='new').length+'｜待付款 '+cached.filter(o=>o.status==='awaiting_payment').length+'｜制作中 '+cached.filter(o=>o.status==='in_progress').length+'｜近30天访问 '+(stats.dataset.views||0);if(!orders.length){box.textContent='暂无匹配订单';return}for(const o of orders){const el=document.createElement('article');el.className='order';const info=document.createElement('div');info.append(field('h3',o.customer_name+' · '+o.plan),field('small',o.id+' · '+new Date(o.created_at).toLocaleString()+' · '+o.contact+' · '+o.timeline+' · '+o.budget),field('p',o.need));const controls=document.createElement('div'),sel=document.createElement('select');for(const [v,t] of Object.entries(labels)){const op=document.createElement('option');op.value=v;op.textContent=t;op.selected=v===o.status;sel.append(op)}const amount=document.createElement('input');amount.type='number';amount.min='0';amount.step='0.01';amount.placeholder='确认金额（元）';amount.value=o.quoted_amount==null?'':(o.quoted_amount/100).toFixed(2);const publicNote=document.createElement('textarea');publicNote.rows=3;publicNote.maxLength=500;publicNote.placeholder='客户可见进度说明';publicNote.value=o.public_note||'';const note=document.createElement('textarea');note.rows=3;note.maxLength=1000;note.placeholder='内部备注（客户不可见）';note.value=o.admin_note||'';const save=document.createElement('button');save.textContent='保存';save.onclick=async()=>{save.disabled=true;const cents=amount.value===''?'':Math.round(Number(amount.value)*100),rr=await fetch('/api/admin/orders/'+o.id,{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({status:sel.value,quotedAmount:cents,publicNote:publicNote.value,adminNote:note.value})});save.textContent=rr.ok?'已保存':'保存失败';if(rr.ok)load();setTimeout(()=>{save.textContent='保存';save.disabled=false},1200)};controls.append(sel,document.createElement('br'),amount,document.createElement('br'),publicNote,document.createElement('br'),note,document.createElement('br'),save);el.append(info,controls);box.append(el)}}
load();`;

function htmlHeaders() {
  return {
    "Content-Type": "text/html; charset=utf-8",
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "no-referrer",
    "X-Frame-Options": "DENY",
    "Content-Security-Policy":
      "default-src 'self'; script-src 'self'; style-src 'unsafe-inline'; img-src 'none'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'",
  };
}
const ADMIN_HTML = `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>知界订单管理</title><style>body{margin:0;background:#080b10;color:#eef3f8;font:14px/1.6 system-ui,"Microsoft YaHei"}.wrap{max-width:1180px;margin:auto;padding:40px 20px}h1{font-size:28px}.card{background:#111722;border:1px solid #273241;border-radius:18px;padding:22px;margin:18px 0}input,select,textarea,button{font:inherit;border-radius:10px;padding:10px 12px;border:1px solid #344255;background:#0b1018;color:#fff}button{cursor:pointer;background:#eaf4ff;color:#07101a;font-weight:700}.toolbar{display:flex;gap:10px;flex-wrap:wrap}.order{display:grid;grid-template-columns:1fr auto;gap:12px;border-top:1px solid #273241;padding:18px 0}.order small{color:#8fa0b4}.order p{white-space:pre-wrap}.order textarea{width:min(520px,90vw)}.hidden{display:none}.error{color:#ff9b9b}@media(max-width:650px){.order{grid-template-columns:1fr}}</style></head><body><main class="wrap"><h1>知界订单管理</h1><section id="login" class="card"><h2>管理员登录</h2><form id="loginForm"><input id="password" type="password" autocomplete="current-password" required placeholder="管理员密码"><button>登录</button></form><p id="loginError" class="error"></p></section><section id="dashboard" class="hidden"><div class="toolbar"><select id="filter"><option value="">全部状态</option><option value="new">待沟通</option><option value="quoted">已报价</option><option value="awaiting_payment">待付款</option><option value="paid">已付款</option><option value="in_progress">制作中</option><option value="completed">已完成</option><option value="cancelled">已取消</option></select><button id="refresh">刷新</button><button id="logout">退出</button></div><div id="orders" class="card"></div></section></main><script src="/admin.js"></script></body></html>`;
const ADMIN_JS = `const q=s=>document.querySelector(s),statusText={new:'待沟通',quoted:'已报价',awaiting_payment:'待付款',paid:'已付款',in_progress:'制作中',completed:'已完成',cancelled:'已取消'};q('#loginForm').addEventListener('submit',async e=>{e.preventDefault();q('#loginError').textContent='';const r=await fetch('/api/admin/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({password:q('#password').value})});if(!r.ok){q('#loginError').textContent=(await r.json()).error||'登录失败';return}q('#password').value='';q('#login').classList.add('hidden');q('#dashboard').classList.remove('hidden');load()});q('#refresh').onclick=load;q('#filter').onchange=load;q('#logout').onclick=async()=>{await fetch('/api/admin/logout',{method:'POST'});location.reload()};async function load(){const r=await fetch('/api/admin/orders?limit=100&status='+encodeURIComponent(q('#filter').value));if(r.status===401){q('#login').classList.remove('hidden');q('#dashboard').classList.add('hidden');return}const data=await r.json(),box=q('#orders');box.textContent='';if(!data.orders?.length){box.textContent='暂无订单';return}for(const o of data.orders){const el=document.createElement('article');el.className='order';const info=document.createElement('div');const title=document.createElement('h3');title.textContent=o.customer_name+' · '+o.plan;const meta=document.createElement('small');meta.textContent=new Date(o.created_at).toLocaleString()+' · '+o.contact+' · '+o.timeline+' · '+o.budget;const need=document.createElement('p');need.textContent=o.need;info.append(title,meta,need);const controls=document.createElement('div'),sel=document.createElement('select');for(const [v,t] of Object.entries(statusText)){const op=document.createElement('option');op.value=v;op.textContent=t;op.selected=v===o.status;sel.append(op)}const note=document.createElement('textarea');note.rows=3;note.maxLength=1000;note.placeholder='内部备注';note.value=o.admin_note||'';const save=document.createElement('button');save.textContent='保存';save.onclick=async()=>{save.disabled=true;const rr=await fetch('/api/admin/orders/'+o.id,{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({status:sel.value,adminNote:note.value})});save.textContent=rr.ok?'已保存':'保存失败';setTimeout(()=>{save.textContent='保存';save.disabled=false},1200)};controls.append(sel,document.createElement('br'),note,document.createElement('br'),save);el.append(info,controls);box.append(el)}}load();`;
