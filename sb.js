/* ============ SUPABASE: login + sync for the pilot ============
   Plain fetch against Supabase Auth (GoTrue) and the REST API (PostgREST).
   Login is by a one-time code sent by email, typed into the app, so it also
   works inside the Home Screen app on iPhone (a magic link would open Safari). */
const SB_URL = "https://wsjdewfdkqscmzdcxeke.supabase.co";
const SB_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndzamRld2Zka3FzY216ZGN4ZWtlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTIxNDMwMDQsImV4cCI6MjEwNzcxOTAwNH0.c1MMwZhyjxr4zZXGV5If6kn3TX9et4MBEfAxiF08e9A";
const sbLS = {
  get(k, d){ try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch(e){ return d; } },
  set(k, v){ try { localStorage.setItem(k, JSON.stringify(v)); } catch(e){} },
  del(k){ try { localStorage.removeItem(k); } catch(e){} },
};
const SB = {
  session: sbLS.get("swole:sb:session", null),
  profile: sbLS.get("swole:sb:profile", null),
  dirty: sbLS.get("swole:sb:dirty", {}),        // {col: {id: stamp}}
  state: "local",
  lastSync: sbLS.get("swole:sb:lastSync", null),
  lastError: "",
  email: sbLS.get("swole:sb:email", ""),
};
const sbUid = () => SB.session && SB.session.user && SB.session.user.id;

function sbSetState(s){ SB.state = s; const dot = document.getElementById("syncdot"); if (dot) dot.dataset.state = s; }

/* ---------- auth ---------- */
async function sbAuth(path, body){
  const r = await fetch(SB_URL + "/auth/v1/" + path, {method: "POST", headers: {apikey: SB_KEY, "Content-Type": "application/json"}, body: JSON.stringify(body)});
  const j = await r.json().catch(() => ({}));
  if (!r.ok){ const e = new Error(j.msg || j.error_description || j.message || ("Auth " + r.status)); e.status = r.status; e.code = j.error_code || j.code || ""; throw e; }
  return j;
}
function sbSetSession(j){
  SB.session = {access_token: j.access_token, refresh_token: j.refresh_token,
    expires_at: j.expires_at || Math.floor(Date.now()/1000) + (Number(j.expires_in) || 3600),
    user: {id: j.user ? j.user.id : (SB.session && SB.session.user.id), email: j.user ? j.user.email : (SB.session && SB.session.user.email)}};
  sbLS.set("swole:sb:session", SB.session);
}
let sbRefreshing = null;
async function sbToken(){
  if (!SB.session) return null;
  if (SB.session.expires_at - 60 > Date.now()/1000) return SB.session.access_token;
  if (!sbRefreshing) sbRefreshing = sbAuth("token?grant_type=refresh_token", {refresh_token: SB.session.refresh_token})
    .then(j => { sbSetSession(j); })
    .catch(e => { if (e.status === 400 || e.status === 401) sbSignOutLocal(); throw e; })
    .finally(() => { sbRefreshing = null; });
  await sbRefreshing;
  return SB.session && SB.session.access_token;
}
async function sbSendCode(email){
  SB.email = email; sbLS.set("swole:sb:email", email);
  await sbAuth("otp", {email, create_user: true});
}
async function sbVerify(email, token){
  const j = await sbAuth("verify", {type: "email", email, token});
  sbSetSession(j);
  sbLS.del("swole:sb:skip");
  // first login on this phone: everything already here gets uploaded
  COLS.forEach(c => Object.keys(S[c] || {}).forEach(id => sbMark(c, id)));
  await sbLoad();
}
function sbSignOutLocal(){
  SB.session = null; SB.profile = null;
  sbLS.del("swole:sb:session"); sbLS.del("swole:sb:profile");
  sbSetState("local");
}
async function sbSignOut(){
  try { const t = SB.session && SB.session.access_token; if (t) await fetch(SB_URL + "/auth/v1/logout", {method: "POST", headers: {apikey: SB_KEY, Authorization: "Bearer " + t}}); } catch(e){}
  sbSignOutLocal();
}
/* a magic link clicked in the email lands here with tokens in the URL hash */
function sbFromHash(){
  if (!location.hash || location.hash.indexOf("access_token=") < 0) return false;
  const p = new URLSearchParams(location.hash.slice(1));
  sbSetSession({access_token: p.get("access_token"), refresh_token: p.get("refresh_token"),
    expires_at: Number(p.get("expires_at")) || 0, expires_in: p.get("expires_in"), user: null});
  try { const claims = JSON.parse(atob(p.get("access_token").split(".")[1].replace(/-/g, "+").replace(/_/g, "/"))); SB.session.user = {id: claims.sub, email: claims.email}; sbLS.set("swole:sb:session", SB.session); } catch(e){}
  history.replaceState(null, "", location.pathname + location.search);
  COLS.forEach(c => Object.keys(S[c] || {}).forEach(id => sbMark(c, id)));
  return true;
}

