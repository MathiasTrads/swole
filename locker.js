/* Swole · Locker v2 (v43): 80 invented items in four categories, all earned through training.
   Catalogue doc: "Swole Locker catalogue v1". Icons: media/locker/items/<id>.webp (flat-lay, transparent).
   Every item fits every Swole (shared proportions). Signature looks: two pre-drawn looks per v2 Swole,
   shown on your Swole when you own and wear every piece of the look.
   unlock: {type, n}
     start     starter kit
     checkins  days with a check-in
     streak    best run of check-in days in a row
     sessions  sessions logged as done
     week      reach Path week n (week n-1 finished = "weekly chest")
     phases    Path phases finished ("checkpoints")
     retests   tests logged at least twice (beat-your-own-result rewards)
     done      the whole Path finished */
const RARITY = {
  common:    {label: "Common",          c: "#BDBDBD"},
  rare:      {label: "Rare",            c: "#8A8A8A"},
  epic:      {label: "Epic",            c: "#4A4A4A"},
  legendary: {label: "Legendary",       c: "#000000"},
  valor:     {label: "No Stolen Valor", c: "#B8912E"},
};
const SLOTS = {top: "Top", bottom: "Bottom", outer: "Outer layer", shoes: "Shoes", head: "Head", hands: "Hands", acc: "Accessory", set: "Set"};
const SLOT_FIXED = ["top", "bottom", "shoes"];          // always wearing something here
const CATS = [["looks", "Looks"], ["sportswear", "Sportswear"], ["casual", "Casual"], ["footwear", "Footwear"], ["gear", "Gear"]];
const U = {
  start: {type: "start"},
  day: n => ({type: "checkins", n}),
  chest: n => ({type: "week", n: n + 1}),
  streak: n => ({type: "streak", n}),
  sessions: n => ({type: "sessions", n}),
  checkpoint: n => ({type: "phases", n}),
  retest: {type: "retests", n: 1},
  done: {type: "done", n: 1},
  checkins: n => ({type: "checkins", n}),
};
const CAT_OF = {S: "sportswear", C: "casual", F: "footwear", G: "gear"};
const I = (id, slot, name, rarity, unlock, desc) => ({id: id.toLowerCase(), cat: CAT_OF[id[0]], slot, name, rarity, unlock, desc,
  img: `media/locker/items/${id.toLowerCase()}.webp`, slots: slot === "set" ? ["top", "bottom"] : [slot]});
