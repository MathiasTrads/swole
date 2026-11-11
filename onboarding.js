/* ============ ONBOARDING ============
   Demo (/demo/): scripted, nothing leaves the phone.
   Real app: real email code (Supabase), and the finished profile is saved as settings.profile,
   which syncs to Supabase like every other entry.
   New member journey: welcome → email → code → goal → AI intake (scripted)
   → plan reveal → create your Swole (photos / build / later) → pick a coach
   → invite a buddy → done. */
const OB_DEMO = !!window.SWOLE_DEMO;
const OB_GOALS = [
  {cat:"strength",  label:"Strength",  items:["Do my first pull-up","Deadlift my body weight","20 push-ups in a row"]},
  {cat:"endurance", label:"Endurance", items:["Run 5 km without stopping","10 km under an hour","Last 5 hard rounds of sparring"]},
  {cat:"mobility",  label:"Mobility",  items:["Touch my toes","Deep squat, heels down","Open up my hips"]},
  {cat:"health",    label:"Health",    items:["Raise my VO2 max","Lower my resting heart rate","Get back in shape after a break"]},
  {cat:"body",      label:"Body",      items:["Build muscle","Lose 5 kg","Feel strong in summer"]},
  {cat:"sport",     label:"Sport",     items:["Get ready for my first fight","A stronger padel game","Last longer in sparring"]},
];
/* v34 goal screen: one open question, a few tap-to-fill examples (Mathias' sketch, 27 Oct) */
const OB_GOAL_SUGGEST = ["Do my first pull-up","Raise my VO2 max","Lose a few kilos","Get ready for my first MMA fight","Touch my toes","Run a marathon","Lower my resting heart rate","Deadlift my body weight"];
/* free-text goal → plan category (first match wins) */
function goalCat(text){
  const t = " " + String(text || "").toLowerCase() + " ";
  if (/fight|mma|muay|boxing|\bbox\b|boxer|kickbox|bjj|jiu|sparr|ski|padel|tennis|football|soccer|fodbold|golf|climb|hockey|handball|season|match|tournament|game\b/.test(t)) return "sport";
  if (/marathon|half|\b\d+ ?k\b|\bkm\b|\brun\b|running|\bjog|triathlon|ironman|race|cycl|\bbike|swim|stamina|endurance|rounds|gas tank|cardio|conditioning/.test(t)) return "endurance";
  if (/split|toes|flexib|mobil|stretch|bridge|deep squat|yoga|hips/.test(t)) return "mobility";
  if (/pull-?up|chin-?up|push-?up|dip|deadlift|squat|bench|press|lift|muscle-?up|handstand|strong|strength/.test(t)) return "strength";
  if (/vo2|heart rate|resting|blood pressure|health|energy|sleep|fitter|in shape|back in shape|cholesterol|longevity/.test(t)) return "health";
  if (/kilo|\bkg\b|lose|weight|fat|lean|muscle|tone|abs|bulk|summer|body/.test(t)) return "body";
  return "health";
}
/* v38 intake: enough to meet a member where they are. Trained people answer about their current week,
   numbers and heart rate, so the plan starts at their level instead of a beginner template.
   when(A) hides a question that doesn't apply. Optional questions have skip:true. */
const OB_LEVELS = ["New to training","Under 1 year","1–3 years","3+ years","I compete"];
const obTrained = A => A.history && A.history !== "New to training" && !(A.types || []).includes("Nothing right now");
/* v42: the four questions (goal, times a week, already set, what you want) come first on their own screens.
   This short chat only asks what the plan can't guess: who you are, where you are now, and what keeps you safe. */
const OB_Q = [
  {id:"name", q:"First things first. What should I call you?", type:"text", ph:"Your name"},
  {id:"age", q:"How old are you?", type:"number", unit:"years", min:14, max:90},
  {id:"sex", q:"Sex? It changes heart-rate and strength estimates a little.", type:"chips", options:["Female","Male","Prefer not to say"]},
  {id:"height", q:"How tall are you?", type:"number", unit:"cm", min:120, max:230, skip:true},
  {id:"weight", q:"And your weight? It stays private. Only you see it.", type:"number", unit:"kg", min:35, max:250, skip:true},
  {id:"history", q:"How long have you trained consistently?", type:"chips", options:OB_LEVELS},
  {id:"numbers", q:"Where are you now? A number that fits your goal. Rough is fine.", type:"text", ph:"E.g. 5 km in 24 min", skip:true, when:A => A.history !== "New to training"},
  {id:"mins", q:"How long can a session be?", type:"chips", options:["20 min","30 min","45 min","60 min","90 min"]},
  {id:"where", q:"Where will you train? Pick all that fit.", type:"multi", options:["Gym","Home","Outdoors","Classes / club"]},
  {id:"gym", q:"Which gym or club? Your crew and gym rewards hang on it.", type:"text", ph:"E.g. Nak Muay CPH", skip:true, when:A => (A.where || []).some(x => x === "Gym" || x === "Classes / club")},
  {id:"deadline", q:"When do you want to get there?", type:"chips", options:["No deadline","8 weeks","12 weeks","16 weeks","6 months"]},
  {id:"injury", q:"Anything that hurts or holds you back?", type:"multi", options:["Nothing","Knee","Back","Shoulder","Something else"], none:"Nothing"},
  {id:"health", q:"Last one, for safety. Does any of this apply to you?", type:"multi", options:["Heart or blood pressure issues","Dizziness or fainting","Pregnant","Surgery in the last 6 months","None of these"], none:"None of these"},
];
/* "where are you now": the example fits the goal */
const OB_NOW_PH = {strength:"E.g. 5 pull-ups, squat 80 kg × 5", endurance:"E.g. 5 km in 28 min, longest run 8 km", mobility:"E.g. hands 10 cm from the floor",
  health:"E.g. resting heart rate 64, walk 30 min easily", body:"E.g. bench 60 kg × 8, 3 gym days now", sport:"E.g. 3 hard rounds before I fade, 5 km in 26 min"};
const obShown = q => !q.when || q.when(OB.a);
const OB_LIB = {
  strength:  {weeks:8,  phases:[["Foundation",2,"Learn the lifts, build the base"],["Build",3,"Add load every week"],["Deload",1,"Half volume, let it land"],["Peak",1,"Heavy and sharp"],["Test",1,"Show what you built"]], sess:["Strength A","Strength B","Skill practice","Conditioning","Mobility","Strength C"]},
  endurance: {weeks:10, phases:[["Base",3,"Easy miles, lots of zone 2"],["Build",3,"Intervals join the party"],["Deload",1,"Shorter and easier"],["Sharpen",2,"Race pace and speed"],["Test",1,"The big day"]], sess:["Easy session (zone 2)","Intervals","Long session","Strength for engines","Mobility","Tempo"]},
  mobility:  {weeks:8,  phases:[["Open up",3,"Daily range, no forcing"],["Deepen",3,"Hold longer, load the end range"],["Deload",1,"Gentle flows"],["Test",1,"Measure your range"]], sess:["Mobility flow","Active flexibility","Strength in range","Easy cardio","Mobility flow B","Breath + stretch"]},
  health:    {weeks:12, phases:[["Base",4,"Zone 2 and full-body strength"],["Build",4,"Intervals once a week"],["Deload",1,"Easy week"],["Build 2",2,"Longer intervals"],["Retest",1,"See your numbers move"]], sess:["Zone 2","Full-body strength","Intervals","Walk + mobility","Zone 2 long","Strength B"]},
  body:      {weeks:12, phases:[["Foundation",4,"Technique and habits"],["Build",4,"More volume, more food"],["Deload",1,"Recover and reset"],["Push",2,"Hardest block"],["Check-in",1,"Photos, numbers, next block"]], sess:["Upper body","Lower body","Full body","Conditioning","Arms + core","Mobility"]},
  sport:     {weeks:10, phases:[["General prep",3,"Engine and strength"],["Specific prep",4,"Sport-like intervals"],["Deload",1,"Fresh legs"],["Peak",1,"Fast and sharp"],["Event",1,"Go time"]], sess:["Power","Sport conditioning","Strength","Skill + speed","Recovery","Long session"]},
};
const OB_DAYS = {2:[0,3], 3:[0,2,4], 4:[0,1,3,5], 5:[0,1,2,4,5], 6:[0,1,2,3,4,5]};
/* v38 coaches: regular, qualified coaches with a science-based voice. No hype, no gimmicks.
   The coach that fits the goal is shown first; the rest are one tap away (choice overload rule). */
const OB_COACHES = [
  {id:"anders", tag:"Strength coach · MSc sport science", fits:["strength","body"], line:g => `Hard sets close to failure, enough weekly volume, and patience. That's most of it.`},
  {id:"sara",   tag:"Conditioning coach · VO2 max and intervals", fits:["endurance","health","sport"], line:g => `Mostly easy work to build the base, a little very hard work on top. That mix is what the research supports.`},
  {id:"tomas",  tag:"Striking coach · S&C for combat sports", fits:["sport"], line:g => `Your classes are hard days. We build power and a gas tank around them, not on top of them.`},
  {id:"ingrid", tag:"Physiotherapist · mobility and injury prevention", fits:["mobility"], line:g => `Range only counts if you can control it, so we stretch and then load it.`},
  {id:"kofi",   tag:"Running coach · 5 km to marathon", fits:["endurance"], line:g => `Most of your runs easy, one quality session, a long run. Consistency beats heroics.`},
  {id:"maja",   tag:"Exercise physiologist · health and longevity", fits:["health"], line:g => `Zone 2, strength twice a week, one hard interval session. Small, steady and measurable.`},
];
/* the best fit for this goal: combat goals get the striking coach, running goals the running coach */
function obCoachOrder(){
  const cat = OB.goal ? OB.goal.cat : "health", t = (OB.goal && OB.goal.label || "").toLowerCase();
  let first = OB_COACHES.find(c => c.fits.includes(cat)) || OB_COACHES[0];
  if (/fight|mma|muay|box|kick|sparr|bjj|jiu/.test(t)) first = OB_COACHES.find(c => c.id === "tomas");
  else if (/run|marathon|\b\d+ ?k\b|\bkm\b/.test(t)) first = OB_COACHES.find(c => c.id === "kofi");
  return [first, ...OB_COACHES.filter(c => c !== first)];
}
const OB_STYLES = [
  {id:"anime", name:"Anime fighter", f:"saturate(1.7) contrast(1.15) brightness(1.05)"},
  {id:"comic", name:"Comic ink", f:"grayscale(1) contrast(2.4) brightness(1.1)"},
  {id:"clay", name:"Soft 3D", f:"blur(1.2px) saturate(1.35) brightness(1.08) contrast(.95)"},
  {id:"pixel", name:"Pixel", f:"saturate(1.4)", pixel:true},
];
/* AV + avatar builder: see "Swole builder" below */
let OB = null;
const obInit = () => ({step:"welcome", email:"", a:{}, qi:0, goal:null, plan:null, av:AV_DEFAULT(), avTab:"body", drawn:false, avMode:null, photos:[], style:"anime", coach:null, fighter:null, fixed:[], gyms:[], goalText:"", times:null, setN:null, want:{picks:[], text:""}});

