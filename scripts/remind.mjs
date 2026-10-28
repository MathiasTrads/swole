// Sends Swole's morning push. Runs from GitHub Actions (see .github/workflows/remind.yml).
import fs from "node:fs";
import vm from "node:vm";
import webpush from "web-push";

const {DATA_TOKEN, VAPID_PUBLIC, VAPID_PRIVATE, DATA_REPO, FORCE} = process.env;
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

// Today's plan, from the same plan.js the app uses.
// plan.js is written for the browser (it reads window/localStorage for a member's own profile since v26).
// Give it empty stand-ins, so it falls back to Mathias' own plan instead of crashing.
const mem = {};
const ctx = vm.createContext({console, window: {}, localStorage: {getItem: k => (k in mem ? mem[k] : null), setItem: (k, v) => { mem[k] = String(v); }, removeItem: k => { delete mem[k]; }}});
const P = vm.runInContext(fs.readFileSync("plan.js", "utf8") + "\n;({plannedFor, SESS, weekNo, phaseOf, slotTime})", ctx);
const today = new Date(new Date().toLocaleString("en-US", {timeZone: "Europe/Copenhagen"}));
const items = P.plannedFor(today);
const w = P.weekNo(today);
const phase = w >= 1 && w <= 26 ? P.phaseOf(w).name : null;
const list = items.map(it => (it.slot === "am" ? "" : P.slotTime(it) + " ") + P.SESS[it.id].title).join(" + ");
const body = items.length
  ? `Today: ${list}. Check in first, then I'll tell you how hard to go.`
  : "Rest day. Check in anyway, then eat, walk and sleep.";
const title = phase ? `Swole · Week ${w} · ${phase}` : "Swole";

// Subscriptions live in the private data repo.
const r = await fetch(`https://api.github.com/repos/${DATA_REPO}/contents/data/settings.json`, {
  headers: {Authorization: `Bearer ${DATA_TOKEN}`, Accept: "application/vnd.github.raw+json"},
});
if (!r.ok) { console.log("No settings.json yet:", r.status); process.exit(0); }
const settings = await r.json();
const subs = Object.values((settings.push && settings.push.subs) || {});
if (!subs.length) { console.log("No push subscriptions yet."); process.exit(0); }

webpush.setVapidDetails("mailto:swole@users.noreply.github.com", VAPID_PUBLIC, VAPID_PRIVATE);
let sent = 0;
for (const s of subs) {
  try {
    await webpush.sendNotification({endpoint: s.endpoint, keys: s.keys}, JSON.stringify({title, body, tag: "swole-morning", url: "./"}), {TTL: 3 * 3600, urgency: "high"});
    sent++;
  } catch (e) { console.log("Push failed:", e.statusCode, e.body); }
}
console.log(`Sent ${sent}/${subs.length}: ${title} — ${body}`);
