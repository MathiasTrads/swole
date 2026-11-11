/* ============ THE PATH ============
   A trainer's program as a Duolingo-style world. Phases are sections,
   weeks are units, morning sessions are nodes, tests are boss nodes,
   every week ends in a chest. The trainer stands next to where you are. */
const PROGRAM = {
  trainer: "tomas",
  name: "Fight Engine",
  by: "Tomas Reyes",
  gym: "Nak Muay CPH",
  blurb: "26 weeks. Explosive first, then the gas tank.",
};
/* a member's own onboarding (demo) can swap in their coach and program name */
if (window.SWOLE_PROFILE && window.SWOLE_PROFILE.coach){
  const P = window.SWOLE_PROFILE;
  PROGRAM.trainer = typeof coachId === "function" ? coachId(P.coach) : P.coach; PROGRAM.by = (typeof CAST !== "undefined" && CAST[PROGRAM.trainer]) ? CAST[PROGRAM.trainer].name : PROGRAM.by;
  if (P.program) PROGRAM.name = P.program;
}
/* v38 coaches: plain, calm, and they say why. One line per phase type. */
const COACH_SAYS = {
  anders: {test:"First we find your numbers. Then every week has a target.", build:"Same lifts, a little more load or one more rep. That's progressive overload.", deload:"Lighter week. Fatigue drops, the strength stays.", retest:"Retest. Same setup as last time, so the numbers compare."},
  sara:   {test:"Baseline first: heart rate, pace, how fast you recover.", build:"Easy days easy, hard days hard. The middle is where progress stalls.", deload:"Easy week. The adaptations from the last block land now.", retest:"Same test, same conditions. Let's see what moved."},
  tomas:  {test:"First we see where you are. No ego, just honest numbers.", build:"Technique holds when you're tired only if you train it tired. Rounds, not reps.", deload:"Lighter week. Sharp beats sore on fight night.", retest:"Checkpoint. Same rounds, same rest. Show me what changed."},
  ingrid: {test:"We measure your range so we know what's actually changing.", build:"Range you can't control doesn't count. Load the end range slowly.", deload:"Gentle week. Keep moving, skip the hard holds.", retest:"Same positions as the first test. Measure, don't force."},
  kofi:   {test:"A short time trial so your paces fit you, not a chart.", build:"Most of your running easy. That's what lets the fast days be fast.", deload:"Fewer kilometres this week. Legs absorb the work.", retest:"Same course, same warm-up. Run it even."},
  maja:   {test:"Resting heart rate, a walk test, your watch's VO2 max. That's our starting line.", build:"Zone 2 most days, one hard interval session. That's the evidence-based mix.", deload:"Easy week. Sleep and walks still count.", retest:"Let's see your numbers move. Small changes here add up over years."},
};
const LEK_GENERIC = COACH_SAYS.tomas;
/* v42: one coach the whole way. They come back along the Path with a tip or a word of counsel,
   in the middle of longer phases. No other coach or face appears on the Path. */