/* ---------- data ---------- */
async function sbRest(path, opts = {}){
  const t = await sbToken();
  if (!t) throw new Error("Not logged in");
  const r = await fetch(SB_URL + "/rest/v1/" + path, {...opts, headers: {apikey: SB_KEY, Authorization: "Bearer " + t, "Content-Type": "application/json", ...(opts.headers || {})}});
  if (!r.ok){ let m = ""; try { m = (await r.json()).message || ""; } catch(_){} const e = new Error("Supabase " + r.status + (m ? " (" + m + ")" : "")); e.status = r.status; throw e; }
  const txt = await r.text();
  return txt ? JSON.parse(txt) : null;
}
/* ---------- consent (GDPR art. 9: health data needs explicit consent) ---------- */
const SWOLE_CONSENT_VERSION = "pilot-2026-10";
const SWOLE_CONTACT = "hello@joinswole.com";
const sbConsentOk = () => sbLS.get("swole:sb:consent", "") === SWOLE_CONSENT_VERSION;
async function sbGiveConsent(){
  await sbRest("consents", {method: "POST", headers: {Prefer: "return=minimal,resolution=ignore-duplicates"}, body: JSON.stringify({version: SWOLE_CONSENT_VERSION})});
  sbLS.set("swole:sb:consent", SWOLE_CONSENT_VERSION);
}
async function sbCheckConsent(){
  if (window.SWOLE_DEMO || !SB.session || sbConsentOk()) return;
  try {
    const r = await sbRest(`consents?select=version&user_id=eq.${sbUid()}&version=eq.${SWOLE_CONSENT_VERSION}&limit=1`);
    if (r && r.length){ sbLS.set("swole:sb:consent", SWOLE_CONSENT_VERSION); return; }
  } catch(e){ return; }
  if (!document.documentElement.classList.contains("ob-open")) openConsent();
}
/* the consent text, shared by the sign-up step and the sheet for existing members */
function consentHTML(btnAttr){
  return `
    <ul class="cons">
      <li><b>What we store.</b> Your plan, sessions, check-ins (sleep, energy, soreness, stress), injuries you tell us about, test results and body weight if you log it.</li>
      <li><b>Why.</b> To build your plan, adjust it to how you feel, and keep you safe.</li>
      <li><b>Who sees it.</b> You and your trainer. Nobody else, and we never sell it.</li>
      <li><b>Where.</b> On servers in the EU (Frankfurt).</li>
      <li><b>Your control.</b> Download or delete everything any time in Settings → Your data.</li>
    </ul>
    <label class="conschk"><input type="checkbox" id="consBox"><span>I agree that Swole stores and uses my health and training data as described above.</span></label>
    <p class="obnote">Read the full <a href="privacy.html" target="_blank" rel="noopener" style="color:inherit;text-decoration:underline">privacy note</a>. Questions: ${esc(SWOLE_CONTACT)}</p>
    <button class="pill wide" ${btnAttr} disabled id="consGo">I agree</button>`;
}
function openConsent(){
  openSheet(`
    <div class="close"><span class="eyebrow">Swole · pilot</span></div>
    <div class="auth"><h1 class="authh" style="font-size:52px">Your data, your call</h1>
    <p class="authp">One thing before you keep going.</p>${consentHTML('data-sb="consent"')}</div>`);
}
document.addEventListener("change", e => { if (e.target.id === "consBox"){ const g = document.getElementById("consGo"); if (g) g.disabled = !e.target.checked; } });