const ITEMS = [
  // Sportswear
  I("S01", "top",    "Plain tee, black",                 "common",    U.start,          "Does the job. Like you, today."),
  I("S02", "bottom", "Training tights, black",           "common",    U.start,          "Nothing to hide behind."),
  I("S03", "top",    "Sleeveless tee, grey",             "common",    U.day(2),         "Arms out. Excuses in."),
  I("S04", "top",    "Short-sleeve rashguard, black",    "common",    U.day(3),         "Tight fit. Loose plans not allowed."),
  I("S05", "bottom", "2-in-1 shorts, black",             "common",    U.day(5),         "Short on top, serious underneath."),
  I("S06", "bottom", "Sweatpants, heather grey",         "common",    U.day(7),         "Rest days count. So do these."),
  I("S07", "top",    "Plain tee, white",                 "common",    U.chest(1),       "Clean slate. Keep it that way."),
  I("S08", "top",    "Pullover hoodie, black",           "common",    U.chest(1),       "Hood up. Head down. Show up."),
  I("S09", "top",    "Sports top, black",                "common",    U.chest(2),       "Built for moving, not posing."),
  I("S10", "top",    "Half-zip training top, cobalt",    "rare",      U.streak(7),      "Zipped. Ready. Unbothered."),
  I("S11", "top",    "Long-sleeve rashguard, charcoal",  "rare",      U.sessions(10),   "Ten in. Now it fits."),
  I("S12", "bottom", "Retro running shorts, 3\"",        "rare",      U.chest(2),       "Short shorts. Long run."),
  I("S13", "bottom", "Track pants with side stripe",     "rare",      U.chest(3),       "Stripe down the side. Straight line forward."),
  I("S14", "top",    "Mesh basketball tank",             "rare",      U.chest(3),       "Air in. Doubt out."),
  I("S15", "top",    "Compression long-sleeve",          "rare",      U.chest(4),       "Holds you together. Mostly."),
  I("S16", "top",    "Wind shell half-zip, sand",        "epic",      U.checkpoint(1),  "Weatherproof. Excuse-proof."),
  I("S17", "top",    "90s football jersey",              "epic",      U.streak(14),     "Two weeks. Wear it like a trophy."),
  I("S18", "top",    "Heavyweight hoodie, washed black", "epic",      U.sessions(25),   "Heavy cotton. Heavier habit."),
  I("S19", "bottom", "Heavyweight sweatpants, washed black","epic",   U.sessions(25),   "Pair with the hoodie. And the habit."),
  I("S20", "bottom", "Fight shorts with Stop crest",     "epic",      U.sessions(20),   "Proof, not promises."),
  I("S21", "top",    "Reflective night-run jacket",      "epic",      U.checkpoint(2),  "Seen in the dark. Seen every week."),
  I("S22", "set",    "Seamless training set, bone",      "legendary", U.streak(30),     "A month without a gap. Literally."),
  I("S23", "top",    "Hand-dyed worn-in hoodie",         "legendary", U.sessions(50),   "Price approves. Rare."),
  I("S24", "top",    "Champion's warm-up jacket",        "legendary", U.retest,         "You vs. you. You won."),
  I("S25", "top",    "No Tag rashguard",                 "valor",     U.checkins(40),   "Nothing to prove."),
  // Casual
  I("C01", "top",    "Crewneck sweatshirt, grey",        "common",    U.day(2),         "The uniform of people who showed up."),
  I("C02", "top",    "Oversized tee, cream",             "common",    U.day(3),         "Loose fit. Tight schedule."),
  I("C03", "bottom", "Wide basketball shorts, black",    "common",    U.day(5),         "Room to move. No room for excuses."),
  I("C04", "bottom", "Wide trousers, charcoal",          "common",    U.chest(1),       "Off duty. Still on plan."),
  I("C05", "outer",  "Track jacket, black",              "common",    U.chest(2),       "Zip it. Go."),
  I("C06", "outer",  "Cropped puffer vest, forest green","rare",      U.chest(2),       "Warm core. Cold stare."),
  I("C07", "outer",  "Cropped puffer jacket, rosewood",  "rare",      U.streak(7),      "Seven days. Now you can afford to look expensive."),
  I("C08", "top",    "Fleece half-zip, oat",             "rare",      U.chest(3),       "Soft outside. Not inside."),
  I("C09", "bottom", "Denim jorts, washed blue",         "rare",      U.chest(3),       "Summer legs earned in winter."),
  I("C10", "bottom", "Long sports skirt with slit",      "rare",      U.chest(4),       "Moves when you move."),
  I("C11", "bottom", "Parachute pants, slate",           "rare",      U.sessions(10),   "Wide. Light. Gone before you notice."),
  I("C12", "top",    "Knit polo, chocolate",             "rare",      U.chest(5),       "Collar up for the ones who stayed."),
  I("C13", "outer",  "Long puffer coat, black",          "epic",      U.checkpoint(1),  "Built for January. Worn by February survivors."),
  I("C14", "outer",  "Leather track jacket, oxblood",    "epic",      U.chest(6),       "Six weeks in. It fits like it knows you."),
  I("C15", "outer",  "Stop varsity jacket",              "epic",      U.checkins(20),   "Lettered in showing up."),
  I("C16", "top",    "Distressed oversized knit, ash",   "epic",      U.sessions(40),   "Looks lazy. Took effort."),
  I("C17", "set",    "Tailored tracksuit, ink",          "legendary", U.streak(60),     "Two months. Dress like it."),
  I("C18", "outer",  "Oversized shearling coat",         "legendary", U.done,           "You walked the whole thing. Stay warm."),
  I("C19", "outer",  "Stop crew bomber, embroidered",    "legendary", U.streak(100),    "Only the gang wears this. Now you do."),
  I("C20", "outer",  "Mended chore coat",                "valor",     U.checkins(75),   "Worn in. Earned in."),
  // Footwear
  I("F01", "shoes",  "Rubber flip-flops, black",         "common",    U.start,          "Recovery has a dress code."),
  I("F02", "shoes",  "Pool slides, white",               "common",    U.day(3),         "Slide in. Slide out. Come back tomorrow."),
  I("F03", "shoes",  "Canvas high-tops, off-white",      "common",    U.chest(1),       "Classic. Like turning up."),
  I("F04", "shoes",  "Everyday runners, grey",           "common",    U.day(7),         "They go where you go. Today, that's out."),
  I("F05", "shoes",  "Flat training shoes, black",       "rare",      U.chest(2),       "Flat sole. Solid base."),
  I("F06", "shoes",  "Retro trainers, cream and navy",   "rare",      U.streak(7),      "Old school. New habit."),
  I("F07", "shoes",  "Trail runners, moss",              "rare",      U.chest(4),       "The path isn't always paved."),
  I("F08", "shoes",  "Platform sneakers, black",         "rare",      U.chest(5),       "A little taller. Same feet on the ground."),
  I("F09", "shoes",  "Chunky sneakers, white and steel", "epic",      U.streak(14),     "Loud shoes. Quiet discipline."),
  I("F10", "shoes",  "Max-cushion runners, white and cobalt","epic",  U.sessions(25),   "For people who actually run."),
  I("F11", "shoes",  "Retro basketball high-tops, sky",  "epic",      U.checkpoint(2),  "Bought in the 90s. Earned in the 20s."),
  I("F12", "shoes",  "Boxing boots, black",              "epic",      U.sessions(30),   "Light feet. Heavy proof."),
  I("F13", "shoes",  "Carbon-plate racers",              "legendary", U.retest,         "Fast shoes for people who don't need them."),
  I("F14", "shoes",  "Hand-made leather sneakers, bone", "legendary", U.streak(60),     "Made slowly. Like you."),
  I("F15", "shoes",  "Gold-sole worn runners",           "valor",     U.checkins(120),  "Soles don't lie."),
  // Gear
  I("G01", "hands",  "Hand wraps, black",                "common",    U.start,          "Wrap up. Show up."),
  I("G02", "acc",    "Skipping rope",                    "common",    U.day(2),         "Cheap rope. Expensive habit."),
  I("G03", "head",   "Beanie, charcoal",                 "common",    U.day(3),         "Up before the sun. Ears covered."),
  I("G04", "head",   "Cap, black",                       "common",    U.day(5),         "Brim down. Plan up."),
  I("G05", "acc",    "Steel water bottle",               "common",    U.chest(1),       "Drink water. Keep promises."),
  I("G06", "hands",  "Sweatband set, white",             "common",    U.chest(2),       "Proof you sweated."),
  I("G07", "acc",    "Gym duffel, black",                "rare",      U.chest(2),       "Packed the night before."),
  I("G08", "acc",    "Steel-cable speed rope",           "rare",      U.streak(7),      "Faster rope. Same feet."),
  I("G09", "head",   "Bucket hat, washed khaki",         "rare",      U.chest(3),       "Low profile. High standards."),
  I("G10", "head",   "Wraparound sunglasses, black",     "rare",      U.chest(4),       "Don't look at the excuse."),
  I("G11", "hands",  "Training gloves 14 oz",            "rare",      U.sessions(10),   "Ten sessions. Now hit something."),
  I("G12", "acc",    "Shin guards, black",               "rare",      U.chest(5),       "Kick first. Talk later."),
  I("G13", "head",   "Over-ear headphones, matte black", "epic",      U.streak(14),     "Noise off. Work on."),
  I("G14", "hands",  "Leather boxing gloves, oxblood",   "epic",      U.checkpoint(1),  "Real leather for real rounds."),
  I("G15", "head",   "Headguard, leather",               "epic",      U.sessions(20),   "Protect the head that made the plan."),
  I("G16", "acc",    "Silver chain",                     "epic",      U.chest(6),       "Not jewellery. A receipt."),
  I("G17", "hands",  "Sports watch, steel",              "epic",      U.sessions(25),   "Counts time. You count sessions."),
  I("G18", "hands",  "Hand-stitched gloves",             "legendary", U.streak(30),     "Made to measure. Earned to the day."),
  I("G19", "acc",    "Weighted leather rope",            "legendary", U.streak(60),     "Heavier rope. You can take it."),
  I("G20", "acc",    "Signature gym bag, Stop crest",    "legendary", U.done,           "Carry the whole Path."),
];
/* Signature looks: two per v2 Swole. Shown when every piece is owned and worn. */
const L = (n, name, items) => ({n, name, items: items.map(s => s.toLowerCase())});
const LOOKS = {
  ghost:  [L(1, "Night run", ["S21","S02","F10","G13"]),     L(2, "Off duty", ["C13","C04","F03","G03"])],
  monday: [L(1, "Matchday", ["S17","S12","F01"]),            L(2, "Recovery", ["S18","S19","F02","G05"])],
  morrow: [L(1, "Studio", ["S09","C10","F03","C08"]),        L(2, "Sharp", ["C14","C04","F09","G10"])],
  price:  [L(1, "Expensive quiet", ["C07","S02","F09","G17"]), L(2, "Fight night", ["S04","S20","F12","G14"])],
  later:  [L(1, "Lunch-break run", ["S01","S12","F13","G17"]), L(2, "Commute", ["C05","S06","F06","G07"])],
  twoday: [L(1, "Court", ["S14","C03","F11","G06"]),         L(2, "Lazy Sunday", ["C02","C09","F01","G09"])],
  snooze: [L(1, "5 a.m.", ["S08","S05","F04","G03"]),        L(2, "Night owl", ["C16","C11","F08","G13"])],
  glory:  [L(1, "Streetball", ["S14","C03","F11","G04"]),    L(2, "Champion", ["S24","S13","F06","G16"])],
  jan:    [L(1, "February", ["C06","S02","F07","G08"]),      L(2, "Gym floor", ["S15","S05","F05","G01"])],
};
Object.entries(LOOKS).forEach(([sw, ls]) => ls.forEach(l => { l.sw = sw; l.img = `media/locker/looks/${sw}-${l.n}.webp`; l.thumb = `media/locker/looks/${sw}-${l.n}-thumb.webp`; }));
const SWOLE_NAMES = {ghost: "Ghost", monday: "Monday", morrow: "Morrow", price: "Price", later: "Later", twoday: "Two-day", snooze: "Snooze", glory: "Glory", jan: "Jan"};

