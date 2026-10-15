/* ============ STORE (local cache + private GitHub repo) ============ */
const S = {checkins:{}, sessions:{}, tests:{}, settings:{}};
const COLS = Object.keys(S);
const VAPID_PUBLIC = "BGdgUrJ3O8IIqYpF-MPujZSXU1B8Ad1bjmk1el6vuz7tjvzqO3x4uRZC3pU_khly4fTlIrqAenMrBLXKLDfYYWE";
const LS = {
  get(k, d){ try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch(e){ return d; } },
  set(k, v){ try { localStorage.setItem(k, JSON.stringify(v)); } catch(e){} },
  del(k){ try { localStorage.removeItem(k); } catch(e){} },
};
const GH = {
  token: LS.get("swole:token", ""),
  owner: LS.get("swole:owner", ""),
  repo: "swole-data",
  sha: {},
  dirty: LS.get("swole:dirty", {}),
  state: "local",      // local | syncing | synced | error
  lastSync: LS.get("swole:lastSync", null),
  lastError: LS.get("swole:lastError", ""),
};
COLS.forEach(c => { S[c] = LS.get("swole:data:" + c, {}); });

function b64e(str){ const bytes = new TextEncoder().encode(str); let bin = ""; for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000)); return btoa(bin); }
function b64d(b64){ const bin = atob(b64.replace(/\s/g, "")); const bytes = Uint8Array.from(bin, c => c.charCodeAt(0)); return new TextDecoder().decode(bytes); }

async function gh(path, opts = {}){
  const r = await fetch("https://api.github.com" + path, {
    cache: "no-store", ...opts,
    headers: {Accept: "application/vnd.github+json", Authorization: "Bearer " + GH.token, "X-GitHub-Api-Version": "2022-11-28", ...(opts.headers || {})},
  });
  if (!r.ok && r.status !== 404){ let m = ""; try { m = (await r.clone().json()).message || ""; } catch(_){} const e = new Error("GitHub " + r.status + (m ? " (" + m + ")" : "")); e.status = r.status; throw e; }
  return r;
}
async function ghGet(file){
  const r = await gh(`/repos/${GH.owner}/${GH.repo}/contents/${file}`);
  if (r.status === 404) return {data: null, sha: null};
  const j = await r.json();
  return {data: JSON.parse(b64d(j.content)), sha: j.sha};
}
async function ghPut(file, data, message){
  const send = async () => {
    const body = {message, content: b64e(JSON.stringify(data, null, 1))};
    if (GH.sha[file]) body.sha = GH.sha[file];
    const r = await gh(`/repos/${GH.owner}/${GH.repo}/contents/${file}`, {method: "PUT", body: JSON.stringify(body)});
    const j = await r.json(); GH.sha[file] = j.content.sha;
  };
  try { await send(); }
  catch(e){
    if (e.status === 409 || e.status === 422){            // sha out of date: refetch, merge, retry once
      const remote = await ghGet(file); GH.sha[file] = remote.sha;
      if (remote.data) Object.assign(data, {...remote.data, ...data});
      await send();
    } else throw e;
  }
}
function setSyncState(s){ GH.state = s; const dot = document.getElementById("syncdot"); if (dot) dot.dataset.state = s; }

async function loadAll(){
  if (!GH.token || !GH.owner) { setSyncState("local"); return; }
  setSyncState("syncing");
  try {
    for (const c of COLS){
      const {data, sha} = await ghGet(`data/${c}.json`);
      GH.sha[`data/${c}.json`] = sha;
      if (data){
        // remote is the base; unsynced local edits win
        S[c] = GH.dirty[c] ? {...data, ...S[c]} : data;
        LS.set("swole:data:" + c, S[c]);
      }
    }
    await flush();
    setSyncState(COLS.some(c => GH.dirty[c]) ? "error" : "synced");
  } catch(e){ GH.lastError = (e && e.message || "error") + " while loading"; LS.set("swole:lastError", GH.lastError); setSyncState("error"); }
}
let flushing = null;
async function flush(){
  if (!GH.token || !GH.owner || !navigator.onLine) return;
  if (flushing) return flushing;
  flushing = (async () => {
    for (const c of COLS){
      if (!GH.dirty[c]) continue;
      try {
        await ghPut(`data/${c}.json`, S[c], `${c}: update from app`);
        GH.dirty[c] = false; LS.set("swole:dirty", GH.dirty);
      } catch(e){ GH.lastError = (e && e.message || "error") + " while saving " + c; LS.set("swole:lastError", GH.lastError); setSyncState("error"); flushing = null; return; }
    }
    GH.lastSync = new Date().toISOString(); LS.set("swole:lastSync", GH.lastSync);
    GH.lastError = ""; LS.set("swole:lastError", "");
    flushing = null;
    // something may have been saved while this flush was running: go again
    if (COLS.some(c => GH.dirty[c])) return flush();
    setSyncState("synced");
  })();
  return flushing;
}
async function save(c, id, data){
  S[c] = {...S[c], [id]: data};
  LS.set("swole:data:" + c, S[c]);
  GH.dirty[c] = true; LS.set("swole:dirty", GH.dirty);
  if (GH.token){ setSyncState("syncing"); flush(); }
}
window.addEventListener("online", () => flush());
document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible") loadAll().then(() => { applyTheme(); render(); }); });

async function connectGitHub(token){
  GH.token = token.trim();
  try {
    const me = await (await gh("/user")).json();
    if (!me.login) throw new Error("no login");
    GH.owner = me.login;
    const repo = await gh(`/repos/${GH.owner}/${GH.repo}`);
    if (repo.status === 404) throw Object.assign(new Error("repo"), {status: 404});
    LS.set("swole:token", GH.token); LS.set("swole:owner", GH.owner);
    COLS.forEach(c => { if (Object.keys(S[c]).length) GH.dirty[c] = true; });
    LS.set("swole:dirty", GH.dirty);
    await loadAll();
    return {ok: true};
  } catch(e){
    GH.token = ""; GH.owner = "";
    return {ok: false, why: e.status === 401 ? "That token was refused. Check it and try again." : e.status === 404 || e.message === "repo" ? "Couldn't find the private repo swole-data. Give the token access to it." : "Couldn't reach GitHub. Check your connection."};
  }
}
function disconnectGitHub(){ GH.token = ""; GH.owner = ""; LS.del("swole:token"); LS.del("swole:owner"); setSyncState("local"); }

/* ============ PUSH ============ */
const isStandalone = () => window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;
function urlB64ToUint8Array(b64){ const pad = "=".repeat((4 - b64.length % 4) % 4); const raw = atob((b64 + pad).replace(/-/g, "+").replace(/_/g, "/")); return Uint8Array.from(raw, c => c.charCodeAt(0)); }
async function pushState(){
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) return "unsupported";
  try { const reg = await navigator.serviceWorker.ready; const sub = await reg.pushManager.getSubscription(); return sub ? "on" : (Notification.permission === "denied" ? "denied" : "off"); } catch(e){ return "off"; }
}
async function enablePush(){
  if (!isStandalone() && /iPhone|iPad/.test(navigator.userAgent)){ toast("First add Swole to your Home Screen, then open it from there."); return false; }
  if (!("serviceWorker" in navigator) || !("PushManager" in window)){ toast("This browser can't receive reminders."); return false; }
  const perm = await Notification.requestPermission();
  if (perm !== "granted"){ toast("Notifications are off. Turn them on in iOS Settings → Swole."); return false; }
  const reg = await navigator.serviceWorker.ready;
  let sub = await reg.pushManager.getSubscription();
  if (!sub) sub = await reg.pushManager.subscribe({userVisibleOnly: true, applicationServerKey: urlB64ToUint8Array(VAPID_PUBLIC)});
  const json = sub.toJSON();
  const key = json.endpoint.slice(-24).replace(/[^A-Za-z0-9]/g, "");
  const push = {...(S.settings.push || {subs: {}})};
  push.subs = {...(push.subs || {}), [key]: {...json, device: navigator.userAgent.slice(0, 80), at: new Date().toISOString()}};
  await save("settings", "push", push);
  toast("Reminder on. See you at 06:05.");
  return true;
}