/* ---------- your data: download + delete ---------- */
async function sbExport(){
  const uid = sbUid();
  const [entries, consents, profile] = await Promise.all([
    sbRest(`entries?select=col,id,data,updated_at&user_id=eq.${uid}`),
    sbRest(`consents?select=version,accepted_at&user_id=eq.${uid}`),
    sbRest(`profiles?select=*&id=eq.${uid}`),
  ]);
  const out = {exported_at: new Date().toISOString(), email: SB.session.user.email, account: profile && profile[0] || null, consents, entries};
  const name = `swole-data-${new Date().toISOString().slice(0, 10)}.json`;
  const blob = new Blob([JSON.stringify(out, null, 2)], {type: "application/json"});
  const file = new File([blob], name, {type: "application/json"});
  if (navigator.canShare && navigator.canShare({files: [file]})){ try { await navigator.share({files: [file], title: "My Swole data"}); return; } catch(e){ if (e.name === "AbortError") return; } }
  const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
}
function openDelete(err){
  openSheet(`
    <div class="close"><span class="eyebrow">Your data</span><button data-act="settings">Back</button></div>
    <div class="auth"><h1 class="authh" style="font-size:52px">Delete my account</h1>
    <p class="authp">This deletes your plan, sessions, check-ins, tests, Swole and login. It can't be undone. Download your data first if you want a copy.</p>
    <div class="field"><label for="delConf">Type DELETE to confirm</label><input type="text" id="delConf" autocapitalize="characters" autocomplete="off" placeholder="DELETE"></div>
    ${err ? `<div class="banner r">${esc(err)}</div>` : ""}
    <button class="pill wide" style="background:#C42419" data-sb="delete-go">Delete everything</button></div>`);
}
async function sbDeleteMe(){
  try { if (typeof drawDeleteFiles === "function") await drawDeleteFiles(); } catch(e){}   // Swole images in storage
  await sbRest("rpc/delete_me", {method: "POST", body: "{}"});
  try { Object.keys(localStorage).filter(k => k.startsWith("swole:")).forEach(k => localStorage.removeItem(k)); } catch(e){}
  SB.session = null; SB.profile = null; SB.dirty = {};
}

function sbMark(c, id){
  SB.dirty[c] = {...(SB.dirty[c] || {}), [id]: Date.now() + Math.random()};
  sbLS.set("swole:sb:dirty", SB.dirty);
}
const sbHasDirty = () => Object.values(SB.dirty).some(o => o && Object.keys(o).length);
let sbFlushing = null;
async function sbFlush(){
  if (!SB.session || !navigator.onLine) return;
  if (sbFlushing) return sbFlushing;
  sbFlushing = (async () => {
    const uid = sbUid(), sent = [], rows = [];
    for (const c of Object.keys(SB.dirty)){
      for (const [id, stamp] of Object.entries(SB.dirty[c] || {})){
        const data = S[c] && S[c][id];
        if (data === undefined){ sent.push([c, id, stamp]); continue; }
        rows.push({user_id: uid, col: c, id, data, updated_at: new Date().toISOString()});
        sent.push([c, id, stamp]);
      }
    }
    try {
      for (let i = 0; i < rows.length; i += 200)
        await sbRest("entries?on_conflict=user_id,col,id", {method: "POST", headers: {Prefer: "resolution=merge-duplicates,return=minimal"}, body: JSON.stringify(rows.slice(i, i + 200))});
      sent.forEach(([c, id, stamp]) => { if (SB.dirty[c] && SB.dirty[c][id] === stamp) delete SB.dirty[c][id]; });
      sbLS.set("swole:sb:dirty", SB.dirty);
      SB.lastSync = new Date().toISOString(); sbLS.set("swole:sb:lastSync", SB.lastSync);
      SB.lastError = "";
      sbFlushing = null;
      if (sbHasDirty()) return sbFlush();
      sbSetState("synced");
    } catch(e){ SB.lastError = e.message || "error"; sbSetState("error"); sbFlushing = null; }
  })();
  return sbFlushing;
}
async function sbLoad(){
  if (!SB.session) return;
  sbSetState("syncing");
  try {
    const uid = sbUid();
    const rows = await sbRest(`entries?select=col,id,data&user_id=eq.${uid}`);
    const remote = {}; COLS.forEach(c => { remote[c] = {}; });
    (rows || []).forEach(r => { if (remote[r.col]) remote[r.col][r.id] = r.data; });
    COLS.forEach(c => {
      const merged = {...S[c], ...remote[c]};
      Object.keys(SB.dirty[c] || {}).forEach(id => { if (S[c][id] !== undefined) merged[id] = S[c][id]; });   // unsynced local edits win
      S[c] = merged; LS.set("swole:data:" + c, S[c]);
    });
    const p = await sbRest(`profiles?id=eq.${uid}&select=display_name,handle,role,gym_id,trainer_id`);
    if (p && p[0]){ SB.profile = p[0]; sbLS.set("swole:sb:profile", SB.profile); }
    await sbFlush();
    if (!sbHasDirty()) sbSetState("synced");
    sbCheckConsent();
    if (typeof drawWatch === "function") drawWatch();
  } catch(e){ SB.lastError = (e.message || "error") + " while loading"; sbSetState("error"); }
}