const UNLOCK_TEXT = {
  start: () => "Starter kit",
  checkins: n => `Check in on ${n} days`,
  streak: n => `Check in ${n} days in a row`,
  sessions: n => `Log ${n} sessions as done`,
  week: n => `Finish week ${n - 1} of your Path`,
  phases: n => `Finish phase ${n} of your Path`,
  retests: () => "Retest one of your tests",
  done: () => "Finish your whole Path",
  tests: n => `Log ${n} different tests`,
};
/* outline icon, only used if an image fails to load */
const SLOT_ICON = {
  extra: `<circle cx="12" cy="12" r="6"/><path d="M6 12h12M12 6v12"/>`,
};

function lockerStats(){
  const days = Object.keys(S.checkins || {}).sort();
  let best = 0, run = 0, prev = null;
  for (const d of days){
    run = prev && daysBetween(parse(prev), parse(d)) === 1 ? run + 1 : 1;
    best = Math.max(best, run); prev = d;
  }
  const wk = Math.max(0, weekNo(new Date()));
  const ph = (typeof PHASES !== "undefined" ? PHASES : []);
  const last = ph.length ? Math.max(...ph.map(p => p.w[1])) : 1e9;
  return {
    checkins: days.length,
    streak: best,
    sessions: Object.values(S.sessions || {}).filter(s => s && s.status === "done").length,
    tests: Object.keys(S.tests || {}).filter(k => k !== "weight" && S.tests[k] && (S.tests[k].history || []).length).length,
    retests: Object.keys(S.tests || {}).filter(k => k !== "weight" && S.tests[k] && (S.tests[k].history || []).length >= 2).length,
    week: wk,
    phases: ph.filter(p => !p.deload && p.w[1] < wk).length,
    done: wk > last ? 1 : 0,
  };
}
function itemState(it, st){
  const u = it.unlock || {type: "start"};
  if (u.type === "start") return {open: true, have: 1, need: 1};
  const have = st[u.type] || 0;
  return {open: have >= u.n, have: Math.min(have, u.n), need: u.n};
}
function lockerData(){ return S.settings.locker || {equipped: {}}; }
const STARTER = {top: "s01", bottom: "s02", shoes: "f01", hands: "g01"};
function equipped(){
  const raw = {...(lockerData().equipped || {})}, eq = {};
  Object.entries(raw).forEach(([slot, id]) => { if (SLOTS[slot] && ITEMS.some(i => i.id === id)) eq[slot] = id; });   // drops v1 items
  SLOT_FIXED.forEach(s => { if (!eq[s]) eq[s] = STARTER[s]; });
  if (!lockerData().equipped || lockerData().v !== 2) { if (!eq.hands) eq.hands = STARTER.hands; }
  return eq;
}
const isWorn = (id, eq) => Object.values(eq || equipped()).includes(id);
function mySwole(){ const f = window.SWOLE_FIGHTER; return f && LOOKS[f] ? f : null; }
function currentLook(){
  const sw = mySwole(); if (!sw) return null;
  const eq = equipped(), st = lockerStats();
  return LOOKS[sw].find(l => l.items.every(id => isWorn(id, eq) && itemState(ITEMS.find(i => i.id === id), st).open)) || null;
}
function outfitLook(){ const l = currentLook(); return l ? l.img : null; }   // the render your Swole wears, if a full look is on
function lookProgress(l, st){ return l.items.filter(id => itemState(ITEMS.find(i => i.id === id), st).open).length; }
function newUnlocks(){
  const st = lockerStats(), seen = LS.get("swole:lockerSeen", []);
  return ITEMS.filter(i => i.unlock.type !== "start" && itemState(i, st).open && !seen.includes(i.id)).map(i => i.id);
}