/* ============ SWOLE (drawn fallback) ============ */
function swoleSVG(mood){
  const P = "#F3EEE7", K = "#14181B", R = "#E5322D";
  const uid = "s"+Math.random().toString(36).slice(2,7);
  const brows = mood === "stern"
    ? `<path d="M77 90 L96 99" /><path d="M123 90 L104 99" />`
    : mood === "grin"
    ? `<path d="M77 95 Q86 91 96 96" /><path d="M123 95 Q114 91 104 96" />`
    : `<path d="M77 93 L96 97" /><path d="M123 93 L104 97" />`;
  const eyeY = mood === "grin" ? 104 : 103;
  const eyes = `<path d="M80 ${eyeY} Q87 ${eyeY-5} 95 ${eyeY} Q87 ${eyeY+3} 80 ${eyeY} Z" fill="${P}" stroke="${K}" stroke-width="2"/>
    <path d="M120 ${eyeY} Q113 ${eyeY-5} 105 ${eyeY} Q113 ${eyeY+3} 120 ${eyeY} Z" fill="${P}" stroke="${K}" stroke-width="2"/>
    <circle cx="89" cy="${eyeY-0.5}" r="2.3" fill="${R}"/><circle cx="111" cy="${eyeY-0.5}" r="2.3" fill="${R}"/>`;
  const mouth = mood === "grin" ? `<path d="M88 127 Q100 133 114 123" stroke-width="3"/><path d="M112 121 L116 124" stroke-width="2"/>`
    : mood === "stern" ? `<path d="M90 129 L110 129" stroke-width="3.5"/>`
    : `<path d="M90 128 Q100 130 110 127" stroke-width="3"/>`;
  return `<svg viewBox="0 0 200 232" role="img" aria-label="Swole, your coach">
  <defs>
    <pattern id="h${uid}" width="4" height="4" patternUnits="userSpaceOnUse" patternTransform="rotate(40)"><line x1="0" y1="0" x2="0" y2="4" stroke="${K}" stroke-width="1.3"/></pattern>
    <pattern id="b${uid}" width="3.2" height="3.2" patternUnits="userSpaceOnUse"><rect width="3.2" height="3.2" fill="#2A3034"/><circle cx="1.6" cy="1.6" r=".75" fill="${K}"/></pattern>
  </defs>
  <path d="M10 232 C14 194 46 176 78 170 L100 188 L122 170 C154 176 186 194 190 232 Z" fill="#1F2427" stroke="${P}" stroke-width="1.6"/>
  <g stroke="#323a3f" stroke-width="1.4">${[34,44,54,64,136,146,156,166].map(x=>`<path d="M${x} ${x<100?200-(x-30)/3:200-(170-x)/3} L${x+(x<100?-4:4)} 232"/>`).join("")}</g>
  <path d="M82 170 C64 172 46 179 30 192" stroke="${P}" stroke-width="1.6" fill="none"/>
  <path d="M118 170 C136 172 154 179 170 192" stroke="${P}" stroke-width="1.6" fill="none"/>
  <path d="M84 136 L81 171 L100 188 L119 171 L116 136 Z" fill="${P}" stroke="${K}" stroke-width="2.4"/>
  <path d="M84 140 L116 140 L117 152 Q100 162 83 152 Z" fill="url(#h${uid})"/>
  <path d="M92 160 L94 176" stroke="${K}" stroke-width="1.5"/><path d="M108 160 L106 176" stroke="${K}" stroke-width="1.5"/>
  <ellipse cx="68" cy="102" rx="6" ry="10" fill="${P}" stroke="${K}" stroke-width="2.2"/>
  <ellipse cx="132" cy="102" rx="6" ry="10" fill="${P}" stroke="${K}" stroke-width="2.2"/>
  <path d="M68 86 C68 52 82 40 100 40 C118 40 132 52 132 86 L131 110 C129 130 116 145 100 147 C84 145 71 130 69 110 Z" fill="${P}" stroke="${K}" stroke-width="2.6"/>
  <path d="M118 62 C130 72 132 88 131 110 C129 130 116 145 100 147 C113 137 121 122 121 102 C121 86 120 72 118 62 Z" fill="url(#h${uid})" opacity=".85"/>
  <path d="M68 84 C66 50 82 37 100 37 C118 37 134 50 132 84 C128 70 116 63 100 63 C84 63 72 70 68 84 Z" fill="url(#b${uid})" stroke="${K}" stroke-width="2.4"/>
  <path d="M65 78 C82 70 118 70 135 78 L135 89 C118 81 82 81 65 89 Z" fill="${R}" stroke="${K}" stroke-width="2.4"/>
  <g stroke="${P}" stroke-width="1.4" opacity=".85"><path d="M76 76 L80 86"/><path d="M90 73 L94 83"/><path d="M106 73 L110 83"/><path d="M120 75 L124 85"/></g>
  <path d="M134 80 L150 70 L147 92 Z" fill="${R}" stroke="${K}" stroke-width="2.2"/>
  <g stroke="${K}" stroke-width="4.2" stroke-linecap="round" fill="none">${brows}</g>
  ${eyes}
  <g stroke="${K}" fill="none" stroke-linecap="round"><path d="M100 104 L96 117 Q100 120 104 117" stroke-width="2"/><path d="M76 116 L83 122" stroke-width="1.6"/><path d="M124 116 L117 122" stroke-width="1.6"/>${mouth}</g>
  <path d="M28 232 C38 208 68 202 100 206 C132 202 162 208 172 232 Z" fill="#283036" stroke="${P}" stroke-width="1.4"/>
  <g stroke="${K}" stroke-width="2.2"><rect x="38" y="203" width="34" height="24" rx="9" fill="${P}"/><rect x="128" y="203" width="34" height="24" rx="9" fill="${P}"/></g>
  <g stroke="${R}" stroke-width="2.6"><path d="M44 205 L50 226"/><path d="M53 204 L59 226"/><path d="M62 204 L67 225"/><path d="M138 204 L133 225"/><path d="M147 204 L141 226"/><path d="M156 205 L150 226"/></g>
</svg>`;
}

/* ============ AVATAR (uploaded art) ============ */
const BUILTIN = {src:"media/cut-default.webp", type:"image/webp", cut:true};
const BUILTIN_SLOT = {
  klar:{src:"media/cut-ready.webp", type:"image/webp", cut:true},
  skru:{src:"media/cut-bench.webp", type:"image/webp", cut:true},
  rest:{src:"media/cut-recover.webp", type:"image/webp", cut:true},
};
/* v11 character pack */
const MOMENT = {
  intro:{src:"media/m-intro.webp", ms:5100, word:"I'M SWOLE", sub:"Your coach for the next 26 weeks. Check in every morning. I'll handle the rest."},
  kick:{src:"media/m-kick.webp", ms:5100, word:"LET'S GO", sub:""},
  flex:{src:"media/m-flex.webp", ms:5100, word:"DONE", sub:"Logged. That's how you get swole."},
  pose:{src:"media/m-pose.webp", ms:5100, word:"SWOLE", sub:""},
  shadow:{src:"media/m-shadow.webp", ms:6100, word:"FINISHED", sub:"Intervals done. Log your max HR."},
};
const EMO = n => `media/emote/${n}.webp`;
const POSE = n => `media/pose/${n}.webp`;
function artFor(slot){
  const a = (S.settings.avatar) || {};
  if (a[slot] && a[slot].id) return a[slot];
  if (a.std && a.std.id) return a.std;
  return BUILTIN_SLOT[slot] || BUILTIN;
}
const isCutout = art => !art.fill && !art.src && /png|webp|gif/.test(art.type || "");
function mediaTag(art){
  const src = art.src || "/_blob/" + art.id;
  if (art.cut) return `<img src="${src}" alt="Swole" decoding="async">`;
  return (art.type || "").startsWith("video/")
    ? `<video src="${src}" ${art.poster ? `poster="${art.poster}"` : ""} autoplay muted loop playsinline aria-label="Swole"></video>`
    : `<img src="${src}" alt="Swole">`;
}

/* ============ READINESS ============ */
function readiness(ci){
  if (!ci) return null;
  const sleep = {"<6":0,"6-7":1,"7-8":2,"8+":2}[ci.sleep] ?? 1;
  const energy = ((ci.energy||3)-1)/2;
  const sore = (5-(ci.sore||3))/2;
  const stress = {lav:2,moderat:1,hoj:0}[ci.stress] ?? 1;
  const score = sleep+energy+sore+stress;
  const level = score >= 6 ? "g" : score >= 4 ? "y" : "r";
  const food = ({"1-2":0,"3":1,"4":2,"5+":2}[ci.meals] ?? 1) + ({alle:2,fleste:1,faa:0}[ci.protein] ?? 1) + ({ja:1,ingen:1,nej:0}[ci.carbs] ?? 0);
  return {score, level, food, knee:(ci.knee||0) >= 2};
}
const LEVEL = {
  g:{word:"Ready", slot:"klar", color:"var(--ok)", mood:"grin", line:"Green light. Run the plan as written."},
  y:{word:"Dial down", slot:"skru", color:"var(--warn)", mood:"neutral", line:"Yellow. We train, but dial it down: one set less on the heavy lifts, no max sprints."},
  r:{word:"Recover", slot:"rest", color:"var(--bad)", mood:"stern", line:"Red. Today you rebuild with mobility and easy zone 2. That's training too."},
};
function foodLine(f){
  if (f >= 4) return "Food looks solid. Keep it up.";
  if (f >= 2) return "You want to gain weight. Add one more meal and get protein in all of them.";
  return "You won't build muscle on that. Today: 4 meals, a palm of protein in each.";
}