function obPlan(){
  const g = OB.goal, A = OB.a, L = OB_LIB[g.cat];
  const newbie = A.history === "New to training";
  const days = OB.times ? Math.max(1, Math.min(6, obFree() || 1)) : (Number(A.days) || 3), mins = parseInt(A.mins) || 45;
  const phases = L.phases.map(p => ({name:p[0], weeks:p[1], focus:p[2]}));
  if (newbie) phases[0].weeks += 2;
  else if (OB_LEVELS.indexOf(A.history) >= 3 && phases[0].weeks > 2) phases[0].weeks -= 1;   // trained people need less ramp-up
  const weeks = phases.reduce((s, p) => s + p.weeks, 0);
  const place = OB.fixed.length ? swolePlaceDays(days, OB.fixed) : {days: OB_DAYS[days] || OB_DAYS[3], capped:false};
  let red = 0; const redCap = Math.max(0, 2 - OB.fixed.reduce((n, f) => n + (f.hard ? f.days.length : 0), 0));
  const wanted = typeof obWantSessions === "function" ? obWantSessions() : [];
  const week1 = place.days.map((d, i) => { if (i < wanted.length) return {d, day:DAY[d], what:wanted[i]}; let what = L.sess[(i - wanted.length) % L.sess.length]; if (/^(Intervals|Tempo|Sport conditioning)$/.test(what)){ if (red >= redCap) what = L.sess[0]; else red++; } return {d, day:DAY[d], what}; });
  OB.fixed.forEach(f => f.days.forEach(d => week1.push({d, day:DAY[d], what:f.label + (f.when ? " · " + f.when.toLowerCase() : ""), fixed:true})));
  week1.sort((a, b) => a.d - b.d || (a.fixed ? 1 : -1));
  const inj = (A.injury || []).filter(x => x !== "Nothing");
  const notes = [];
  if (newbie) notes.push("We start gentle: two extra weeks of foundation.");
  if (inj.length) notes.push(`We'll go easy on your ${inj.join(" and ").toLowerCase()} and build it up carefully.`);
  if (OB.fixed.length) notes.push("Your set sessions stay where they are. Swole's sessions go around them.");
  if (wanted.length > place.days.length) notes.unshift(`You asked for ${wanted.length} sessions and there were ${place.days.length} free days, so the first ${place.days.length} are in.`);
  if (OB.fixed.some(f => f.hard)) notes.push("Your hard classes count as hard days, so there are fewer intervals in the plan.");
  if (place.capped) notes.push(`We kept one day a week fully free, so that's ${place.days.length} Swole session${place.days.length === 1 ? "" : "s"} a week.`);
  const flag = (A.health || []).some(x => x !== "None of these");
  return {title:g.label, weeks, days: place.days.length, mins, phases, week1, notes, flag};
}

/* ---------- v38: the plan builder ----------
   The real app sends the answers to the Supabase function "build-plan". An AI writes the plan,
   the function checks it against the Path safety rules (and fixes or rejects it), then sends it back.
   If anything goes wrong we fall back to obPlan() so sign-up never gets stuck.
   The steps on screen are the real steps, shown as they happen (labor illusion, never fake work). */
/* v39 building screen (behaviour design):
   - endowed progress / goal gradient: the member's own answers are the first steps, already ticked,
     so the bar starts half full and the finish line is close;
   - labor illusion, never fake: the open steps are the server's real stages (writing → checking → fixing);
   - Von Restorff + choice overload: one filled button only ("Notify me when it's ready"), nothing else to decide. */
const OB_STAGES = {writing: 0, checking: 1, fixing: 1, done: 2};
function obBuildSteps(){
  const A = OB.a, n = OB_Q.filter(q => obShown(q) && A[q.id] != null && A[q.id] !== "").length + 1 + (OB.fixed.length ? 1 : 0);
  const fx = OB.fixed.length ? `${OB.fixed.length} fixed session${OB.fixed.length === 1 ? "" : "s"} plus ` : "";
  const st = OB_STAGES[OB.bstage || "writing"] ?? 0;
  const mine = [
    {t: `Your goal: ${OB.goal ? OB.goal.label : ""}`, done: true},
    {t: OB.times ? `Your week: ${OB.times} sessions${obSetCount() ? `, ${obSetCount()} already set` : ""}, ${obFree()} for Swole` : `Your week: ${fx}${A.days || "?"} days for Swole, up to ${parseInt(A.mins) || 45} min`, done: true},
    ...(obWant().picks.length || obWant().text ? [{t: `In your Path: ${obWant().picks.length ? obWant().picks.join(", ") : "your own program"}`, done: true}] : []),
    {t: A.history && A.history !== "New to training" ? `Your level: ${A.history.toLowerCase()} of training${A.current ? `, ${A.current} sessions a week now` : ""}` : "Your level: starting fresh, so we start gentle", done: true},
  ];
  const ours = [
    {t: "Writing every session for you", done: st > 0, now: st === 0},
    {t: OB.bstage === "fixing" ? "Fixing what the safety check found" : "Checking the safety rules", done: st > 1, now: st === 1},
    {t: "Your plan", done: false, now: st === 2},
  ];
  return {n, steps: [...mine, ...ours], pct: Math.round(([...mine, ...ours].filter(x => x.done).length + (st < 2 ? .5 : 1)) / (mine.length + 3) * 100)};
}
const PLAN_FN = typeof SB_URL !== "undefined" ? SB_URL + "/functions/v1/build-plan" : "";
function obIntake(){
  const A = {...OB.a}; delete A.name;
  /* v42: B = sessions a week in total (incl. the set ones), free slots = B − C go to Swole */
  if (OB.times){ A.days = String(Math.max(1, Math.min(7, obFree() || 1))); A.current = obRange(OB.times); }
  const W = obWant(), wants = W.picks.length || W.text ? {methods: W.picks.slice(), week: [], text: (W.text || "").slice(0, 3000)} : null;
  return {goal: OB.goal, answers: A, fixed: OB.fixed.map(({label, days, when, hard}) => ({label, days, when, hard})), gyms: OB.gyms.slice(), start: obStartDate(), rebuild: !!OB.rebuild,
    mode: wants ? "wants" : "new", own: wants, times: OB.times || null, setCount: obSetCount(), feedback: OB.feedback || "", previous: OB.prevBrief || ""};
}
async function planCall(body){
  const t = await sbToken(); if (!t) throw new Error("Not logged in");
  const r = await fetch(PLAN_FN, {method: "POST", headers: {apikey: SB_KEY, Authorization: "Bearer " + t, "Content-Type": "application/json"}, body: JSON.stringify(body)});
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.message || j.error || ("build-plan " + r.status));
  return j;
}
/* poll the background build; the stage on screen is the server's real stage */
async function obPollJob(job){
  const t0 = Date.now();
  while (Date.now() - t0 < 7 * 60e3){
    if (!OB || OB.job !== job) throw new Error("left");
    if (document.visibilityState === "visible"){
      const s = await planCall({action: "status", job}).catch(() => null);
      if (s && s.status === "missing") throw new Error("missing");
      if (s && s.status === "done") return s.result || {};
      if (s && s.stage && s.stage !== OB.bstage){ OB.bstage = s.stage; if (OB.step === "building") obRender(); }
    }
    await new Promise(r => setTimeout(r, 3000));
  }
  throw new Error("timeout");
}
/* the sign-up so far, so a member can close the app while the plan is written and pick up here */
const OB_DRAFT = "swole:ob:draft";
function obSaveDraft(){ if (OB_DEMO || !OB || !(OB.job || OB.plan)) return; try { localStorage.setItem(OB_DRAFT, JSON.stringify({...OB, photos: [], building: false, savedAt: Date.now()})); } catch(e){} }
function obLoadDraft(){ try { const d = JSON.parse(localStorage.getItem(OB_DRAFT) || "null"); return d && Date.now() - d.savedAt < 2 * 864e5 ? d : null; } catch(e){ return null; } }
function obClearDraft(){ try { localStorage.removeItem(OB_DRAFT); } catch(e){} }
/* the server plan → what the sign-up screens show (same shape as obPlan) */
function obFromAi(res){
  const ai = res.plan, w0 = (ai.phases[0] && ai.phases[0].week) || [];
  const week1 = w0.map((id, d) => id && ai.sessions[id] ? {d, day: DAY[d], what: ai.sessions[id].title} : null).filter(Boolean);
  OB.fixed.forEach(f => f.days.forEach(d => week1.push({d, day: DAY[d], what: f.label + (f.when ? " · " + f.when.toLowerCase() : ""), fixed: true})));
  week1.sort((a, b) => a.d - b.d || (a.fixed ? 1 : -1));
  const mins = Math.max(...w0.filter(id => id && ai.sessions[id]).map(id => Number(ai.sessions[id].durMin) || 0), 0) || parseInt(OB.a.mins) || 45;
  return {title: ai.title || OB.goal.label, weeks: ai.phases.reduce((n, p) => n + (Number(p.weeks) || 0), 0), days: w0.filter(Boolean).length, mins,
    phases: ai.phases.map(p => ({name: p.name, weeks: p.weeks, focus: p.focus, type: p.type})), week1, notes: (ai.notes || []).slice(0, 3),
    flag: (OB.a.health || []).some(x => x !== "None of these"), summary: ai.summary || "", ai};
}
async function obBuild(){
  OB.building = true; OB.bstage = OB.bstage || "writing";
  const wait = ms => new Promise(r => setTimeout(r, ms));
  let plan = null;
  if (!OB_DEMO && PLAN_FN && typeof sbToken === "function"){
    try {
      if (!OB.job){ OB.bstage = "writing"; const r = await planCall({action: "start", intake: obIntake()}); OB.job = r.job; obSaveDraft(); }
      const res = await obPollJob(OB.job);
      if (res.plan) plan = obFromAi(res);
      else console.warn("Plan builder:", res.error, res.details || res.message || "");
    } catch(e){ if (e.message === "left") return; console.warn("Plan builder failed, using the standard blocks:", e.message); }
  } else { for (const s of ["writing", "checking"]){ OB.bstage = s; if (OB.step === "building") obRender(); await wait(900); } }
  if (!OB) return;
  if (!plan){ plan = obPlan(); if (!OB_DEMO) plan.notes.unshift("The plan builder couldn't finish, so this plan uses our standard training blocks. You can rebuild it any time in Settings."); }
  OB.bstage = "done"; OB.plan = plan; OB.building = false; OB.job = null; obSaveDraft();
  if (OB.step === "building"){ obRender(); await wait(500); OB.step = "plan"; obRender(); }
}

/* ---------- v42: four questions to a Path ----------
   A  What do you want to achieve?            (goal)
   B  How many times a week do you train?      (times)
   C  How many of those are already set?       (set: count + one row per set session)
   D  Anything you want in your Path?          (want: methods you trust, your own words, or "No, Swole decides")
   Free slots = B − C. Swole puts the member's D picks in the free slots first, then fills the rest for the goal.
   Someone with no idea taps "No, Swole decides" and gets a full program. */
