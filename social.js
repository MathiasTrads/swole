/* Swole · social prototype: Community, Feed, Search, You.
   Everything here is mock data so the flows can be tried on a phone.
   Local interactions (I'm in, follows, respect, added programs) are remembered on this device only. */

/* ---------- cast ---------- */
const CAST = {
  mia:    {name: "Mia",      handle: "mia.kicks",    sport: "Muay Thai",   role: "friend",  city: "Copenhagen"},
  kasper: {name: "Kasper",   handle: "bigkasper",    sport: "Boxing",      role: "friend",  city: "Copenhagen"},
  noor:   {name: "Noor",     handle: "noorruns",     sport: "Kickboxing · Running", role: "friend", city: "Frederiksberg"},
  jonas:  {name: "Jonas",    handle: "jonas.lifts",  sport: "Strength (rookie)", role: "friend", city: "Copenhagen"},
  lek:    {name: "Kru Lek",  handle: "krulek",       sport: "Muay Thai coach", role: "trainer", city: "Copenhagen"},
  elin:   {name: "Elin",     handle: "elin.moves",   sport: "Group fitness", role: "trainer", city: "Stockholm"},
  fred:   {name: "Frederik", handle: "padelfred",    sport: "Padel coach", role: "trainer", city: "Copenhagen"},
  dale:   {name: "Dale",     handle: "gusmester",    sport: "Sauna aufguss", role: "trainer", city: "Sun Valley"},
};
const castImg = id => `media/cast/${id}.webp`;
const initials = n => n.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
/* round head crop of a full-body cutout; falls back to initials until the art is in */
function head(id, size = 40){
  const c = CAST[id] || {name: "?"};
  return `<span class="hd" style="--s:${size}px" data-i="${esc(initials(c.name))}"><img src="${castImg(id)}" alt="${esc(c.name)}" loading="lazy" onerror="this.remove()"></span>`;
}
function body(id){
  const c = CAST[id] || {name: "?"};
  return `<span class="bd" data-i="${esc(initials(c.name))}"><img src="${castImg(id)}" alt="${esc(c.name)}" loading="lazy" onerror="this.remove()"></span>`;
}
function myHead(size = 40){
  return `<span class="hd me" style="--s:${size}px" data-i="M"><img src="${outfitLook() || "media/pose/stance.webp"}" alt="You"></span>`;
}

/* ---------- local state ---------- */
const SOC = {
  get(k, d){ return LS.get("swole:soc:" + k, d); },
  set(k, v){ LS.set("swole:soc:" + k, v); },
  toggle(k, id){ const o = SOC.get(k, {}); o[id] = !o[id]; SOC.set(k, o); return o[id]; },
};

/* ---------- my progress (drives the profile and flexes) ----------
   No XP, levels or ranks: they reward volume and nudge people to overtrain.
   Progress = where you are in your plan and how closely you followed it. Rest days count as following it. */
function myStats(){
  const st = lockerStats();
  const owned = ITEMS.filter(i => itemState(i, st).open).length;
  // current streak (ending today or yesterday)
  let streak = 0; for (let d = new Date(); ; d = addDays(d, -1)){ if (S.checkins[iso(d)]) streak++; else if (streak || iso(d) !== iso(new Date())) break; }
  // plan week + how many planned sessions were done so far (today counts once it's done)
  const wk = Math.min(PLAN_WEEKS, Math.max(0, st.week));
  let planned = 0, done = 0;
  const today = new Date();
  for (let d = new Date(START); d <= today && weekNo(d) <= PLAN_WEEKS; d = addDays(d, 1)){
    for (const it of plannedFor(d)){
      const ok = (S.sessions[iso(d)+"_"+it.slot] || {}).status === "done";
      if (iso(d) === iso(today) && !ok) continue;
      planned++; if (ok) done++;
    }
  }
  const onPlan = planned ? Math.round(done / planned * 100) : 0;
  const phase = wk >= 1 ? ((phaseOf(wk) || {}).name || "") : "Starts soon";
  return {...st, wk, phase, planned, done, onPlan, owned, cur: streak};
}