const COACH_TIPS = {
  anders: ["Log the weight. Next week's target comes from this week's numbers.", "Two reps left in the tank is close enough. Grinding every set slows you down.", "Sleep is part of the program. Short nights show up on the bar."],
  sara:   ["If you can't talk on an easy day, it isn't easy. Slow down.", "Hard intervals only work if you show up fresh. Protect the day before.", "Your watch's heart rate is a guide, not a judge. Effort counts too."],
  tomas:  ["Your classes are hard days. Mornings around them stay controlled.", "Breathe out on every strike. Gas tank starts with breathing.", "Tired technique is the technique you fight with. Keep it clean."],
  ingrid: ["Range you can control beats range you can only reach.", "A little every day beats a lot once a week.", "Discomfort is fine. Sharp pain means back off."],
  kofi:   ["Most runs should feel too easy. That's the point.", "Shoes, sleep and patience. Three cheap wins.", "Miss a run? Don't make it up. Just run the next one."],
  maja:   ["Small and steady wins. A walk on a busy day still counts.", "Check your resting heart rate in the morning. It tells you how you recover.", "Strength twice a week protects everything else you do."],
};
function coachTip(n){ const t = COACH_TIPS[PROGRAM.trainer] || COACH_TIPS.tomas; return t[n % t.length]; }
const coachNote = (txt, label) => `<div class="pcoach">${head(PROGRAM.trainer, 34)}<p><b>${esc(PROGRAM.by)}${label ? " · " + esc(label) : ""}</b>${esc(txt)}</p></div>`;
function coachLine(phKey){
  const gen = typeof PLAN_GENERATED !== "undefined" && PLAN_GENERATED;
  if (PROGRAM.trainer === "tomas" && !gen) return LEK_SAYS[phKey] || "";
  const c = COACH_SAYS[PROGRAM.trainer] || LEK_GENERIC;
  if (gen && phKey === "f1") return c.test;                     // a member's first phase: the "day one" line
  return /^d|jul/.test(phKey) ? c.deload : (phKey === "test" ? c.test : /rt|end/.test(phKey) ? c.retest : c.build);
}
const PATH_SKIP = new Set(["mobil"]);          /* optional sessions stay off the path */
const PCOLOR = { test:"#000000", f1:"#000000", d1:"#6E6564", f2:"#000000", jul:"#000000", rt1:"#000000", f3:"#000000", d2:"#6E6564", f4:"#000000", d3:"#000000", f5:"#000000", end:"#000000" };
const LEK_SAYS = {
  test:"First we measure. No ego, just numbers.",
  f1:"Landing mechanics and tendons first, then we jump.",
  d1:"Lighter week. The work from the last block lands now.",
  f2:"Now we get heavy. Then we get fast.",
  jul:"Christmas. Eat, laugh, keep the engine warm.",
  rt1:"Retest. Show me what changed.",
  f3:"Power: low reps, full rest, every rep fast. Slow reps don't count here.",
  d2:"Easy week. Hips, ankles, breathe.",
  f4:"Gas tank: hard efforts, short rest. Your recovery between rounds is the target.",
  d3:"Light week, tests on the weekend.",
  f5:"Peak: less volume, same intensity. You should feel fresh and fast.",
  end:"Final test. Let's see the fighter you built.",
};
const PICON = {
  strength:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M6.5 6.5v11M17.5 6.5v11M3.5 9v6M20.5 9v6M6.5 12h11"/></svg>`,
  conditioning:`<svg viewBox="0 0 24 24" fill="currentColor"><path d="M13.5 2 4.5 13.5h6L9.5 22l9-11.5h-6z"/></svg>`,
  zone2:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M20.8 8.6a5 5 0 0 0-8.8-3.2 5 5 0 0 0-8.8 3.2c0 5.4 8.8 11 8.8 11s8.8-5.6 8.8-11z"/><path d="M3.5 12h4l1.5-3 3 6 1.5-3h7"/></svg>`,
  test:`<svg viewBox="0 0 24 24" fill="currentColor"><path d="M3 7l4.5 4L12 4l4.5 7L21 7l-2 12H5z"/></svg>`,
  mobility:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><circle cx="12" cy="4.5" r="2"/><path d="M5 9h14M12 9v5l-4 6M12 14l4 6"/></svg>`,
  check:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>`,
  chest:`<svg viewBox="0 0 48 40"><rect x="3" y="14" width="42" height="23" rx="4" fill="currentColor"/><path d="M3 18a10 10 0 0 1 10-10h22a10 10 0 0 1 10 10z" fill="currentColor" opacity=".78"/><rect x="3" y="17" width="42" height="4" fill="#000" opacity=".18"/><rect x="20" y="16" width="8" height="10" rx="2" fill="#fff" opacity=".9"/></svg>`,
  fire:`<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2c1 4-3 5.5-3 9.5A3 3 0 0 0 12 15a3 3 0 0 0 3-3.5c2 1.5 3 3.5 3 5.5a6 6 0 0 1-12 0c0-5 6-7 6-15z"/></svg>`,
  star:`<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.5l2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.4l-5.9 3.1 1.2-6.5L2.5 9.4l6.6-.9z"/></svg>`,
};
const OFFS = [0, 52, 78, 52, 0, -52, -78, -52];   /* the snake */

