/* ============ THE PATH ============
   A trainer's program as a Duolingo-style world. Phases are sections,
   weeks are units, morning sessions are nodes, tests are boss nodes,
   every week ends in a chest. The trainer stands next to where you are. */
const PROGRAM = {
  trainer: "lek",
  name: "Fight Engine",
  by: "Kru Lek",
  gym: "Nak Muay CPH",
  blurb: "26 weeks. Explosive first, then the gas tank.",
};
const PATH_SKIP = new Set(["mobil"]);          /* optional sessions stay off the path */
const PCOLOR = { test:"#141010", f1:"#FF3B2F", d1:"#6E6564", f2:"#FF3B2F", jul:"#2E7D4F", rt1:"#141010", f3:"#FF3B2F", d2:"#6E6564", f4:"#FF3B2F", d3:"#141010", f5:"#FF3B2F", end:"#141010" };
const LEK_SAYS = {
  test:"First we measure. No ego, just numbers.",
  f1:"Knees first, then we jump. Slow is smooth.",
  d1:"Rest week. You grow when you sleep, not when you sweat.",
  f2:"Now we get heavy. Then we get fast.",
  jul:"Christmas. Eat, laugh, keep the engine warm.",
  rt1:"Retest. Show me what changed.",
  f3:"Explosive. Every rep like the last round.",
  d2:"Easy week. Hips, ankles, breathe.",
  f4:"Gas tank. Stay in the red, recover fast.",
  d3:"Light week, tests on the weekend.",
  f5:"Peak. Low volume, all speed.",
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
  /* friends on the same program, a few nodes ahead (mock) */
  const ahead = nodes.map((n, i) => i).filter(i => i > cur && nodes[i].type === "sess");
  const ghosts = {}; if (ahead[1] != null) ghosts[ahead[1]] = "mia"; if (ahead[4] != null) ghosts[ahead[4]] = "noor";
  let html = "", lastPh = null, lastW = null, si = 0;
  nodes.forEach((n, i) => {
    if (n.ph !== lastPh){
      lastPh = n.ph;
      const deload = n.ph.deload || n.ph.key === "jul";
      html += `<div class="pphase" style="--pc:${PCOLOR[n.ph.key] || "#FF3B2F"}" data-pw="${n.w}">
        <span>${n.ph.w[0] === n.ph.w[1] ? "Week "+n.ph.w[0] : "Weeks "+n.ph.w[0]+"–"+n.ph.w[1]}${deload ? " · rest camp" : ""}</span>
        <b>${deload ? `<i class="pfire">${PICON.fire}</i>` : ""}${esc(n.ph.name)}</b>
        <em>${esc(n.ph.focus[0])}</em></div>`;
    }
    if (n.w !== lastW){ lastW = n.w; html += `<div class="pweek" data-pw="${n.w}"><span>Week ${n.w} · ${fmt(weekStart(n.w))}</span></div>`; }
    const x = OFFS[si++ % OFFS.length];
    if (n.type === "chest"){
      html += `<div class="prow" style="--x:${x}px"><button class="pchest ${n.state}" data-pchest="${n.w}" aria-label="Week ${n.w} chest">${PICON.chest}</button></div>`;
      return;
    }
    const k = pkind(n.id), boss = k === "test";
    const icon = n.state === "done" && !boss ? PICON.check : PICON[k] || PICON.strength;
    const starRow = (n.state === "done" || n.state === "part") ? `<span class="pstars">${[0,1,2].map(s => `<i class="${s < n.stars ? "on" : ""}">${PICON.star}</i>`).join("")}</span>` : "";
    const g = ghosts[i] ? `<span class="pghost" title="${esc(CAST[ghosts[i]].name)} is here">${head(ghosts[i], 30)}<em>${esc(CAST[ghosts[i]].name)}</em></span>` : "";
    const bubble = i === cur ? `<span class="pstart">${iso(n.d) === iso(new Date()) ? "TODAY" : "START"}</span>` : "";
    const lek = i === cur ? `<div class="plek ${lekSide}"><div class="psay"><b>Kru Lek</b>${esc(LEK_SAYS[n.ph.key] || "")}</div><img src="${castImg("lek")}" alt="Kru Lek"></div>` : "";
    html += `<div class="prow ${i === cur ? "iscur" : ""}" style="--x:${x}px" ${i === cur ? 'id="pcur"' : ""}>${lek}
      <button class="pnode ${n.state} ${boss ? "boss" : ""}" style="--pc:${PCOLOR[n.ph.key] === "#6E6564" ? "#FF3B2F" : (PCOLOR[n.ph.key] || "#FF3B2F")}" data-pnode="${n.key}|${n.id}" aria-label="${esc(SESS[n.id].title)}, ${DAY[dow(n.d)]} ${fmt(n.d)}">
        ${bubble}<span class="pface">${icon}</span>${n.state === "current" ? `<span class="pring"></span>` : ""}</button>
      ${starRow}${g}
      <span class="plabel">${DAY[dow(n.d)]} ${n.d.getDate()}/${n.d.getMonth()+1} · ${esc(SESS[n.id].title.split(" · ")[0])}</span></div>`;
  });
  const pct = Math.round(done / sess.length * 100);
  return `
  <div class="phead" id="phead" style="--pc:${PCOLOR[curN.ph.key] || "#FF3B2F"}">
    <div class="phtop">${head(PROGRAM.trainer, 40)}<div class="phtxt"><span id="phsec">${esc(PROGRAM.by)} · ${esc(PROGRAM.name)}</span><b id="phunit">Week ${curN.w} · ${esc(curN.ph.name)}</b></div>
      <div class="phstat"><i>${PICON.star}</i>${stars}</div></div>
    <div class="phbar"><i style="width:${Math.max(2,pct)}%"></i></div>
    <div class="phmeta"><span>${done}/${sess.length} sessions</span><span>${pct}% of the program</span></div>
  </div>
  <div class="ppath">${html}
    <div class="pend"><img src="${POSE ? POSE("arms") : ""}" alt="" onerror="this.remove()"><b>Graduation</b><span>Finish the program to unlock Kru Lek's mongkol in your Locker.</span></div>
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
  if (u && u.textContent !== t){ u.textContent = t; h.style.setProperty("--pc", PCOLOR[ph.key] || "#FF3B2F"); }
}
let pathRaf = 0;
window.addEventListener("scroll", () => { if (pathRaf) return; pathRaf = requestAnimationFrame(() => { pathRaf = 0; pathSync(); }); }, {passive:true});

function pathClick(t){
  const nd = t.closest("[data-pnode]");
  if (nd){ const [key, id] = nd.dataset.pnode.split("|"); openSession(key, id); return true; }
  const ch = t.closest("[data-pchest]");
  if (ch){
    const w = Number(ch.dataset.pchest);
    if (ch.classList.contains("open")) toast(`Week ${w} chest opened: +50 XP from Kru Lek.`);
    else toast(`Finish every session in week ${w} to open this chest.`);
    return true;
  }
  return false;
}