/* ---------- mock world ---------- */
const GYM = {name: "Nak Muay CPH", area: "Nørrebro, Copenhagen", members: 214};
function gymClasses(){
  const dow = (new Date().getDay() + 6) % 7;
  const base = [
    {id: "am-pads",  t: "07:00", title: "Morning pads",        coach: "lek", cap: 16, going: ["noor"]},
    {id: "tech",     t: "17:00", title: "Technique",           coach: "lek", cap: 24, going: ["jonas", "noor"]},
    {id: "spar",     t: "18:00", title: "Hard sparring",       coach: "lek", cap: 14, going: ["mia", "kasper", "noor"], extra: 6, hot: true},
    {id: "sauna",    t: "19:45", title: "Aufguss recovery",    coach: "dale", cap: 10, going: ["kasper"], extra: 3},
  ];
  if (dow === 5 || dow === 6) return base.filter(c => c.id !== "spar");
  return base;
}
const FRIENDS = [
  {id: "mia",    today: true,  streak: 23, last: {title: "Hard sparring", when: "Yesterday 18:00", meta: "6 × 3 min · RPE 9"}, goal: {text: "Fight-ready by March", p: .62}},
  {id: "kasper", today: true,  streak: 9,  last: {title: "Heavy bag + sauna", when: "Today 07:10", meta: "45 min · RPE 7"}, goal: {text: "Cut to 100 kg", p: .4}},
  {id: "noor",   today: true,  streak: 41, last: {title: "10 km tempo run", when: "Today 06:30", meta: "4:52 /km"}, goal: {text: "Sub-45 10 km", p: .8}},
  {id: "jonas",  today: false, streak: 0,  last: {title: "Full body A", when: "5 days ago", meta: "40 min · RPE 6"}, goal: {text: "First pull-up", p: .55}},
];
const TEAM_GOAL = {text: "Nak Muay logs 100 sessions in October", have: 63, need: 100, reward: {name: "Team fight shorts", rarity: "epic", img: "media/items/shorts-fist.webp"}};

const POSTS = [
  {id: "p1", type: "drop", by: "lek", kind: "Drill", title: "Teep, then step off the line", body: "Three rounds on the bag: teep, angle out left, rear kick. Don't admire the teep. Move.", dur: "0:24", tint: "#141010", respect: 128},
  {id: "p2", type: "flex", by: "mia", kind: "Streak", title: "23-day streak", body: "Three weeks without a missed morning.", respect: 54},
  {id: "p3", type: "drop", by: "elin", kind: "Program", title: "Engine 6", body: "6 weeks, 3 × 30 min. Intervals that make your rounds feel shorter. Finish it and unlock Elin's hoodie.", dur: "6 wk", program: {id: "engine6", weeks: 6, perWeek: 3}, signature: {name: "Elin's hoodie", rarity: "epic"}, tint: "#FF3B2F", respect: 302},
  {id: "p4", type: "flex", by: "kasper", kind: "Unlock", title: "Unlocked Barong gloves", body: "Sixty sessions. They're heavy.", item: "gloves-barong", respect: 87},
  {id: "p5", type: "drop", by: "dale", kind: "Motivation", title: "Heat is a skill", body: "Two minutes longer than you want. Breathe through the nose. Then cold. That's recovery, not a reward.", tint: "#3A2A22", respect: 61},
  {id: "p6", type: "flex", by: "noor", kind: "PR", title: "New PR · 10 km in 46:20", body: "Fastest yet. Sub-45 is coming.", respect: 143},
  {id: "p7", type: "drop", by: "fred", kind: "Program", title: "Zero to court-ready", body: "4 weeks for total beginners: footwork, the bandeja and not running into the glass.", dur: "4 wk", program: {id: "court4", weeks: 4, perWeek: 2}, tint: "#1B2A4A", respect: 77},
  {id: "p8", type: "flex", by: "jonas", kind: "Week done", title: "Week 3 on plan", body: "Still can't do a pull-up. Yet.", respect: 39},
];
const DIRECTORY = [
  ...Object.keys(CAST).map(id => ({kind: CAST[id].role === "trainer" ? "Trainers" : "People", id, name: CAST[id].name, sub: `@${CAST[id].handle} · ${CAST[id].sport}`})),
  {kind: "People", id: "x1", name: "Sofie", sub: "@sofie.bjj · Jiu-jitsu"},
  {kind: "People", id: "x2", name: "Ahmed", sub: "@ahmedlifts · Powerlifting"},
  {kind: "Gyms", id: "g1", name: GYM.name, sub: `${GYM.area} · ${GYM.members} members`, mine: true},
  {kind: "Gyms", id: "g2", name: "Iron Harbour", sub: "Vesterbro · Strength & conditioning"},
  {kind: "Gyms", id: "g3", name: "Court 9 Padel", sub: "Amager · Padel club"},
  {kind: "Gyms", id: "g4", name: "Løvens Boxing", sub: "Østerbro · Boxing"},
  {kind: "Programs", id: "engine6", name: "Engine 6", sub: "Elin · 6 weeks · conditioning"},
  {kind: "Programs", id: "court4", name: "Zero to court-ready", sub: "Frederik · 4 weeks · padel"},
  {kind: "Programs", id: "teep", name: "Teep everything", sub: "Kru Lek · 3 weeks · Muay Thai"},
];

