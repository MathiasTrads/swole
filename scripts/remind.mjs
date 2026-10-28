// Sends Swole's morning push. Runs from GitHub Actions (see .github/workflows/remind.yml).
// v37: phone signups come from Supabase (every member), plus the old swole-data repo while it still exists.
import fs from "node:fs";
import vm from "node:vm";
import webpush from "web-push";

const {DATA_TOKEN, VAPID_PUBLIC, VAPID_PRIVATE, DATA_REPO, FORCE, REMINDER_SECRET} = process.env;
const SB_URL = process.env.SB_URL || "https://wsjdewfdkqscmzdcxeke.supabase.co";
const SB_ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndzamRld2Zka3FzY216ZGN4ZWtlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTIxNDMwMDQsImV4cCI6MjEwNzcxOTAwNH0.c1MMwZhyjxr4zZXGV5If6kn3TX9et4MBEfAxiF08e9A";   // public by design
const {SCHEDULE} = process.env;

// Copenhagen offset right now (+1 winter, +2 summer)
const offH = d => { const p = Object.fromEntries(new Intl.DateTimeFormat("en-US", {timeZone: "Europe/Copenhagen", hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit"}).formatToParts(d).map(x => [x.type, x.value]));
  return Math.round((Date.UTC(+p.year, p.month - 1, +p.day, +p.hour, +p.minute) - d.getTime()) / 36e5); };
if (!FORCE) {
  const off = offH(new Date());
  // Two cron lines (one per DST regime). Only the one meant for today's offset continues.
  const mine = off === 2 ? "35 2 * * *" : "35 3 * * *";
  if (SCHEDULE && SCHEDULE.trim() !== mine) { console.log(`Run for "${SCHEDULE}", today's slot is "${mine}". Skipping.`); process.exit(0); }
  const now = new Date();
  const loc = new Date(now.getTime() + off * 36e5);
  const target = Date.UTC(loc.getUTCFullYear(), loc.getUTCMonth(), loc.getUTCDate(), 6, 5) - off * 36e5;   // 06:05 local, as UTC ms
  const wait = target - now.getTime();
  if (wait < -3 * 36e5) { console.log("More than 3 h late. Skipping."); process.exit(0); }
  if (wait > 0) { console.log(`Waiting ${Math.round(wait / 6e4)} min until 06:05 Copenhagen.`); await new Promise(r => setTimeout(r, wait)); }
  else console.log(`Started ${Math.round(-wait / 6e4)} min late. Sending now.`);
}

// Today's message for one member, from the same plan.js (+ gen.js for a member's own plan) the app uses.
// plan.js/gen.js are written for the browser, so they get an empty window and localStorage.
const PLAN = fs.readFileSync("plan.js", "utf8"), GEN = fs.readFileSync("gen.js", "utf8");
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
  const r = await fetch(`${SB_URL}/rest/v1/rpc/reminder_targets`, {method: "POST",
    headers: {apikey: SB_ANON, Authorization: `Bearer ${SB_ANON}`, "Content-Type": "application/json"},
    body: JSON.stringify({p_secret: REMINDER_SECRET})});
  if (!r.ok) console.log("Supabase said", r.status, (await r.text()).slice(0, 200));
  else for (const row of await r.json()) {
    const subs = Object.values((row.push && row.push.subs) || {});
    const profile = row.profile && row.profile.onboarded ? row.profile : null;
    subs.forEach(sub => targets.push({who: "member " + String(row.user_id).slice(0, 8), uid: row.user_id, profile, sub}));
  }
} else console.log("No REMINDER_SECRET yet, so only the old swole-data list is used.");

if (DATA_TOKEN && DATA_REPO) {
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
  const m = message(t.profile);
  try {
    await webpush.sendNotification({endpoint: t.sub.endpoint, keys: t.sub.keys}, JSON.stringify({...m, tag: "swole-morning", url: "./"}), {TTL: 3 * 3600, urgency: "high"});
    sent++; console.log(`Sent to ${t.who} (${new URL(t.sub.endpoint).host}): ${m.title} — ${m.body}`);
  } catch (e) {
    console.log(`Push failed for ${t.who} (${new URL(t.sub.endpoint).host}):`, e.statusCode, String(e.body || "").slice(0, 120));
    // 404/410 = that phone signup is gone (app removed, or iOS reset it). Drop it so we stop trying.
    if ((e.statusCode === 404 || e.statusCode === 410) && t.uid && REMINDER_SECRET) {
      await fetch(`${SB_URL}/rest/v1/rpc/reminder_drop`, {method: "POST",
        headers: {apikey: SB_ANON, Authorization: `Bearer ${SB_ANON}`, "Content-Type": "application/json"},
        body: JSON.stringify({p_secret: REMINDER_SECRET, p_user: t.uid, p_endpoint: t.sub.endpoint})}).catch(() => {});
    }
  }
}
console.log(`Sent ${sent}/${list.length}.`);
