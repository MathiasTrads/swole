/* Swole · social prototype: Community, Feed, Search, You.
   Everything here is mock data so the flows can be tried on a phone.
   Local interactions (I'm in, follows, respect, added programs) are remembered on this device only. */

/* ---------- cast ---------- */
const CAST = {
  mia:    {name: "Mia",      handle: "mia.kicks",    sport: "Muay Thai",   role: "friend",  city: "Copenhagen"},
  kasper: {name: "Kasper",   handle: "bigkasper",    sport: "Boxing",      role: "friend",  city: "Copenhagen"},
  noor:   {name: "Noor",     handle: "noorruns",     sport: "Kickboxing · Running", role: "friend", city: "Frederiksberg"},
  jonas:  {name: "Jonas",    handle: "jonas.lifts",  sport: "Strength (rookie)", role: "friend", city: "Copenhagen"},
  anders: {name: "Anders Holm",  handle: "anders.holm",  sport: "Strength coach",            role: "trainer", city: "Copenhagen", coach: "strength"},
  sara:   {name: "Sara Okafor",  handle: "sara.okafor",  sport: "Conditioning coach",        role: "trainer", city: "Copenhagen", coach: "conditioning"},
  tomas:  {name: "Tomas Reyes",  handle: "tomas.reyes",  sport: "Striking coach",            role: "trainer", city: "Copenhagen", coach: "combat"},
  ingrid: {name: "Ingrid Lund",  handle: "ingrid.lund",  sport: "Physio · mobility",         role: "trainer", city: "Aarhus",     coach: "mobility"},
  kofi:   {name: "Kofi Mensah",  handle: "kofi.runs",    sport: "Running coach",             role: "trainer", city: "Copenhagen", coach: "running"},
  maja:   {name: "Maja Berg",    handle: "maja.berg",    sport: "Exercise physiologist",     role: "trainer", city: "Stockholm",  coach: "health"},
};
/* v38: the old cartoon coaches (lek, elin, fred, dale) were replaced by six science-based coaches.
   Profiles saved before v38 still say the old id, so it maps to the closest new coach. */
const COACH_ALIAS = {lek: "tomas", elin: "sara", fred: "anders", dale: "maja"};
const coachId = id => COACH_ALIAS[id] || id;
const castImg = id => `media/cast/${coachId(id)}.webp`;
const initials = n => n.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
/* round head crop of a full-body cutout; falls back to initials until the art is in */
function head(id, size = 40){
  const c = CAST[coachId(id)] || {name: "?"};
  return `<span class="hd"${tierAttr(kitOf(coachId(id)))} style="--s:${size}px" data-i="${esc(initials(c.name))}"><img src="${castImg(id)}" alt="${esc(c.name)}" loading="lazy" onerror="this.remove()"></span>`;
}
function body(id){
  const c = CAST[coachId(id)] || {name: "?"};
  return `<span class="bd" data-i="${esc(initials(c.name))}"><img src="${castImg(id)}" alt="${esc(c.name)}" loading="lazy" onerror="this.remove()"></span>`;
}
function myHead(size = 40){
  return `<span class="hd me"${tierAttr(myKit())} style="--s:${size}px" data-i="M"><img src="${mySwoleImg()}" alt="You"></span>`;
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
    {id: "am-pads",  t: "07:00", title: "Morning pads",        coach: "tomas", cap: 16, going: ["noor"]},
    {id: "tech",     t: "17:00", title: "Technique",           coach: "tomas", cap: 24, going: ["jonas", "noor"]},
    {id: "spar",     t: "18:00", title: "Hard sparring",       coach: "tomas", cap: 14, going: ["mia", "kasper", "noor"], extra: 6, hot: true},
    {id: "sc",       t: "19:45", title: "Strength for fighters", coach: "anders", cap: 12, going: ["kasper"], extra: 3},
  ];
  if (dow === 5 || dow === 6) return base.filter(c => c.id !== "spar");
  return base;
}
const FRIENDS = [
  {id: "mia",    today: true,  streak: 23, kit: ["s22","f12","g14","g16"], earned: {s22: "2026-11-02", g14: "2026-10-20", g16: "2026-10-27", f12: "2026-10-12"}, last: {title: "Hard sparring", when: "Yesterday 18:00", meta: "6 × 3 min · RPE 9"}, goal: {text: "Fight-ready by March", p: .62}},
  {id: "kasper", today: true,  streak: 9,  kit: ["s18","s19","f09","g18"], earned: {g18: "2026-11-08", s18: "2026-10-30", s19: "2026-10-30", f09: "2026-10-16"}, last: {title: "Heavy bag + sauna", when: "Today 07:10", meta: "45 min · RPE 7"}, goal: {text: "Cut to 100 kg", p: .4}},
  {id: "noor",   today: true,  streak: 41, kit: ["s25","s12","f13","g17"], earned: {s25: "2026-11-06", f13: "2026-10-24", g17: "2026-10-18", s12: "2026-09-29"}, last: {title: "10 km tempo run", when: "Today 06:30", meta: "4:52 /km"}, goal: {text: "Sub-45 10 km", p: .8}},
  {id: "jonas",  today: false, streak: 0,  kit: ["s03","s05","f04","g01"], earned: {s03: "2026-10-21", s05: "2026-10-24", f04: "2026-10-27"}, last: {title: "Full body A", when: "5 days ago", meta: "40 min · RPE 6"}, goal: {text: "First pull-up", p: .55}},
];
const TEAM_GOAL = {text: "Nak Muay logs 100 sessions in October", have: 63, need: 100, reward: {name: "Fight shorts with Stop crest", rarity: "epic", img: "media/locker/items/s20.webp"}};