function pathNodes(){
  const out = [];
  PHASES.forEach(ph => {
    for (let w = ph.w[0]; w <= ph.w[1]; w++){
      TEMPLATES[ph.tpl].forEach((id, dw) => {
        if (!id || PATH_SKIP.has(id)) return;
        const d = addDays(weekStart(w), dw);
        out.push({type:"sess", w, ph, id, d, key: iso(d)+"_am"});
      });
      out.push({type:"chest", w, ph, d: addDays(weekStart(w), 6)});
    }
  });
  const today = iso(new Date());
  let cur = -1;
  out.forEach((n, i) => {
    if (n.type === "chest"){
      const wk = out.filter(x => x.type === "sess" && x.w === n.w);
      n.state = wk.every(x => (S.sessions[x.key] || {}).status === "done") ? "open" : "closed";
      return;
    }
    const log = S.sessions[n.key] || {};
    const ds = iso(n.d);
    if (log.status === "done") n.state = "done";
    else if (log.status === "part") n.state = "part";
    else if (ds < today) n.state = log.status === "skip" ? "skip" : "missed";
    else if (cur < 0){ n.state = "current"; cur = i; }
    else n.state = "locked";
    n.stars = n.state === "done" ? 1 + (log.rpe ? 1 : 0) + (S.checkins[ds] ? 1 : 0) : n.state === "part" ? 1 : 0;
  });
  return {nodes: out, cur};
}
const pkind = id => id === "zone2" ? "zone2" : (SESS[id].kind === "test" ? "test" : SESS[id].kind);

function viewPath(){
  const {nodes, cur} = pathNodes();
  const sess = nodes.filter(n => n.type === "sess");
  const done = sess.filter(n => n.state === "done").length;
  const stars = sess.reduce((a, n) => a + (n.stars || 0), 0);
  const curN = nodes[cur] || sess[sess.length-1];
  const lekSide = OFFS[cur % OFFS.length] > 0 ? "l" : "r";
  const curPh = nodes[cur] && nodes[cur].ph;
  let html = "", lastPh = null, lastW = null, si = 0, tips = 0;
  nodes.forEach((n, i) => {
    if (n.ph !== lastPh){
      lastPh = n.ph;
      const deload = n.ph.deload || n.ph.key === "jul";
      html += `<div class="pphase" style="--pc:${PCOLOR[n.ph.key] || "#000000"}" data-pw="${n.w}">
        <span>${n.ph.w[0] === n.ph.w[1] ? "Week "+n.ph.w[0] : "Weeks "+n.ph.w[0]+"–"+n.ph.w[1]}${deload ? " · rest camp" : ""}</span>
        <b>${deload ? `<i class="pfire">${PICON.fire}</i>` : ""}${esc(n.ph.name)}</b>
        <em>${esc(n.ph.focus[0])}</em></div>`;
      if (n.ph !== curPh){ const line = coachLine(n.ph.key); if (line) html += coachNote(line); }   // the coach opens every phase (the current one is said by the coach beside you)
    }
    if (n.w !== lastW){
      lastW = n.w; html += `<div class="pweek" data-pw="${n.w}"><span>Week ${n.w} · ${fmt(weekStart(n.w))}</span></div>`;
      const len = n.ph.w[1] - n.ph.w[0] + 1, mid = n.ph.w[0] + Math.floor(len / 2);
      if (len >= 3 && n.w === mid && n.ph !== curPh) html += coachNote(coachTip(tips++), "tip");
    }
    const x = OFFS[si++ % OFFS.length];
    if (n.type === "chest"){
      html += `<div class="prow" style="--x:${x}px"><button class="pchest ${n.state}" data-pchest="${n.w}" aria-label="Week ${n.w} chest">${PICON.chest}</button></div>`;
      return;
    }
    const k = pkind(n.id), boss = k === "test";
    const icon = n.state === "done" && !boss ? PICON.check : PICON[k] || PICON.strength;
    const starRow = (n.state === "done" || n.state === "part") ? `<span class="pstars">${[0,1,2].map(s => `<i class="${s < n.stars ? "on" : ""}">${PICON.star}</i>`).join("")}</span>` : "";
    const bubble = i === cur ? `<span class="pstart">${iso(n.d) === iso(new Date()) ? "TODAY" : "START"}</span>` : "";
    const lek = i === cur ? `<div class="plek ${lekSide}"><div class="psay"><b>${esc(PROGRAM.by)}</b>${esc(coachLine(n.ph.key))}</div><img src="${castImg(PROGRAM.trainer)}" alt="${esc(PROGRAM.by)}"></div>` : "";
    html += `<div class="prow ${i === cur ? "iscur" : ""}" style="--x:${x}px" ${i === cur ? 'id="pcur"' : ""}>${lek}
      <button class="pnode ${n.state} ${boss ? "boss" : ""}" style="--pc:${PCOLOR[n.ph.key] === "#6E6564" ? "#000000" : (PCOLOR[n.ph.key] || "#000000")}" data-pnode="${n.key}|${n.id}" aria-label="${esc(SESS[n.id].title)}, ${DAY[dow(n.d)]} ${fmt(n.d)}">
        ${bubble}<span class="pface">${icon}</span>${n.state === "current" ? `<span class="pring"></span>` : ""}</button>
      ${starRow}
      <span class="plabel">${DAY[dow(n.d)]} ${n.d.getDate()}/${n.d.getMonth()+1} · ${esc(SESS[n.id].title.split(" · ")[0])}</span></div>`;
  });
  const pct = Math.round(done / sess.length * 100);
  return `
  <div class="phead" id="phead" style="--pc:${PCOLOR[curN.ph.key] || "#000000"}">
    <div class="phtop">${head(PROGRAM.trainer, 40)}<div class="phtxt"><span id="phsec">${esc(PROGRAM.by)} · ${esc(PROGRAM.name)}</span><b id="phunit">Week ${curN.w} · ${esc(curN.ph.name)}</b></div>
      <div class="phstat"><i>${PICON.star}</i>${stars}</div></div>
    <div class="phbar"><i style="width:${Math.max(2,pct)}%"></i></div>
    <div class="phmeta"><span>${done}/${sess.length} sessions</span><span>${pct}% of the program</span></div>
  </div>
  <div class="ppath">${html}
    <div class="pend"><img src="${POSE ? POSE("arms") : ""}" alt="" onerror="this.remove()"><b>Graduation</b><span>Finish the program to unlock ${esc(PROGRAM.by)}'s signature item in your Locker.</span></div>
  </div>`;
}

