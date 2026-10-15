/* Swole · Locker: items, rarities and how you unlock them.
   Add a new item: drop a square transparent thumbnail in media/items/<id>.webp and add a row below.
   unlock: {type: "start" | "checkins" | "streak" | "sessions" | "tests" | "week", n}
   look (optional): media file for a Swole render wearing this item. */
const RARITY = {
  common:    {label: "Common",    c: "#A3A9AE"},
  rare:      {label: "Rare",      c: "#3EA6FF"},
  epic:      {label: "Epic",      c: "#B76CFF"},
  legendary: {label: "Legendary", c: "#FFB020"},
};
const SLOTS = {
  top: "Top", hoodie: "Hoodie", shorts: "Shorts", wraps: "Hand wraps", gloves: "Gloves",
  shins: "Shin guards", shoes: "Shoes", head: "Headwear", arms: "Arm bands", extra: "Extra",
};
const ITEMS = [
  {id: "rash-black",    slot: "top",    name: "Black rashguard",      rarity: "common",    img: "media/items/rash-black.webp",    unlock: {type: "start"},           desc: "The everyday uniform. Tight, black, no nonsense."},
  {id: "shorts-yokkao", slot: "shorts", name: "YOKKAO camo shorts",   rarity: "rare",      img: "media/items/shorts-yokkao.webp", unlock: {type: "start"},           desc: "Dark purple camo. Classic Thai cut."},
  {id: "wraps-lime",    slot: "wraps",  name: "Lime wraps",           rarity: "common",    img: "media/items/wraps-lime.webp",    unlock: {type: "start"},           desc: "4.5 m, wrapped tight. Swole's signature colour."},
  {id: "shins-fairtex", slot: "shins",  name: "Fairtex shin guards",  rarity: "rare",      img: "media/items/shins-fairtex.webp", unlock: {type: "start"},           desc: "Black leather. For the hard sparring days."},
  {id: "tank-gym",      slot: "top",    name: "Gym tank",             rarity: "common",    unlock: {type: "sessions", n: 3},   desc: "For the morning sessions."},
  {id: "slides",        slot: "shoes",  name: "Recovery slides",      rarity: "common",    unlock: {type: "checkins", n: 5},   desc: "Off the mat, into the slides."},
  {id: "towel",         slot: "extra",  name: "Corner towel",         rarity: "common",    unlock: {type: "week", n: 6},       desc: "Reach your first deload week."},
  {id: "hoodie-camp",   slot: "hoodie", name: "Fight-camp hoodie",    rarity: "rare",      unlock: {type: "streak", n: 7},     desc: "Seven mornings in a row. Earned, not bought."},
  {id: "gloves-16",     slot: "gloves", name: "16 oz sparring gloves", rarity: "rare",     unlock: {type: "sessions", n: 10},  desc: "Ten sessions logged as done."},
  {id: "wraps-red",     slot: "wraps",  name: "Red wraps",            rarity: "rare",      unlock: {type: "tests", n: 4},      desc: "Log four tests in the test week."},
  {id: "runners",       slot: "shoes",  name: "Roadwork runners",     rarity: "rare",      unlock: {type: "checkins", n: 21},  desc: "Three weeks of check-ins."},
  {id: "prajied",       slot: "arms",   name: "Prajied arm bands",    rarity: "epic",      unlock: {type: "sessions", n: 20},  desc: "Twenty sessions done. You're one of the camp now."},
  {id: "shorts-fight",  slot: "shorts", name: "Fight-night shorts",   rarity: "epic",      unlock: {type: "sessions", n: 40},  desc: "Satin, loud, made for walkouts."},
  {id: "mongkol",       slot: "head",   name: "Mongkol",              rarity: "legendary", unlock: {type: "week", n: 26},      desc: "Finish all 26 weeks."},
  {id: "belt",          slot: "extra",  name: "Swole title belt",     rarity: "legendary", unlock: {type: "checkins", n: 150}, desc: "150 check-ins. The real champions show up."},
];
const UNLOCK_TEXT = {
  start: () => "Starter kit",
  checkins: n => `Check in ${n} times`,
  streak: n => `Check in ${n} days in a row`,
  sessions: n => `Log ${n} sessions as done`,
  tests: n => `Log ${n} different tests`,
  week: n => `Reach week ${n}`,
};
/* outline icons for items without a thumbnail yet */
const SLOT_ICON = {
  top: `<path d="M8 4 4 7l2 4 2-1v10h8V10l2 1 2-4-4-3c-.5 1.5-2 2.5-4 2.5S8.5 5.5 8 4z"/>`,
  hoodie: `<path d="M9 4c0-1 6-1 6 0l4 3-2 4-1-1v10H8V10l-1 1-2-4z"/><path d="M10 4c0 3 4 3 4 0M11 14h2"/>`,
  shorts: `<path d="M5 5h14l1 13-6 1-2-6-2 6-6-1z"/><path d="M5 8h14"/>`,
  wraps: `<path d="M7 13V7a2 2 0 0 1 4 0v4V6a2 2 0 0 1 4 0v5-3a2 2 0 0 1 4 0v6c0 4-3 6-6 6s-6-2-6-6z"/><path d="M7 15h12M7 18h11"/>`,
  gloves: `<path d="M6 10a6 6 0 0 1 12 0v4c0 3-2 5-5 5h-2c-3 0-5-2-5-5z"/><path d="M8 19v2h8v-2M6 12c2 0 3 1 3 3"/>`,
  shins: `<path d="M8 3h7l1 13-1 4H9l-1-4z"/><path d="M8 8h8M9 20l-2 1h10"/>`,
  shoes: `<path d="M3 16c0-3 1-6 3-7l3 2 3-1 3 3c2 1 6 1 6 3v2H3z"/><path d="M3 18h18"/>`,
  head: `<path d="M4 12c0-4 4-6 8-6s8 2 8 6"/><path d="M4 12c3 2 13 2 16 0M12 6c1-2 3-3 5-3"/>`,
  arms: `<path d="M6 8c3-2 9-2 12 0v3c-3-2-9-2-12 0z"/><path d="M12 11c0 3-1 6-3 9M12 11c0 3 1 6 3 9"/>`,
  extra: `<circle cx="12" cy="12" r="6"/><path d="M6 12h12M12 6v12"/>`,
};