const ICON = {
  gear:`<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/></svg>`,
  edit:`<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>`,
  chat:`<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>`,
};
/* ============ UI STATE ============ */
let tab = "dag";
let homeMode = "today";
let lockerCat = "fightwear";
let schedMode = "week";
let schedDate = new Date();

function toast(msg){ const t = document.getElementById("toast"); t.textContent = msg; t.hidden = false; clearTimeout(toast._t); toast._t = setTimeout(() => { t.hidden = true; }, 2200); }

function statusChip(key){
  const s = S.sessions[key];
  if (!s) return "";
  const m = {done:["ok","Done"], part:["part","Partly"], skip:["skip","Skipped"]}[s.status];
  return m ? `<span class="st ${m[0]}">${m[1]}</span>` : "";
}

function render(){
  document.querySelectorAll("#tabs button").forEach(b => b.setAttribute("aria-current", b.dataset.tab === tab));
  const app = document.getElementById("app");
  const fixed = tab === "dag" && (homeMode === "today" || homeMode === "locker");
  app.classList.toggle("is-home", fixed);
  document.documentElement.classList.toggle("lock", fixed);
  app.classList.toggle("is-locker", tab === "dag" && homeMode === "locker");
  app.classList.toggle("is-social", tab !== "dag");
  let html;
  if (tab === "dag"){
    html = homeMode === "locker" ? viewLocker()
      : homeMode === "schedule" ? hubBar() + viewSchedule()
      : homeMode === "plan" ? hubBar() + viewPlan()
      : homeMode === "tests" ? hubBar() + viewTests()
      : viewHome();
  } else html = tab === "community" ? viewCommunity() : tab === "feed" ? viewFeed() : tab === "search" ? viewSearch() : viewYou();
  app.innerHTML = html;

}

/* ---------- HOME ---------- */
function viewHome(){
  const d = new Date(), key = iso(d);
  const w = weekNo(d), ph = w >= 1 && w <= 26 ? phaseOf(w) : null;
  const ci = S.checkins[key], r = readiness(ci);
  const items = plannedFor(d);
  let word = "Check in", mood = "neutral", slot = "std", lines = [];
  if (r){
    const L = LEVEL[r.level]; word = L.word; mood = L.mood; slot = L.slot;
    lines.push(L.line);
    if (r.knee) lines.push("The knee says no. No jumps today. Isometrics instead.");
    lines.push(foodLine(r.food));
  } else if (w < 1){
    word = "Soon";
    lines.push("Test week starts Monday, Oct 19. Until then, train as usual. Sleep, eat, show up rested.");
    lines.push("You can start checking in now so we have a baseline.");
  } else {
    lines.push("Check in first. Then I'll know what you've got today.");
  }
  const art = artFor(slot);
  const stars = r ? Math.max(1, Math.min(5, Math.round(r.score/8*5))) : 0;
  const tm = addDays(d,1), tItems = plannedFor(tm);
  const status = r ? LEVEL[r.level].word : "Not checked in";
  const wk = ph ? `Week ${w} · ${ph.name}` : w < 1 ? `Starts Oct 19 · ${daysBetween(d,START)} days` : "Plan complete";
  const nu = newUnlocks().length;
  return `
  <section class="home3">
    <svg class="bigword" viewBox="0 0 1000 500" aria-hidden="true"><text x="0" y="492" textLength="1000" lengthAdjust="spacingAndGlyphs">SWOLE</text></svg>
    <div class="h3fig">${outfitLook() ? `<img src="${outfitLook()}" alt="Swole">` : art ? mediaTag(art) : swoleSVG(mood)}</div>
    <p class="h3say"><b>Report says:</b> ${lines.map(esc).join(" ")}</p>
    ${topBar(false, nu)}
    <div class="card2 h3today">
      <div class="today2-h"><button class="hubopen" data-hub="schedule"><h2>Today</h2><i>Schedule ›</i></button><span>Tomorrow · ${tItems.length ? tItems.map(it => esc(SESS[it.id].title.split(" · ")[0])).join(" + ") : "Rest"}</span></div>
      ${items.length ? items.map(it => { const s2 = SESS[it.id], k = key+"_"+it.slot;
        return `<button class="r2 kind-${s2.kind}" data-open="${k}|${it.id}"><span class="t2">${esc(slotTime(it))}</span><span class="n2">${esc(s2.title)}<small>${esc(s2.dur)} · ${esc(s2.sub)}</small></span>${statusChip(k) || `<span class="go2">›</span>`}</button>`; }).join("")
        : `<div class="r2"><span class="t2">All day</span><span class="n2">Rest day<small>Walk, eat, sleep 8 hours</small></span><span></span></div>`}
      <button class="pill wide" data-act="checkin">${ci ? "Redo check-in" : "Start check-in"}</button>
    </div>
  </section>`;
}
function topBar(inLocker, nu){
  return `<div class="h3top"><button class="sqbtn" data-act="settings" aria-label="Settings">${ICON.gear}<span id="syncdot" data-state="${GH.state}"></span></button><button class="lockpill ${inLocker ? "on" : ""}" data-act="locker">Locker${nu && !inLocker ? `<i class="nu">${nu}</i>` : ""}</button></div>`;
}

function hubBar(){
  const t = [["schedule","Schedule"],["plan","Plan"],["tests","Tests"]];
  return `<div class="hubbar"><button class="hubback" data-act="hubback" aria-label="Back to Today">‹ Today</button><div class="hubseg">${t.map(x => `<button data-hub="${x[0]}" aria-pressed="${homeMode === x[0]}">${x[1]}</button>`).join("")}</div></div>`;
}

