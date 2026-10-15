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
  top: "Top", shorts: "Shorts", wraps: "Hand wraps", gloves: "Gloves", shins: "Shin guards",
  head: "Headgear", mouth: "Mouthguard", outfit: "Outfit",
};
const CATS = [["fightwear", "Fightwear"], ["leisure", "Leisure"], ["casual", "Casual"]];
const I = (id, cat, slot, name, rarity, unlock, desc) => ({id, cat, slot, name, rarity, unlock, desc,
  img: slot === "outfit" ? null : `media/items/${id}.webp`});
const ITEMS = [
  // fightwear: starter kit
  I("rash-black",      "fightwear", "top",    "Black rashguard",         "common",    {type: "start"}, "The everyday uniform. Tight, black, no nonsense."),
  I("shorts-yokkao",   "fightwear", "shorts", "YOKKAO camo shorts",      "rare",      {type: "start"}, "Dark purple camo. Classic Thai cut."),
  I("wraps-lime",      "fightwear", "wraps",  "Lime wraps",              "common",    {type: "start"}, "4.5 m, wrapped tight. Swole's signature colour."),
  I("shins-fairtex",   "fightwear", "shins",  "Fairtex shin guards",     "rare",      {type: "start"}, "Black leather. For the hard sparring days."),
  // fightwear: earned
  I("head-black",      "fightwear", "head",   "Black headgear",          "common",    {type: "checkins", n: 3},  "Full-face protection for sparring rounds."),
  I("wraps-bear",      "fightwear", "wraps",  "Bear wraps",              "common",    {type: "sessions", n: 3},  "Cute on the outside. Still hits hard."),
  I("mouth-gator",     "fightwear", "mouth",  "Gator mouthguard",        "rare",      {type: "checkins", n: 10}, "Bite down. Show teeth."),
  I("wraps-dragon",    "fightwear", "wraps",  "Dragon wraps",            "rare",      {type: "streak", n: 5},    "Five mornings in a row."),
  I("wraps-skull",     "fightwear", "wraps",  "Skull quick-wraps",       "rare",      {type: "sessions", n: 10}, "Neon gel wraps for fast pad rounds."),
  I("shorts-leaf",     "fightwear", "shorts", "White leaf shorts",       "rare",      {type: "tests", n: 4},     "Finish the test week."),
  I("gloves-eyeball",  "fightwear", "gloves", "Eyeball gloves",          "epic",      {type: "sessions", n: 20}, "They see everything coming."),
  I("gloves-tokidoki", "fightwear", "gloves", "Tokidoki gloves",         "epic",      {type: "streak", n: 14},   "Two weeks of mornings without a miss."),
  I("shorts-elsol",    "fightwear", "shorts", "El Sol shorts",           "epic",      {type: "week", n: 6},      "Reach your first deload week."),
  I("shorts-fist",     "fightwear", "shorts", "Fist satin shorts",       "epic",      {type: "sessions", n: 35}, "Silver satin. Earned the hard way."),
  I("gloves-holo",     "fightwear", "gloves", "Holo gloves",             "epic",      {type: "week", n: 12},     "Make it to the week 12 retest."),
  I("gloves-barong",   "fightwear", "gloves", "Barong gloves",           "legendary", {type: "sessions", n: 60}, "Sixty sessions. A guardian on each fist."),
  I("head-gladiator",  "fightwear", "head",   "Gladiator headgear",      "legendary", {type: "streak", n: 30},   "Thirty mornings straight. Enter the arena."),
  I("shorts-tassel",   "fightwear", "shorts", "Fight-night tassel shorts","legendary",{type: "week", n: 26},     "Finish all 26 weeks. Walk out like a champion."),
  // leisure (full outfits)
  I("l-black",         "leisure",   "outfit", "All-black lounge set",    "common",    {type: "start"},           "Oversized crew, long shorts, iced coffee."),
  I("l-brown",         "leisure",   "outfit", "Mocha hoodie set",        "rare",      {type: "sessions", n: 8},  "Hood up, recovery mode."),
  I("l-charcoal",      "leisure",   "outfit", "Charcoal fleece set",     "epic",      {type: "streak", n: 21},   "Three weeks of mornings. Cozy is earned."),
  // casual (full outfits)
  I("c-blacktee",      "casual",    "outfit", "Black tee & pleats",      "common",    {type: "start"},           "Clean, black, effortless."),
  I("c-jorts",         "casual",    "outfit", "Cream crew & jorts",      "common",    {type: "checkins", n: 7},  "One week of check-ins."),
  I("c-knit",          "casual",    "outfit", "Pattern knit & clogs",    "rare",      {type: "checkins", n: 14}, "Two weeks of check-ins."),
  I("c-retro",         "casual",    "outfit", "Retro neckerchief",       "rare",      {type: "streak", n: 7},    "Seven days in a row. Very dapper."),
  I("c-fleece",        "casual",    "outfit", "Sherpa & cargos",         "rare",      {type: "sessions", n: 15}, "Fifteen sessions done."),
  I("c-jersey",        "casual",    "outfit", "Jersey 46",               "epic",      {type: "checkins", n: 45}, "45 check-ins. Earth tones only."),
  I("c-racing",        "casual",    "outfit", "Candy racing jacket",     "legendary", {type: "checkins", n: 100},"100 check-ins. Loud and proud."),
];
/* outfit renders: filled in when the Magnific renders land (media/outfits/<id>.webp + -thumb.webp) */
const OUTFIT_READY = ["l-black","l-brown","l-charcoal","c-blacktee","c-jorts","c-knit","c-retro","c-fleece","c-jersey","c-racing"];
ITEMS.forEach(it => { if (it.slot === "outfit" && OUTFIT_READY.includes(it.id)){ it.img = `media/outfits/${it.id}-thumb.webp`; it.look = `media/outfits/${it.id}.webp`; } });
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
  mouth: `<path d="M4 10c2-3 14-3 16 0-1 5-4 7-8 7s-7-2-8-7z"/><path d="M7 11h10M9 11v3M12 11v3M15 11v3"/>`,
  outfit: `<path d="M8 3 4 6l2 4 2-1v12h8V9l2 1 2-4-4-3-2 2h-4z"/><path d="M10 14h4"/>`,
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
  ITEMS.filter(i => i.unlock.type === "start" && i.slot !== "outfit").forEach(i => { if (!(i.slot in eq)) eq[i.slot] = i.id; });
  return eq;
}
function outfitLook(){   // the render Swole should wear, if an outfit with a render is equipped
  const id = equipped().outfit; const it = id && ITEMS.find(i => i.id === id);
  return it && it.look ? it.look : null;
}
function newUnlocks(){
  const st = lockerStats(), seen = LS.get("swole:lockerSeen", []);
  return ITEMS.filter(i => i.unlock.type !== "start" && itemState(i, st).open && !seen.includes(i.id)).map(i => i.id);
}