/* ---------- shared bits ---------- */
const pageTop = (title, right = "") => `<div class="stop"><h1 class="sbig">${title}</h1>${right}</div>`;
const ICO = {
  fist: `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 11V8a1.5 1.5 0 0 1 3 0v3V7a1.5 1.5 0 0 1 3 0v4V8a1.5 1.5 0 0 1 3 0v4a1.5 1.5 0 0 1 3 0v2c0 4-3 7-7 7h-1c-3 0-5-2-5-5v-2a1.5 1.5 0 0 1 1-1.4"/></svg>`,
  plus: `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>`,
  play: `<svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>`,
  qr: `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><path d="M14 14h3v3M21 14v7h-4M14 21v-3"/></svg>`,
  search: `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>`,
};
const rarityChip = r => `<span class="rchip" style="--rc:${RARITY[r].c}">${RARITY[r].label}</span>`;

/* ============ COMMUNITY ============ */
function viewCommunity(){
  const rsvp = SOC.get("rsvp:" + iso(new Date()), {});
  const hype = SOC.get("hype:" + iso(new Date()), {});
  const cls = gymClasses();
  const inGym = new Set(cls.flatMap(c => c.going)).size + 11;
  const tg = TEAM_GOAL, tgp = Math.min(1, tg.have / tg.need);
  return `
  ${pageTop("Community")}
  <div class="frow">
    <button class="fcard me" data-friend="me">${`<span class="bd"><img src="${outfitLook() || "media/pose/stance.webp"}" alt=""></span>`}<b>You</b><small>${myStats().cur} day streak</small></button>
    ${FRIENDS.map(f => `<button class="fcard ${f.today ? "on" : "off"}" data-friend="${f.id}">${body(f.id)}<b>${esc(CAST[f.id].name)}</b><small>${f.today ? `Trained today · ${f.streak}d` : "Hasn't shown up"}</small>${hype[f.id] ? `<i class="hyped">Hyped</i>` : ""}</button>`).join("")}
  </div>

  <section class="scard gym">
    <div class="gymh"><div><span class="eyebrow">Your gym</span><h2>${esc(GYM.name)}</h2><small>${inGym} training today · ${GYM.members} members</small></div><button class="ghost-s" data-soc="gyminfo">Gym</button></div>
    ${cls.map(c => {
      const me = !!rsvp[c.id], n = c.going.length + (c.extra || 0) + (me ? 1 : 0);
      return `<div class="cls ${c.hot ? "hot" : ""}">
        <span class="ct">${c.t}</span>
        <div class="cm"><b>${esc(c.title)}</b><small>${esc(CAST[c.coach].name)} · ${n}/${c.cap} in</small>
          <span class="stack">${me ? myHead(26) : ""}${c.going.map(id => head(id, 26)).join("")}${c.extra ? `<em>+${c.extra}</em>` : ""}</span></div>
        <button class="inbtn" data-rsvp="${c.id}" aria-pressed="${me}">${me ? "You're in" : "I'm in"}</button>
      </div>`; }).join("")}
  </section>

  <section class="scard team">
    <div class="tgh"><span class="eyebrow">Team goal</span>${rarityChip(tg.reward.rarity)}</div>
    <h3>${esc(tg.text)}</h3>
    <div class="bar"><i style="width:${Math.round(tgp * 100)}%"></i></div>
    <div class="tgf"><small>${tg.have}/${tg.need} sessions · ends Oct 31</small><span class="rw"><img src="${tg.reward.img}" alt=""><small>Everyone gets<br><b>${esc(tg.reward.name)}</b></small></span></div>
  </section>

  <h3 class="sh3">Friends' training</h3>
  <div class="acts">${FRIENDS.map(f => `<button class="act" data-friend="${f.id}">${head(f.id, 38)}<div><b>${esc(CAST[f.id].name)}</b> · ${esc(f.last.title)}<small>${esc(f.last.when)} · ${esc(f.last.meta)}</small></div><span class="go2">›</span></button>`).join("")}</div>`;
}
function openFriend(id){
  if (id === "me"){ tab = "you"; render(); return; }
  const f = FRIENDS.find(x => x.id === id), c = CAST[id], hyped = SOC.get("hype:" + iso(new Date()), {})[id];
  openSheet(`
    <div class="close"><span class="eyebrow">@${esc(c.handle)}</span><button data-act="close">Close ✕</button></div>
    <div class="prof">
      <div class="pfig ${f.today ? "" : "off"}">${body(id)}</div>
      <div class="pinfo"><h1 class="sbig">${esc(c.name)}</h1><small>${esc(c.sport)} · ${esc(GYM.name)}</small>
        <div class="pst"><span><b>${f.streak}</b>day streak</span><span><b>${f.today ? "Yes" : "No"}</b>trained today</span></div></div>
    </div>
    <div class="scard"><span class="eyebrow">Goal</span><h3 style="margin:4px 0 8px">${esc(f.goal.text)}</h3><div class="bar"><i style="width:${Math.round(f.goal.p * 100)}%"></i></div></div>
    <div class="scard"><span class="eyebrow">Latest public workout</span><h3 style="margin:4px 0 2px">${esc(f.last.title)}</h3><small class="mut">${esc(f.last.when)} · ${esc(f.last.meta)}</small></div>
    <div class="opts" style="margin-top:6px"><button class="pill wide" data-hype="${id}" ${hyped ? "disabled" : ""}>${hyped ? "Hype sent" : f.today ? "Send hype" : "Pull up tonight?"}</button></div>`);
}