/* ---------- login screen ---------- */
let sbStep = "email";
function openAuth(step){
  sbStep = step || "email";
  const err = openAuth.err ? `<div class="banner r" style="margin:10px 0">${esc(openAuth.err)}</div>` : "";
  openAuth.err = "";
  const body = sbStep === "email" ? `
      <p class="authp">Log in with your email. We'll send you a code. No password.</p>
      <div class="field"><label for="sbEmail">Email</label><input type="email" id="sbEmail" inputmode="email" autocomplete="email" autocapitalize="off" value="${esc(SB.email)}" placeholder="you@example.com"></div>
      ${err}
      <button class="pill wide authgo" data-sb="send">Send me a code</button>`
    : `
      <p class="authp">We sent a code to <b>${esc(SB.email)}</b>. Type it here.</p>
      <div class="field"><label for="sbCode">Code</label><input type="text" id="sbCode" inputmode="numeric" autocomplete="one-time-code" maxlength="10" placeholder="123456"></div>
      ${err}
      <button class="pill wide authgo" data-sb="verify">Log in</button>
      <div class="authrow"><button class="authlink" data-sb="back">Use another email</button><button class="authlink" data-sb="resend">Send a new code</button></div>`;
  openSheet(`
    <div class="close"><span class="eyebrow">Swole · pilot</span><button data-sb="skip">Not now</button></div>
    <div class="auth">
      <h1 class="authh">Steady habits beat ${typeof HABIT_WORDS !== "undefined" ? HABIT_WORDS[0] : "big bursts."}</h1>
      ${body}
      <p class="authfine">The pilot is invite-only. Your check-ins and logs are stored in the EU and only you and your trainer can see your training data.</p>
    </div>`);
  setTimeout(() => { const i = document.getElementById(sbStep === "email" ? "sbEmail" : "sbCode"); if (i) i.focus(); }, 250);
}
function sbErrText(e){
  if (e.status === 429 || /rate/i.test(e.message)) return "Too many tries. Wait a minute and try again.";
  if (/not authorized/i.test(e.message)) return "Supabase won't email that address yet (the built-in email only reaches the project's own team). Use the email your Supabase account is on, or set up custom email.";
  if (/invite-only|Database error/i.test(e.message)) return "That email isn't on the pilot list yet. Ask Mathias to add you.";
  if (/expired|invalid/i.test(e.message) || e.code === "otp_expired") return "That code didn't work. Check it, or send a new one.";
  if (/fetch|network/i.test(e.message)) return "No connection. Try again when you're online.";
  return e.message || "Something went wrong.";
}
document.addEventListener("click", async e => {
  const b = e.target.closest("[data-sb]"); if (!b) return;
  const a = b.dataset.sb;
  if (a === "send" || a === "resend"){
    const email = a === "send" ? (document.getElementById("sbEmail").value || "").trim().toLowerCase() : SB.email;
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)){ openAuth.err = "That doesn't look like an email address."; openAuth("email"); return; }
    b.disabled = true; b.textContent = "Sending…";
    try { await sbSendCode(email); if (a === "resend") toast("New code sent."); openAuth("code"); }
    catch(err){ openAuth.err = sbErrText(err); openAuth(a === "send" ? "email" : "code"); }
  }
  else if (a === "verify"){
    const code = (document.getElementById("sbCode").value || "").replace(/\D/g, "");
    if (code.length < 6){ openAuth.err = "The code has at least 6 digits."; openAuth("code"); return; }
    b.disabled = true; b.textContent = "Logging in…";
    try { await sbVerify(SB.email, code); closeSheet(); toast("You're in. Your data is synced."); }
    catch(err){ openAuth.err = sbErrText(err); openAuth("code"); }
  }
  else if (a === "back"){ openAuth("email"); }
  else if (a === "consent"){
    b.disabled = true; b.textContent = "Saving…";
    try { await sbGiveConsent(); closeSheet(); toast("Thanks. You're all set."); }
    catch(err){ b.disabled = false; b.textContent = "I agree"; toast("Couldn't save. Check your connection and try again."); }
  }
  else if (a === "export"){ b.disabled = true; b.textContent = "Preparing…"; try { await sbExport(); } catch(err){ toast("Couldn't get your data. Try again when you're online."); } b.disabled = false; b.textContent = "Download my data"; }
  else if (a === "delete"){ openDelete(); }
  else if (a === "delete-go"){
    if (((document.getElementById("delConf") || {}).value || "").trim().toUpperCase() !== "DELETE"){ openDelete("Type DELETE to confirm."); return; }
    b.disabled = true; b.textContent = "Deleting…";
    try { await sbDeleteMe(); closeSheetQuiet(); toast("Your account and data are deleted."); setTimeout(() => location.reload(), 1200); }
    catch(err){ openDelete("Couldn't delete right now (" + (err.message || "error") + "). Try again, or email " + SWOLE_CONTACT + "."); }
  }
  else if (a === "skip"){ sbLS.set("swole:sb:skip", true); closeSheet(); }
  else if (a === "login"){ openAuth("email"); }
  else if (a === "logout"){ await sbSignOut(); toast("Logged out. Your data stays on this phone."); openSettings(); }
  else if (a === "redraw"){ b.disabled = true; await drawRetry(); openSettings(); }
  else if (a === "sync"){ await sbLoad(); render(); toast(SB.state === "synced" ? "Synced." : "Couldn't sync."); openSettings(); }
});

