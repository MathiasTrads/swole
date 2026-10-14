// Sends Swole's morning push. Runs from GitHub Actions (see .github/workflows/remind.yml).
import fs from "node:fs";
import vm from "node:vm";
import webpush from "web-push";

const {DATA_TOKEN, VAPID_PUBLIC, VAPID_PRIVATE, DATA_REPO, FORCE} = process.env;
const now = new Date();
const local = new Intl.DateTimeFormat("en-GB", {timeZone: "Europe/Copenhagen", hour: "2-digit", hour12: false}).format(now);
// Two cron lines cover summer and winter time; only the one that lands at 06:xx Copenhagen time sends.
if (!FORCE && Number(local) !== 6) { console.log(`Copenhagen hour is ${local}, not 06. Skipping.`); process.exit(0); }

// Today's plan, from the same plan.js the app uses.
const ctx = vm.createContext({console});
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