/* sticky header follows the unit you're looking at */
let pathScrollTo = false;
function pathAfter(){
  if (pathScrollTo){ pathScrollTo = false; const c = document.getElementById("pcur"); if (c) c.scrollIntoView({block:"center"}); }
  pathSync();
}
function pathSync(){
  const h = document.getElementById("phead"); if (!h) return;
  const lim = h.getBoundingClientRect().bottom + 4;
  let w = null;
  document.querySelectorAll(".pweek[data-pw]").forEach(el => { if (el.getBoundingClientRect().top < lim) w = Number(el.dataset.pw); });
  if (w == null) w = 1;
  const ph = phaseOf(w); if (!ph) return;
  const u = document.getElementById("phunit"); const t = `Week ${w} · ${ph.name}`;
  if (u && u.textContent !== t){ u.textContent = t; h.style.setProperty("--pc", PCOLOR[ph.key] || "#000000"); }
}
let pathRaf = 0;
window.addEventListener("scroll", () => { if (pathRaf) return; pathRaf = requestAnimationFrame(() => { pathRaf = 0; pathSync(); }); }, {passive:true});

function pathClick(t){
  const nd = t.closest("[data-pnode]");
  if (nd){ const [key, id] = nd.dataset.pnode.split("|"); openSession(key, id); return true; }
  const ch = t.closest("[data-pchest]");
  if (ch){
    const w = Number(ch.dataset.pchest);
    if (ch.classList.contains("open")) toast(`Week ${w} done. That's the plan working.`);
    else toast(`Finish every session in week ${w} to open this chest.`);
    return true;
  }
  return false;
}