/* ============ FEED ============ */
function viewFeed(){
  const mine = SOC.get("myflex", []);
  const posts = [...mine, ...POSTS];
  return `
  ${pageTop("Feed", `<button class="ghost-s" data-soc="flex">${ICO.plus} Flex</button>`)}
  <div class="fchips"><button aria-pressed="${feedFilter === "all"}" data-ff="all">All</button><button aria-pressed="${feedFilter === "drop"}" data-ff="drop">Trainer drops</button><button aria-pressed="${feedFilter === "flex"}" data-ff="flex">Flexes</button></div>
  <div class="posts">${posts.filter(p => feedFilter === "all" || p.type === feedFilter).map(postCard).join("")}</div>`;
}
let feedFilter = "all";
function postCard(p){
  const r = SOC.get("respect", {}), mine = !!r[p.id], n = (p.respect || 0) + (mine ? 1 : 0);
  const who = p.by === "me" ? {name: "You", handle: "mathias"} : CAST[p.by];
  const added = SOC.get("programs", {});
  const foot = `<div class="pfoot"><button class="resp" data-respect="${p.id}" aria-pressed="${mine}">${ICO.fist}<span>${n}</span></button>
    ${p.program ? `<button class="addp" data-addprog="${p.program.id}" data-title="${esc(p.title)}" data-by="${esc(who.name)}" aria-pressed="${!!added[p.program.id]}">${added[p.program.id] ? "In your plan ✓" : "Add to my plan"}</button>` : ""}</div>`;
  const hdr = `<div class="phd">${p.by === "me" ? myHead(34) : head(p.by, 34)}<div><b>${esc(who.name)}</b>${CAST[p.by] && CAST[p.by].role === "trainer" ? `<span class="tbadge">Trainer</span>` : ""}<small>@${esc(who.handle)} · ${esc(p.kind)}</small></div></div>`;
  if (p.type === "drop"){
    return `<article class="post drop">${hdr}
      <div class="dmedia" style="--tint:${p.tint || "#141010"}">
        <svg class="dword" viewBox="0 0 1000 300" aria-hidden="true"><text x="0" y="280" textLength="1000" lengthAdjust="spacingAndGlyphs">${esc(p.kind.toUpperCase())}</text></svg>
        <div class="dfig">${body(p.by)}</div>
        ${p.dur ? `<span class="ddur">${p.kind === "Drill" ? ICO.play : ""}${esc(p.dur)}</span>` : ""}
      </div>
      <div class="pbody"><h3>${esc(p.title)}</h3><p>${esc(p.body)}</p>${p.signature ? `<p class="sig">Finish it to unlock ${rarityChip(p.signature.rarity)} <b>${esc(p.signature.name)}</b></p>` : ""}</div>${foot}</article>`;
  }
  const item = p.item && ITEMS.find(i => i.id === p.item);
  const art = p.by === "me" ? (p.img || outfitLook() || "media/pose/win.webp") : null;
  return `<article class="post flex">${hdr}
    <div class="fmedia ${item ? "item" : ""}" style="${item ? `--rc:${RARITY[item.rarity].c}` : ""}">
      <div class="ftxt"><span class="fkind">${esc(p.kind)}</span><svg class="fword" viewBox="0 0 600 170" aria-hidden="true"><text x="0" y="150" textLength="${Math.min(600, p.title.length * 34)}" lengthAdjust="spacingAndGlyphs">${esc(p.title.toUpperCase())}</text></svg></div>
      <div class="ffig">${item ? `<img src="${item.img}" alt="">` : art ? `<span class="bd"><img src="${art}" alt=""></span>` : body(p.by)}</div>
    </div>
    <div class="pbody"><p>${esc(p.body)}</p></div>${foot}</article>`;
}
function openFlexComposer(){
  const m = myStats(), st = lockerStats();
  const lastUnlock = ITEMS.filter(i => i.unlock.type !== "start" && itemState(i, st).open).slice(-1)[0];
  const opts = [
    {kind: "Streak", title: `${Math.max(1, m.cur)}-day streak`, body: "Showing up is the whole trick.", img: "media/pose/win.webp"},
    {kind: "On plan", title: `Week ${Math.max(1, m.wk)} of ${PLAN_WEEKS}`, body: m.planned ? `${m.done} of ${m.planned} planned sessions done. Rest days included.` : "Day one. Let's go."},
    {kind: "Fit check", title: "Today's fit", body: "Locker looking right.", img: outfitLook() || "media/pose/stance.webp"},
    ...(lastUnlock ? [{kind: "Unlock", title: `Unlocked ${lastUnlock.name}`, body: RARITY[lastUnlock.rarity].label + " drop.", item: lastUnlock.id}] : []),
  ];
  window.__flexOpts = opts;
  openSheet(`
    <div class="close"><span class="eyebrow">New flex</span><button data-act="close">Close ✕</button></div>
    <h1 class="sh-title">What are you flexing?</h1>
    <p class="mut" style="margin:0 0 10px">Swole builds the card from your own data. One tap and it's out.</p>
    <div class="flexopts">${opts.map((o, i) => `<button class="flexopt" data-postflex="${i}"><b>${esc(o.title)}</b><small>${esc(o.kind)}</small></button>`).join("")}</div>
    <p class="mut" style="font-size:12px;margin-top:12px">Photo and video upload come in the real version.</p>`);
}