const OB_TIMES = [1,2,3,4,5,6,7,8,9,10];
/* what each method needs per week (sessions) and what those sessions are called; n:0 = a daily add-on, no slot */
const OB_WANT = {
  "Long slow runs":{n:1, s:["Long slow run"]}, "Norwegian 4×4":{n:1, s:["Norwegian 4×4"]}, "Push, pull, legs":{n:3, s:["Push","Pull","Legs"]},
  "Upper, lower":{n:2, s:["Upper body","Lower body"]}, "Full body 3× a week":{n:3, s:["Full body"]}, "Bro split":{n:5, s:["Chest","Back","Shoulders","Arms","Legs"]},
  "5×5":{n:3, s:["5×5 A","5×5 B"]}, "5/3/1":{n:4, s:["5/3/1 squat","5/3/1 bench","5/3/1 deadlift","5/3/1 press"]}, "Grease the groove":{n:0, s:[]},
  "Zone 2":{n:2, s:["Zone 2"]}, "80/20 easy and hard":{n:3, s:["Easy run","Hard intervals"]}, "Tempo runs":{n:1, s:["Tempo run"]}, "Hill repeats":{n:1, s:["Hill repeats"]},
  "Strength 2× a week":{n:2, s:["Strength"]}, "Rounds on the bag":{n:1, s:["Bag rounds"]}, "Sprint intervals":{n:1, s:["Sprints"]}, "Plyometrics":{n:1, s:["Jumps and throws"]},
  "Daily mobility":{n:0, s:[]}, "Loaded stretching":{n:2, s:["Loaded stretching"]}, "Yoga":{n:1, s:["Yoga"]}, "Pilates":{n:1, s:["Pilates"]},
  "10,000 steps":{n:0, s:[]}, "Swimming":{n:1, s:["Swim"]}, "Kettlebells":{n:2, s:["Kettlebells"]},
};
const OB_WANTS = {
  strength:  ["Push, pull, legs","Upper, lower","Full body 3× a week","5×5","5/3/1","Grease the groove"],
  body:      ["Push, pull, legs","Bro split","Upper, lower","Full body 3× a week","Zone 2","Kettlebells"],
  endurance: ["Long slow runs","Norwegian 4×4","80/20 easy and hard","Tempo runs","Hill repeats","Strength 2× a week"],
  health:    ["Zone 2","Norwegian 4×4","Strength 2× a week","Long slow runs","10,000 steps","Daily mobility"],
  sport:     ["Norwegian 4×4","Push, pull, legs","Long slow runs","Rounds on the bag","Sprint intervals","Plyometrics"],
  mobility:  ["Daily mobility","Loaded stretching","Yoga","Pilates","Strength 2× a week","Zone 2"],
};
const obWant = () => { if (!OB.want) OB.want = {picks: [], text: ""}; return OB.want; };
const obSetCount = () => OB.fixed.reduce((n, f) => n + f.days.length, 0);
const obFree = () => Math.max(0, (OB.times || 0) - obSetCount());
const obNeed = () => obWant().picks.reduce((n, m) => n + (OB_WANT[m] ? OB_WANT[m].n : 1), 0);
/* the sessions the member asked for, in the order they go in the free slots (used by the fallback plan) */
function obWantSessions(){
  const out = [];
  obWant().picks.forEach(m => { const w = OB_WANT[m] || {n:1, s:[m]}; for (let i = 0; i < w.n; i++) out.push(w.s[i % w.s.length] || m); });
  return out;
}
/* sessions a week now → the ranges the plan builder knows */
const obRange = n => n <= 2 ? "1–2" : n <= 4 ? "3–4" : n <= 6 ? "5–6" : n <= 9 ? "7–9" : "10+";

/* ---------- roster ---------- */
const ROSTER = [
  {id:"swole", img:"media/cut-default.webp"},   // the original Swole art
  ...["ghost","monday","morrow","price","later","twoday","snooze","glory","jan"].map(id => ({id, img:`media/roster/${id}/default.webp`, name: SWOLE_NAMES[id]})),   // v43: the nine v2 Swoles (old roster files stay for existing members)
];
/* ---------- Swole builder (v25) ----------
   The member picks traits; the preview below is a quick sketch only.
   The real Swole is drawn from swolePrompt(v) with the lookbook recipe (Swole Lookbook v1):
   Magnific seedream-5-pro, style ref = original Swole art (Cq4AjOiEEy) only, flat Swole red field,
   4 moods, then cut out. Demo: nothing is sent. */
const AV = {
  frame:  ["Feminine", "In between", "Masculine"],
  age:    ["20s", "30s", "40s", "50s", "60+"],
  build:  ["Lean", "Athletic", "Strong", "Solid", "Broad"],
  skin:   ["#F8DCCB","#EFC7A8","#E0AE88","#C98F62","#A86F45","#87553A","#64402B","#45291C"],
  hairS:  ["Buzz","Short","Curly","Afro","Locs","Braid","Bob","Long","Bun","Pixie","Bald"],
  hairC:  ["#141010","#3B2418","#6B4226","#D9B36C","#E0A070","#A33A1A","#8E8A86","#E4E1DC"],
  beard:  ["None","Stubble","Short beard","Full beard","Moustache"],
  eyes:   ["#3A2316","#6B4226","#8A6A3A","#4F7B4A","#3F74A8","#7D858C"],
  glasses:["None","Round","Square"],
  ears:   ["None","Studs","Hoops"],
};
const AV_TABS = [["body","Body"],["hair","Hair"],["face","Face"]];
const AV_DEFAULT = () => ({frame:1, age:1, build:1, skin:3, hairS:1, hairC:0, beard:0, eyes:0, glasses:0, ears:0});

/* words for the drawing prompt (index-aligned with AV) */
const AVW = {
  who:   ["woman", "androgynous person", "man"],
  pron:  ["her", "their", "his"],
  age:   ["twenties", "thirties", "forties", "fifties", "sixties"],
  build: ["lean, wiry build", "athletic build", "strong, muscular build", "solid, heavier build with a soft belly", "big, broad heavyweight build"],
  skin:  ["very fair", "fair", "light", "light olive", "medium tan", "brown", "dark brown", "deep dark brown"],
  hairC: ["black", "dark brown", "brown", "blonde", "strawberry-blonde", "auburn red", "salt-and-pepper grey", "silver-white"],
  hairS: ["a buzzcut", "short {c} hair", "short curly {c} hair", "a big {c} afro", "shoulder-length {c} locs", "long {c} hair in a single braid", "a sleek {c} bob", "long straight {c} hair worn down", "{c} hair in a high bun", "a short {c} pixie cut", "a shaved bald head"],
  beard: ["", "light stubble", "a short trimmed beard", "a full beard", "a moustache"],
  eyes:  ["dark brown", "brown", "hazel", "green", "blue", "grey"],
  glasses:["", "round glasses", "square glasses"],
  ears:  ["", "small stud earrings", "small hoop earrings"],
};
function swolePrompt(v){
  const hair = AVW.hairS[v.hairS].replace("{c}", AVW.hairC[v.hairC]);
  const bits = [AVW.build[v.build], `${AVW.skin[v.skin]} skin`, v.hairS === 0 ? `a ${AVW.hairC[v.hairC]} buzzcut` : hair];
  if (v.beard) bits.push(AVW.beard[v.beard]);
  if (v.glasses) bits.push(AVW.glasses[v.glasses]);
  if (v.ears) bits.push(AVW.ears[v.ears]);
  const deep = v.skin >= 6 ? "Warm soft key light from the upper left so every facial feature reads clearly, gentle warm highlights on forehead, cheekbones, nose and lips. " : "";
  return "Single full-body figure from head to feet, front view, standing relaxed with weight on one leg, one hand in a shorts pocket, other arm loose at the side. "
    + `One original ${AVW.who[v.frame]} in ${AVW.pron[v.frame]} ${AVW.age[v.age]}, ${bits.join(", ")}, with tall long-legged fashion-illustration proportions and an honest natural body. `
    + "Plain black crewneck t-shirt, plain black training shorts with no stripes or piping, plain white trainers. "
    + deep
    + "Refined seinen anime illustration exactly in the style reference: crisp fine black linework, soft cel shading with gentle tonal steps, natural realistic facial structure, subtle skin texture. "
    + `Eyes: natural almond-shaped, slightly narrowed and relaxed, strong upper lash line, detailed ${AVW.eyes[v.eyes]} iris with a small soft highlight, defined brows sitting low. `
    + "Calm, quietly confident expression. Flat solid white background, soft dark floor shadow. No props. Original character. No text, no logos, no watermark.";
}
/* the ready-made Swole closest to the traits: shown while the member's own Swole is being drawn */
const ROSTER_TRAITS = {
  swole:{frame:2, age:1, build:2, skin:1, hairS:0}, ayo:{frame:0, age:0, build:2, skin:6, hairS:3}, mei:{frame:0, age:1, build:0, skin:1, hairS:6},
  rafa:{frame:2, age:2, build:3, skin:4, hairS:1}, dev:{frame:2, age:0, build:0, skin:5, hairS:2}, freja:{frame:0, age:1, build:3, skin:0, hairS:5},
  malik:{frame:2, age:1, build:4, skin:7, hairS:4}, nadia:{frame:0, age:3, build:0, skin:4, hairS:9},
  sw8:{frame:2, age:1, build:2, skin:1, hairS:1}, sw9:{frame:0, age:1, build:1, skin:1, hairS:8},
};
function closestSwole(v){
  let best = "swole", bd = 1e9;
  for (const [id, t] of Object.entries(ROSTER_TRAITS)){
    const d = Math.abs(t.frame - v.frame) * 4 + Math.abs(t.skin - v.skin) * 1.5 + Math.abs(t.build - v.build) * 1.2 + Math.abs(t.age - v.age) * .8 + (t.hairS === v.hairS ? 0 : 1);
    if (d < bd){ bd = d; best = id; }
  }
  return best;
}

