// Sends Swole's reminders. Runs from GitHub Actions (see .github/workflows/remind.yml).
// v37: phone signups come from Supabase (every member), plus the old swole-data repo while it still exists.
// v38: four slots. Morning (06:05) always goes out. Lunch, evening and bedtime only go to a member
//      when there is something to do (no check-in yet, a planned session not logged), and only if the
//      member hasn't switched that reminder off in Settings (settings/reminders).
import fs from "node:fs";
import vm from "node:vm";
import webpush from "web-push";

const {DATA_TOKEN, VAPID_PUBLIC, VAPID_PRIVATE, DATA_REPO, FORCE, REMINDER_SECRET} = process.env;
const SB_URL = process.env.SB_URL || "https://wsjdewfdkqscmzdcxeke.supabase.co";
const SB_ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndzamRld2Zka3FzY216ZGN4ZWtlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTIxNDMwMDQsImV4cCI6MjEwNzcxOTAwNH0.c1MMwZhyjxr4zZXGV5If6kn3TX9et4MBEfAxiF08e9A";   // public by design
const {SCHEDULE, SLOT: SLOT_IN} = process.env;

// Each slot has two cron lines (summer / winter time), started ~90 min early because GitHub runs late.
const SLOTS = {
  morning: {h: 6,  m: 5,  cron: {2: "35 2 * * *", 1: "35 3 * * *"}},
  lunch:   {h: 12, m: 30, cron: {2: "0 9 * * *",  1: "0 10 * * *"}},
  evening: {h: 17, m: 30, cron: {2: "0 14 * * *", 1: "0 15 * * *"}},
  bed:     {h: 21, m: 30, cron: {2: "0 18 * * *", 1: "0 19 * * *"}},
};
const SLOT = SLOT_IN && SLOTS[SLOT_IN] ? SLOT_IN
  : Object.keys(SLOTS).find(k => SCHEDULE && Object.values(SLOTS[k].cron).includes(SCHEDULE.trim())) || "morning";