/* ============ SEARCH ============ */
let searchQ = "", searchKind = "All";
function viewSearch(){
  const fol = SOC.get("follow", {});
  const kinds = ["All", "People", "Trainers", "Gyms", "Programs"];
  const q = searchQ.trim().toLowerCase();
  const res = DIRECTORY.filter(d => (searchKind === "All" || d.kind === searchKind) && (!q || (d.name + " " + d.sub).toLowerCase().includes(q)));
  return `
  ${pageTop("Search")}
  <div class="sbox">${ICO.search}<input id="sq" type="search" placeholder="Friends, gyms, trainers, programs" value="${esc(searchQ)}" autocomplete="off"></div>
  <div class="fchips">${kinds.map(k => `<button aria-pressed="${searchKind === k}" data-sk="${k}">${k}</button>`).join("")}</div>
  <button class="qrbtn" data-soc="qr">${ICO.qr}<span><b>Scan at the front desk</b><small>Join your gym in one scan</small></span></button>
  <div class="sres" id="sres">${searchResults(res, fol)}</div>`;
}
function searchResults(res, fol){
  if (!res.length) return `<div class="empty">Nothing found. Try another name.</div>`;
  return res.map(d => {
    const on = d.mine || fol[d.id];
    const label = d.kind === "Gyms" ? (on ? "Member" : "Join") : d.kind === "Programs" ? (SOC.get("programs", {})[d.id] ? "In plan" : "Add") : (on ? "Following" : "Follow");
    const pic = CAST[d.id] ? head(d.id, 44) : `<span class="hd sq" style="--s:44px" data-i="${esc(initials(d.name))}"></span>`;
    return `<div class="sr">${pic}<div><b>${esc(d.name)}</b><small>${esc(d.sub)}</small></div><button class="inbtn" data-follow="${d.id}" data-kind="${d.kind}" aria-pressed="${!!on || label === "In plan"}" ${d.mine ? "disabled" : ""}>${label}</button></div>`;
  }).join("");
}

