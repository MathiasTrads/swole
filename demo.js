/* ============ DEMO MODE ============
   Loaded only by demo/index.html (after plan.js, before app.js).
   Storage is namespaced in the page head, so nothing here touches the real app.
   First visit seeds four weeks of believable training so the Path, streaks and
   Locker look alive. "Reset demo" in Settings wipes it and seeds again. */
(function(){
  if (!window.SWOLE_DEMO) return;
  const get = k => { try { return JSON.parse(localStorage.getItem(k)); } catch(e){ return null; } };
  const put = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch(e){} };
  if (!get("swole:demo:seeded")){
    const today = new Date(); today.setHours(0,0,0,0);
    let seed = 11; const R = () => { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; };
    const pick = a => a[Math.floor(R() * a.length)];
    const sessions = {}, checkins = {};
    for (let d = new Date(START); d < today; d = addDays(d, 1)){
      const ds = iso(d);
      if (R() < 0.88){
        const energy = pick([3,4,4,5]), sore = pick([1,2,2,3]);
        checkins[ds] = {sleep: pick(["7-8","7-8","8+","6-7"]), energy, sore, knee: 0, stress: pick(["lav","lav","moderat"]),
          meals: pick(["4","4","5+","3"]), protein: pick(["alle","alle","fleste"]), carbs: "ja", at: ds + "T06:20:00.000Z"};
      }
      plannedFor(d).forEach(it => {
        if (R() < 0.07) return;                                   // a few missed sessions, like real life
        sessions[ds + "_" + it.slot] = {session: it.id, status: R() < 0.9 ? "done" : "part",
          rpe: R() < 0.75 ? 6 + Math.floor(R() * 3) : null, note: "", at: ds + (it.slot === "am" ? "T08:00:00.000Z" : "T19:40:00.000Z")};
      });
    }
    const w1 = n => iso(addDays(START, n));
    const tests = {
      broad:   {name: "Broad jump", history: [{date: w1(0), v: {v: 248}}]},
      trapbar: {name: "Trap bar deadlift", history: [{date: w1(0), v: {kg: 150, reps: 4}}]},
      pullups: {name: "Max pull-ups", history: [{date: w1(0), v: {v: 12}}]},
      sprint:  {name: "6 × 15 sec air bike", history: [{date: w1(4), v: {first: 21, last: 15, total: 106}}]},
      maxhr:   {name: "Max heart rate", history: [{date: w1(4), v: {v: 188}}]},
      hrr:     {name: "HR recovery 60 sec", history: [{date: w1(4), v: {v: 31}}]},
      z2:      {name: "Aerobic test, HR 125", history: [{date: w1(6), v: {v: 142}}]},
      ktw:     {name: "Knee-to-wall", history: [{date: w1(2), v: {l: 9, r: 11}}]},
      squat:   {name: "Deep squat hold", history: [{date: w1(2), v: {v: 75}}]},
      weight:  {name: "Body weight", history: [{date: w1(0), v: {v: 82.4}}]},
    };
    put("swole:data:sessions", sessions);
    put("swole:data:checkins", checkins);
    put("swole:data:tests", tests);
    put("swole:data:settings", {});
    put("swole:sb:skip", true);
    put("swole:demo:seeded", true);
  }
  document.documentElement.classList.add("is-demo");
  document.addEventListener("DOMContentLoaded", () => {
    const b = document.createElement("div"); b.id = "demobadge"; b.textContent = "Demo"; document.body.appendChild(b);
  });
  document.addEventListener("click", e => {
    const t = e.target.closest("[data-demo]"); if (!t) return;
    if (t.dataset.demo === "reset"){
      window.__demoClear();
      location.reload();
    }
  });
})();
function demoSettingsBlock(){
  return `
    <div class="block">
      <h3>Demo<small>Sample data</small></h3>
      <p class="verdict-l" style="text-align:left;max-width:none;margin:6px 0 10px">This is a demo of Swole with four weeks of sample training. Everything you do here stays on this phone. Reminders and login are switched off.</p>
      <div style="margin-bottom:12px"><button class="btn red" data-demo="reset">Reset demo</button></div>
    </div>`;
}