/* ---------- settings block ---------- */
function sbSettingsBlock(){
  const st = {local: "Not logged in", syncing: "Syncing…", synced: "Synced", error: "Couldn't sync. Will retry."}[SB.session ? SB.state : "local"];
  if (!SB.session) return `
    <div class="block">
      <h3>Account<small>${esc(st)}</small></h3>
      <p class="verdict-l" style="text-align:left;max-width:none;margin:6px 0 10px">Log in to back up your data and join the pilot.</p>
      <div style="margin-bottom:12px"><button class="btn red" data-sb="login">Log in</button></div>
    </div>`;
  const last = SB.lastSync ? new Date(SB.lastSync).toLocaleString("en-GB", {day:"numeric", month:"short", hour:"2-digit", minute:"2-digit"}) : "";
  const role = SB.profile ? SB.profile.role : "";
  return `
    <div class="block">
      <h3>Account<small>${esc(st)}</small></h3>
      <p class="verdict-l" style="text-align:left;max-width:none;margin:6px 0">Logged in as <b>${esc(SB.session.user.email || "")}</b>${role && role !== "member" ? ` · ${esc(role)}` : ""}. Your data is stored in the EU (Frankfurt).${last ? ` Last sync ${esc(last)}.` : ""}</p>
      ${SB.lastError ? `<div class="banner r" style="margin:8px 0">${esc(SB.lastError)}</div>` : ""}
      <div class="opts" style="margin:10px 0 12px"><button class="btn" data-sb="sync">Sync now</button><button class="btn ghost" data-sb="logout">Log out</button></div>
    </div>
    ${typeof drawSettingsBlock === "function" ? drawSettingsBlock() : ""}
    <div class="block">
      <h3>Your data<small>EU · Frankfurt</small></h3>
      <p class="verdict-l" style="text-align:left;max-width:none;margin:6px 0">Get a copy of everything Swole has stored about you, or delete it all. <a href="privacy.html" target="_blank" rel="noopener" style="color:inherit;text-decoration:underline">Privacy note</a></p>
      <div class="opts" style="margin:10px 0 12px"><button class="btn" data-sb="export">Download my data</button><button class="btn ghost" style="color:#C42419" data-sb="delete">Delete my account</button></div>
    </div>`;
}

/* ---------- boot ---------- */
function sbBoot(){
  if (window.SWOLE_DEMO) return;
  sbFromHash();
  if (!SB.session && !sbLS.get("swole:sb:skip", false)) setTimeout(() => { if (!SB.session && !document.documentElement.classList.contains("ob-open")) openAuth("email"); }, 1300);
}
window.addEventListener("online", () => sbFlush());