function lockerStats(){
  const days = Object.keys(S.checkins || {}).sort();
  let best = 0, run = 0, prev = null;
  for (const d of days){
    run = prev && daysBetween(parse(prev), parse(d)) === 1 ? run + 1 : 1;
    best = Math.max(best, run); prev = d;
  }
  return {
    checkins: days.length,
    streak: best,
    sessions: Object.values(S.sessions || {}).filter(s => s && s.status === "done").length,
    tests: Object.keys(S.tests || {}).filter(k => k !== "weight" && S.tests[k] && (S.tests[k].history || []).length).length,
    week: Math.max(0, weekNo(new Date())),
  };
}
function itemState(it, st){
  const u = it.unlock || {type: "start"};
  if (u.type === "start") return {open: true, have: 1, need: 1};
  const have = st[u.type] || 0;
  return {open: have >= u.n, have: Math.min(have, u.n), need: u.n};
}
function lockerData(){ return S.settings.locker || {equipped: {}}; }
function equipped(){
  const eq = {...(lockerData().equipped || {})};
  ITEMS.filter(i => i.unlock.type === "start").forEach(i => { if (!(i.slot in eq)) eq[i.slot] = i.id; });
  return eq;
}
function newUnlocks(){
  const st = lockerStats(), seen = LS.get("swole:lockerSeen", []);
  return ITEMS.filter(i => i.unlock.type !== "start" && itemState(i, st).open && !seen.includes(i.id)).map(i => i.id);
}