const POSTS = [
  {id: "p1", type: "drop", by: "tomas", kind: "Drill", title: "Teep, then step off the line", body: "Three 3-min rounds on the bag: teep, angle out left, rear kick. Work at about 7/10 so the technique holds. Fatigue makes footwork sloppy first, so stop the round when the angle disappears.", dur: "0:24", tint: "#111111", respect: 128},
  {id: "p2", type: "session", by: "mia", kind: "Session", word: "SPARRING", title: "Hard sparring", meta: "6 × 3 min · RPE 9", proof: 2, body: "Three weeks without a missed morning.", respect: 54},
  {id: "p9", type: "unlock", by: "noor", kind: "Unlock", item: "s25", title: "No Tag rashguard", body: "Forty verified mornings. Nothing to prove.", respect: 211},
  {id: "p3", type: "drop", by: "sara", kind: "Program", title: "Engine 6", body: "6 weeks, 3 sessions a week. Two long zone 2 sessions build the aerobic base that refills you between efforts. One 4 × 4 min interval session at 90–95 % of max heart rate raises VO2 max. Finish it and unlock Sara's hoodie.", dur: "6 wk", program: {id: "engine6", weeks: 6, perWeek: 3}, signature: {name: "Sara's hoodie", rarity: "epic"}, tint: "#747474", respect: 302},
  {id: "p4", type: "unlock", by: "kasper", kind: "Unlock", item: "g18", title: "Hand-stitched gloves", body: "Thirty days straight. Made to measure.", respect: 87},
  {id: "p5", type: "drop", by: "maja", kind: "Explainer", title: "What zone 2 actually is", body: "Steady work you can keep for 30–90 minutes while still talking in full sentences. Roughly 60–70 % of max heart rate. Short bursts at 6/10 are not zone 2. The benefit comes from the time spent there.", tint: "#2E2E2E", respect: 61},
  {id: "p6", type: "session", by: "noor", kind: "PR", word: "TEMPO", title: "10 km tempo run · new PR", meta: "46:20 · 4:38 /km", proof: 2, body: "Fastest yet. Sub-45 is coming.", respect: 143},
  {id: "p7", type: "drop", by: "anders", kind: "Program", title: "Strong in 8", body: "8 weeks, 3 full-body sessions a week. Each lift 2–4 hard sets, stopping 1–3 reps short of failure. Add load when you hit the top of the rep range. Simple progressive overload.", dur: "8 wk", program: {id: "strong8", weeks: 8, perWeek: 3}, tint: "#292929", respect: 77},
  {id: "p8", type: "session", by: "jonas", kind: "Session", word: "FULL BODY", title: "Full body A", meta: "40 min · RPE 6 · week 3 on plan", proof: 1, body: "Still can't do a pull-up. Yet.", respect: 39},
];
const DIRECTORY = [
  ...Object.keys(CAST).map(id => ({kind: CAST[id].role === "trainer" ? "Trainers" : "People", id, name: CAST[id].name, sub: `@${CAST[id].handle} · ${CAST[id].sport}`})),
  {kind: "People", id: "x1", name: "Sofie", sub: "@sofie.bjj · Jiu-jitsu"},
  {kind: "People", id: "x2", name: "Ahmed", sub: "@ahmedlifts · Powerlifting"},
  {kind: "Gyms", id: "g1", name: GYM.name, sub: `${GYM.area} · ${GYM.members} members`, mine: true},
  {kind: "Gyms", id: "g2", name: "Iron Harbour", sub: "Vesterbro · Strength & conditioning"},
  {kind: "Gyms", id: "g3", name: "Court 9 Padel", sub: "Amager · Padel club"},
  {kind: "Gyms", id: "g4", name: "Løvens Boxing", sub: "Østerbro · Boxing"},
  {kind: "Programs", id: "engine6", name: "Engine 6", sub: "Sara Okafor · 6 weeks · conditioning"},
  {kind: "Programs", id: "strong8", name: "Strong in 8", sub: "Anders Holm · 8 weeks · strength"},
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
const rarityChip = r => `<span class="rchip" data-r="${r}" style="--rc:${RARITY[r].c}">${RARITY[r].label}</span>`;

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
    <button class="fcard me" data-friend="me">${tierTag(myKit())}${`<span class="bd"><img src="${mySwoleImg()}" alt=""></span>`}<b>You</b><small>${myStats().cur} day streak</small></button>
    ${FRIENDS.map(f => `<button class="fcard ${f.today ? "on" : "off"}" data-friend="${f.id}">${tierTag(f.kit)}${body(f.id)}<b>${esc(CAST[f.id].name)}</b><small>${f.today ? `Trained today · ${f.streak}d` : "Hasn't shown up"}</small>${hype[f.id] ? `<i class="hyped">Hyped</i>` : ""}</button>`).join("")}
  </div>

  <section class="scard gym">
    <div class="gymh"><div><span class="eyebrow">Your gym</span><h2>${esc(GYM.name)}</h2><small>${inGym} training today · ${GYM.members} members</small></div><button class="ghost-s" data-soc="gyminfo">Gym</button></div>
    ${cls.map(c => {
      const me = !!rsvp[c.id], n = c.going.length + (c.extra || 0) + (me ? 1 : 0);
      return `<div class="cls ${c.hot ? "hot" : ""}">
        <span class="ct">${c.t}</span>
        <div class="cm"><b>${esc(c.title)}</b><small>${esc(CAST[c.coach].name)} · ${n}/${c.cap} in</small>
          <span class="floor">${me ? `<button class="flp me" data-inspect="me"${tierAttr(myKit())} aria-label="You"><span class="bd"><img src="${mySwoleImg("ready")}" alt=""></span></button>` : ""}${c.going.map(id => `<button class="flp" data-inspect="${id}"${tierAttr(kitOf(id))} aria-label="${esc(CAST[id].name)}">${body(id)}</button>`).join("")}${c.extra ? `<em>+${c.extra}</em>` : ""}</span></div>
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
    <h3 class="sh3">Kit ${tierTag(f.kit, true)}</h3>
    <p class="mut kitnote">Tap an item to see what it took.</p>
    ${kitGrid(id)}
    <div class="scard"><span class="eyebrow">Latest public workout</span><h3 style="margin:4px 0 2px">${esc(f.last.title)}</h3><small class="mut">${esc(f.last.when)} · ${esc(f.last.meta)}</small></div>
    <div class="opts" style="margin-top:6px"><button class="pill wide" data-hype="${id}" ${hyped ? "disabled" : ""}>${hyped ? "Hype sent" : f.today ? "Send hype" : "Pull up tonight?"}</button></div>`);
}

/* ============ FEED ============ */
function viewFeed(){
  const mine = SOC.get("myflex", []);
  const posts = [...mine, ...POSTS];
  const drafts = feedDrafts(); window.__drafts = drafts;
  const show = p => feedFilter === "all" || (feedFilter === "drop" ? p.type === "drop" : p.type !== "drop");
  return `
  ${pageTop("Feed", `<button class="ghost-s" data-soc="flex">${ICO.plus} Flex</button>`)}
  <div class="fchips"><button aria-pressed="${feedFilter === "all"}" data-ff="all">All</button><button aria-pressed="${feedFilter === "crew"}" data-ff="crew">Crew</button><button aria-pressed="${feedFilter === "drop"}" data-ff="drop">Trainer drops</button></div>
  ${drafts.length ? `<div class="drafts">${drafts.slice(0, 3).map(draftCard).join("")}</div>` : ""}
  <div class="posts">${posts.filter(show).map(postCard).join("")}</div>
  <p class="mut proto">Your crew and gym see your posts. Posting never earns XP.</p>`;
}
let feedFilter = "all";
function postCard(p){
  const r = SOC.get("respect", {}), mine = !!r[p.id], n = (p.respect || 0) + (mine ? 1 : 0);
  const who = p.by === "me" ? {name: "You", handle: myHandle()} : CAST[p.by];
  const added = SOC.get("programs", {});
  const own = p.by === "me", it0 = p.item && itemById(p.item), have0 = it0 && itemState(it0, lockerStats()).open, chasing = it0 && SOC.get("chase", {})[it0.id];
  const resp = own ? `<span class="rcount" title="Only you see this">${ICO.fist}${myRespect(p)} respect · only you see this</span>`
    : `<button class="resp" data-respect="${p.id}" aria-pressed="${mine}">${ICO.fist}<span>${mine ? "Respect given" : "Respect"}</span></button>`;
  const extra = p.type === "unlock" && !own ? `<button class="addp" data-receipt="${p.by}|${p.item}">How?</button>${have0 ? `<span class="have">You have it</span>` : `<button class="addp chs" data-chase="${p.item}" aria-pressed="${!!chasing}">${chasing ? "Chasing ✓" : "Chase it"}</button>`}`
    : own && (p.type === "session" || p.type === "unlock") ? `<button class="addp" data-share="${p.id}">Share</button>` : "";
  const foot = `<div class="pfoot">${resp}${extra}
    ${p.program ? `<button class="addp" data-addprog="${p.program.id}" data-title="${esc(p.title)}" data-by="${esc(who.name)}" aria-pressed="${!!added[p.program.id]}">${added[p.program.id] ? "In your plan ✓" : "Add to my plan"}</button>` : ""}</div>`;
  const canInspect = p.by === "me" || FRIENDS.some(f => f.id === p.by);
  const hdr = `<div class="phd">${canInspect ? `<button class="hdb" data-inspect="${p.by}" aria-label="See kit">` : ""}${p.by === "me" ? myHead(34) : head(p.by, 34)}${canInspect ? "</button>" : ""}<div><b>${esc(who.name)}</b>${CAST[p.by] && CAST[p.by].role === "trainer" ? `<span class="tbadge">Trainer</span>` : ""}<small>@${esc(who.handle)} · ${esc(p.kind)}</small></div></div>`;
  if (p.type === "drop"){
    return `<article class="post drop">${hdr}
      <div class="dmedia" style="--tint:${p.tint || "#111111"}">
        <svg class="dword" viewBox="0 0 1000 300" aria-hidden="true"><text x="0" y="280" textLength="1000" lengthAdjust="spacingAndGlyphs">${esc(p.kind.toUpperCase())}</text></svg>
        <div class="dfig">${body(p.by)}</div>
        ${p.dur ? `<span class="ddur">${p.kind === "Drill" ? ICO.play : ""}${esc(p.dur)}</span>` : ""}
      </div>
      <div class="pbody"><h3>${esc(p.title)}</h3><p>${esc(p.body)}</p>${p.signature ? `<p class="sig">Finish it to unlock ${rarityChip(p.signature.rarity)} <b>${esc(p.signature.name)}</b></p>` : ""}</div>${foot}</article>`;
  }
  if (p.type === "session") return `<article class="post spost">${hdr}${sessionMedia(p)}
    <div class="pbody"><h3>${esc(p.title)}</h3>${p.meta ? `<small class="pmeta">${esc(p.meta)}</small>` : ""}${p.body ? `<p>${esc(p.body)}</p>` : ""}</div>${foot}</article>`;
  if (p.type === "unlock" && itemById(p.item)){
    const it = itemById(p.item), took = unlockText(it);
    return `<article class="post unl">${hdr}${unlockMedia(it)}
    <div class="pbody"><h3>${esc(it.name)}</h3><p class="rcpt">What it took: ${esc(took)}</p>${p.body ? `<p>${esc(p.body)}</p>` : ""}</div>${foot}</article>`;
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
    <button class="yfig" data-inspect="me" aria-label="See your kit">${outfitLook() ? `<img src="${outfitLook()}" alt="">` : mediaTag(BUILTIN)}</button>
    <div class="yinfo">
      <span class="eyebrow">@${esc(myHandle())}${myGym() ? ` · ${esc(myGym())}` : ""}</span>${tierTag(myKit(), true)}
      <h1 class="sbig">${esc(myName())}</h1>
      <div class="lvl"><b>${m.wk >= 1 ? `Week ${m.wk} of ${PLAN_WEEKS}` : "Plan starts Monday"}</b><span>${esc(m.phase)}</span></div>
      <div class="bar"><i style="width:${pct}%"></i></div><small class="mut">${m.planned ? `${m.onPlan} % of planned sessions done` : "Your plan, one week at a time"}</small>
      <div class="pst"><span><b>${m.cur}</b>streak</span><span><b>${m.sessions}</b>sessions</span><span><b>${m.owned}</b>items</span></div>
    </div>
  </section>
  <h3 class="sh3">Showroom</h3>
  <div class="showroom">${shown.map(i => `<button class="ltile on" style="--rc:${RARITY[i.rarity].c}" data-item="${i.id}"><img src="${i.img}" alt=""></button>`).join("")}<button class="ltile add" data-act="locker">${ICO.plus}</button></div>
  ${chasingList()}
  <h3 class="sh3">Badges</h3>
  <div class="badges">${badges.map(b => `<span class="badge ${b.on ? "on" : ""}">${esc(b.n)}</span>`).join("")}</div>
  ${Object.keys(added).filter(k => added[k]).length ? `<h3 class="sh3">Programs you added</h3><div class="acts">${Object.keys(added).filter(k => added[k]).map(k => { const d = DIRECTORY.find(x => x.id === k); return `<div class="act">${d ? `<div><b>${esc(d.name)}</b><small>${esc(d.sub)}</small></div>` : esc(k)}</div>`; }).join("")}</div>` : ""}
  <h3 class="sh3">Admin</h3>
  <div class="admin">
    <button class="arow" data-act="settings"><b>Settings</b><small>Data sync, reminder, look</small><span class="go2">›</span></button>
    <button class="arow" data-soc="devices"><b>Devices</b><small>Garmin, Apple Health</small><span class="go2">›</span></button>
    <div class="arow"><b>Who sees my posts</b><div class="seg mini">${[["public","Public"],["friends","Crew + gym"],["private","Only me"]].map(v => `<button data-vis="${v[0]}" aria-pressed="${vis === v[0]}">${v[1]}</button>`).join("")}</div></div>
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
  if (d.respect){ SOC.toggle("respect", d.respect); const n = t.querySelector("span"); const on = t.getAttribute("aria-pressed") !== "true"; t.setAttribute("aria-pressed", on); n.textContent = on ? "Respect given" : "Respect"; return true; }
  if (showoffClick(t)) return true;
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

/* v36: the member's own name, not Mathias'. Profile name from sign-up, else the account name, else "You". */
function myName(){
  const P = window.SWOLE_PROFILE, sp = typeof SB !== "undefined" && SB.profile;
  if (P && P.name) return P.name;
  if (sp && sp.display_name && !P) return sp.display_name;
  return P ? "You" : "Mathias";
}
function myHandle(){
  const P = window.SWOLE_PROFILE, sp = typeof SB !== "undefined" && SB.profile;
  if (!(P && P.name) && sp && sp.handle) return sp.handle;
  return myName().toLowerCase().normalize("NFD").replace(/[^a-z0-9]+/g, "") || "you";
}
function myGym(){
  const P = window.SWOLE_PROFILE;
  if (P) return (P.gyms && P.gyms[0]) || "";
  return GYM.name;
}

/* ============ v44 · SHOW-OFF LAYER ============
   Your Swole is your face on every social surface, and every item carries a receipt (what it took).
   1 session card (your Swole + kit strip)  2 drop card (rarity frame, "How?", "Chase it")  3 inspect (kit + receipts)
   4 rarity rings  5 the gym floor (Swoles of who's coming)  6 share out (9:16 story card)
   Rules: crew + gym see posts by default · posting and respect never give XP · the respect count is shown to the poster only
   · auto-posts wait for one tap (drafts at the top of the Feed) · no comments, respect only. */
const TIER_RANK = {common: 0, rare: 1, epic: 2, legendary: 3, valor: 4};
const TIER_LABEL = {rare: "Rare", epic: "Epic", legendary: "Legendary", valor: "Valor"};
const itemById = id => ITEMS.find(i => i.id === id);
function topTier(ids){
  let best = null;
  (ids || []).forEach(id => { const it = itemById(id); if (it && (!best || TIER_RANK[it.rarity] > TIER_RANK[best])) best = it.rarity; });
  return best;
}
function tierAttr(ids){ const t = topTier(ids); return t && TIER_RANK[t] >= 1 ? ` data-tier="${t}"` : ""; }
function tierTag(ids, inline){ const t = topTier(ids); return t && TIER_RANK[t] >= 2 ? `<span class="ttag${inline ? " tin" : ""}" data-tier="${t}">${TIER_LABEL[t]}</span>` : ""; }
function myKit(){ return [...new Set(Object.values(equipped()))]; }
function kitOf(who){
  if (who === "me") return myKit();
  const f = FRIENDS.find(x => x.id === who);
  return f ? f.kit : [];
}
const kitSort = ids => [...ids].filter(itemById).sort((a, b) => TIER_RANK[itemById(b).rarity] - TIER_RANK[itemById(a).rarity]);
const unlockText = it => (UNLOCK_TEXT[it.unlock.type] || (() => ""))(it.unlock.n);
const fmtDay = d => parse(d).toLocaleDateString("en-GB", {day: "numeric", month: "short"});

/* your Swole: a full signature look wins, else the mood pose of your own Swole */
function mySwoleImg(mood){
  const look = outfitLook(); if (look) return look;
  try { return CUTSRC(mood || "default"); } catch (e){ return "media/pose/stance.webp"; }
}
const MOOD_OF = {strength: "ready", mt: "ready", test: "ready", conditioning: "ready", mobility: "recover"};
const sessMood = id => id === "zone2" ? "default" : MOOD_OF[(SESS[id] || {}).kind] || "default";
const WORD_OF = {strength: "POWER", mt: "MUAY THAI", test: "TEST", mobility: "MOBILITY"};
function sessWord(id){
  if (id === "zonered") return "ZONE RED";
  if (id === "zone2") return "ZONE TWO";
  const sx = SESS[id] || {};
  return WORD_OF[sx.kind] || (sx.title || "TRAINING").split("·")[0].replace(/[0-9]/g, "").trim().toUpperCase() || "TRAINING";
}

/* when each item was first seen open on this device (the receipt date). First run marks everything "before". */
function earnedMap(){
  const st = lockerStats(), m = SOC.get("earned", null), first = !m, out = m || {};
  let changed = first;
  ITEMS.forEach(i => { if (i.unlock.type !== "start" && itemState(i, st).open && !out[i.id]){ out[i.id] = first ? "before" : iso(new Date()); changed = true; } });
  if (changed) SOC.set("earned", out);
  return out;
}

/* ---------- 1 + 2: drafts. A done session (last 2 days) or a new drop waits here for one tap. ---------- */
function feedDrafts(){
  const posted = SOC.get("posted", {}), out = [], today = parse(iso(new Date()));
  Object.entries(S.sessions || {}).forEach(([k, s]) => {
    if (!s || s.status !== "done" || posted[k]) return;
    if (daysBetween(parse(k.slice(0, 10)), today) > 1) return;
    const sx = SESS[s.session] || {title: "Training", dur: ""};
    out.push({draft: k, type: "session", by: "me", kind: "Session", word: sessWord(s.session), title: sx.title,
      meta: [sx.dur, s.rpe ? "RPE " + s.rpe : ""].filter(Boolean).join(" · "), mood: sessMood(s.session), proof: s.proof || 1});
  });
  const em = earnedMap();
  const drops = ITEMS.filter(i => em[i.id] && em[i.id] !== "before" && !posted["u" + i.id] && daysBetween(parse(em[i.id]), today) <= 6)
    .sort((a, b) => TIER_RANK[b.rarity] - TIER_RANK[a.rarity])
    .map(i => ({draft: "u" + i.id, type: "unlock", by: "me", kind: "Unlock", item: i.id, title: i.name}));
  /* newest session first, then the best new drop, then the rest */
  out.sort((a, b) => b.draft.localeCompare(a.draft));
  return [...out.slice(0, 1), ...drops, ...out.slice(1)];
}
function draftCard(d){
  const it = d.item && itemById(d.item);
  const th = it ? `<img src="${it.img}" alt="">` : `<span class="bd"><img src="${mySwoleImg(d.mood)}" alt=""></span>`;
  return `<article class="draft">
    <div class="drhd"><span class="eyebrow">Ready to post</span><small>${it ? "New drop" : "From your log"}</small></div>
    <div class="drrow"><div class="th"${it ? ` style="--rc:${RARITY[it.rarity].c}"` : ""}>${th}</div>
      <div><b>${esc(it ? it.name : d.title)}</b><small>${it ? `${RARITY[it.rarity].label} · ${esc(unlockText(it))}` : esc(d.meta || "Logged")}</small></div></div>
    <div class="dract"><button class="pill" data-postdraft="${d.draft}">Post to crew</button><button class="ghost-s" data-skipdraft="${d.draft}">Not this one</button></div>
  </article>`;
}
/* friends' respect on your own post, mocked: one more every couple of hours, up to 6 */
const myRespect = p => p.at ? Math.min(6, Math.floor((Date.now() - p.at) / 72e5)) : (p.respect || 0);

/* ---------- 1: session card ---------- */
function sessionMedia(p){
  const kit = kitSort(p.by === "me" ? (p.kit || myKit()) : kitOf(p.by)).slice(0, 6);
  const fig = p.by === "me" ? `<span class="bd"><img src="${p.img || mySwoleImg(p.mood)}" alt=""></span>` : body(p.by);
  return `<div class="smedia"${tierAttr(kit)}>
    <svg class="sword" viewBox="0 0 1000 300" aria-hidden="true"><text x="0" y="270" textLength="1000" lengthAdjust="spacingAndGlyphs">${esc(p.word || "TRAINING")}</text></svg>
    <button class="sfig" data-inspect="${p.by}" aria-label="See kit">${fig}</button>
    <span class="proof ${p.proof === 2 ? "v" : ""}">${p.proof === 2 ? "✓✓ Verified" : "✓ Logged"}</span>
    ${p.look ? `<span class="slook">${esc(p.look)}</span>` : ""}
    <div class="kitstrip">${kit.map(id => { const it = itemById(id); return `<button class="kchip" style="--rc:${RARITY[it.rarity].c}" data-receipt="${p.by}|${id}" aria-label="${esc(it.name)}"><img src="${it.img}" alt=""></button>`; }).join("")}</div>
  </div>`;
}
/* ---------- 2: drop card ---------- */
function unlockMedia(it){
  const r = RARITY[it.rarity];
  return `<div class="umedia" data-r="${it.rarity}" style="--rc:${r.c}">
    <svg class="sword" viewBox="0 0 1000 300" aria-hidden="true"><text x="0" y="270" textLength="1000" lengthAdjust="spacingAndGlyphs">${esc(it.rarity === "valor" ? "VALOR" : r.label.toUpperCase())}</text></svg>
    <img class="uimg" src="${it.img}" alt="">
    ${rarityChip(it.rarity)}
  </div>`;
}

/* ---------- 3: inspect + receipts ---------- */
function kitGrid(who){
  const ids = kitSort(kitOf(who));
  return `<div class="kitgrid">${ids.map(id => { const it = itemById(id); return `<button class="ltile on" style="--rc:${RARITY[it.rarity].c}" data-receipt="${who}|${id}"><img src="${it.img}" alt="${esc(it.name)}"></button>`; }).join("")}</div>`;
}
function openInspect(who){
  if (who !== "me"){ if (FRIENDS.some(f => f.id === who)) openFriend(who); return; }
  const look = currentLook();
  openSheet(`
    <div class="close"><span class="eyebrow">@${esc(myHandle())}</span><button data-act="close">Close ✕</button></div>
    <div class="prof"><div class="pfig"><span class="bd"><img src="${mySwoleImg()}" alt=""></span></div>
      <div class="pinfo"><h1 class="sbig">${esc(myName())}</h1>${tierTag(myKit(), true)}<small class="mut">${look ? `Wearing the full look: ${esc(look.name)}` : "This is what your crew sees."}</small></div></div>
    <h3 class="sh3">Kit</h3><p class="mut kitnote">Tap an item to see what it took.</p>
    ${kitGrid("me")}
    <div class="opts"><button class="pill wide" data-act="locker">Open Locker</button></div>`);
}
let receiptWho = "me";
function openReceipt(who, id){
  const it = itemById(id); if (!it) return;
  receiptWho = who;
  const st = lockerStats(), mine = itemState(it, st), chasing = SOC.get("chase", {})[id];
  const f = FRIENDS.find(x => x.id === who);
  const date = who === "me" ? earnedMap()[id] : f && f.earned && f.earned[id];
  const owner = who === "me" ? "You" : CAST[who].name;
  const when = it.unlock.type === "start" ? "got it in the starter kit" : date && date !== "before" ? `earned it on ${fmtDay(date)}` : "earned it";
  const pct = Math.round(mine.have / mine.need * 100);
  openSheet(`
    <div class="close"><span class="eyebrow">Receipt</span><button data-act="close">Close ✕</button></div>
    <div class="rcard" data-r="${it.rarity}" style="--rc:${RARITY[it.rarity].c}"><img src="${it.img}" alt=""></div>
    ${rarityChip(it.rarity)}
    <h1 class="sh-title">${esc(it.name)}</h1>
    <p class="mut" style="margin-top:-4px">${esc(it.desc)}</p>
    <div class="scard rbox"><span class="eyebrow">What it took</span><h3>${esc(unlockText(it))}</h3><small>${who === "me" && !mine.open ? "Not earned yet." : `${esc(owner)} ${when}.`}${it.rarity === "valor" ? " No Stolen Valor items can't be bought, traded or given." : ""}</small></div>
    ${who !== "me" || !mine.open ? `<div class="scard rbox"><span class="eyebrow">You</span>${mine.open ? `<h3>You have this too.</h3>` : `<h3>${mine.have} of ${mine.need}</h3><div class="bar"><i style="width:${pct}%"></i></div>`}</div>` : ""}
    ${!mine.open ? `<div class="opts"><button class="pill wide" data-chase="${id}" aria-pressed="${!!chasing}">${chasing ? "Chasing ✓" : "Chase it"}</button></div>` : who === "me" ? `<div class="opts"><button class="pill wide" data-item="${id}">Open in Locker</button></div>` : ""}`);
}
function chasingList(){
  const ch = SOC.get("chase", {}), st = lockerStats();
  const items = Object.keys(ch).filter(k => ch[k]).map(itemById).filter(Boolean);
  if (!items.length) return "";
  return `<h3 class="sh3">Chasing</h3><div class="chase">${items.map(i => { const s = itemState(i, st);
    return `<button class="chrow" data-receipt="me|${i.id}" style="--rc:${RARITY[i.rarity].c}"><img src="${i.img}" alt=""><div><b>${esc(i.name)}</b><small>${esc(unlockText(i))}</small><div class="bar"><i style="width:${Math.round(s.have / s.need * 100)}%"></i></div></div><em>${s.open ? "Earned" : `${s.have}/${s.need}`}</em></button>`; }).join("")}</div>`;
}

/* ---------- 6: share out. A 1080×1920 story card, drawn on this device. ---------- */
async function storyCard(p){
  const W = 1080, H = 1920, c = document.createElement("canvas"); c.width = W; c.height = H;
  const x = c.getContext("2d");
  try { await document.fonts.ready; } catch (e){}
  const load = src => new Promise(r => { if (!src) return r(null); const im = new Image(); im.onload = () => r(im); im.onerror = () => r(null); im.src = src; });
  const fit = (txt, fam, max, w) => { let sz = max; x.font = `${sz}px ${fam}`; while (x.measureText(txt).width > w && sz > 20){ sz -= 4; x.font = `${sz}px ${fam}`; } return sz; };
  const contain = (im, bx, by, bw, bh, alignBottom) => { if (!im) return; const k = Math.min(bw / im.width, bh / im.height), w = im.width * k, h = im.height * k; x.drawImage(im, bx + (bw - w) / 2, alignBottom ? by + bh - h : by + (bh - h) / 2, w, h); };
  const it = p.item && itemById(p.item);
  x.fillStyle = "#FFFFFF"; x.fillRect(0, 0, W, H);
  // giant SWOLE behind the figure, like the home screen
  x.fillStyle = "#111111"; x.textAlign = "center"; x.textBaseline = "alphabetic";
  fit("SWOLE", "Metrim", 600, W - 60); x.fillText("SWOLE", W / 2, 560);
  if (it){
    x.fillStyle = it.rarity === "valor" ? "#2B230E" : "#111111";
    x.beginPath(); x.roundRect(90, 640, 900, 820, 60); x.fill();
    x.strokeStyle = RARITY[it.rarity].c === "#000000" ? "#FFFFFF" : RARITY[it.rarity].c; x.lineWidth = 12; x.stroke();
    contain(await load(it.img), 190, 700, 700, 700);
  } else {
    contain(await load(p.img || mySwoleImg(p.mood)), 90, 300, 900, 1180, true);
  }
  // bottom card
  x.fillStyle = "#111111"; x.beginPath(); x.roundRect(60, 1480, 960, 340, 48); x.fill();
  x.textAlign = "left"; x.fillStyle = "#A1A1A1";
  x.font = `34px "Terza Display", Georgia, serif`;
  x.fillText((it ? `${RARITY[it.rarity].label} drop` : p.proof === 2 ? "✓✓ Verified session" : "✓ Logged session").toUpperCase(), 110, 1550);
  x.fillStyle = "#FFFFFF"; fit(it ? it.name : p.title, `"Terza Display", Georgia, serif`, 76, 860); x.fillText(it ? it.name : p.title, 110, 1640);
  x.fillStyle = "#C8C8C8"; fit(it ? `What it took: ${unlockText(it)}` : (p.meta || ""), `"Terza Display", Georgia, serif`, 38, 860);
  x.fillText(it ? `What it took: ${unlockText(it)}` : (p.meta || ""), 110, it ? 1720 : 1692);
  if (!it){ const kit = kitSort(p.kit || myKit()).slice(0, 6); let kx = 110; for (const id of kit){ const im = await load(itemById(id).img); x.fillStyle = "#E9E9E9"; x.beginPath(); x.roundRect(kx, 1718, 80, 80, 18); x.fill(); x.fillStyle = RARITY[itemById(id).rarity].c === "#000000" ? "#111111" : RARITY[itemById(id).rarity].c; x.fillRect(kx + 12, 1792, 56, 4); contain(im, kx + 6, 1722, 68, 68); kx += 94; } }
  x.fillStyle = "#111111"; x.textAlign = "center"; x.font = `36px "Terza Display", Georgia, serif`; x.fillText("joinswole.com · Character is earned.", W / 2, 1880);
  return new Promise(r => c.toBlob(r, "image/png"));
}
let storyFile = null;
async function openStory(id){
  const p = SOC.get("myflex", []).find(x => x.id === id); if (!p) return;
  toast("Making your story card…");
  const blob = await storyCard(p); if (!blob){ toast("Couldn't make the card."); return; }
  storyFile = new File([blob], "swole-story.png", {type: "image/png"});
  const url = URL.createObjectURL(blob), canShare = navigator.canShare && navigator.canShare({files: [storyFile]});
  openSheet(`
    <div class="close"><span class="eyebrow">Story card</span><button data-act="close">Close ✕</button></div>
    <img class="storyprev" src="${url}" alt="Story card">
    <div class="opts">${canShare ? `<button class="pill wide" data-sharestory="1">Share</button>` : `<a class="pill wide" href="${url}" download="swole-story.png">Save image</a>`}</div>
    <p class="mut" style="font-size:12px;margin-top:10px">${canShare ? "Pick Instagram, or Save Image to post it later." : "On iPhone you can also press and hold the image, then Save to Photos."}</p>`);
}

function showoffClick(t){
  const d = t.dataset;
  if (d.inspect){ openInspect(d.inspect); return true; }
  if (d.receipt){ const [who, id] = d.receipt.split("|"); openReceipt(who, id); return true; }
  if (d.chase){ const on = SOC.toggle("chase", d.chase); toast(on ? "Chasing it. It's on your profile." : "Stopped chasing."); if (!document.getElementById("sheet").hidden) openReceipt(receiptWho, d.chase); else render(); return true; }
  if (d.postdraft){
    const dr = (window.__drafts || []).find(x => x.draft === d.postdraft); if (!dr) return true;
    const posted = SOC.get("posted", {}); posted[dr.draft] = true; SOC.set("posted", posted);
    const look = currentLook();
    const post = {...dr, id: "me" + Date.now(), at: Date.now(), respect: 0, kit: myKit(), look: look ? look.name : "", img: dr.type === "session" ? mySwoleImg(dr.mood) : undefined};
    delete post.draft;
    const list = SOC.get("myflex", []); list.unshift(post); SOC.set("myflex", list.slice(0, 30));
    render(); toast("Posted to your crew."); return true;
  }
  if (d.skipdraft){ const posted = SOC.get("posted", {}); posted[d.skipdraft] = "skip"; SOC.set("posted", posted); render(); return true; }
  if (d.share){ openStory(d.share); return true; }
  if (d.sharestory){ if (storyFile) navigator.share({files: [storyFile]}).catch(() => {}); return true; }
  return false;
}