/* ============ YOU ============ */
function viewYou(){
  const m = myStats(), eq = equipped(), vis = SOC.get("visibility", "friends");
  const pct = Math.round(Math.max(0, m.wk) / PLAN_WEEKS * 100);
  const shown = Object.values(eq).map(id => ITEMS.find(i => i.id === id)).filter(Boolean);
  const badges = [
    {n: "First check-in", on: m.checkins >= 1}, {n: "7-day streak", on: m.streak >= 7}, {n: "10 sessions", on: m.sessions >= 10},
    {n: "Test week", on: m.tests >= 4}, {n: "Deload survivor", on: m.week >= 6}, {n: "26 weeks", on: m.week >= 26},
  ];
  const added = SOC.get("programs", {});
  return `
  <section class="youhero">
    <div class="yfig">${outfitLook() ? `<img src="${outfitLook()}" alt="">` : mediaTag(BUILTIN)}</div>
    <div class="yinfo">
      <span class="eyebrow">@mathias · ${esc(GYM.name)}</span>
      <h1 class="sbig">Mathias</h1>
      <div class="lvl"><b>${m.wk >= 1 ? `Week ${m.wk} of ${PLAN_WEEKS}` : "Plan starts Monday"}</b><span>${esc(m.phase)}</span></div>
      <div class="bar"><i style="width:${pct}%"></i></div><small class="mut">${m.planned ? `${m.onPlan} % of planned sessions done` : "Your plan, one week at a time"}</small>
      <div class="pst"><span><b>${m.cur}</b>streak</span><span><b>${m.sessions}</b>sessions</span><span><b>${m.owned}</b>items</span></div>
    </div>
  </section>
  <h3 class="sh3">Showroom</h3>
  <div class="showroom">${shown.map(i => `<button class="ltile on" style="--rc:${RARITY[i.rarity].c}" data-item="${i.id}"><img src="${i.img}" alt=""></button>`).join("")}<button class="ltile add" data-act="locker">${ICO.plus}</button></div>
  <h3 class="sh3">Badges</h3>
  <div class="badges">${badges.map(b => `<span class="badge ${b.on ? "on" : ""}">${esc(b.n)}</span>`).join("")}</div>
  ${Object.keys(added).filter(k => added[k]).length ? `<h3 class="sh3">Programs you added</h3><div class="acts">${Object.keys(added).filter(k => added[k]).map(k => { const d = DIRECTORY.find(x => x.id === k); return `<div class="act">${d ? `<div><b>${esc(d.name)}</b><small>${esc(d.sub)}</small></div>` : esc(k)}</div>`; }).join("")}</div>` : ""}
  <h3 class="sh3">Admin</h3>
  <div class="admin">
    <button class="arow" data-act="settings"><b>Settings</b><small>Data sync, reminder, look</small><span class="go2">›</span></button>
    <button class="arow" data-soc="devices"><b>Devices</b><small>Garmin, Apple Health</small><span class="go2">›</span></button>
    <div class="arow"><b>Who sees my workouts</b><div class="seg mini">${[["public","Public"],["friends","Friends"],["private","Private"]].map(v => `<button data-vis="${v[0]}" aria-pressed="${vis === v[0]}">${v[1]}</button>`).join("")}</div></div>
    <button class="arow" data-soc="purchases"><b>Purchases & drops</b><small>Nothing bought yet</small><span class="go2">›</span></button>
    <button class="arow" data-act="replayintro"><b>Replay intro</b><small>Meet Swole again</small><span class="go2">›</span></button>
  </div>
  <p class="mut proto">Prototype: friends, gym, feed and search use made-up data. Your own training data is real.</p>`;
}