// Copenhagen offset right now (+1 winter, +2 summer)
const offH = d => { const p = Object.fromEntries(new Intl.DateTimeFormat("en-US", {timeZone: "Europe/Copenhagen", hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit"}).formatToParts(d).map(x => [x.type, x.value]));
  return Math.round((Date.UTC(+p.year, p.month - 1, +p.day, +p.hour, +p.minute) - d.getTime()) / 36e5); };
const SL = SLOTS[SLOT], hhmm = `${String(SL.h).padStart(2, "0")}:${String(SL.m).padStart(2, "0")}`;
console.log(`Slot: ${SLOT} (${hhmm} Copenhagen)`);
if (!FORCE) {
  const off = offH(new Date());
  // Two cron lines per slot (one per DST regime). Only the one meant for today's offset continues.
  const mine = SL.cron[off === 2 ? 2 : 1];
  if (SCHEDULE && SCHEDULE.trim() !== mine) { console.log(`Run for "${SCHEDULE}", today's line is "${mine}". Skipping.`); process.exit(0); }
  const now = new Date();
  const loc = new Date(now.getTime() + off * 36e5);
  const target = Date.UTC(loc.getUTCFullYear(), loc.getUTCMonth(), loc.getUTCDate(), SL.h, SL.m) - off * 36e5;   // local time, as UTC ms
  const wait = target - now.getTime();
  const late = SLOT === "morning" ? 3 * 36e5 : 75 * 6e4;   // a lunch reminder at 15:00 is worse than none
  if (wait < -late) { console.log("Too late for this slot. Skipping."); process.exit(0); }
  if (wait > 0) { console.log(`Waiting ${Math.round(wait / 6e4)} min until ${hhmm} Copenhagen.`); await new Promise(r => setTimeout(r, wait)); }
  else console.log(`Started ${Math.round(-wait / 6e4)} min late. Sending now.`);
}

// Today's message for one member, from the same plan.js (+ gen.js for a member's own plan) the app uses.
// plan.js/gen.js are written for the browser, so they get an empty window and localStorage.
const PLAN = fs.readFileSync("plan.js", "utf8"), GEN = fs.readFileSync("gen.js", "utf8");
const TODAY = (() => { const d = new Date(new Date().toLocaleString("en-US", {timeZone: "Europe/Copenhagen"})); return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); })();
/* today's plan for one member: [{slot, title, time}] */
function todayPlan(profile){
  const mem = {};
  const ctx = vm.createContext({console, window: profile ? {SWOLE_PROFILE: profile} : {},
    localStorage: {getItem: k => (k in mem ? mem[k] : null), setItem: (k, v) => { mem[k] = String(v); }, removeItem: k => { delete mem[k]; }}});
  const P = vm.runInContext(PLAN + "\n;" + (profile ? GEN : "") + "\n;({plannedFor, SESS, slotTime})", ctx);
  const today = new Date(new Date().toLocaleString("en-US", {timeZone: "Europe/Copenhagen"}));
  return P.plannedFor(today).map(it => ({slot: it.slot, title: P.SESS[it.id].title, time: P.slotTime(it)}));
}
/* lunch / evening / bedtime: null = nothing to do, so nothing is sent */
function laterMessage(slot, t){
  const prefs = t.reminders || {};
  if (prefs[slot] === false) return null;
  let items = [];
  try { items = todayPlan(t.profile); } catch (e) { console.log("Plan error:", e.message); }
  const open = items.filter(it => !(t.sessions || {})[TODAY + "_" + it.slot]);
  const name = it => it.title + (it.slot === "pm" && /\d/.test(it.time) ? " at " + it.time : "");
  if (slot === "lunch")
    return t.checkedIn ? null : {title: "Check in", body: "You haven't checked in today. It takes 30 seconds, and today's session adjusts to how you feel."};
  if (slot === "evening")
    return open.length ? {title: "Today's session", body: `${open.map(name).join(" + ")}. Log it when you're done, so the plan knows how your week went.`} : null;
  if (slot === "bed"){
    if (open.length) return {title: "Log today", body: `Did you train? Log ${open.map(it => it.title).join(" + ")}, or mark it skipped. Both count.`};
    if (!t.checkedIn) return {title: "Check in", body: "No check-in today. Do it now and tomorrow's plan starts from the right place."};
    if (items.length) return {title: "Good day", body: "Everything's logged. Screens down soon. Sleep is where the training turns into fitness."};
    return null;
  }
  return null;
}
function message(profile){
  const mem = {};
  const ctx = vm.createContext({console, window: profile ? {SWOLE_PROFILE: profile} : {},
    localStorage: {getItem: k => (k in mem ? mem[k] : null), setItem: (k, v) => { mem[k] = String(v); }, removeItem: k => { delete mem[k]; }}});
  try {
    const P = vm.runInContext(PLAN + "\n;" + (profile ? GEN : "") + "\n;({plannedFor, SESS, weekNo, phaseOf, slotTime, PLAN_WEEKS})", ctx);
    const today = new Date(new Date().toLocaleString("en-US", {timeZone: "Europe/Copenhagen"}));
    const items = P.plannedFor(today);
    const w = P.weekNo(today);
    const phase = w >= 1 && w <= P.PLAN_WEEKS ? (P.phaseOf(w) || {}).name : null;
    const list = items.map(it => (it.slot === "am" ? "" : P.slotTime(it) + " ") + P.SESS[it.id].title).join(" + ");
    if (w < 1) return {title: "Swole", body: "Your plan starts soon. Check in this morning so we have a baseline."};
    return {
      title: phase ? `Swole · Week ${w} · ${phase}` : "Swole",
      body: items.length ? `Today: ${list}. Check in first, then see how today looks.` : "Rest day. Check in anyway, then eat, walk and sleep.",
    };
  } catch (e) {
    console.log("Plan error, sending the general message:", e.message);
    return {title: "Swole", body: "Good morning. Check in first, then see what today holds."};
  }
}

// Who gets a push: every phone signup in Supabase, plus the old swole-data list.
const targets = [];   // {who, profile, sub}
if (REMINDER_SECRET) {
  // v38: reminder_status adds today's check-in, today's session logs and the reminder choices.
  // Until reminder_v38.sql has been run, fall back to reminder_targets (morning only).
  const call = (fn, body) => fetch(`${SB_URL}/rest/v1/rpc/${fn}`, {method: "POST",
    headers: {apikey: SB_ANON, Authorization: `Bearer ${SB_ANON}`, "Content-Type": "application/json"}, body: JSON.stringify(body)});
  let r = await call("reminder_status", {p_secret: REMINDER_SECRET, p_day: TODAY}), v2 = r.ok;
  if (!r.ok){ console.log("reminder_status not available:", r.status); if (SLOT !== "morning") process.exit(0); r = await call("reminder_targets", {p_secret: REMINDER_SECRET}); }
  if (!r.ok) console.log("Supabase said", r.status, (await r.text()).slice(0, 200));
  else for (const row of await r.json()) {
    const subs = Object.values((row.push && row.push.subs) || {});
    const profile = row.profile && row.profile.onboarded ? row.profile : null;
    subs.forEach(sub => targets.push({who: "member " + String(row.user_id).slice(0, 8), uid: row.user_id, profile, sub,
      checkedIn: v2 ? !!row.checked_in : null, sessions: v2 ? (row.sessions || {}) : null, reminders: v2 ? (row.reminders || {}) : {}}));
  }
} else console.log("No REMINDER_SECRET yet, so only the old swole-data list is used.");

if (DATA_TOKEN && DATA_REPO && SLOT === "morning") {   // the old list has no check-in data, so morning only
  const r = await fetch(`https://api.github.com/repos/${DATA_REPO}/contents/data/settings.json`, {
    headers: {Authorization: `Bearer ${DATA_TOKEN}`, Accept: "application/vnd.github.raw+json"}});
  if (r.ok) {
    const settings = await r.json();
    Object.values((settings.push && settings.push.subs) || {}).forEach(sub => targets.push({who: "swole-data", profile: null, sub}));
  } else console.log("swole-data not read:", r.status);
}

// the same phone can be in both lists
const seen = new Set();
const list = targets.filter(t => t.sub && t.sub.endpoint && !seen.has(t.sub.endpoint) && seen.add(t.sub.endpoint));
if (!list.length) { console.log("No push subscriptions yet."); process.exit(0); }

webpush.setVapidDetails("mailto:hello@joinswole.com", VAPID_PUBLIC, VAPID_PRIVATE);
let sent = 0;
for (const t of list) {
  const m = SLOT === "morning" ? message(t.profile) : laterMessage(SLOT, t);
  if (!m) { console.log(`Nothing to remind ${t.who} about. Skipped.`); continue; }
  try {
    await webpush.sendNotification({endpoint: t.sub.endpoint, keys: t.sub.keys}, JSON.stringify({...m, tag: "swole-" + SLOT, url: "./"}), {TTL: (SLOT === "morning" ? 3 : 1) * 3600, urgency: SLOT === "bed" ? "normal" : "high"});
    sent++; console.log(`Sent to ${t.who} (${new URL(t.sub.endpoint).host}): ${m.title} — ${m.body}`);
  } catch (e) {
    console.log(`Push failed for ${t.who} (${new URL(t.sub.endpoint).host}):`, e.statusCode, String(e.body || e.message || "").slice(0, 120), `[${m.title} — ${m.body}]`);
    // 404/410 = that phone signup is gone (app removed, or iOS reset it). Drop it so we stop trying.
    if ((e.statusCode === 404 || e.statusCode === 410) && t.uid && REMINDER_SECRET) {
      await fetch(`${SB_URL}/rest/v1/rpc/reminder_drop`, {method: "POST",
        headers: {apikey: SB_ANON, Authorization: `Bearer ${SB_ANON}`, "Content-Type": "application/json"},
        body: JSON.stringify({p_secret: REMINDER_SECRET, p_user: t.uid, p_endpoint: t.sub.endpoint})}).catch(() => {});
    }
  }
}
console.log(`Sent ${sent}/${list.length}.`);
