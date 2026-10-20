/* ============ PATH GENERATOR v1 ============
   Turns a member's sign-up plan (profile.plan: goal category, phases, days, minutes)
   into the structures the app already runs on: PHASES, TEMPLATES, SESS and TESTS.
   Mathias's own account has no profile, so his 26-week Muay Thai plan is untouched.
   Rules followed from swole-path-rules.md (v1 = one Primary Track):
   - block types: Skill, Strength, Power, Aerobic Z2, Zone Red, Mobility, Recovery
   - max 2 Zone Red sessions a week, at least 1 rest day, deload weeks at ~60 % volume
   - max tests only in Test weeks; beginners get gentler versions
   Loaded after plan.js + demo.js, before path.js and app.js. */
const PLAN_GENERATED = (() => {
  const P = window.SWOLE_PROFILE;
  if (!P || !P.plan || !P.goal) return false;
  const cat = OB_CAT(P.goal.cat), plan = P.plan, A = P.answers || {};
  const mins = Math.max(20, Math.min(90, Number(plan.mins) || 45));
  const days = Math.max(2, Math.min(6, Number(plan.days) || 3));
  const newbie = A.history === "New to training";
  const goal = (P.goal.label || "").toLowerCase();
  const inj = (A.injury || []).filter(x => x !== "Nothing").map(x => x.toLowerCase());

  /* ---------- helpers ---------- */
  const M = f => Math.max(5, Math.round(mins * f / 5) * 5);        // a share of the session, in 5-min steps
  const ex = (name, dose, note = "") => [name, dose, note];
  const blk = (name, t, list) => ({name, t: t + " min", ex: list});
  const warm = (what) => blk("Warm-up", M(.15), [ex(what || "Easy movement, building", M(.1) + " min"), ex("Mobility: hips, ankles, shoulders", "3 min")]);
  const cool = () => blk("Cool-down", M(.1), [ex("Easy, then stretch", M(.1) + " min")]);
  const kneeNote = inj.includes("knee") ? " Keep it pain-free for the knee (under 3/10)." : "";
  const backNote = inj.includes("back") ? " Neutral spine, no rounding. Stop if the back complains." : "";
  const shNote = inj.includes("shoulder") ? " Pain-free range only for the shoulder." : "";

  /* ---------- session library per category ----------
     each entry: (phaseType) => session. phaseType: base | build | peak | deload | test */
  const LIB = {
    endurance: [
      t => ({title: newbie && t === "base" ? "Run-walk · Zone 2" : "Easy run · Zone 2", kind:"conditioning", sub: newbie && t === "base" ? "1 min run, 1 min walk" : "Conversational pace",
        blocks:[warm("Brisk walk"), blk("Aerobic Z2", M(.75), [newbie && t === "base" ? ex("Run 1 min, walk 1 min", Math.round(M(.75) / 2) + " rounds", "Slow enough to talk. Walk breaks are the plan, not a failure.") : ex("Easy run", M(.75) + " min", "You can speak in full sentences. Slow down if you can't.")]), cool()]}),
      t => ({title:"Intervals · Zone red", kind:"conditioning", sub: t === "base" ? "6 × 1 min hard" : t === "build" ? "5 × 3 min hard" : "4 × 4 min hard", zoneRed:true,
        timer: t === "base" ? [{label:"Hard", reps:6, work:60, rest:90}] : t === "build" ? [{label:"Hard", reps:5, work:180, rest:120}] : [{label:"Hard", reps:4, work:240, rest:150}],
        blocks:[warm("Easy jog"), blk("Zone Red", M(.55), [t === "base" ? ex("Hard, about 8/10", "6 × 1 min", "90 sec easy jog between.") : t === "build" ? ex("Hard, about 8/10", "5 × 3 min", "2 min easy between. Even pace.") : ex("Race pace", "4 × 4 min", "2½ min easy between.")]), cool()]}),
      t => ({title:"Long session", kind:"conditioning", sub:"Longest of the week, easy", blocks:[warm("Brisk walk"), blk("Aerobic Z2", M(.85), [ex(newbie ? "Run-walk, easy" : "Easy run", M(.85) + " min", "The longest session of the week. Easy the whole way.")])]}),
      t => ({title:"Strength for runners", kind:"strength", sub:"Legs, hips, core", blocks:[warm(), blk("Strength", M(.6), [ex("Split squat", "3 × 8 / side", "Slow down, steady up." + kneeNote), ex("Single-leg Romanian deadlift", "3 × 8 / side", backNote.trim()), ex("Calf raises, straight knee", "3 × 15", ""), ex("Side plank", "3 × 30 sec / side", "")]), cool()]}),
      t => ({title:"Tempo", kind:"conditioning", sub:"Comfortably hard", zoneRed:true, blocks:[warm("Easy jog"), blk("Zone Red", M(.5), [ex("Tempo, about 7/10", "2 × " + Math.max(5, Math.round(M(.5) / 2.5)) + " min", "Comfortably hard: a few words at a time. 3 min easy between.")]), cool()]}),
      t => ({title:"Mobility + easy walk", kind:"mobility", sub:"Recovery", blocks:[blk("Recovery", M(.5), [ex("Easy walk", M(.5) + " min", "")]), blk("Mobility", M(.3), [ex("Calf and hip flexor stretch", "60 sec / side", ""), ex("90/90 hip switches", "2 × 8", "")])]}),
    ],
    strength: [
      t => ({title:"Strength A · Lower body", kind:"strength", sub:"Squat and hinge", blocks:[warm(), blk("Strength", M(.65), [ex(newbie ? "Goblet squat" : "Back squat or goblet squat", t === "base" ? "3 × 8" : t === "build" ? "4 × 6" : "4 × 4", "Leave 2 reps in the tank." + kneeNote), ex(newbie ? "Kettlebell deadlift" : "Deadlift or trap bar", t === "base" ? "3 × 8" : t === "build" ? "4 × 5" : "4 × 3", "Flat back, push the floor away." + backNote), ex("Walking lunge", "3 × 8 / side", "")]), cool()]}),
      t => ({title:"Strength B · Upper body", kind:"strength", sub:"Push and pull", blocks:[warm(), blk("Strength", M(.65), [ex(newbie ? "Incline push-up" : "Push-up or bench press", t === "base" ? "3 × 8" : "4 × 6", shNote.trim()), ex("Row (dumbbell or ring)", "4 × 8", ""), ex(/pull-up/.test(goal) ? "Pull-up negatives" : "Lat pulldown or band pull-up", "3 × 5", /pull-up/.test(goal) ? "Jump up, lower for 4–5 sec." : "")]), cool()]}),
      t => ({title:"Skill practice", kind:"strength", sub:"Practise the goal itself", blocks:[warm(), blk("Skill", M(.6), [
        /pull-up/.test(goal) ? ex("Dead hang", "4 × 20–30 sec", "Builds grip and shoulders.") : /push-up/.test(goal) ? ex("Push-ups, perfect reps", "5 × half your max", "Stop each set before form breaks.") : ex("Technique sets of your main lift", "5 × 3 light", "Same groove every rep."),
        /pull-up/.test(goal) ? ex("Band-assisted pull-up", "4 × 4", "Less band as you get stronger.") : ex("Plank", "3 × 40 sec", ""),
        ex("Scapular pull-ups / shoulder taps", "3 × 8", "")]), cool()]}),
      t => ({title:"Conditioning", kind:"conditioning", sub:"Easy engine work", blocks:[warm(), blk("Aerobic Z2", M(.7), [ex("Bike, row or brisk walk", M(.7) + " min", "Easy: you can talk.")])]}),
      t => ({title:"Mobility", kind:"mobility", sub:"Hips, shoulders, t-spine", blocks:[blk("Mobility", M(.7), [ex("90/90 hip switches", "2 × 8", ""), ex("T-spine open book", "8 / side", ""), ex("Couch stretch", "60 sec / side", ""), ex("Shoulder CARs", "5 / side", "")])]}),
      t => ({title:"Strength C · Full body", kind:"strength", sub:"Lighter, faster", blocks:[warm(), blk("Power", M(.25), [ex("Kettlebell swing", "4 × 10", "Snap the hips." + backNote)]), blk("Strength", M(.4), [ex("Split squat", "3 × 8 / side", kneeNote.trim()), ex("Push-up", "3 × max − 2", ""), ex("Farmer carry", "3 × 30 m", "")]), cool()]}),
    ],
    mobility: [
      t => ({title:"Mobility flow", kind:"mobility", sub: /split/.test(goal) ? "Hips and hamstrings" : /toe/.test(goal) ? "Hamstrings and back" : "Ankles and hips", blocks:[warm("Easy movement"), blk("Mobility", M(.75), /split/.test(goal) ? [ex("Half-split rocks", "2 × 10 / side", ""), ex("Couch stretch", "90 sec / side", ""), ex("Frog stretch", "2 × 60 sec", ""), ex("Lizard lunge", "60 sec / side", "")] : /toe/.test(goal) ? [ex("Jefferson curl, light", "2 × 8", "Slow, no weight to start." + backNote), ex("Seated pike reach", "3 × 45 sec", ""), ex("Hamstring floss", "2 × 10 / side", "")] : [ex("Knee-to-wall rocks", "2 × 10 / side", ""), ex("Deep squat hold", "4 × 30 sec", "Hold onto something if you need to." + kneeNote), ex("90/90 hip switches", "2 × 8", "")])]}),
      t => ({title:"Active flexibility", kind:"mobility", sub:"Strength at the end of range", blocks:[warm(), blk("Mobility", M(.7), [ex("Leg lifts at end range", "3 × 8 / side", ""), ex("Cossack squat", "3 × 6 / side", kneeNote.trim()), ex("Pancake good morning, light", "3 × 8", backNote.trim())])]}),
      t => ({title:"Strength in range", kind:"strength", sub:"Load the new range", blocks:[warm(), blk("Strength", M(.6), [ex("Goblet squat, slow", "3 × 8", "3 sec down, pause at the bottom." + kneeNote), ex("Romanian deadlift", "3 × 8", backNote.trim()), ex("Split squat, deep", "3 × 8 / side", "")]), cool()]}),
      t => ({title:"Easy cardio", kind:"conditioning", sub:"Zone 2", blocks:[blk("Aerobic Z2", M(.8), [ex("Walk, bike or swim", M(.8) + " min", "Easy.")])]}),
      t => ({title:"Mobility flow B", kind:"mobility", sub:"Full body", blocks:[blk("Mobility", M(.8), [ex("World's greatest stretch", "5 / side", ""), ex("Thread the needle", "8 / side", ""), ex("Hip CARs", "5 / side", "")])]}),
      t => ({title:"Breath + stretch", kind:"mobility", sub:"Recovery", blocks:[blk("Recovery", M(.6), [ex("Box breathing", "4 min", "4 in, 4 hold, 4 out, 4 hold."), ex("Easy long holds", "2 min per position", "")])]}),
    ],
    health: [
      t => ({title:"Zone 2", kind:"conditioning", sub:"Easy and steady", blocks:[warm("Easy start"), blk("Aerobic Z2", M(.8), [ex("Walk, bike, row or easy jog", M(.8) + " min", "You can talk in full sentences. This builds the base.")])]}),
      t => ({title:"Full-body strength", kind:"strength", sub:"Big movements", blocks:[warm(), blk("Strength", M(.65), [ex("Goblet squat", "3 × 10", kneeNote.trim()), ex("Push-up (incline if needed)", "3 × 8", shNote.trim()), ex("Row", "3 × 10", ""), ex("Hip hinge (kettlebell deadlift)", "3 × 10", backNote.trim())]), cool()]}),
      t => ({title: t === "base" ? "Pick-ups" : "Intervals · Zone red", kind:"conditioning", sub: t === "base" ? "Short, comfortable bursts" : "4 × 4 min hard", zoneRed: t !== "base",
        timer: t === "base" ? [{label:"Brisk", reps:6, work:30, rest:90}] : [{label:"Hard", reps:4, work:240, rest:180}],
        blocks:[warm(), blk(t === "base" ? "Aerobic Z2" : "Zone Red", M(.55), [t === "base" ? ex("Brisk, about 6/10", "6 × 30 sec", "90 sec easy between.") : ex("Hard, about 8/10", "4 × 4 min", "3 min easy between. The classic VO2 max set.")]), cool()]}),
      t => ({title:"Walk + mobility", kind:"mobility", sub:"Recovery", blocks:[blk("Recovery", M(.6), [ex("Brisk walk", M(.6) + " min", "Outside if you can.")]), blk("Mobility", M(.3), [ex("Hip and calf stretches", "60 sec each", "")])]}),
      t => ({title:"Zone 2 · Long", kind:"conditioning", sub:"Longest easy session", blocks:[blk("Aerobic Z2", M(.9), [ex("Walk, bike or easy jog", M(.9) + " min", "Easy all the way.")])]}),
      t => ({title:"Strength B", kind:"strength", sub:"Single-leg and core", blocks:[warm(), blk("Strength", M(.6), [ex("Split squat", "3 × 8 / side", kneeNote.trim()), ex("Single-arm row", "3 × 10 / side", ""), ex("Dead bug", "3 × 8 / side", "")]), cool()]}),
    ],
    body: [
      t => ({title:"Upper body", kind:"strength", sub:"Push and pull", blocks:[warm(), blk("Strength", M(.7), [ex("Bench or push-up", t === "base" ? "3 × 10" : "4 × 8", shNote.trim()), ex("Row", "4 × 10", ""), ex("Shoulder press", "3 × 10", shNote.trim()), ex("Lat pulldown", "3 × 10", "")]), cool()]}),
      t => ({title:"Lower body", kind:"strength", sub:"Squat and hinge", blocks:[warm(), blk("Strength", M(.7), [ex("Squat (goblet or barbell)", t === "base" ? "3 × 10" : "4 × 8", kneeNote.trim()), ex("Romanian deadlift", "3 × 10", backNote.trim()), ex("Walking lunge", "3 × 10 / side", ""), ex("Calf raise", "3 × 15", "")]), cool()]}),
      t => ({title:"Full body", kind:"strength", sub:"Big lifts, moderate", blocks:[warm(), blk("Strength", M(.7), [ex("Deadlift or trap bar", "3 × 6", backNote.trim()), ex("Push-up", "3 × 10", ""), ex("Split squat", "3 × 8 / side", ""), ex("Farmer carry", "3 × 30 m", "")]), cool()]}),
      t => ({title:"Conditioning", kind:"conditioning", sub: t === "base" ? "Zone 2" : "Intervals", zoneRed: t !== "base", blocks:[warm(), blk(t === "base" ? "Aerobic Z2" : "Zone Red", M(.6), [t === "base" ? ex("Bike, row or brisk walk", M(.6) + " min", "Easy.") : ex("Bike or row, hard", "8 × 30 sec", "90 sec easy between.")]), cool()]}),
      t => ({title:"Arms + core", kind:"strength", sub:"Accessories", blocks:[warm(), blk("Strength", M(.6), [ex("Curls", "3 × 12", ""), ex("Triceps extension", "3 × 12", ""), ex("Plank", "3 × 40 sec", ""), ex("Hanging knee raise", "3 × 10", "")])]}),
      t => ({title:"Mobility", kind:"mobility", sub:"Recovery", blocks:[blk("Mobility", M(.6), [ex("90/90 hip switches", "2 × 8", ""), ex("T-spine open book", "8 / side", ""), ex("Couch stretch", "60 sec / side", "")])]}),
    ],
    sport: [
      t => ({title:"Power", kind:"strength", sub:"Jumps and throws", blocks:[warm(), blk("Power", M(.35), [ex("Box jump, step down", "4 × 3", "Explosive up, soft landing." + kneeNote, "jump"), ex("Med ball slam", "4 × 5", "Max speed.")]), blk("Strength", M(.35), [ex("Trap bar deadlift", "4 × 4", backNote.trim()), ex("Push press", "3 × 5", shNote.trim())]), cool()]}),
      t => ({title:"Sport conditioning · Zone red", kind:"conditioning", sub:"Rounds like the real thing", zoneRed:true, timer:[{label:"Round", reps: t === "base" ? 4 : 6, work: t === "base" ? 120 : 180, rest:60}],
        blocks:[warm(), blk("Zone Red", M(.6), [ex(/fight|sparring/.test(goal) ? "Bag or shadow rounds" : /ski/.test(goal) ? "Wall sits + squat jumps" : /padel/.test(goal) ? "Court sprints and lateral shuffles" : "Sport-like intervals", t === "base" ? "4 × 2 min" : "6 × 3 min", "1 min rest. Same pace in every round.")]), cool()]}),
      t => ({title:"Strength", kind:"strength", sub:"Base strength", blocks:[warm(), blk("Strength", M(.65), [ex("Squat", "4 × 5", kneeNote.trim()), ex("Pull-up or row", "4 × 6", ""), ex("Single-leg RDL", "3 × 8 / side", backNote.trim())]), cool()]}),
      t => ({title:"Skill + speed", kind:"conditioning", sub:"Quality over volume", blocks:[warm(), blk("Skill", M(.6), [ex(/fight/.test(goal) ? "Technique drills" : /padel/.test(goal) ? "Footwork and shadow strokes" : "Sport-specific drills", M(.4) + " min", "Fresh and sharp."), ex("Short sprints", "6 × 10 sec", "Full rest between.", "sprint")]), cool()]}),
      t => ({title:"Recovery", kind:"mobility", sub:"Easy + mobility", blocks:[blk("Recovery", M(.5), [ex("Easy bike or walk", M(.5) + " min", "")]), blk("Mobility", M(.3), [ex("Hips, ankles, t-spine", M(.3) + " min", "")])]}),
      t => ({title:"Long session", kind:"conditioning", sub:"Zone 2 engine", blocks:[blk("Aerobic Z2", M(.85), [ex("Bike, row or easy run", M(.85) + " min", "Easy.")])]}),
    ],
  };
  const TESTLIB = {
    endurance: {title:"Checkpoint · Timed run", sub:"Your goal distance, or 20 min for distance", tests:[
      {id:"run", name:"Timed run", how:"Your goal distance for time, or as far as you can in 20 minutes.", fields:[["min","minutes"],["km","km"]]},
      {id:"rhr", name:"Resting heart rate", how:"From your watch, or count 60 sec right after waking.", fields:[["v","bpm"]]}]},
    strength: {title:"Checkpoint · Max test", sub:"Test the goal lift", tests:[
      {id:"maxreps", name: /pull-up/.test(goal) ? "Max pull-ups" : /push-up/.test(goal) ? "Max push-ups" : "Max reps, main movement", how:"One all-out set with good form.", fields:[["v","reps"]]},
      {id:"rm3", name:"3-rep max, main lift", how:"Build up to a heavy set of 3 with good form. No grinding.", fields:[["kg","kg"]]}]},
    mobility: {title:"Checkpoint · Range test", sub:"Measure your range", tests:[
      {id:"reach", name:"Sit-and-reach", how:"Legs straight. + cm past your toes, − cm short of them.", fields:[["cm","cm"]]},
      {id:"squat", name:"Deep squat hold", how:"Heels down, chest up. Stop at 120 sec.", fields:[["v","sec"]]},
      {id:"split", name:"Split depth", how:"Hands to the floor to the groin, in cm. Lower is better.", fields:[["cm","cm"]]}]},
    health: {title:"Checkpoint · Engine test", sub:"See your numbers move", tests:[
      {id:"rhr", name:"Resting heart rate", how:"From your watch, or count 60 sec right after waking.", fields:[["v","bpm"]]},
      {id:"vo2", name:"VO2 max (watch)", how:"The estimate from your watch, if it has one.", fields:[["v","ml/kg/min"]]},
      {id:"walk", name:"20-minute distance", how:"As far as you can walk or jog in 20 minutes.", fields:[["km","km"]]}]},
    body: {title:"Checkpoint · Strength check", sub:"Performance, not the mirror", tests:[
      {id:"pushups", name:"Max push-ups", how:"One set, good form.", fields:[["v","reps"]]},
      {id:"goblet", name:"Goblet squat, 10 reps", how:"Heaviest dumbbell or kettlebell for 10 good reps.", fields:[["kg","kg"]]},
      {id:"plank", name:"Plank hold", how:"Stop when the form breaks.", fields:[["v","sec"]]}]},
    sport: {title:"Checkpoint · Athletic test", sub:"Jump, sprint, rounds", tests:[
      {id:"broad", name:"Broad jump", how:"Best of 3, in cm.", fields:[["v","cm"]]},
      {id:"rounds", name:"Rounds at pace", how:"How many hard rounds you finished at the same pace.", fields:[["v","rounds"]]},
      {id:"rhr", name:"Resting heart rate", how:"From your watch.", fields:[["v","bpm"]]}]},
  };

  /* ---------- build ---------- */
  const lib = LIB[cat], T = TESTLIB[cat];
  const dayIdx = ({2:[0,3], 3:[0,2,4], 4:[0,1,3,5], 5:[0,1,2,4,5], 6:[0,1,2,3,4,5]})[days];
  const typeOf = (ph, i, n) => /deload/i.test(ph.name) ? "deload" : (i === n - 1 && /test|event|check|retest/i.test(ph.name)) ? "test" : i === 0 ? "base" : /peak|sharpen|push|event/i.test(ph.name) ? "peak" : "build";
  const used = new Set();
  const addSess = (id, s) => { SESS[id] = {dur: (s.durMin || mins) + " min", ...s}; used.add(id); return id; };
  const mkWeek = (type, pi) => {
    const week = [null,null,null,null,null,null,null];
    let red = 0;
    dayIdx.forEach((d, k) => {
      if (type === "test" && k === 0){ week[d] = addSess(`g${pi}_test`, {title:T.title, kind:"test", sub:T.sub, note:"Test week: give it your best, but stop if anything hurts.", blocks:[warm(), blk("Test", M(.6), T.tests.map(t => ex(t.name, "1 attempt", t.how))), cool()]}); return; }
      let j = k % lib.length, s = lib[j](type === "test" || type === "deload" ? "base" : type);
      if (s.zoneRed){ if (red >= 2 || type === "test" || newbie && type === "base" && red >= 1){ s = lib[0]("base"); } else red++; }   // max 2 Zone Red a week (1 for beginners at first)
      if (type === "deload"){ s = {...s, title: s.title + " · easy week", note:"Deload: about 60 % of the usual work. Same quality, less of it.", durMin: Math.max(15, Math.round(mins * .6 / 5) * 5), timer: undefined}; }
      week[d] = addSess(`g${pi}_${k}`, s);
    });
    return week;
  };
  const phases = plan.phases || [];
  PHASES.length = 0;
  Object.keys(TEMPLATES).forEach(k => { if (k.startsWith("g")) delete TEMPLATES[k]; });
  let w = 1, di = 0, fi = 0;
  phases.forEach((ph, pi) => {
    const type = typeOf(ph, pi, phases.length), last = pi === phases.length - 1;
    const key = type === "deload" ? `d${++di}` : last && type === "test" ? "end" : `f${++fi}`;
    TEMPLATES["g" + pi] = mkWeek(type, pi);
    PHASES.push({key, w:[w, w + ph.weeks - 1], name: ph.name, tpl: "g" + pi, deload: type === "deload", focus: [ph.focus, ...(type === "deload" ? ["Recovery is where the progress lands."] : [])].filter(Boolean)});
    w += ph.weeks;
  });
  PLAN_WEEKS = w - 1;
  TEMPLATES.base = TEMPLATES.g0;                                  // the Plan page shows week 1 as the weekly template
  TESTS.length = 0; T.tests.forEach(t => TESTS.push(t));
  return true;
})();
/* demo fast-forward: seed sample training only now, so it follows the generated plan */
if (window.__demoNeedsSeed && typeof demoSeed === "function"){ demoSeed(); demoPut("swole:demo:seeded", true); window.__demoNeedsSeed = false; }

/* goal categories from sign-up; own-text goals land in "health" */
function OB_CAT(c){ return ["strength","endurance","mobility","health","body","sport"].includes(c) ? c : "health"; }