/* v40: the preview is a plain icon (head, hair, shoulders), not a face. The real Swole is drawn later. */
function avatarSVG(v, size){
  v = {...AV_DEFAULT(), ...v};
  const s = AV.skin[v.skin] || AV.skin[3], h = AV.hairC[v.hairC] || "#141010", st = AV.hairS[v.hairS] || "Short";
  const sw = [44, 50, 58, 62, 70][v.build] + (v.frame === 2 ? 4 : v.frame === 0 ? -4 : 0);
  const longBack = ["Long","Braid","Locs","Bob"].includes(st) ? `<path d="M64 70 Q60 140 72 170 L128 170 Q140 140 136 70 Z" fill="${h}"/>` : "";
  const top = st === "Bald" ? "" : st === "Buzz" ? `<path d="M68 76 Q70 42 100 40 Q130 42 132 76 Q118 58 100 58 Q82 58 68 76Z" fill="${h}" opacity=".7"/>`
    : st === "Afro" ? `<circle cx="100" cy="64" r="44" fill="${h}"/>`
    : st === "Bun" ? `<circle cx="100" cy="30" r="15" fill="${h}"/><path d="M64 84 Q62 40 100 38 Q138 40 136 84 Q122 60 100 58 Q78 60 64 84Z" fill="${h}"/>`
    : `<path d="M64 86 Q60 38 100 36 Q140 38 136 86 Q124 60 100 58 Q76 60 64 86Z" fill="${h}"/>`;
  const beard = v.beard >= 2 ? `<path d="M74 104 Q76 136 100 140 Q124 136 126 104 Q112 120 100 120 Q88 120 74 104Z" fill="${h}" opacity=".85"/>` : "";
  const glasses = v.glasses ? `<path d="M76 96 h18 M106 96 h18 M94 96 h12" stroke="#141010" stroke-width="3" stroke-linecap="round"/>` : "";
  return `<svg viewBox="0 0 200 220" width="${size}" height="${Math.round(size * 1.1)}" role="img" aria-label="Your Swole, as an icon">
    ${longBack}<path d="M${100 - sw} 220 Q${100 - sw} 168 100 162 Q${100 + sw} 168 ${100 + sw} 220Z" fill="#141010"/>
    <rect x="88" y="124" width="24" height="40" rx="10" fill="${s}"/>
    <circle cx="100" cy="94" r="36" fill="${s}"/>${beard}${top}${glasses}
  </svg>`;
}
/* the old detailed sketch, kept for reference */
function avatarSketchOld(v, size){
  v = {...AV_DEFAULT(), ...v};
  const K = "#141010", s = AV.skin[v.skin] || AV.skin[3], h = AV.hairC[v.hairC] || K, e = AV.eyes[v.eyes] || AV.eyes[0], st = AV.hairS[v.hairS] || "Short";
  const fem = v.frame === 0, masc = v.frame === 2;
  const sw = [50, 58, 68, 70, 82][v.build] + (masc ? 6 : fem ? -4 : 0);       // shoulder half-width
  const fx = (fem ? 36 : masc ? 41 : 38) + (v.build >= 3 ? 4 : 0);              // face half-width
  const fy = fem ? 46 : 48;
  const neck = v.build >= 2 ? 30 : 24;
  const hl = (d, extra = "") => `<path d="${d}" fill="${h}" stroke="${K}" stroke-width="2.5" stroke-linejoin="round" ${extra}/>`;
  const HB = {   // hair behind the head
    Long:  hl(`M${100 - fx - 6} 96 Q${100 - fx - 12} 34 100 30 Q${100 + fx + 12} 34 ${100 + fx + 6} 96 L${100 + fx + 12} 186 Q${100 + fx - 10} 192 ${100 + fx - 6} 130 L${100 - fx + 6} 130 Q${100 - fx + 10} 192 ${100 - fx - 12} 186Z`),
    Braid: hl(`M${100 + fx - 4} 110 Q${100 + fx + 14} 140 ${100 + fx + 6} 190 L${100 + fx - 8} 190 Q${100 + fx - 2} 150 ${100 + fx - 16} 118Z`),
    Locs:  [...Array(9)].map((_, i) => { const x = 100 - fx - 4 + i * (fx * 2 + 8) / 8; return `<path d="M${x} 70 Q${x + (i < 4 ? -6 : 6)} 120 ${x + (i < 4 ? -2 : 2)} 168" stroke="${h}" stroke-width="10" stroke-linecap="round" fill="none"/><path d="M${x} 70 Q${x + (i < 4 ? -6 : 6)} 120 ${x + (i < 4 ? -2 : 2)} 168" stroke="${K}" stroke-width="1.2" fill="none" opacity=".35"/>`; }).join(""),
    Afro:  `${[[100,30,44],[64,52,30],[136,52,30],[56,88,24],[144,88,24],[82,34,26],[118,34,26]].map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${h}" stroke="${K}" stroke-width="2.5"/>`).join("")}`,
    Bob:   hl(`M${100 - fx - 10} 128 Q${100 - fx - 14} 36 100 34 Q${100 + fx + 14} 36 ${100 + fx + 10} 128 Q${100 + fx - 4} 134 ${100 + fx - 6} 100 L${100 - fx + 6} 100 Q${100 - fx + 4} 134 ${100 - fx - 10} 128Z`),
  };
  const HF = {   // hair in front / on top
    Buzz:  `<path d="M${100 - fx + 2} 84 Q${100 - fx + 4} 44 100 42 Q${100 + fx - 4} 44 ${100 + fx - 2} 84 Q${100 + fx - 12} 62 100 60 Q${100 - fx + 12} 62 ${100 - fx + 2} 84Z" fill="${h}" opacity=".85"/>`,
    Short: hl(`M${100 - fx - 3} 90 Q${100 - fx - 6} 38 100 34 Q${100 + fx + 8} 36 ${100 + fx + 3} 90 Q${100 + fx - 2} 66 118 60 Q104 72 78 66 Q${100 - fx + 4} 72 ${100 - fx - 3} 90Z`),
    Curly: `${[[100 - fx + 2,70],[100 - fx + 12,50],[90,40],[110,40],[100 + fx - 12,50],[100 + fx - 2,70]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="14" fill="${h}" stroke="${K}" stroke-width="2.5"/>`).join("")}`,
    Afro:  hl(`M${100 - fx + 2} 74 Q${100 - fx} 50 100 50 Q${100 + fx} 50 ${100 + fx - 2} 74 Q100 62 ${100 - fx + 2} 74Z`),
    Locs:  hl(`M${100 - fx - 4} 86 Q${100 - fx - 6} 38 100 36 Q${100 + fx + 6} 38 ${100 + fx + 4} 86 Q${100 + fx - 8} 64 100 62 Q${100 - fx + 8} 64 ${100 - fx - 4} 86Z`),
    Braid: hl(`M${100 - fx - 3} 90 Q${100 - fx - 6} 38 100 34 Q${100 + fx + 6} 38 ${100 + fx + 3} 90 Q${100 + fx - 6} 60 104 56 Q90 66 ${100 - fx + 4} 76 Q${100 - fx} 82 ${100 - fx - 3} 90Z`),
    Bob:   hl(`M${100 - fx - 2} 84 Q${100 - fx - 4} 40 100 38 Q${100 + fx + 4} 40 ${100 + fx + 2} 84 L${100 + fx - 2} 76 L${100 - fx + 2} 76Z`),
    Long:  hl(`M${100 - fx - 2} 92 Q${100 - fx - 4} 40 100 38 Q${100 + fx + 4} 40 ${100 + fx + 2} 92 Q${100 + fx - 6} 62 104 58 Q92 70 ${100 - fx + 4} 72 Z`),
    Bun:   `<circle cx="100" cy="26" r="17" fill="${h}" stroke="${K}" stroke-width="2.5"/>` + hl(`M${100 - fx} 88 Q${100 - fx - 2} 40 100 38 Q${100 + fx + 2} 40 ${100 + fx} 88 Q${100 + fx - 10} 62 100 60 Q${100 - fx + 10} 62 ${100 - fx} 88Z`),
    Pixie: hl(`M${100 - fx - 2} 88 Q${100 - fx - 4} 40 100 36 Q${100 + fx + 6} 38 ${100 + fx + 2} 84 Q${100 + fx - 4} 62 112 58 L${100 - fx + 6} 80 Q${100 - fx} 82 ${100 - fx - 2} 88Z`),
    Bald:  `<path d="M${100 - 18} 52 Q100 46 ${100 + 10} 50" stroke="#fff" stroke-width="3" opacity=".35" fill="none" stroke-linecap="round"/>`,
  };
  const jaw = `${100 - fx} 92 Q${100 - fx} ${92 + fy} 100 ${92 + fy} Q${100 + fx} ${92 + fy} ${100 + fx} 92`;
  const beard = ["",
    `<path d="M${100 - fx + 4} 104 Q${100 - fx + 6} ${88 + fy} 100 ${90 + fy} Q${100 + fx - 6} ${88 + fy} ${100 + fx - 4} 104" fill="${h}" opacity=".28"/>`,
    `<path d="M${100 - fx + 2} 102 Q${100 - fx + 4} ${92 + fy} 100 ${96 + fy} Q${100 + fx - 4} ${92 + fy} ${100 + fx - 2} 102 Q${100 + fx - 8} 122 112 124 Q100 118 88 124 Q${100 - fx + 8} 122 ${100 - fx + 2} 102Z" fill="${h}" stroke="${K}" stroke-width="2"/>`,
    `<path d="M${100 - fx} 96 Q${100 - fx - 2} ${100 + fy} 100 ${108 + fy} Q${100 + fx + 2} ${100 + fy} ${100 + fx} 96 Q${100 + fx - 6} 124 112 124 Q100 116 88 124 Q${100 - fx + 6} 124 ${100 - fx} 96Z" fill="${h}" stroke="${K}" stroke-width="2"/>`,
    `<path d="M86 121 Q100 112 114 121 Q100 118 86 121Z" fill="${h}" stroke="${K}" stroke-width="2"/>`,
  ][v.beard];
  const glasses = v.glasses === 1 ? `<g fill="none" stroke="${K}" stroke-width="2.5"><circle cx="85" cy="95" r="11"/><circle cx="115" cy="95" r="11"/><path d="M96 95 L104 95"/></g>`
    : v.glasses === 2 ? `<g fill="none" stroke="${K}" stroke-width="2.5"><rect x="72" y="86" width="25" height="18" rx="4"/><rect x="103" y="86" width="25" height="18" rx="4"/><path d="M97 94 L103 94"/></g>` : "";
  const ears = v.ears === 1 ? `<circle cx="${100 - fx}" cy="112" r="2.6" fill="#E8C35A" stroke="${K}" stroke-width="1"/><circle cx="${100 + fx}" cy="112" r="2.6" fill="#E8C35A" stroke="${K}" stroke-width="1"/>`
    : v.ears === 2 ? `<circle cx="${100 - fx}" cy="117" r="5.5" fill="none" stroke="#E8C35A" stroke-width="2.2"/><circle cx="${100 + fx}" cy="117" r="5.5" fill="none" stroke="#E8C35A" stroke-width="2.2"/>` : "";
  const lines = v.age >= 2 ? `<g stroke="${K}" stroke-width="1.4" opacity="${v.age >= 3 ? .45 : .3}" fill="none" stroke-linecap="round"><path d="M${100 - fx + 10} 118 Q${100 - fx + 13} 124 ${100 - fx + 16} 126"/><path d="M${100 + fx - 10} 118 Q${100 + fx - 13} 124 ${100 + fx - 16} 126"/>${v.age >= 3 ? `<path d="M86 66 L114 66"/><path d="M90 72 L110 72"/>` : ""}</g>` : "";
  const brow = st === "Bald" || st === "Buzz" ? (v.hairC >= 6 ? h : K) : h;
  const lash = fem ? `<path d="M78 90 L76 87 M122 90 L124 87" stroke="${K}" stroke-width="2" stroke-linecap="round"/>` : "";
  const belly = v.build === 3 ? `<path d="M${100 - sw + 14} 214 Q100 ${196} ${100 + sw - 14} 214" stroke="#2A2424" stroke-width="3" fill="none"/>` : "";
  return `<svg viewBox="0 -16 200 236" width="${size}" height="${Math.round(size * 1.18)}" role="img" aria-label="Sketch of your Swole">
    ${HB[st] || ""}
    <path d="M${100 - sw} 220 Q${100 - sw} 168 100 164 Q${100 + sw} 168 ${100 + sw} 220Z" fill="#141010"/>${belly}
    <rect x="${100 - neck / 2}" y="128" width="${neck}" height="40" rx="9" fill="${s}" stroke="${K}" stroke-width="2.5"/>
    <ellipse cx="${100 - fx}" cy="100" rx="8" ry="12" fill="${s}" stroke="${K}" stroke-width="2.5"/><ellipse cx="${100 + fx}" cy="100" rx="8" ry="12" fill="${s}" stroke="${K}" stroke-width="2.5"/>
    <path d="M${100 - fx} 92 Q${100 - fx} 44 100 44 Q${100 + fx} 44 ${100 + fx} 92 Q${100 + fx} ${92 + fy} 100 ${92 + fy} Q${100 - fx} ${92 + fy} ${100 - fx} 92Z" fill="${s}" stroke="${K}" stroke-width="3"/>
    ${beard}${lines}${HF[st] || ""}
    <path d="M78 82 L94 84" stroke="${brow}" stroke-width="${fem ? 3 : 4.5}" stroke-linecap="round"/><path d="M122 82 L106 84" stroke="${brow}" stroke-width="${fem ? 3 : 4.5}" stroke-linecap="round"/>
    <ellipse cx="85" cy="95" rx="7.5" ry="${fem ? 6 : 5}" fill="#fff" stroke="${K}" stroke-width="2"/><ellipse cx="115" cy="95" rx="7.5" ry="${fem ? 6 : 5}" fill="#fff" stroke="${K}" stroke-width="2"/>
    <circle cx="85" cy="95" r="3.8" fill="${e}"/><circle cx="115" cy="95" r="3.8" fill="${e}"/>${lash}
    <path d="M100 100 L95 114 Q100 117 105 114" fill="none" stroke="${K}" stroke-width="2.2" stroke-linejoin="round"/>
    ${v.beard === 3 ? "" : `<path d="M89 126 Q100 131 111 125" fill="none" stroke="${K}" stroke-width="2.8" stroke-linecap="round"/>`}
    ${glasses}${ears}
  </svg>`;
}