/* ---------- LOCKER ---------- */
function viewLocker(){
  const st = lockerStats(), eq = equipped(), seen = LS.get("swole:lockerSeen", []);
  const tiles = ITEMS.filter(it => it.cat === lockerCat).map(it => {
    const s = itemState(it, st), R = RARITY[it.rarity], on = it.slot === "outfit" ? eq.outfit === it.id : (eq[it.slot] === it.id && !eq.outfit), isNew = s.open && it.unlock.type !== "start" && !seen.includes(it.id);
    return `<button class="ltile ${s.open ? "" : "locked"} ${on ? "on" : ""}" style="--rc:${R.c}" data-item="${it.id}" aria-label="${esc(it.name)}${s.open ? "" : " (locked)"}">
      ${it.img ? `<img src="${it.img}" alt="" loading="lazy">` : `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round">${SLOT_ICON[it.slot] || SLOT_ICON.extra}</svg>`}
      ${s.open ? "" : `<span class="lk"><svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg></span><span class="prog"><i style="width:${Math.round(s.have/s.need*100)}%"></i></span>`}
      ${on ? `<span class="eq">✓</span>` : ""}${isNew ? `<span class="new">NEW</span>` : ""}
    </button>`;
  }).join("");
  const owned = ITEMS.filter(i => itemState(i, st).open).length;
  return `
  <section class="locker">
    ${topBar(true, 0)}
    <div class="lhead"><span>${owned}/${ITEMS.length} unlocked</span></div>
    <div class="lcats">${CATS.map(c => `<button class="lcat" data-lcat="${c[0]}" aria-pressed="${lockerCat === c[0]}">${c[1]}</button>`).join("")}</div>
    <div class="lgrid">${tiles}</div>
    <div class="lfig">${outfitLook() ? `<img src="${outfitLook()}" alt="Swole">` : mediaTag(BUILTIN)}</div>
  </section>`;
}
function openItem(id){
  const it = ITEMS.find(i => i.id === id); if (!it) return;
  const st = lockerStats(), s = itemState(it, st), R = RARITY[it.rarity], eqd = equipped();
  const on = it.slot === "outfit" ? eqd.outfit === it.id : (eqd[it.slot] === it.id && !eqd.outfit);
  const seen = LS.get("swole:lockerSeen", []); if (s.open && !seen.includes(id)){ LS.set("swole:lockerSeen", [...seen, id]); }
  openSheet(`
    <div class="close"><span class="eyebrow">Locker · ${esc(SLOTS[it.slot] || it.slot)}</span><button data-act="close">Close ✕</button></div>
    <div class="idet" style="--rc:${R.c}">
      <div class="iart ${s.open ? "" : "locked"}">${it.img ? `<img src="${it.img}" alt="">` : `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round">${SLOT_ICON[it.slot] || SLOT_ICON.extra}</svg>`}</div>
      <span class="rar">${R.label}</span>
      <h1 class="sh-title">${esc(it.name)}</h1>
      <p>${esc(it.desc || "")}</p>
      ${it.unlock.type === "start" ? "" : `<div class="ireq"><div><b>${esc(UNLOCK_TEXT[it.unlock.type](it.unlock.n))}</b><span>${s.have} / ${s.need}</span></div><span class="prog big"><i style="width:${Math.round(s.have/s.need*100)}%"></i></span></div>`}
      ${!s.open ? `<button class="pill wide" disabled>Locked</button>`
        : it.slot === "outfit" && on ? `<button class="pill wide" data-unequip="outfit">Back to fight kit</button>`
        : `<button class="pill wide" data-equip="${it.id}" ${on ? "disabled" : ""}>${on ? "Equipped" : "Equip"}</button>`}
      ${s.open && !it.look ? `<p class="inote">${it.slot === "outfit" ? "Swole wears this outfit as soon as its render is in." : "Swole's figure shows this item once its render is made."}</p>` : ""}
    </div>`);
}
async function unequipOutfit(){
  const L = {...lockerData()}; L.equipped = {...equipped()}; const was = L.equipped.outfit; delete L.equipped.outfit;
  await save("settings", "locker", L); toast("Fight kit back on."); if (was) openItem(was);
}
async function equipItem(id){
  const it = ITEMS.find(i => i.id === id); if (!it) return;
  const L = {...lockerData()}; L.equipped = {...equipped(), [it.slot]: id};
  if (it.slot !== "outfit") delete L.equipped.outfit;   // picking fight gear puts the fight kit back on
  await save("settings", "locker", L);
  toast(`${it.name} equipped.`);
  openItem(id);
}
function bindTilt(){
  const h = document.getElementById("hero"); if (!h) return;
  if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const set = (x,y) => { h.style.setProperty("--px", x.toFixed(3)); h.style.setProperty("--py", y.toFixed(3)); };
  h.addEventListener("pointermove", e => { const b = h.getBoundingClientRect(); set(((e.clientX-b.left)/b.width-.5)*2, ((e.clientY-b.top)/b.height-.5)*2); });
  h.addEventListener("pointerleave", () => set(0,0));
  h.addEventListener("pointerup", () => set(0,0));
}

/* ---------- SCHEDULE ---------- */
function viewSchedule(){
  const modes = [["day","Day"],["week","Week"],["month","Month"],["year","Year"]];
  let label = "", sub = "", body = "";
  const d = schedDate;
  if (schedMode === "day"){
    const w = weekNo(d), ph = w >= 1 && w <= 26 ? phaseOf(w) : null;
    label = `${DAY[dow(d)]} ${fmt(d)}`; sub = ph ? `Week ${w} · ${ph.name}` : d.getFullYear();
    const items = plannedFor(d), ci = S.checkins[iso(d)], r = readiness(ci);
    body = `${r ? `<div class="banner ${r.level === "g" ? "g" : r.level}">Check-in: ${LEVEL[r.level].word}. ${esc(LEVEL[r.level].line)}</div>` : ""}
      <div class="list">${items.length ? items.map(it => sessCard(d,it)).join("") : `<div class="empty">Rest day.</div>`}</div>`;
  } else if (schedMode === "week"){
    const base = addDays(d, -dow(d)), w = weekNo(base), ph = w >= 1 && w <= 26 ? phaseOf(w) : null;
    label = `${fmt(base)} – ${fmt(addDays(base,6))}`; sub = ph ? `Week ${w} of 26 · ${ph.name}` : w < 1 ? "Before start" : "After the plan";
    let rows = "";
    for (let i = 0; i < 7; i++){
      const dd = addDays(base,i), items = plannedFor(dd), r = readiness(S.checkins[iso(dd)]);
      rows += `<div class="d ${iso(dd) === iso(new Date()) ? "today" : ""}"><b>${DAY[i]}</b><span>${fmt(dd)}</span>${r ? `<br><span class="dot" style="background:${LEVEL[r.level].color};margin-top:6px"></span>` : ""}</div>
        <div class="c">${items.length ? items.map(it => { const s = SESS[it.id], key = iso(dd)+"_"+it.slot;
          return `<button class="mini" data-open="${key}|${it.id}"><i>${it.slot === "am" ? "AM" : "PM"}</i><span class="tt">${esc(s.title)}</span>${statusChip(key)}</button>`; }).join("") : `<span class="eyebrow" style="padding:8px 0">Rest</span>`}</div>`;
    }
    body = `${ph && ph.deload ? `<div class="banner y">Deload week. 50–60 % of normal volume, no max sprints.</div>` : ""}
      ${ph && ph.key === "jul" ? `<div class="banner n">Christmas. The gym may be closed. Do the 3 short sessions and enjoy the rest.</div>` : ""}
      <div class="wk">${rows}</div>`;
  } else if (schedMode === "month"){
    const first = new Date(d.getFullYear(), d.getMonth(), 1), dim = new Date(d.getFullYear(), d.getMonth()+1, 0).getDate();
    label = `${MONL[d.getMonth()]}`; sub = d.getFullYear();
    let cells = DAY.map(n => `<div class="hd">${n}</div>`).join("");
    for (let i = 0; i < dow(first); i++) cells += `<div class="cell out"></div>`;
    for (let n = 1; n <= dim; n++){
      const dd = new Date(d.getFullYear(), d.getMonth(), n), items = plannedFor(dd);
      const allDone = items.length && items.every(it => (S.sessions[iso(dd)+"_"+it.slot] || {}).status === "done");
      if (dow(dd) === 0){ const ph = weekNo(dd) >= 1 && weekNo(dd) <= 26 ? phaseOf(weekNo(dd)) : null; if (ph && (ph.deload || ["test","rt1","d3","end","jul"].includes(ph.key))) cells += `<div class="wkband">↓ ${esc(ph.name)}</div>`; }
      cells += `<button class="cell ${iso(dd) === iso(new Date()) ? "today" : ""}" data-goday="${iso(dd)}" aria-label="${DAYL[dow(dd)]} ${fmt(dd)}">
        <span class="n"><span>${n}</span>${allDone ? "<em>✓</em>" : ""}</span>
        ${items.map(it => `<span class="bar k-${SESS[it.id].kind} ${(S.sessions[iso(dd)+"_"+it.slot]||{}).status === "done" ? "done" : ""}"></span>`).join("")}
      </button>`;
    }
    body = `<div class="cal">${cells}</div>${legend()}`;
  } else {
    const startM = new Date(d.getFullYear(), d.getMonth(), 1);
    label = `${MON[startM.getMonth()]} ${startM.getFullYear()} – ${MON[(startM.getMonth()+11)%12]} ${startM.getFullYear() + (startM.getMonth() ? 1 : 0)}`; sub = "12 months";
    let months = "";
    for (let m = 0; m < 12; m++){
      const f = new Date(startM.getFullYear(), startM.getMonth()+m, 1), dim = new Date(f.getFullYear(), f.getMonth()+1, 0).getDate();
      const phs = [...new Set(Array.from({length:dim},(_,i)=>{ const w = weekNo(new Date(f.getFullYear(),f.getMonth(),i+1)); return w>=1&&w<=26 ? phaseOf(w).name : null; }).filter(Boolean))];
      let g = "";
      for (let i = 0; i < dow(f); i++) g += `<i class="e"></i>`;
      for (let n = 1; n <= dim; n++){
        const dd = new Date(f.getFullYear(), f.getMonth(), n), am = plannedFor(dd).find(x => x.slot === "am");
        g += `<i class="${am ? "k-"+SESS[am.id].kind : ""} ${iso(dd) === iso(new Date()) ? "t" : ""}"></i>`;
      }
      const cur = f.getFullYear() === new Date().getFullYear() && f.getMonth() === new Date().getMonth();
      months += `<button class="ym ${cur ? "cur" : ""}" data-gomonth="${iso(f)}"><b>${MON[f.getMonth()]} ${String(f.getFullYear()).slice(2)}</b><div class="ph">${phs.length ? esc(phs.join(" · ")) : "Muay Thai only"}</div><div class="g">${g}</div></button>`;
    }
    body = `<div class="year">${months}</div>${legend(true)}`;
  }
  return `
  <div class="top"><div class="brand">Schedule<b>.</b></div><button class="iconbtn" data-act="stoday">Today</button></div>
  <div class="seg">${modes.map(m => `<button data-mode="${m[0]}" aria-pressed="${schedMode === m[0]}">${m[1]}</button>`).join("")}</div>
  <div class="snav"><button data-act="sprev" aria-label="Previous">‹</button><div class="mid"><b>${esc(label)}</b><span class="eyebrow">${esc(sub)}</span></div><button data-act="snext" aria-label="Next">›</button></div>
  ${body}`;
}
function legend(amOnly){
  const ks = [["strength","Strength"],["conditioning","Conditioning"],["mobility","Mobility"],["test","Test"]].concat(amOnly ? [] : [["mt","Muay Thai"]]);
  return `<div class="legend">${ks.map(k => `<span><i class="k-${k[0]}"></i>${k[1]}</span>`).join("")}${amOnly ? `<span>Morning sessions only</span>` : `<span><i style="box-shadow:0 0 0 1.5px var(--white);background:var(--card-2)"></i>Logged done</span>`}</div>`;
}
function shiftSched(dir){
  const d = schedDate;
  if (schedMode === "day") schedDate = addDays(d, dir);
  else if (schedMode === "week") schedDate = addDays(d, 7*dir);
  else if (schedMode === "month") schedDate = new Date(d.getFullYear(), d.getMonth()+dir, 1);
  else schedDate = new Date(d.getFullYear(), d.getMonth()+12*dir, 1);
}
function sessCard(d, it){
  const s = SESS[it.id], key = iso(d)+"_"+it.slot;
  return `<button class="sess kind-${s.kind}" data-open="${key}|${it.id}">
    <span class="slot" aria-hidden="true"></span>
    <span style="min-width:0"><span class="t">${esc(s.title)}</span><br><span class="s">${esc(slotTime(it))} · ${esc(s.dur)} · ${esc(s.sub)}</span></span>
    ${statusChip(key) || `<span class="st go">›</span>`}
  </button>`;
}

/* ---------- PLAN ---------- */
function viewPlan(){
  const cw = weekNo(new Date());
  return `
  <div class="top"><div class="brand">Plan<b>.</b></div><span class="eyebrow">Oct 19 → Apr 18</span></div>
  <div class="phero"><p>26 weeks. Explosiveness first, then the gas tank. A deload every 4–6 weeks. Retests in weeks 12, 22 and 26.</p><img src="${POSE("arms")}" alt=""></div>
  <div class="banner n">Phase 2 onwards is provisional. Swole adjusts exercises and loads to your test numbers before each phase starts.</div>
  ${PHASES.map(p => {
    const a = weekStart(p.w[0]), b = addDays(weekStart(p.w[1]), 6);
    const cls = cw >= p.w[0] && cw <= p.w[1] ? "now" : cw > p.w[1] ? "past" : "";
    return `<div class="phase ${cls}"><div class="wks"><b>${p.w[0] === p.w[1] ? p.w[0] : p.w[0]+"–"+p.w[1]}</b>week</div>
      <div style="min-width:0"><h3>${esc(p.name)}</h3><div class="dates">${fmt(a)} – ${fmt(b)}${cls === "now" ? " · NOW" : ""}</div>
      <ul>${p.focus.map(f => `<li>${esc(f)}</li>`).join("")}</ul></div></div>`;
  }).join("")}
  <div class="section"><div class="section-h"><h2>Weekly template</h2></div>
    <div class="list">
      ${DAY.map((n,i) => { const am = TEMPLATES.base[i], pm = MT[i];
        return `<div class="mini"><i>${n}</i><span class="tt">${am ? esc(SESS[am].title) : "—"}${pm ? ` <span style="color:var(--muted)">+ ${esc(SESS[pm].title.replace("Muay Thai · ","MT "))}</span>` : ""}</span></div>`; }).join("")}
    </div>
  </div>`;
}

/* ---------- TESTS ---------- */
function viewTests(){
  return `
  <div class="top"><div class="brand">Tests<b>.</b></div><span class="eyebrow">Weeks 1 · 12 · 22 · 26</span></div>
  <div class="phero"><p>Enter your numbers after each test. Swole uses them to build the next phases.</p><img src="${POSE("teep")}" alt=""></div>
  <div class="list">${TESTS.map(t => {
    const cur = S.tests[t.id], last = cur && cur.history && cur.history.length ? cur.history[cur.history.length-1] : null;
    const extra = last && t.calc ? t.calc(last.v) : "";
    return `<div class="test"><div class="h"><b>${esc(t.name)}</b>${last ? `<span class="last">${esc(Object.values(last.v).join(" / "))} · ${fmt(parse(last.date))}</span>` : `<span class="eyebrow">Not tested</span>`}</div>
      <p class="how">${esc(t.how)}${extra ? ` <b style="color:var(--paper)">${esc(extra)}</b>` : ""}</p>
      <div class="fields">${t.fields.map(f => `<div class="field"><label for="t-${t.id}-${f[0]}">${esc(f[1])}</label><input type="number" inputmode="decimal" step="any" id="t-${t.id}-${f[0]}"></div>`).join("")}
      <button class="btn" data-savetest="${t.id}" style="align-self:flex-end">Save</button></div></div>`;
  }).join("")}</div>`;
}
async function saveTest(id){
  const t = TESTS.find(x => x.id === id), v = {};
  for (const f of t.fields){ const el = document.getElementById(`t-${id}-${f[0]}`); if (el.value !== "") v[f[0]] = Number(el.value); }
  if (!Object.keys(v).length){ toast("Enter a number first."); return; }
  const cur = S.tests[id] || {history:[]};
  await save("tests", id, {name:t.name, history:[...(cur.history || []), {date: iso(new Date()), v}]});
  toast("Saved.");
  render();
}

/* ============ SHEETS ============ */
function openSheet(html){ document.getElementById("sheetIn").innerHTML = html; const sh = document.getElementById("sheet"); sh.hidden = false; sh.scrollTop = 0; }
function closeSheetQuiet(){ stopTimer(); document.getElementById("sheet").hidden = true; }
function closeSheet(){ stopTimer(); document.getElementById("sheet").hidden = true; render(); }

/* settings */
async function openSettings(){
  const ps = await pushState();
  const connected = !!(GH.token && GH.owner);
  const last = GH.lastSync ? new Date(GH.lastSync) : null;
  const stateText = {local: "Saved on this phone only", syncing: "Syncing…", synced: "Synced", error: "Couldn't sync. Will retry."}[GH.state];
  openSheet(`
    <div class="close"><span class="eyebrow">Settings</span><button data-act="close">Close ✕</button></div>
    <div class="phero set"><h1 class="sh-title">Swole setup</h1><img src="${POSE("bench")}" alt=""></div>

    <div class="block">
      <h3>Look<small>${theme() === "red" ? "Red" : "White"}</small></h3>
      <div class="opts" style="margin:8px 0 12px"><button class="opt" data-theme="white" aria-pressed="${theme() !== "red"}">White</button><button class="opt" data-theme="red" aria-pressed="${theme() === "red"}">Red</button><button class="opt" data-act="replayintro">Replay intro</button></div>
    </div>

    <div class="block">
      <h3>Your data<small>${esc(stateText)}</small></h3>
      ${connected ? `
        <p class="verdict-l" style="text-align:left;max-width:none;margin:6px 0">Check-ins, logs and tests are saved to your private repo <b>${esc(GH.owner)}/swole-data</b>. Swole reads them there to adjust your plan.${last ? ` Last sync ${last.toLocaleString("en-GB",{day:"numeric",month:"short",hour:"2-digit",minute:"2-digit"})}.` : ""}</p>
        ${GH.lastError || COLS.some(c => GH.dirty[c]) ? `<div class="banner r" style="margin:8px 0">Not uploaded yet: ${esc(COLS.filter(c => GH.dirty[c]).join(", ") || "nothing")}.${GH.lastError ? ` Last error: ${esc(GH.lastError)}.` : ""}</div>` : ""}
        <div class="opts" style="margin:10px 0 12px"><button class="btn" data-act="syncnow">Sync now</button><button class="btn ghost" data-act="disconnect">Disconnect</button></div>`
      : `
        <p class="verdict-l" style="text-align:left;max-width:none;margin:6px 0 10px">Paste your GitHub token to back up your data and let Swole read it. Without it, everything stays on this phone.</p>
        <div class="field" style="margin-bottom:10px"><label for="ghToken">GitHub token</label><input type="password" id="ghToken" autocomplete="off" placeholder="github_pat_…"></div>
        <div style="margin-bottom:12px"><button class="btn red" data-act="connect">Connect</button></div>`}
    </div>

    <div class="block">
      <h3>Morning reminder<small>06:05 every day</small></h3>
      <p class="verdict-l" style="text-align:left;max-width:none;margin:6px 0 10px">${
        ps === "on" ? "On. Swole will tell you what today holds and ask you to check in."
        : ps === "denied" ? "Notifications are blocked. Turn them on in iOS Settings → Notifications → Swole."
        : ps === "unsupported" && !isStandalone() ? "Add Swole to your Home Screen first (Share → Add to Home Screen) and open it from there."
        : "Get a push at 06:05 with today's sessions and a nudge to check in."}</p>
      ${ps === "on" ? "" : `<div style="margin-bottom:12px"><button class="btn red" data-act="pushon" ${ps === "denied" ? "disabled" : ""}>Turn on reminder</button></div>`}
    </div>

    <div class="block">
      <h3>App<small>v18 · PWA</small></h3>
      <p class="verdict-l" style="text-align:left;max-width:none;margin:6px 0 12px">${isStandalone() ? "Running from your Home Screen." : "Tip: Share → Add to Home Screen for full-screen and reminders."}<br><small style="opacity:.6">Screen ${(window.__vp||{}).screen} · view ${(window.__vp||{}).inner} · inset ${(window.__vp||{}).envB} · gap ${(window.__vp||{}).gap}</small></p>
    </div>`);
}

/* session */
let timerState = null;
function openSession(key, id){
  const s = SESS[id], date = key.split("_")[0], d = parse(date);
  const r = readiness(S.checkins[date]);
  const log = S.sessions[key] || {};
  const w = weekNo(d), ph = w >= 1 && w <= 26 ? phaseOf(w) : null;
  const trainable = s.kind !== "mt";
  let banner = "";
  if (r && trainable){
    if (r.level === "r" && s.kind !== "mobility") banner = `<div class="banner r">Red day. Swap this for 15 min mobility and 20 min zone 2.</div>`;
    else if (r.level === "y") banner = `<div class="banner y">Yellow day. One set less on the heavy lifts. Sprints at 80 %.</div>`;
    else if (r.level === "g") banner = `<div class="banner g">Green day. Do the full session.</div>`;
    if (r.knee) banner += `<div class="banner y">Knee: drop jumps and pogos. Add 2 extra sets of Spanish squat isometrics instead.</div>`;
  }
  if (ph && ph.deload && trainable) banner += `<div class="banner y">Deload week: halve the number of sets.</div>`;
  if (ph && !["test","f1"].includes(ph.key) && trainable && s.kind !== "test") banner += `<div class="banner n">Provisional. Swole updates this session after the retest.</div>`;
  const cut = ex => r && trainable && ((r.knee && ex[3] === "jump") || (r.level === "r" && s.kind !== "mobility") || (r.level === "y" && ex[3] === "sprint" && false));
  openSheet(`
    <div class="close"><span class="eyebrow">${DAYL[dow(d)]} ${fmt(d)} · ${slotTime({slot:key.endsWith("am") ? "am" : "pm", id})}</span><button data-act="close">Close ✕</button></div>
    <h1 class="sh-title">${esc(s.title)}</h1>
    <div class="sh-meta"><span class="chip red">${esc(s.dur)}</span><span class="chip">${esc(KIND_LABEL[s.kind])}</span>${ph ? `<span class="chip">Week ${w}</span>` : ""}</div>
    ${s.note ? `<p style="margin:0;color:#d9d2cc">${esc(s.note)}</p>` : ""}
    ${banner}
    ${s.blocks.map(b => `<div class="block"><h3>${esc(b.name)}<small>${esc(b.t)}</small></h3>
      ${b.ex.map(ex => `<div class="ex ${cut(ex) ? "cut" : ""}"><b>${esc(ex[0])}</b><span class="dose">${esc(ex[1])}</span>${ex[2] ? `<span class="cue">${esc(ex[2])}</span>` : ""}</div>`).join("")}</div>`).join("")}
    ${s.timer ? `<div class="timer" id="timer"><div class="lab" id="tLab">Interval timer</div><div class="big mono" id="tBig" style="font-size:56px">${s.timer.filter(x=>x.work).map(x=>x.reps+"×"+x.work+"s").join(" + ")}</div>
      <div class="row"><button class="btn red" data-act="tstart" data-sid="${id}">Start</button><button class="btn ghost" data-act="tstop">Reset</button></div></div>` : ""}
    <div class="logbox">
      <div class="eyebrow">Log this session</div>
      <div class="opts" id="logStatus">${[["done","Done"],["part","Partly"],["skip","Skipped"]].map(o => `<button class="opt" data-status="${o[0]}" aria-pressed="${log.status === o[0]}">${o[1]}</button>`).join("")}</div>
      <div><div class="eyebrow" style="margin-bottom:6px">How hard? (RPE 1–10)</div>
      <div class="rpe" id="logRpe">${[1,2,3,4,5,6,7,8,9,10].map(n => `<button data-rpe="${n}" aria-pressed="${log.rpe === n}">${n}</button>`).join("")}</div></div>
      <textarea id="logNote" placeholder="Note for Swole (optional)">${esc(log.note || "")}</textarea>
      <button class="btn red" data-act="logsave" data-key="${key}" data-id="${id}">Save log</button>
    </div>`);
}

/* timer */
let actx = null;
function beep(f, dur){ try { if (!actx) return; const o = actx.createOscillator(), g = actx.createGain(); o.frequency.value = f; o.connect(g); g.connect(actx.destination); g.gain.setValueAtTime(.25, actx.currentTime); g.gain.exponentialRampToValueAtTime(.001, actx.currentTime+dur); o.start(); o.stop(actx.currentTime+dur); } catch(e){} }
function buildSeq(segs){ const q = [{t:5,kind:"rest",label:"Get ready"}]; segs.forEach((s,si) => { for (let i=1;i<=s.reps;i++){ if (s.work) q.push({t:s.work,kind:"work",label:`${s.label} ${i}/${s.reps}`}); const last = si === segs.length-1 && i === s.reps; if (s.rest && !last) q.push({t:s.rest,kind:"rest",label:s.work ? "Rest" : s.label}); } }); return q; }
async function startTimer(id){
  const s = SESS[id]; if (!s || !s.timer) return;
  try { actx = actx || new (window.AudioContext || window.webkitAudioContext)(); } catch(e){}
  stopTimer(true);
  const seq = buildSeq(s.timer);
  timerState = {seq, i:0, end: Date.now() + seq[0].t*1000, lastSec:null};
  try { timerState.lock = await navigator.wakeLock.request("screen"); } catch(e){}
  timerState.iv = setInterval(tick, 200); tick();
}
function tick(){
  const T = timerState; if (!T) return;
  let left = Math.ceil((T.end - Date.now())/1000);
  if (left <= 0){
    T.i++;
    if (T.i >= T.seq.length){ beep(660,.6); stopTimer(true); const b = document.getElementById("tBig"); if (b){ b.textContent = "DONE"; document.getElementById("tLab").textContent = "Log your max HR"; } playMoment("shadow"); return; }
    T.end = Date.now() + T.seq[T.i].t*1000; left = T.seq[T.i].t; beep(T.seq[T.i].kind === "work" ? 1046 : 520, .35);
  } else if (left <= 3 && left !== T.lastSec){ beep(440,.08); }
  T.lastSec = left;
  const seg = T.seq[T.i], box = document.getElementById("timer");
  if (!box) return stopTimer(true);
  box.className = "timer" + (seg.kind === "work" ? " work" : "");
  document.getElementById("tLab").textContent = seg.label;
  const m = Math.floor(left/60), sec = left%60, big = document.getElementById("tBig");
  big.style.fontSize = ""; big.textContent = m ? m+":"+String(sec).padStart(2,"0") : sec;
}
function stopTimer(keep){
  if (timerState){ clearInterval(timerState.iv); try { timerState.lock && timerState.lock.release(); } catch(e){} }
  timerState = null;
  if (!keep){ const box = document.getElementById("timer"); if (box){ box.className = "timer"; document.getElementById("tLab").textContent = "Interval timer"; document.getElementById("tBig").textContent = "Ready"; } }
}

/* ============ CHECK-IN ============ */
let CI = null;
function startCheckin(){
  const today = iso(new Date()), y = addDays(new Date(), -1);
  const prev = S.checkins[today] || {};
  const ySess = plannedFor(y).filter(it => !(S.sessions[iso(y)+"_"+it.slot]));
  CI = {step:0, a:{...prev, sessions:{}}, ySess, yDate:iso(y)};
  CI.steps = (ySess.length ? ["sessions"] : []).concat(["sleep","energy","sore","knee","stress","meals","protein","carbs","final"]);
  renderCI();
  document.getElementById("sheet").hidden = false;
}
const Q = {
  sleep:{q:"How much did you sleep last night?", opts:[["<6","Under 6 hours"],["6-7","6–7 hours"],["7-8","7–8 hours"],["8+","8 hours or more"]]},
  energy:{q:"How's your energy?", scale:["Flat","Sharp"]},
  sore:{q:"How sore or stiff are you?", scale:["Fresh","Wrecked"]},
  knee:{q:"How's the knee?", opts:[[0,"Nothing"],[1,"I can feel it"],[2,"It bothers me"],[3,"It hurts"]]},
  stress:{q:"Stress level?", opts:[["lav","Low"],["moderat","Moderate"],["hoj","High"]]},
  meals:{q:"How many proper meals did you eat yesterday?", sub:"A meal is a plate of food or a solid shake. Snacks don't count.", opts:[["1-2","1–2"],["3","3"],["4","4"],["5+","5 or more"]]},
  protein:{q:"Was there protein in every meal?", sub:"At least a palm: meat, fish, eggs, skyr or cottage cheese.", opts:[["alle","Yes, all of them"],["fleste","Most of them"],["faa","Only a few"]]},
  carbs:{q:"Did you eat carbs around training?", sub:"Rice, pasta, potatoes, bread or oats within 3 hours before or after.", opts:[["ja","Yes"],["nej","No"],["ingen","I didn't train"]]},
};
function renderCI(){
  const st = CI.steps[CI.step], n = CI.steps.length;
  const prog = `<div class="ci-prog">${CI.steps.map((_,i) => `<i class="${i <= CI.step ? "on" : ""}"></i>`).join("")}</div>`;
  const head = `<div class="close"><span class="eyebrow">Check-in · ${CI.step+1}/${n}</span><button data-act="close">Close ✕</button></div>`;
  let body = "";
  if (st === "sessions"){
    body = `<h2 class="ci-q">Did you get yesterday's sessions done?</h2><p class="ci-sub">${DAYL[dow(parse(CI.yDate))]} ${fmt(parse(CI.yDate))}</p>
    <div class="ci-sess">${CI.ySess.map(it => { const k = CI.yDate+"_"+it.slot; const v = CI.a.sessions[k];
      return `<div class="row"><b>${esc(SESS[it.id].title)}</b><div class="opts">${[["done","Yes"],["part","Partly"],["skip","No"]].map(o => `<button class="opt" data-cisess="${k}|${o[0]}|${it.id}" aria-pressed="${v && v.status === o[0]}">${o[1]}</button>`).join("")}</div></div>`; }).join("")}</div>
    <div class="ci-nav"><span></span><button class="btn red" data-act="cinext">Next →</button></div>`;
  } else if (st === "final"){
    const isMon = dow(new Date()) === 0;
    body = `<h2 class="ci-q">Anything I should know?</h2><p class="ci-sub">Optional. Keep it short.</p>
    <div class="field" style="margin-bottom:12px"><label for="ciWeight">Morning weight (kg)${isMon ? " · it's Monday, weigh in" : " · optional"}</label><input type="number" inputmode="decimal" step="0.1" id="ciWeight" value="${CI.a.weight ?? ""}"></div>
    <textarea id="ciNote" placeholder="E.g. bad night, sore shins after sparring">${esc(CI.a.note || "")}</textarea>
    <div class="ci-nav"><button class="btn ghost" data-act="ciback">← Back</button><button class="btn red" data-act="cisave">Get today's verdict</button></div>`;
  } else {
    const q = Q[st];
    body = `<h2 class="ci-q">${esc(q.q)}</h2>${q.sub ? `<p class="ci-sub">${esc(q.sub)}</p>` : `<p class="ci-sub">&nbsp;</p>`}`;
    if (q.scale){
      body += `<div class="scale">${[1,2,3,4,5].map(v => `<button data-ci="${st}|${v}" aria-pressed="${CI.a[st] === v}">${v}</button>`).join("")}</div><div class="scale-l"><span>${q.scale[0]}</span><span>${q.scale[1]}</span></div>`;
    } else {
      body += `<div class="ci-opts">${q.opts.map(o => `<button class="ci-opt" data-ci="${st}|${o[0]}" aria-pressed="${String(CI.a[st]) === String(o[0])}"><span>${esc(o[1])}</span><span style="color:var(--red)">→</span></button>`).join("")}</div>`;
    }
    body += `<div class="ci-nav">${CI.step > 0 ? `<button class="btn ghost" data-act="ciback">← Back</button>` : "<span></span>"}<span></span></div>`;
  }
  document.getElementById("sheetIn").innerHTML = head + prog + body;
  document.getElementById("sheet").scrollTop = 0;
}
async function saveCI(){
  const w = document.getElementById("ciWeight").value, note = document.getElementById("ciNote").value.trim();
  const a = {...CI.a}; if (w) a.weight = Number(w); else delete a.weight; a.note = note;
  const sess = a.sessions; delete a.sessions;
  a.date = iso(new Date()); a.at = new Date().toISOString();
  const r = readiness(a); a.level = r.level; a.score = Math.round(r.score*10)/10; a.food = r.food;
  await save("checkins", a.date, a);
  for (const k of Object.keys(sess)) await save("sessions", k, sess[k]);
  if (a.weight){
    const cur = S.tests.weight || {history:[]};
    await save("tests", "weight", {name:"Body weight", history:[...(cur.history||[]).filter(h => h.date !== a.date), {date:a.date, v:{v:a.weight}}]});
  }
  const L = LEVEL[r.level], art = artFor(L.slot);
  const emo = r.knee && r.level !== "r" ? "surprised" : {g:"hyped", y:"serious", r:"exhausted"}[r.level];
  document.getElementById("sheetIn").innerHTML = `
    <div class="close"><span class="eyebrow">Today's verdict</span><button data-act="close">Close ✕</button></div>
    <section class="verdict3">
      <div class="vfig"><svg class="vword" viewBox="0 0 1000 300" aria-hidden="true"><text x="500" y="270" text-anchor="middle" textLength="${Math.min(1000, L.word.length*150)}" lengthAdjust="spacingAndGlyphs">${esc(L.word.toUpperCase())}</text></svg>${mediaTag(art)}</div>
      <div class="vcard"><div class="vhead"><img class="emo lg" src="${EMO(emo)}" alt=""><div><b style="color:${L.color}">${esc(L.word)}</b><span>Readiness ${Math.round(r.score*10)/10} / 8</span></div></div>
      <p>${esc(L.line)}</p>${r.knee ? `<p>The knee says no. No jumps today.</p>` : ""}<p>${esc(foodLine(r.food))}</p>
      <button class="pill wide" data-act="close">To today's sessions</button></div>
    </section>`;
  if (r.level !== "r") playMoment("kick", {word: r.level === "g" ? "LET'S GO" : "EASY NOW", sub: L.line});
  CI = null;
}

/* ============ EVENTS ============ */
document.getElementById("tabs").addEventListener("click", e => { const b = e.target.closest("button[data-tab]"); if (!b) return; tab = b.dataset.tab; homeMode = "today"; render(); window.scrollTo(0,0); });
document.addEventListener("click", async e => {
  const t = e.target.closest("button"); if (!t) return;
  const act = t.dataset.act;
  if (act === "sprev"){ shiftSched(-1); render(); }
  else if (act === "snext"){ shiftSched(1); render(); }
  else if (act === "stoday"){ schedDate = new Date(); render(); }
  else if (act === "settings"){ openSettings(); }
  else if (act === "saytoggle"){ const open = t.getAttribute("aria-expanded") !== "true"; t.setAttribute("aria-expanded", open); }
  else if (act === "connect"){ t.disabled = true; const v = (document.getElementById("ghToken") || {}).value || ""; const r = await connectGitHub(v); toast(r.ok ? "Connected. Your data is backed up." : r.why); render(); openSettings(); }
  else if (act === "disconnect"){ disconnectGitHub(); toast("Disconnected. Data stays on this phone."); openSettings(); }
  else if (act === "syncnow"){ await loadAll(); render(); toast(GH.state === "synced" ? "Synced." : "Couldn't sync."); openSettings(); }
  else if (act === "pushon"){ t.disabled = true; await enablePush(); openSettings(); }
  else if (act === "checkin"){ startCheckin(); }
  else if (act === "hubback"){ homeMode = "today"; render(); window.scrollTo(0,0); }
  else if (t.dataset.hub){ homeMode = t.dataset.hub; if (homeMode === "schedule") schedDate = new Date(); render(); window.scrollTo(0,0); }
  else if (socialClick(t)){ }
  else if (act === "locker"){ homeMode = tab === "dag" && homeMode === "locker" ? "today" : "locker"; tab = "dag"; closeSheetQuiet(); render(); window.scrollTo(0,0); }
  else if (act === "replayintro"){ document.getElementById("sheet").hidden = true; render(); playMoment("intro"); }
  else if (t.dataset.theme){ setTheme(t.dataset.theme); openSettings(); }
  else if (act === "close"){ CI = null; closeSheet(); }
  else if (act === "tstart"){ startTimer(t.dataset.sid); }
  else if (act === "tstop"){ stopTimer(false); }
  else if (act === "cinext"){ CI.step++; renderCI(); }
  else if (act === "ciback"){ CI.step = Math.max(0, CI.step-1); renderCI(); }
  else if (act === "cisave"){ t.disabled = true; await saveCI(); }
  else if (act === "logsave"){
    const st = document.querySelector("#logStatus [aria-pressed=true]"), rp = document.querySelector("#logRpe [aria-pressed=true]");
    if (!st){ toast("Pick Done, Partly or Skipped."); return; }
    await save("sessions", t.dataset.key, {session:t.dataset.id, status:st.dataset.status, rpe: rp ? Number(rp.dataset.rpe) : null, note: document.getElementById("logNote").value.trim(), at:new Date().toISOString()});
    closeSheet();
    if (st.dataset.status === "done") playMoment("flex"); else toast("Logged. Good work.");
  }
  else if (t.dataset.mode){ schedMode = t.dataset.mode; render(); }
  else if (t.dataset.goday){ schedDate = parse(t.dataset.goday); schedMode = "day"; render(); window.scrollTo(0,0); }
  else if (t.dataset.gomonth){ schedDate = parse(t.dataset.gomonth); schedMode = "month"; render(); window.scrollTo(0,0); }
  else if (t.dataset.open){ const [k,id] = t.dataset.open.split("|"); openSession(k,id); }
  else if (t.dataset.item){ openItem(t.dataset.item); }
  else if (t.dataset.equip){ equipItem(t.dataset.equip); }
  else if (t.dataset.unequip){ unequipOutfit(); }
  else if (t.dataset.lcat){ lockerCat = t.dataset.lcat; render(); }
  else if (t.dataset.savetest){ saveTest(t.dataset.savetest); }
  else if (t.dataset.status){ document.querySelectorAll("#logStatus .opt").forEach(b => b.setAttribute("aria-pressed", b === t)); }
  else if (t.dataset.rpe){ document.querySelectorAll("#logRpe button").forEach(b => b.setAttribute("aria-pressed", b === t)); }
  else if (t.dataset.ci){ const [k,v] = t.dataset.ci.split("|"); CI.a[k] = ["energy","sore","knee"].includes(k) ? Number(v) : v; CI.step++; renderCI(); }
  else if (t.dataset.cisess){ const [k,v,id] = t.dataset.cisess.split("|"); CI.a.sessions[k] = {session:id, status:v, via:"checkin", at:new Date().toISOString()}; renderCI(); }
});

/* ============ THEME ============ */
function theme(){ return (S.settings.look && S.settings.look.theme) || LS.get("swole:theme", "white"); }
function applyTheme(){ const t = theme(); document.documentElement.dataset.theme = t; const m = document.querySelector('meta[name="theme-color"]'); if (m) m.content = t === "red" ? "#FF3B2F" : "#FFFFFF"; }
async function setTheme(t){ LS.set("swole:theme", t); applyTheme(); await save("settings", "look", {theme:t}); }

/* ============ MOMENTS ============ */
const momentBlobs = {};
async function momentURL(src){
  try {
    if (!momentBlobs[src]) momentBlobs[src] = await (await fetch(src)).blob();
    return URL.createObjectURL(momentBlobs[src]);   // fresh URL = animation starts from frame 1
  } catch(e){ return src; }
}
function preloadMoments(){ Object.values(MOMENT).forEach(m => { if (!momentBlobs[m.src]) fetch(m.src).then(r => r.ok && r.blob()).then(b => { if (b) momentBlobs[m.src] = b; }).catch(() => {}); }); }
let momentT = null;
async function playMoment(name, over = {}){
  const m = {...MOMENT[name], ...over}; if (!m.src) return;
  const url = await momentURL(m.src);
  let el = document.getElementById("moment");
  if (!el){ el = document.createElement("div"); el.id = "moment"; document.body.appendChild(el); el.addEventListener("click", closeMoment); }
  el.innerHTML = `<svg class="mword" viewBox="0 0 1000 400" aria-hidden="true"><text x="500" y="372" text-anchor="middle" textLength="${Math.min(1000, Math.max(3, m.word.length)*130)}" lengthAdjust="spacingAndGlyphs">${esc(m.word)}</text></svg>
    <img class="mfig" src="${url}" alt="">
    ${m.sub ? `<p class="msub">${esc(m.sub)}</p>` : ""}<span class="mtap">Tap to continue</span>`;
  el.hidden = false; el.classList.remove("out"); void el.offsetWidth; el.classList.add("in");
  clearTimeout(momentT); momentT = setTimeout(closeMoment, m.ms);
}
function closeMoment(){
  clearTimeout(momentT); const el = document.getElementById("moment"); if (!el || el.hidden) return;
  el.classList.remove("in"); el.classList.add("out");
  setTimeout(() => { el.hidden = true; const img = el.querySelector(".mfig"); if (img && img.src.startsWith("blob:")) URL.revokeObjectURL(img.src); el.innerHTML = ""; }, 260);
}

/* ============ VIEWPORT FIX ============ */
// iOS 26 home-screen apps can hand us a webview that already ends above the home indicator,
// while env(safe-area-inset-bottom) still reports ~34px. Then everything sits too high.
function fitViewport(){
  const r = document.documentElement;
  const probe = document.createElement("div");
  probe.style.cssText = "position:fixed;left:0;top:0;width:1px;height:env(safe-area-inset-bottom,0px);visibility:hidden;pointer-events:none";
  document.body.appendChild(probe); const envB = probe.getBoundingClientRect().height; probe.remove();
  const portrait = window.matchMedia("(orientation: portrait)").matches;
  const gap = isStandalone() && portrait ? Math.max(0, screen.height - window.innerHeight) : 0;
  r.style.setProperty("--sb", Math.max(0, envB - gap) + "px");
  const nav = document.querySelector(".tabs nav"); if (nav) r.style.setProperty("--tabh", Math.round(nav.getBoundingClientRect().height) + "px");
  window.__vp = {envB, gap, inner: window.innerHeight, screen: screen.height};
}
window.addEventListener("resize", fitViewport);
// tap Swole on the home screen: knee-up pose + wink
document.addEventListener("click", e => { if (e.target.closest(".h3fig img, .h3fig video")) playMoment("pose"); });
window.addEventListener("orientationchange", () => setTimeout(fitViewport, 300));

/* ============ BOOT ============ */
(function splash(){
  const el = document.createElement("div"); el.id = "splash";
  el.innerHTML = `<svg viewBox="0 0 1000 420" aria-label="Swole"><text x="500" y="400" text-anchor="middle" textLength="980" lengthAdjust="spacingAndGlyphs">SWOLE</text></svg>`;
  document.body.appendChild(el);
  const go = () => { el.classList.add("out"); setTimeout(() => el.remove(), 450); };
  (document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve()).then(() => setTimeout(go, 900));
  setTimeout(go, 2500);
})();
applyTheme();
fitViewport();
render();
if (!LS.get("swole:introSeen", false)){ LS.set("swole:introSeen", true); playMoment("intro"); }
setTimeout(preloadMoments, 2500);
if ("serviceWorker" in navigator){ navigator.serviceWorker.register("sw.js").catch(() => {}); }
loadAll().then(render);