/* ============ CLICK HANDLING ============ */
function socialClick(t){
  const d = t.dataset;
  if (d.friend){ openFriend(d.friend); return true; }
  if (d.rsvp){ const k = "rsvp:" + iso(new Date()); const on = SOC.toggle(k, d.rsvp); toast(on ? "You're in. See you there." : "Spot released."); render(); return true; }
  if (d.hype){ const k = "hype:" + iso(new Date()); const o = SOC.get(k, {}); o[d.hype] = true; SOC.set(k, o); toast(`Hype sent to ${CAST[d.hype].name}.`); openFriend(d.hype); return true; }
  if (d.respect){ SOC.toggle("respect", d.respect); const n = t.querySelector("span"); const on = t.getAttribute("aria-pressed") !== "true"; t.setAttribute("aria-pressed", on); n.textContent = Number(n.textContent) + (on ? 1 : -1); return true; }
  if (d.addprog){ const on = SOC.toggle("programs", d.addprog); toast(on ? `${d.title} added. It shows up in your plan.` : "Removed from your plan."); t.setAttribute("aria-pressed", on); t.textContent = on ? "In your plan ✓" : "Add to my plan"; return true; }
  if (d.ff){ feedFilter = d.ff; render(); return true; }
  if (d.sk){ searchKind = d.sk; render(); return true; }
  if (d.follow){
    if (d.kind === "Programs"){ SOC.toggle("programs", d.follow); }
    else { const on = SOC.toggle("follow", d.follow); toast(d.kind === "Gyms" ? (on ? "Request sent to the gym." : "Left.") : on ? "Following." : "Unfollowed."); }
    document.getElementById("sres").innerHTML = searchResults(currentResults(), SOC.get("follow", {})); return true;
  }
  if (d.postflex){
    const o = window.__flexOpts[Number(d.postflex)]; const list = SOC.get("myflex", []);
    list.unshift({id: "me" + Date.now(), type: "flex", by: "me", respect: 0, ...o}); SOC.set("myflex", list.slice(0, 20));
    closeSheet(); tab = "feed"; feedFilter = "all"; render(); window.scrollTo(0, 0); toast("Flex posted."); return true;
  }
  if (d.vis){ SOC.set("visibility", d.vis); render(); return true; }
  if (d.soc === "flex"){ openFlexComposer(); return true; }
  if (d.soc === "qr"){ toast("In the real app this opens the camera."); return true; }
  if (d.soc === "gyminfo"){ toast(`${GYM.name} · ${GYM.area}`); return true; }
  if (d.soc === "devices"){ toast("Garmin and Apple Health sync come in the real version."); return true; }
  if (d.soc === "purchases"){ toast("No drops yet. The first one lands soon."); return true; }
  return false;
}
function currentResults(){
  const q = searchQ.trim().toLowerCase();
  return DIRECTORY.filter(x => (searchKind === "All" || x.kind === searchKind) && (!q || (x.name + " " + x.sub).toLowerCase().includes(q)));
}
document.addEventListener("input", e => {
  if (e.target.id !== "sq") return;
  searchQ = e.target.value;
  document.getElementById("sres").innerHTML = searchResults(currentResults(), SOC.get("follow", {}));
});