/* ---------- render ---------- */
const OB_ORDER = ["welcome","email","code","consent","goal","times","set","want","intake","building","plan","swole","coach","invite","done"];
function obRender(){
  let el = document.getElementById("onb");
  if (!el){ el = document.createElement("div"); el.id = "onb"; document.body.appendChild(el); }
  const st = OB.step, idx = OB_ORDER.indexOf(st.split(":")[0]);
  const prog = st === "welcome" || st === "building" ? "" : `<div class="obprog"><i style="width:${Math.round(idx / (OB_ORDER.length - 1) * 100)}%"></i></div>`;
  const back = ["welcome","building","done"].includes(st) ? "" : `<button class="obback" data-ob="back" aria-label="Back">‹</button>`;
  el.innerHTML = `<div class="obtop">${back}${prog}</div><div class="obbody">${obView(st)}</div>`;
  el.scrollTop = 0;
  if (st === "welcome") habitRotate(); else clearInterval(habitTimer);
  if (st === "intake"){ const log = el.querySelector(".oblog"); if (log) log.scrollTop = log.scrollHeight; const i = el.querySelector(".obin input"); if (i) setTimeout(() => i.focus(), 200); }
  if (st === "swole:drawing" && !OB.drawn) setTimeout(() => { if (OB.step === "swole:drawing"){ OB.drawn = true; obRender(); } }, 2600);
  if (st === "building" && !OB.building && !OB.plan) obBuild();
  obSaveDraft();
}
/* welcome headline: "Steady habits beat ___", the last words rotate */
const HABIT_WORDS = ["big bursts.", "hard starts.", "crash diets.", "going all in.", "quick fixes.", "beast mode.", "motivation.", "talent."];
let habitTimer = 0;
function habitRotate(){
  clearInterval(habitTimer);
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  let i = 0;
  habitTimer = setInterval(() => {
    const el = document.querySelector(".obrot");
    if (!el){ clearInterval(habitTimer); return; }
    el.classList.add("out");
    setTimeout(() => { i = (i + 1) % HABIT_WORDS.length; el.textContent = HABIT_WORDS[i]; el.classList.remove("out"); }, 260);
  }, 1680);
}
function obView(st){
  const name = OB.a.name ? esc(OB.a.name) : "";
  if (st === "welcome") return `
    <div class="obwel v35 v40">
      <svg class="obwordmark" viewBox="0 0 1000 310" role="img" aria-label="Swole"><text x="500" y="226" text-anchor="middle" textLength="990" lengthAdjust="spacingAndGlyphs">SWOLE</text></svg>
      <p class="obtag">Commit to your own path</p>
      <div class="obwelbtns"><button class="pill wide" data-ob="go:email">Log in</button>
      <button class="oblink" data-ob="go:email">Sign-up</button></div></div>`;
  if (st === "email") return `
    <h2 class="obh">What's your email?</h2><p class="obp">We'll send you a code. No password to remember.</p>
    <input class="obinput" id="obEmail" type="email" inputmode="email" autocomplete="email" autocapitalize="off" placeholder="you@example.com" value="${esc(OB.email)}">
    <button class="pill wide" data-ob="email">Send me a code</button>`;
  if (st === "code") return `
    <h2 class="obh">Check your inbox</h2><p class="obp">We sent a code to <b>${esc(OB.email)}</b>.</p>
    <input class="obinput obcode" id="obCode" inputmode="numeric" autocomplete="one-time-code" maxlength="8" placeholder="123456">
    ${OB_DEMO ? `<p class="obnote">Demo: any 6 digits work.</p>` : `<p class="obnote">Can't find it? Look in spam. It can take a minute.</p>`}
    <button class="pill wide" data-ob="code">Continue</button>
    ${OB_DEMO ? "" : `<button class="oblink" data-ob="resend">Send a new code</button>`}`;
  if (st === "consent") return `
    <h2 class="obh">Your data, your call</h2><p class="obp">Swole works with health data, so we need your OK first.</p>
    ${typeof consentHTML === "function" ? consentHTML('data-ob="consent"') : ""}`;
  if (st === "goal") return `
    <div class="obq">
      <h2 class="obqh">What do you want to achieve?</h2>
      <div class="obqin"><input class="obinput obpill" id="obGoal" placeholder="I want to …" value="${esc(OB.goalText || "")}" autocomplete="off" enterkeyhint="next"></div>
      <div class="obqfoot">
        <div class="obchips obsugg">${OB_GOAL_SUGGEST.map((g, i) => `<button class="obchip" data-ob="gsug:${i}">${esc(g)}</button>`).join("")}</div>
        <button class="pill wide" data-ob="goalgo">Continue</button>
      </div>
    </div>`;
  /* v42 B: how many times a week, everything counted */
  if (st === "times") return `
    <div class="obq">
      <h2 class="obqh">How many times a week do you train?</h2>
      <p class="obp obqp">Count everything: classes, gym, runs. Two sessions on one day count as two.</p>
      <div class="obnums">${OB_TIMES.map(n => `<button class="obnum ${OB.times === n ? "on" : ""}" data-ob="times:${n}" aria-pressed="${OB.times === n}">${n}</button>`).join("")}</div>
      <div class="obqfoot"><button class="oblink" data-ob="times:unsure">Not sure. Suggest something</button></div>
    </div>`;
  /* v42 C: how many of those are already set; one row per set session */
  if (st === "set"){
    const n = OB.setN, added = obSetCount(), max = OB.times || 10;
    return `<div class="obq">
      <h2 class="obqh">How many of those are already set?</h2>
      <p class="obp obqp">Team classes, a run club, sessions with a trainer. They stay put, and Swole plans around them.</p>
      <div class="obnums">${Array.from({length: max + 1}, (_, i) => `<button class="obnum ${n === i ? "on" : ""}" data-ob="setn:${i}" aria-pressed="${n === i}">${i}</button>`).join("")}</div>
      ${n ? `<div class="obqin"><div class="obin"><input class="obinput obpill" id="obFixed" placeholder="E.g. Muay Thai Mon–Thu 18:00" autocomplete="off" enterkeyhint="done"><button class="obsend" data-ob="fxadd" aria-label="Add">+</button></div>
        <div class="oblist">${OB.fixed.map((f, i) => `<div class="obitem"><button class="obx" data-ob="fxdel:${i}" aria-label="Remove ${esc(f.label)}">×</button><span class="obchip on-soft">${esc(f.label)} · ${esc(fixedDaysLabel(f.days))}${f.when ? " " + esc(f.when.toLowerCase()) : ""}</span></div>`).join("")}</div>
        <p class="obnote">${added ? `${added} of ${n} added.` : "What, which days and when. One line can cover several days."}</p></div>` : ""}
      <div class="obqfoot"><button class="pill wide" data-ob="setgo" ${n == null ? "disabled" : ""}>Continue</button></div>
    </div>`;
  }
  /* v42 D: anything you want in your Path; the one filled button is "No, Swole decides" until they pick something */
  if (st === "want"){
    const W = obWant(), cat = OB.goal ? OB_CAT(OB.goal.cat) : "health";
    const opts = [...new Set([...OB_WANTS[cat], ...W.picks])], free = obFree(), need = obNeed();
    const over = W.picks.length && need > free;
    const any = W.picks.length || (W.text || "").trim();
    return `<div class="obq obwant">
      <h2 class="obqh">Anything you want in your Path?</h2>
      <p class="obp obqp">A method you trust, a session you love. Swole builds the rest around it.</p>
      <div class="obchips">${opts.map(m => `<button class="obchip ${W.picks.includes(m) ? "on" : ""}" data-ob="wm:${esc(m)}" aria-pressed="${W.picks.includes(m)}">${esc(m)}</button>`).join("")}${OB.wmAdding ? `<span class="obin sm"><input class="obinput sm" id="obMethod" placeholder="E.g. Hyrox, swimming" enterkeyhint="done"><button class="obsend" data-ob="wmsave" aria-label="Add">+</button></span>` : `<button class="obchip add" data-ob="wmadd">+ Your own</button>`}</div>
      <p class="obnote">${over ? `That's about ${need} sessions and you have ${free} free. Swole will suggest a fit on your plan.` : W.picks.length && need ? `Your picks use ${need} of your ${free} free slot${free === 1 ? "" : "s"}.${need < free ? " Swole fills the rest." : ""}` : `${free} free slot${free === 1 ? "" : "s"} a week for Swole.`}</p>
      <details class="obpaste" ${W.text ? "open" : ""}><summary>Or paste a program</summary><textarea id="obWantText" placeholder="E.g. Mon: bench 5×5, rows 4×8 · Fri: Norwegian 4×4 on the bike">${esc(W.text || "")}</textarea></details>
      <div class="obqfoot"><button class="pill wide" data-ob="wantgo">${any ? "Continue" : "No, Swole decides"}</button></div>
    </div>`;
  }
  if (st === "intake"){
    const log = OB_Q.slice(0, OB.qi).filter(obShown).map(obQ).map(q => `<div class="obmsg c">${esc(q.q.replace("{name}", name))}</div><div class="obmsg u">${esc(obAns(q))}</div>`).join("");
    const q = obQ(OB_Q[OB.qi]);
    const intro = `<div class="obmsg c">${esc(OB.goal.label)}, ${OB.times || "a few"} times a week. Got it. A few quick ones about you, so the plan starts where you are now.</div>`;
    let input = "";
    if (q.type === "text") input = `<div class="obin"><input class="obinput sm" id="obA" placeholder="${esc(q.ph)}" autocapitalize="${q.id === "name" ? "words" : "sentences"}"><button class="obsend" data-ob="ans">→</button></div>${q.skip ? `<button class="oblink" data-ob="skipq">Skip</button>` : ""}`;
    if (q.type === "number") input = `<div class="obin"><input class="obinput sm" id="obA" type="number" inputmode="decimal" min="${q.min}" max="${q.max}" placeholder="${esc(q.unit)}"><button class="obsend" data-ob="ans">→</button></div>${q.skip ? `<button class="oblink" data-ob="skipq">Skip</button>` : ""}`;
    if (q.type === "chips") input = `<div class="obchips">${q.options.map(o => `<button class="obchip" data-ob="pick:${esc(o)}">${esc(o)}</button>`).join("")}</div>`;
    if (q.type === "multi"){ const sel = OB.a[q.id] || []; input = `<div class="obchips">${q.options.map(o => `<button class="obchip ${sel.includes(o) ? "on" : ""}" data-ob="tog:${esc(o)}">${esc(o)}</button>`).join("")}</div><button class="pill wide" data-ob="ans" ${sel.length ? "" : "disabled"}>Next</button>`; }
    return `<div class="obchathead"><span class="obav">S</span><b>Swole</b><span>Setting up your plan · ${OB_Q.slice(0, OB.qi).filter(obShown).length + 1}/${OB_Q.filter(obShown).length}</span></div>
      <div class="oblog">${intro}${log}<div class="obmsg c">${esc(q.q)}</div></div>${input}`;
  }
  if (st === "building") return `
    ${(() => { const B = obBuildSteps(), pushOn = OB.pushOn;
      return `<div class="obbuild v39">
      <p class="obeye">Your plan</p>
      <h2 class="obh">You've done your part.</h2>
      <p class="obp">${B.n} answers about your goal, your week and where you are now. Now we do ours.</p>
      <div class="obbar" role="progressbar" aria-valuenow="${B.pct}" aria-valuemin="0" aria-valuemax="100"><i style="width:${B.pct}%"></i></div>
      <ul class="obsteps v39">${B.steps.map(x => `<li class="${x.done ? "done" : x.now ? "now" : ""}">${esc(x.t)}</li>`).join("")}</ul>
      ${OB_DEMO ? "" : pushOn
        ? `<p class="obnote">You can close Swole now. We'll send a notification the moment your plan is ready.</p>`
        : `<p class="obnote">Usually about a minute. You don't have to wait here.</p><button class="pill wide" data-ob="notifyme">Notify me when it's ready</button>`}
      </div>`; })()}`;
  if (st === "plan"){
    const P = OB.plan, easy = p => /deload|easy/i.test(p.type || p.name);
    const loaded = P.phases.filter(p => !easy(p));
    const why = [P.summary || "", P.ai && (OB.mode === "own" || obWant().picks.length || obWant().text) && P.notes.length ? P.notes.join(" ") : ""].filter(Boolean).join(" ");
    return `<div class="obplan v40"><p class="obeye">Your plan${name ? `, ${name}` : ""}</p><h2 class="obbig sm">${esc(P.title)}</h2>
      <div class="obstats sm"><div><b>${P.weeks}</b><span>weeks</span></div><div><b>${P.days}×</b><span>a week</span></div><div><b>${P.mins}</b><span>min each</span></div></div>
      ${P.flag ? `<div class="obwarn"><b>Talk to a doctor first.</b> You ticked something on the safety list. Get a green light before you start.</div>` : ""}
      <div class="obphases">${P.phases.map(p => easy(p) ? `<div class="obph dl" style="flex:${p.weeks}"></div>` : `<div class="obph" style="flex:${p.weeks}"></div>`).join("")}</div>
      <p class="obnote obphn">${loaded.length} phases${P.phases.some(easy) ? ", an easy week (grey) every few weeks" : ""}.</p>
      ${OB.changing ? "" : `<div class="obcard obweek"><p class="obeye">Week 1</p>${P.week1.map(x => `<div class="obday${x.fixed ? " fx" : ""}"><i>${x.day}</i><span>${esc(x.what)}${x.fixed ? " <small>yours</small>" : ""}</span></div>`).join("")}</div>`}
      ${why ? `<details class="obwhy"><summary><b>Why this plan</b><span>${esc(why)}</span></summary><p>${esc(why)}</p></details>` : ""}
      ${P.notes.length && !P.ai ? `<p class="obnote">${esc(P.notes[0])}</p>` : ""}
      ${OB.changing ? `<div class="obchange"><textarea id="obChange" placeholder="E.g. no running, I want heavier legs on Thursday, intervals on Wednesday">${esc(OB.feedback || "")}</textarea>
        <button class="pill wide" data-ob="rebuildwith">Rebuild with my changes</button><button class="oblink" data-ob="changeoff">Cancel</button></div>`
      : `<button class="pill wide" data-ob="go:${OB.rebuild ? "coach" : "swole"}">Looks good</button>${P.ai ? `<button class="oblink" data-ob="changeon">Change something</button>` : ""}`}</div>`;
  }
  if (st === "swole"){
    const F = OB.fighter && ROSTER.find(f => f.id === OB.fighter);
    return `
    <h2 class="obh">Pick your Swole</h2><p class="obp">Pick the one that feels most like you.</p>
    <div class="obroster">${ROSTER.map((f, i) => `<button class="obfighter ${OB.fighter === f.id ? "on" : ""}" data-ob="fighter:${f.id}" aria-pressed="${OB.fighter === f.id}" aria-label="${f.name || "Swole " + (i + 1)}"><img src="${f.img}" alt="">${f.name ? `<span class="obfname">${f.name}</span>` : ""}</button>`).join("")}</div>
    <button class="pill wide" data-ob="go:coach" ${F ? "" : "disabled"}>${F ? "This is my Swole" : "Pick a Swole"}</button>
    ${OB_DEMO ? `<button class="oblink" data-ob="go:swole:photo">Make my Swole from photos</button>` : ""}
    <button class="oblink" data-ob="go:swole:build">Build my Swole</button>`;
  }
  if (st === "swole:photo"){
    const S0 = OB_STYLES.find(s => s.id === OB.style);
    const prev = OB.photos[0] ? (S0.pixel ? `<canvas id="obPix" class="obprev"></canvas>` : `<img class="obprev" src="${OB.photos[0]}" style="filter:${S0.f}" alt="Style preview">`) : `<div class="obprev empty">Your preview shows here</div>`;
    return `<h2 class="obh">From photos</h2>
      <label class="obupload"><input type="file" id="obFiles" accept="image/*" multiple hidden>${OB.photos.length ? `${OB.photos.map(u => `<img src="${u}" alt="">`).join("")}<span>Change photos</span>` : `<span>+ Add 1–3 photos</span>`}</label>
      <div class="obchips">${OB_STYLES.map(s => `<button class="obchip ${OB.style === s.id ? "on" : ""}" data-ob="style:${s.id}">${esc(s.name)}</button>`).join("")}</div>
      ${prev}
      <p class="obnote">Demo: this is a rough filter. The real app renders a full-body Swole in the style you pick. Your photos are deleted as soon as the render is done. Here they never leave your phone.</p>
      <button class="pill wide" data-ob="avphoto" ${OB.photos.length ? "" : "disabled"}>Use this look</button>`;
  }
  if (st === "swole:build"){
    const v = OB.av, tab = OB.avTab || "body";
    const sw = (k, arr, label) => `<div class="obsw" role="group" aria-label="${label}">${arr.map((c, i) => `<button class="${v[k] === i ? "on" : ""}" style="background:${c}" data-ob="av:${k}:${i}" aria-label="${label} ${i + 1}" aria-pressed="${v[k] === i}"></button>`).join("")}</div>`;
    const ch = (k, arr) => `<div class="obchips">${arr.map((c, i) => `<button class="obchip ${v[k] === i ? "on" : ""}" data-ob="av:${k}:${i}" aria-pressed="${v[k] === i}">${c}</button>`).join("")}</div>`;
    const ctl = (label, html) => `<div class="obctl"><span>${label}</span>${html}</div>`;
    const panes = {
      body: ctl("Shape", ch("frame", AV.frame)) + ctl("Build", ch("build", AV.build)) + ctl("Skin", sw("skin", AV.skin, "Skin tone")),
      hair: ctl("Hair", ch("hairS", AV.hairS)) + ctl("Colour", sw("hairC", AV.hairC, "Hair colour")),
      face: ctl("Eyes", sw("eyes", AV.eyes, "Eye colour")) + ctl("Facial hair", ch("beard", AV.beard)) + ctl("Glasses", ch("glasses", AV.glasses)) + ctl("Earrings", ch("ears", AV.ears)),
    };
    return `<h2 class="obh">Build my Swole</h2>
      <div class="obavwrap"><div class="obavatar" id="obAv">${avatarSVG(v, 170)}</div><p class="obnote">We used your answers for age, sex and build. Your Swole is drawn in full when you're done.</p></div>
      <div class="obtabs" role="tablist">${AV_TABS.map(([id, n]) => `<button role="tab" class="obtab ${tab === id ? "on" : ""}" aria-selected="${tab === id}" data-ob="avtab:${id}">${n}</button>`).join("")}</div>
      <div class="obpane">${panes[tab]}</div>
      <button class="pill wide" data-ob="avdraw">Draw my Swole</button>`;
  }
  if (st === "swole:drawing"){
    const stand = ROSTER.find(f => f.id === OB.fighter) || ROSTER[0];
    if (!OB.drawn) return `<div class="obbuild"><div class="obavatar pulse">${avatarSVG(OB.av, 150)}</div><h2 class="obh">Drawing your Swole…</h2><p class="obp">Full body, four moods. It takes a few minutes.</p></div>`;
    return `<h2 class="obh">Your Swole is on its way</h2>
      <p class="obp">We'll swap it in the moment it's ready. Until then you train with the closest ready-made Swole.</p>
      <div class="obpair"><figure><div class="obavatar">${avatarSVG(OB.av, 120)}</div><figcaption>Your Swole</figcaption></figure><span aria-hidden="true">→</span><figure><img src="${stand.img}" alt="Ready-made Swole"><figcaption>For now</figcaption></figure></div>
      ${OB_DEMO ? `<p class="obnote">Demo: nothing is sent. In the real app our server draws your Swole with the same recipe as the ready-made ones.</p>
      <details class="obprompt"><summary>Demo: drawing prompt</summary><p id="obPrompt">${esc(swolePrompt(OB.av))}</p><button class="oblink" data-ob="copyprompt">Copy prompt</button></details>` : ""}
      <button class="pill wide" data-ob="go:coach">Continue</button>`;
  }
  if (st === "coach"){
    const order = obCoachOrder(), shown = OB.allCoaches ? order : order.slice(0, 3);
    if (!OB.coach) OB.coach = order[0].id;
    return `
    <h2 class="obh">Pick your coach</h2><p class="obp">Your coach adjusts your plan as you go and keeps you motivated on your path.</p>
    <div class="obcoaches ${OB.allCoaches ? "all" : ""}">${shown.map((c, i) => `<button class="obcoach ${OB.coach === c.id ? "on" : ""}" data-ob="coach:${c.id}">
      <img src="${castImg(c.id)}" alt="" onerror="this.style.visibility='hidden'"><div><b>${esc(CAST[c.id].name)}</b><span>${esc(c.tag)}${i === 0 ? " · fits your goal" : ""}</span>${!OB.allCoaches || OB.coach === c.id ? `<p>“${esc(c.line(OB.goal.label))}”</p>` : ""}</div></button>`).join("")}</div>
    ${OB.allCoaches ? "" : `<button class="oblink" data-ob="allcoaches">See all ${OB_COACHES.length} coaches</button>`}
    <button class="pill wide" data-ob="go:${OB.rebuild ? "done" : "invite"}">Train with ${esc(CAST[OB.coach].name)}</button>`;
  }
  if (st === "invite") return `
    <h2 class="obh">Better with a buddy</h2><p class="obp">Research shows that people who train with friends are more likely to reach their goals. Invite a friend to unlock the buddy reward when they finish their first week.</p>
    <div class="obreward"><img src="media/items/buddy-tee.webp" alt="Buddy tee"><span>Buddy reward · Rare</span></div>
    <button class="pill wide" data-ob="share">Invite a buddy</button>
    <button class="oblink" data-ob="go:done">Not now</button>`;
  if (st === "done"){
    const FD = OB.avMode === "fighter" && ROSTER.find(f => f.id === OB.fighter);
    const av = FD ? `<img src="${FD.img}" alt="Your Swole" class="obfig sm">` : OB.avMode === "build" ? `<div class="obavatar">${avatarSVG(OB.av, 160)}</div>` : OB.avMode === "photo" && OB.photos[0] ? `<img class="obprev round" src="${OB.photos[0]}" style="filter:${OB_STYLES.find(s => s.id === OB.style).f}" alt="">` : `<img src="${POSE("flex")}" alt="" class="obfig sm">`;
    return `<h1 class="obbig">Your goal is within reach${name ? `, ${name}` : ""}.</h1>${av}
      <div class="obsum"><span>${esc(OB.goal.label)}</span><span>${OB.plan.weeks} weeks · ${OB.plan.days}× a week</span><span>Coach: ${esc(CAST[coachId(OB.coach || "tomas")].name)}</span></div>
      <button class="pill wide" data-ob="finish">${OB.rebuild ? "Start my new plan" : "Start week 1"}</button>
      ${OB_DEMO ? `<button class="oblink" data-ob="finishff">Demo: fast-forward 4 weeks</button>` : ""}`;
  }
  return "";
}
function obQ(q){
  if (q.id === "numbers") return {...q, ph: OB_NOW_PH[OB.goal ? OB_CAT(OB.goal.cat) : "health"] || q.ph};
  return q;
}
function obAns(q){ const v = OB.a[q.id]; if (v == null || v === "") return "Skipped"; return Array.isArray(v) ? v.join(", ") : q.unit ? `${v} ${q.unit}` : String(v); }
function obPix(){
  const c = document.getElementById("obPix"); if (!c || !OB.photos[0]) return;
  const img = new Image(); img.onload = () => { const w = 36, h = Math.round(w * img.height / img.width); const t = document.createElement("canvas"); t.width = w; t.height = h; t.getContext("2d").drawImage(img, 0, 0, w, h); c.width = w; c.height = h; c.getContext("2d").drawImage(t, 0, 0); }; img.src = OB.photos[0];
}

/* ---------- actions ---------- */
/* v40: Build my Swole starts from the plan answers: age, sex and build (from height and weight) */
function obAvFromAnswers(){
  if (OB.avTouched) return;
  const A = OB.a;
  if (A.age) OB.av.age = Math.max(0, Math.min(4, Math.floor((A.age - 20) / 10)));
  if (A.sex) OB.av.frame = A.sex === "Female" ? 0 : A.sex === "Male" ? 2 : 1;
  if (A.height && A.weight){ const bmi = A.weight / Math.pow(A.height / 100, 2); OB.av.build = bmi < 20 ? 0 : bmi < 24 ? 1 : bmi < 27 ? 2 : bmi < 31 ? 3 : 4; }
}
function obGo(step){ if (step === "swole:build") obAvFromAnswers(); if (step === "building" && typeof pushState === "function") pushState().then(s => { if (OB){ OB.pushOn = s === "on"; if (OB.step === "building") obRender(); } }); if (step === "swole:build" && !OB.avTouched && OB.a.age) OB.av.age = Math.max(0, Math.min(4, Math.floor((OB.a.age - 20) / 10))); OB.step = step; obRender(); if (step === "swole:photo") obPix(); }
function obBack(){
  const s = OB.step;
  if (s === "intake"){ let i = OB.qi - 1; while (i >= 0 && !obShown(OB_Q[i])) i--; if (i >= 0){ OB.qi = i; obRender(); return; } }
  if (OB.rebuild && s === "goal") return obCancelRebuild();
  const prev = {email:"welcome", code:"email", consent:"code", goal:"consent", times:"goal", set:"times", want:"set", intake:"want", plan:"intake", swole:"plan", "swole:photo":"swole", "swole:build":"swole", "swole:drawing":"swole:build", coach: OB.rebuild ? "plan" : "swole", invite:"coach", done: OB.rebuild ? "coach" : "invite"}[s];
  if (!OB_DEMO && SB.session && (prev === "code" || prev === "email")) return;
  if (prev){ if (prev === "intake"){ let i = OB_Q.length - 1; while (i > 0 && !obShown(OB_Q[i])) i--; OB.qi = i; } obGo(prev); }
}
/* the chat starts at its first question; a rebuild skips the personal basics */
function obToIntake(){
  OB.qi = 0; if (OB.rebuild){ while (OB.qi < OB_Q.length - 1 && (OB_Q[OB.qi].id in OB.a) && ["name","age","sex","height","weight"].includes(OB_Q[OB.qi].id)) OB.qi++; }
  while (OB.qi < OB_Q.length && !obShown(OB_Q[OB.qi])) OB.qi++;
}
function obNextQ(){ OB.qi++; while (OB.qi < OB_Q.length && !obShown(OB_Q[OB.qi])) OB.qi++; if (OB.qi >= OB_Q.length){ OB.building = false; OB.plan = null; OB.job = null; OB.bstage = null; obGo("building"); } else obRender(); }
function obFinish(ff){
  const P = {name: OB.a.name || "", email: OB.email, goal: OB.goal, program: OB.plan.title, coach: OB.coach || obCoachOrder()[0].id, answers: OB.a, plan: OB.plan, avatar: OB.avMode === "build" ? OB.av : null, avatarPrompt: OB.avMode === "build" ? swolePrompt(OB.av) : null, avatarStatus: OB.avMode === "build" ? "drawing" : null, style: OB.avMode === "photo" ? OB.style : null, fighter: (OB.avMode === "fighter" || OB.avMode === "build") ? OB.fighter : null, fixed: OB.fixed.map(({label, days, when, hard, text}) => ({label, days, when, hard, text})), gyms: OB.a.gym ? [OB.a.gym] : OB.gyms.slice(),
    mode: obWant().picks.length || obWant().text ? "wants" : "new", own: null, want: obWant(), times: OB.times || null, setN: OB.setN ?? null};
  if (OB.rebuild){   // keep the member's Swole, avatar and history; swap the goal, answers and plan
    const old = OB.rebuild;
    Object.assign(P, {avatar: old.avatar, avatarPrompt: old.avatarPrompt, avatarStatus: old.avatarStatus, avatarArt: old.avatarArt, avatarDrawId: old.avatarDrawId, style: old.style, fighter: old.fighter, createdAt: old.createdAt, rebuiltAt: new Date().toISOString(), previousPlans: [...(old.previousPlans || []), {program: old.program, goal: old.goal, start: old.start, endedAt: new Date().toISOString()}].slice(-5)});
    if (!P.name) P.name = old.name || "";
  }
  if (!OB_DEMO) return obFinishReal(P);
  demoPut("swole:demo:profile", P);
  demoPut("swole:demo:onboarded", true);
  demoPut("swole:introSeen", false);
  if (ff) demoPut("swole:demo:ff", true);
  location.reload();
}
/* the member's plan starts on Monday (today, if today is a Monday) */
function obStartDate(){ const d = new Date(); d.setHours(0,0,0,0); d.setDate(d.getDate() + (7 - (d.getDay() + 6) % 7) % 7); return iso(d); }
async function obFinishReal(P){
  const btn = document.querySelector('#onb [data-ob="finish"]'); if (btn){ btn.disabled = true; btn.textContent = "Saving…"; }
  P.email = (SB.session && SB.session.user.email) || P.email;
  obClearDraft();
  P.onboarded = true; P.start = obStartDate(); P.createdAt = P.createdAt || new Date().toISOString(); P.v = 2;
  await save("settings", "profile", P);
  LS.set("swole:introSeen", false);
  try { await Promise.race([sbFlush(), new Promise(r => setTimeout(r, 5000))]); } catch(e){}
  location.reload();
}
document.addEventListener("click", async e => {
  const b = e.target.closest("#onb [data-ob]"); if (!b) return;
  const a = b.dataset.ob;
  if (a === "back") return obBack();


  if (a === "go:intake") obToIntake();


  if (a.startsWith("go:")) return obGo(a.slice(3));
  if (a === "email"){
    const v = (document.getElementById("obEmail").value || "").trim().toLowerCase(); if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v)){ toast("That doesn't look like an email."); return; }
    OB.email = v;
    if (!OB_DEMO){ b.disabled = true; b.textContent = "Sending…"; try { await sbSendCode(v); } catch(err){ b.disabled = false; b.textContent = "Send me a code"; toast(sbErrText(err)); return; } }
    return obGo("code");
  }
  if (a === "resend"){ try { await sbSendCode(OB.email); toast("New code sent."); } catch(err){ toast(sbErrText(err)); } return; }
  if (a === "code"){
    const v = (document.getElementById("obCode").value || "").replace(/\D/g, ""); if (v.length < 6){ toast("Type the code from the email."); return; }
    if (OB_DEMO) return obGo("consent");
    b.disabled = true; b.textContent = "Checking…";
    try { await sbVerify(OB.email, v); } catch(err){ b.disabled = false; b.textContent = "Continue"; toast(sbErrText(err)); return; }
    const p = S.settings && S.settings.profile;
    if (p && p.onboarded){ toast("Welcome back."); setTimeout(() => location.reload(), 600); return; }   // an existing member on a new phone
    return obGo(sbConsentOk() ? "goal" : "consent");
  }
  if (a === "consent"){
    if (!(document.getElementById("consBox") || {}).checked) return;
    if (OB_DEMO || sbConsentOk()) return obGo("goal");
    b.disabled = true; b.textContent = "Saving…";
    try { await sbGiveConsent(); } catch(err){ b.disabled = false; b.textContent = "I agree"; toast("Couldn't save. Check your connection and try again."); return; }
    return obGo("goal");
  }
  if (a.startsWith("gsug:")){ const g = OB_GOAL_SUGGEST[Number(a.slice(5))]; const i = document.getElementById("obGoal"); if (i){ i.value = g; i.focus(); } OB.goalText = g; return; }
  if (a === "goalgo"){
    let v = (document.getElementById("obGoal").value || "").trim().replace(/^i want to\s+/i, "");
    if (!v){ toast("Write your goal, or tap one of the examples."); return; }
    v = v.charAt(0).toUpperCase() + v.slice(1);
    OB.goalText = v; OB.goal = {cat: goalCat(v), label: v}; return obGo("times");
  }
  if (a === "fxadd"){
    const i = document.getElementById("obFixed"), f = parseFixed(i && i.value);
    if (!f) return;
    if (f.error === "day"){ toast("Which day? E.g. “Pilates every Friday morning”."); return; }
    OB.fixed.push(f); obRender(); const n = document.getElementById("obFixed"); if (n) n.focus(); return;
  }
  if (a.startsWith("fxdel:")){ OB.fixed.splice(Number(a.slice(6)), 1); return obRender(); }

  if (a === "ans"){
    const q = OB_Q[OB.qi];
    if (q.type === "multi"){ if (!(OB.a[q.id] || []).length) return; return obNextQ(); }
    const v = (document.getElementById("obA").value || "").trim();
    if (!v){ toast(q.skip ? "Type a number or tap Skip." : "Type an answer first."); return; }
    if (q.type === "number"){ const n = Number(v.replace(",", ".")); if (!(n >= q.min && n <= q.max)){ toast(`Between ${q.min} and ${q.max} ${q.unit}, please.`); return; } OB.a[q.id] = n; }
    else OB.a[q.id] = v;
    return obNextQ();
  }
  if (a === "skipq"){ OB.a[OB_Q[OB.qi].id] = null; return obNextQ(); }
  if (a.startsWith("pick:")){ OB.a[OB_Q[OB.qi].id] = a.slice(5); return obNextQ(); }
  if (a.startsWith("tog:")){
    const q = OB_Q[OB.qi], o = a.slice(4); let sel = OB.a[q.id] || [];
    if (o === q.none) sel = sel.includes(o) ? [] : [o];
    else { sel = sel.filter(x => x !== q.none); sel = sel.includes(o) ? sel.filter(x => x !== o) : [...sel, o]; }
    OB.a[q.id] = sel; return obRender();
  }
  if (a.startsWith("style:")){ OB.style = a.slice(6); return obGo("swole:photo"); }
  if (a.startsWith("av:")){ const [, k, i] = a.split(":"); OB.av[k] = Number(i); OB.avTouched = true; return obRender(); }
  if (a.startsWith("fighter:")){ OB.fighter = a.slice(8); OB.avMode = "fighter"; return obRender(); }
  if (a === "avphoto"){ OB.avMode = "photo"; return obGo("coach"); }
  if (a.startsWith("avtab:")){ OB.avTab = a.slice(6); return obRender(); }
  if (a === "avdraw"){ OB.avMode = "build"; OB.fighter = closestSwole(OB.av); OB.drawn = false; return obGo("swole:drawing"); }
  if (a === "copyprompt"){ const t = swolePrompt(OB.av); try { await navigator.clipboard.writeText(t); toast("Prompt copied."); } catch(err){ const el = document.getElementById("obPrompt"); if (el){ const r = document.createRange(); r.selectNodeContents(el); const sel = getSelection(); sel.removeAllRanges(); sel.addRange(r); } toast("Select and copy the prompt."); } return; }
  if (a.startsWith("coach:")){ OB.coach = a.slice(6); return obRender(); }
  if (a === "allcoaches"){ OB.allCoaches = true; return obRender(); }
  /* v42 B, C, D */
  if (a.startsWith("times:")){ const v = a.slice(6); OB.times = v === "unsure" ? 4 : Number(v); if (OB.setN != null && OB.setN > OB.times) OB.setN = OB.times; return obGo("set"); }
  if (a.startsWith("setn:")){ OB.setN = Number(a.slice(5)); if (!OB.setN) OB.fixed = []; obRender(); const i = document.getElementById("obFixed"); if (i) i.focus(); return; }
  if (a === "setgo"){
    const i = document.getElementById("obFixed");
    if (i && i.value.trim()){ const f = parseFixed(i.value); if (f && f.error === "day"){ toast("Which days? E.g. “Muay Thai Mon–Thu 18:00”."); return; } if (f) OB.fixed.push(f); }
    if (OB.setN && !OB.fixed.length){ toast("Add your set sessions, e.g. “Muay Thai Mon–Thu 18:00”."); return; }
    const n = obSetCount(); if (n > (OB.times || 0)) OB.times = Math.min(10, n);   // more set sessions than the total: the rows win
    OB.setN = n; return obGo("want");
  }
  if (a.startsWith("wm:")){ const W = obWant(), m = a.slice(3); W.picks = W.picks.includes(m) ? W.picks.filter(x => x !== m) : [...W.picks, m]; W.text = ((document.getElementById("obWantText") || {}).value || W.text || ""); return obRender(); }
  if (a === "wmadd"){ OB.wmAdding = true; obRender(); const i = document.getElementById("obMethod"); if (i) i.focus(); return; }
  if (a === "wmsave"){ const m = ((document.getElementById("obMethod") || {}).value || "").trim(); OB.wmAdding = false; if (m){ const W = obWant(); if (!W.picks.includes(m)) W.picks.push(m); } return obRender(); }
  if (a === "wantgo"){
    const W = obWant(); W.text = ((document.getElementById("obWantText") || {}).value || "").trim();
    const m = ((document.getElementById("obMethod") || {}).value || "").trim(); if (m && !W.picks.includes(m)) W.picks.push(m);
    OB.wmAdding = false; obToIntake(); return obGo("intake");
  }
  if (a === "changeon"){ OB.changing = true; return obRender(); }
  if (a === "changeoff"){ OB.changing = false; return obRender(); }
  if (a === "rebuildwith"){
    const v = ((document.getElementById("obChange") || {}).value || "").trim(); if (!v){ toast("Write what you'd like to change."); return; }
    const P = OB.plan; OB.feedback = v; OB.changing = false;
    OB.prevBrief = `${P.title}, ${P.weeks} weeks. Week 1: ` + P.week1.filter(x => !x.fixed).map(x => `${x.day} ${x.what}`).join(", ");
    OB.plan = null; OB.job = null; OB.bstage = null; OB.building = false; return obGo("building");
  }
  if (a === "notifyme"){
    b.disabled = true;
    const ok = typeof enablePush === "function" && await enablePush("We'll tell you when your plan is ready.");
    OB.pushOn = !!ok; obSaveDraft(); return obRender();
  }
  if (a === "share"){
    const data = {title: "Swole", text: `I'm training for "${OB.goal.label}" on Swole. Join me and we both get the Buddy tee.`, url: location.origin + location.pathname};
    try { if (navigator.share){ await navigator.share(data); } else { await navigator.clipboard.writeText(data.text + " " + data.url); toast("Invite link copied."); } } catch(err){}
    return obGo("done");
  }
  if (a === "finish") return obFinish(false);
  if (a === "finishff") return obFinish(true);
});
document.addEventListener("input", e => {
  const r = e.target.closest("#onb [data-obr]"); if (!r) return;
  OB.av[r.dataset.obr] = Number(r.value);
  if (r.dataset.obr === "height"){ const h = document.getElementById("obH"); if (h) h.textContent = r.value + " cm"; }
  else { const av = document.getElementById("obAv"); if (av) av.innerHTML = avatarSVG(OB.av, 180); }
});
document.addEventListener("change", e => {
  if (e.target.id !== "obFiles") return;
  const files = [...e.target.files].slice(0, 3);
  OB.photos.forEach(u => URL.revokeObjectURL(u));
  OB.photos = files.map(f => URL.createObjectURL(f));
  obGo("swole:photo");
});
document.addEventListener("keydown", e => {
  if (e.key !== "Enter" || !document.getElementById("onb")) return;
  const btn = document.querySelector("#onb .obsend, #onb .pill.wide:not([disabled])"); if (btn) btn.click();
});
function startOnboarding(step){ OB = obInit(); if (step) OB.step = step; document.documentElement.classList.add("ob-open"); obRender(); }
/* v38: Settings → Rebuild my plan. Same questions, answers filled in from last time, nothing else lost. */
function startRebuild(){
  const P = (window.SWOLE_DEMO ? demoGet("swole:demo:profile") : (S.settings && S.settings.profile)) || {};
  OB = obInit();
  OB.rebuild = P; OB.a = {...(P.answers || {})}; if (P.name && !OB.a.name) OB.a.name = P.name;
  OB.goalText = P.goal ? P.goal.label : ""; OB.fixed = (P.fixed || []).map(f => ({...f})); OB.gyms = (P.gyms || []).slice();
  OB.coach = P.coach ? coachId(P.coach) : null; OB.fighter = P.fighter || null; OB.avMode = P.fighter ? "fighter" : null; OB.email = P.email || "";
  OB.times = P.times || null; OB.setN = P.setN ?? (P.fixed || []).reduce((n, f) => n + f.days.length, 0);
  OB.want = P.want ? JSON.parse(JSON.stringify(P.want)) : {picks: (P.own && P.own.methods || []).map(m => m.replace(/ \/ /g, ", ").replace("80/20 polarised", "80/20 easy and hard")), text: (P.own && P.own.text) || ""};   // v41 profiles: their methods carry over
  OB.step = "goal"; document.documentElement.classList.add("ob-open"); obRender();
}
function obCancelRebuild(){ obClearDraft(); const el = document.getElementById("onb"); if (el) el.remove(); document.documentElement.classList.remove("ob-open"); OB = null; }
/* v39: a sign-up or rebuild that was closed while the plan was written picks up where it was */
function obResume(){
  const d = obLoadDraft(); if (!d || !SB.session) return false;
  OB = {...obInit(), ...d, building: false};
  if (OB.step === "building" && !OB.job && !OB.plan) OB.step = "intake";
  if (!OB_ORDER.includes(OB.step.split(":")[0])) OB.step = "goal";   // a v41 draft on a step that no longer exists
  if (OB.step === "building" && OB.plan) OB.step = "plan";
  document.documentElement.classList.add("ob-open"); obRender(); return true;
}
if (OB_DEMO){ if (!demoGet("swole:demo:onboarded")) startOnboarding(); }
else if (obResume()){ /* back in the sign-up */ }
else {
  /* real app: someone with no profile and no training on this phone is new → sign-up.
     Mathias's own account has training data, so he never sees it. */
  const hasData = Object.keys(S.sessions || {}).length || Object.keys(S.checkins || {}).length;
  if (!(S.settings && S.settings.profile && S.settings.profile.onboarded) && !hasData) startOnboarding(SB.session ? "goal" : "welcome");
}
