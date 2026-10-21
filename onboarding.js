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
  {cat:"mobility",  label:"Mobility",  items:["Touch my toes","Deep squat, heels down","Full split"]},
  {cat:"health",    label:"Health",    items:["Raise my VO2 max","Lower my resting heart rate","Get back in shape after a break"]},
  {cat:"body",      label:"Body",      items:["Build muscle","Lose 5 kg","Feel strong in summer"]},
  {cat:"sport",     label:"Sport",     items:["Get ready for my first fight","Ski-season legs","A stronger padel game"]},
];
const OB_Q = [
  {id:"name", q:"First things first. What should I call you?", type:"text", ph:"Your name"},
  {id:"age", q:"How old are you?", type:"number", unit:"years", min:14, max:90},
  {id:"height", q:"How tall are you?", type:"number", unit:"cm", min:120, max:230, skip:true},
  {id:"weight", q:"And your weight? It stays private. Only you see it.", type:"number", unit:"kg", min:35, max:250, skip:true},
  {id:"history", q:"How much have you trained before?", type:"chips", options:["New to training","On and off","Regularly for 1+ year","Competing / very experienced"]},
  {id:"days", q:"How many days a week can you train?", type:"chips", options:["2","3","4","5","6"]},
  {id:"mins", q:"How long can a session be?", type:"chips", options:["20 min","30 min","45 min","60 min","90 min"]},
  {id:"where", q:"Where will you train? Pick all that fit.", type:"multi", options:["Gym","Home","Outdoors","Classes / club"]},
  {id:"injury", q:"Anything that hurts or holds you back?", type:"multi", options:["Nothing","Knee","Back","Shoulder","Something else"], none:"Nothing"},
  {id:"health", q:"Last one, for safety. Does any of this apply to you?", type:"multi", options:["Heart or blood pressure issues","Dizziness or fainting","Pregnant","Surgery in the last 6 months","None of these"], none:"None of these"},
];
const OB_LIB = {
  strength:  {weeks:8,  phases:[["Foundation",2,"Learn the lifts, build the base"],["Build",3,"Add load every week"],["Deload",1,"Half volume, let it land"],["Peak",1,"Heavy and sharp"],["Test",1,"Show what you built"]], sess:["Strength A","Strength B","Skill practice","Conditioning","Mobility","Strength C"]},
  endurance: {weeks:10, phases:[["Base",3,"Easy miles, lots of zone 2"],["Build",3,"Intervals join the party"],["Deload",1,"Shorter and easier"],["Sharpen",2,"Race pace and speed"],["Test",1,"The big day"]], sess:["Easy session (zone 2)","Intervals","Long session","Strength for engines","Mobility","Tempo"]},
  mobility:  {weeks:8,  phases:[["Open up",3,"Daily range, no forcing"],["Deepen",3,"Hold longer, load the end range"],["Deload",1,"Gentle flows"],["Test",1,"Measure your range"]], sess:["Mobility flow","Active flexibility","Strength in range","Easy cardio","Mobility flow B","Breath + stretch"]},
  health:    {weeks:12, phases:[["Base",4,"Zone 2 and full-body strength"],["Build",4,"Intervals once a week"],["Deload",1,"Easy week"],["Build 2",2,"Longer intervals"],["Retest",1,"See your numbers move"]], sess:["Zone 2","Full-body strength","Intervals","Walk + mobility","Zone 2 long","Strength B"]},
  body:      {weeks:12, phases:[["Foundation",4,"Technique and habits"],["Build",4,"More volume, more food"],["Deload",1,"Recover and reset"],["Push",2,"Hardest block"],["Check-in",1,"Photos, numbers, next block"]], sess:["Upper body","Lower body","Full body","Conditioning","Arms + core","Mobility"]},
  sport:     {weeks:10, phases:[["General prep",3,"Engine and strength"],["Specific prep",4,"Sport-like intervals"],["Deload",1,"Fresh legs"],["Peak",1,"Fast and sharp"],["Event",1,"Go time"]], sess:["Power","Sport conditioning","Strength","Skill + speed","Recovery","Long session"]},
};
const OB_DAYS = {2:[0,3], 3:[0,2,4], 4:[0,1,3,5], 5:[0,1,2,4,5], 6:[0,1,2,3,4,5]};
const OB_COACHES = [
  {id:"lek",  tag:"Muay Thai coach · calm", line:g => `${g}? Slow is smooth, smooth is fast. We start Monday.`},
  {id:"elin", tag:"Group fitness · hype",  line:g => `${g}?! Oh, we are so doing this. Let's goooo!`},
  {id:"dale", tag:"Recovery + sauna · warm", line:g => `${g}. Steady work, good sleep, sauna to finish. I've got you.`},
  {id:"fred", tag:"Padel coach · sharp", line:g => `${g}. Clear plan, clean reps, no wasted time.`},
];
const OB_STYLES = [
  {id:"anime", name:"Anime fighter", f:"saturate(1.7) contrast(1.15) brightness(1.05)"},
  {id:"comic", name:"Comic ink", f:"grayscale(1) contrast(2.4) brightness(1.1)"},
  {id:"clay", name:"Soft 3D", f:"blur(1.2px) saturate(1.35) brightness(1.08) contrast(.95)"},
  {id:"pixel", name:"Pixel", f:"saturate(1.4)", pixel:true},
];
/* AV + avatar builder: see "Swole builder" below */
let OB = null;
const obInit = () => ({step:"welcome", email:"", a:{}, qi:0, goal:null, plan:null, av:AV_DEFAULT(), avTab:"body", drawn:false, avMode:null, photos:[], style:"anime", coach:null, fighter:null});

function obPlan(){
  const g = OB.goal, A = OB.a, L = OB_LIB[g.cat];
  const newbie = A.history === "New to training";
  const days = Number(A.days) || 3, mins = parseInt(A.mins) || 45;
  const phases = L.phases.map(p => ({name:p[0], weeks:p[1], focus:p[2]}));
  if (newbie) phases[0].weeks += 2;
  const weeks = phases.reduce((s, p) => s + p.weeks, 0);
  const week1 = OB_DAYS[days].map((d, i) => ({day:DAY[d], what:L.sess[i % L.sess.length]}));
  const inj = (A.injury || []).filter(x => x !== "Nothing");
  const notes = [];
  if (newbie) notes.push("We start gentle: two extra weeks of foundation.");
  if (inj.length) notes.push(`We'll go easy on your ${inj.join(" and ").toLowerCase()} and build it up carefully.`);
  const flag = (A.health || []).some(x => x !== "None of these");
  return {title:g.label, weeks, days, mins, phases, week1, notes, flag};
}

/* ---------- roster ---------- */
const ROSTER = [
  {id:"swole", img:"media/cut-default.webp"},   // the original Swole art
  ...["ayo","mei","rafa","dev","freja","malik","nadia","sw8","sw9"].map(id => ({id, img:`media/roster/${id}/default.webp`})),   // ids are internal file keys only; Swoles have no names
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
    + "Calm, quietly confident expression. Flat solid red background (#FF3B2F), soft dark floor shadow. No props. Original character. No text, no logos, no watermark.";
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

/* quick sketch preview: head and shoulders */
function avatarSVG(v, size){
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
const OB_ORDER = ["welcome","email","code","goal","intake","building","plan","swole","coach","invite","done"];
function obRender(){
  let el = document.getElementById("onb");
  if (!el){ el = document.createElement("div"); el.id = "onb"; document.body.appendChild(el); }
  const st = OB.step, idx = OB_ORDER.indexOf(st.split(":")[0]);
  const prog = st === "welcome" ? "" : `<div class="obprog"><i style="width:${Math.round(idx / (OB_ORDER.length - 1) * 100)}%"></i></div>`;
  const back = ["welcome","building","done"].includes(st) ? "" : `<button class="obback" data-ob="back" aria-label="Back">‹</button>`;
  el.innerHTML = `<div class="obtop">${back}${prog}</div><div class="obbody">${obView(st)}</div>`;
  el.scrollTop = 0;
  if (st === "welcome") habitRotate(); else clearInterval(habitTimer);
  if (st === "intake"){ const log = el.querySelector(".oblog"); if (log) log.scrollTop = log.scrollHeight; const i = el.querySelector(".obin input"); if (i) setTimeout(() => i.focus(), 200); }
  if (st === "swole:drawing" && !OB.drawn) setTimeout(() => { if (OB.step === "swole:drawing"){ OB.drawn = true; obRender(); } }, 2600);
  if (st === "building") setTimeout(() => { if (OB.step === "building"){ OB.plan = obPlan(); OB.step = "plan"; obRender(); } }, 2400);
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
  }, 2400);
}
function obView(st){
  const name = OB.a.name ? esc(OB.a.name) : "";
  if (st === "welcome") return `
    <div class="obwel"><h1 class="obbig obhab">Steady habits beat <span class="obrot" aria-live="off">${HABIT_WORDS[0]}</span></h1>
    <p class="obp obsub">With a clear path, a coach and a Swole of your own, your goals are closer than you think.</p>
    <button class="pill wide" data-ob="go:email">Get started</button>
    <button class="oblink" data-ob="go:email">I already have an account</button></div>`;
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
  if (st === "goal") return `
    <h2 class="obh">What do you want to achieve?</h2><p class="obp">Pick one to start. You can add more goals later.</p>
    ${OB_GOALS.map(g => `<div class="obcat"><span>${esc(g.label)}</span><div class="obchips">${g.items.map(it => `<button class="obchip ${OB.goal && OB.goal.label === it ? "on" : ""}" data-ob="goal:${g.cat}|${esc(it)}">${esc(it)}</button>`).join("")}</div></div>`).join("")}
    <div class="obcat"><span>Something else</span><div class="obrow"><input class="obinput sm" id="obOwn" placeholder="E.g. carry my kids up a mountain"><button class="obchip" data-ob="own">Use</button></div></div>`;
  if (st === "intake"){
    const log = OB_Q.slice(0, OB.qi).map(q => `<div class="obmsg c">${esc(q.q.replace("{name}", name))}</div><div class="obmsg u">${esc(obAns(q))}</div>`).join("");
    const q = OB_Q[OB.qi];
    const intro = `<div class="obmsg c">${esc(OB.goal.label)}. Love it. A few quick questions and I'll build your plan.</div>`;
    let input = "";
    if (q.type === "text") input = `<div class="obin"><input class="obinput sm" id="obA" placeholder="${esc(q.ph)}" autocapitalize="words"><button class="obsend" data-ob="ans">→</button></div>`;
    if (q.type === "number") input = `<div class="obin"><input class="obinput sm" id="obA" type="number" inputmode="decimal" min="${q.min}" max="${q.max}" placeholder="${esc(q.unit)}"><button class="obsend" data-ob="ans">→</button></div>${q.skip ? `<button class="oblink" data-ob="skipq">Skip</button>` : ""}`;
    if (q.type === "chips") input = `<div class="obchips">${q.options.map(o => `<button class="obchip" data-ob="pick:${esc(o)}">${esc(o)}</button>`).join("")}</div>`;
    if (q.type === "multi"){ const sel = OB.a[q.id] || []; input = `<div class="obchips">${q.options.map(o => `<button class="obchip ${sel.includes(o) ? "on" : ""}" data-ob="tog:${esc(o)}">${esc(o)}</button>`).join("")}</div><button class="pill wide" data-ob="ans" ${sel.length ? "" : "disabled"}>Next</button>`; }
    return `<div class="obchathead"><span class="obav">S</span><b>Swole</b><span>Setting up your plan · ${OB.qi + 1}/${OB_Q.length}</span></div>
      <div class="oblog">${intro}${log}<div class="obmsg c">${esc(q.q)}</div></div>${input}`;
  }
  if (st === "building") return `
    <div class="obbuild"><img src="${POSE("squat")}" alt="" class="obfig sm"><h2 class="obh">Building your plan…</h2>
    <ul class="obsteps"><li>Reading your answers</li><li>Picking the right training blocks</li><li>Planning rest and retests</li></ul></div>`;
  if (st === "plan"){
    const P = OB.plan;
    return `<p class="obeye">Your plan${name ? `, ${name}` : ""}</p><h2 class="obbig sm">${esc(P.title)}</h2>
      <div class="obstats"><div><b>${P.weeks}</b><span>weeks</span></div><div><b>${P.days}×</b><span>a week</span></div><div><b>${P.mins}</b><span>min each</span></div></div>
      ${P.flag ? `<div class="obwarn"><b>Talk to a doctor first.</b> You ticked something on the safety list. Get a green light before you start. Your plan will wait for you.</div>` : ""}
      <div class="obphases">${P.phases.map(p => `<div class="obph" style="flex:${p.weeks}"><b>${esc(p.name)}</b><span>${p.weeks} wk</span></div>`).join("")}</div>
      <div class="obcard"><p class="obeye">Week 1</p>${P.week1.map(s => `<div class="obday"><i>${s.day}</i><span>${esc(s.what)}</span></div>`).join("")}</div>
      ${P.notes.map(n => `<p class="obnote">${esc(n)}</p>`).join("")}
      <p class="obnote">${OB_DEMO ? "Demo: the plan is built from a small library of training blocks. In the real app an AI tailors it within safe limits." : "Built from proven training blocks for your goal. Your coach adjusts it as you go."}</p>
      <button class="pill wide" data-ob="go:swole">Looks good</button>`;
  }
  if (st === "swole"){
    const F = OB.fighter && ROSTER.find(f => f.id === OB.fighter);
    return `
    <h2 class="obh">Pick your Swole</h2><p class="obp">Pick the one that feels most like you.</p>
    <div class="obroster">${ROSTER.map((f, i) => `<button class="obfighter ${OB.fighter === f.id ? "on" : ""}" data-ob="fighter:${f.id}" aria-pressed="${OB.fighter === f.id}" aria-label="Swole ${i + 1}"><img src="${f.img}" alt=""></button>`).join("")}</div>
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
      body: ctl("Shape", ch("frame", AV.frame)) + ctl("Build", ch("build", AV.build)) + ctl("Age", ch("age", AV.age)) + ctl("Skin", sw("skin", AV.skin, "Skin tone")),
      hair: ctl("Hair", ch("hairS", AV.hairS)) + ctl("Colour", sw("hairC", AV.hairC, "Hair colour")),
      face: ctl("Eyes", sw("eyes", AV.eyes, "Eye colour")) + ctl("Facial hair", ch("beard", AV.beard)) + ctl("Glasses", ch("glasses", AV.glasses)) + ctl("Earrings", ch("ears", AV.ears)),
    };
    return `<h2 class="obh">Build my Swole</h2>
      <div class="obavwrap"><div class="obavatar" id="obAv">${avatarSVG(v, 170)}</div><p class="obnote">A quick sketch. Your Swole is drawn in full when you're done.</p></div>
      <div class="obtabs" role="tablist">${AV_TABS.map(([id, n]) => `<button role="tab" class="obtab ${tab === id ? "on" : ""}" aria-selected="${tab === id}" data-ob="avtab:${id}">${n}</button>`).join("")}</div>
      <div class="obpane">${panes[tab]}</div>
      <button class="pill wide" data-ob="avdraw">Draw my Swole</button>`;
  }
  if (st === "swole:drawing"){
    const stand = ROSTER.find(f => f.id === OB.fighter) || ROSTER[0];
    if (!OB.drawn) return `<div class="obbuild"><div class="obavatar pulse">${avatarSVG(OB.av, 150)}</div><h2 class="obh">Drawing your Swole…</h2><p class="obp">Full body, four moods. It takes about a minute.</p></div>`;
    return `<h2 class="obh">Your Swole is on its way</h2>
      <p class="obp">We'll swap it in the moment it's ready. Until then you train with the closest ready-made Swole.</p>
      <div class="obpair"><figure><div class="obavatar">${avatarSVG(OB.av, 120)}</div><figcaption>Your Swole</figcaption></figure><span aria-hidden="true">→</span><figure><img src="${stand.img}" alt="Ready-made Swole"><figcaption>For now</figcaption></figure></div>
      ${OB_DEMO ? `<p class="obnote">Demo: nothing is sent. In the real app our server draws your Swole with the same recipe as the ready-made ones.</p>
      <details class="obprompt"><summary>Demo: drawing prompt</summary><p id="obPrompt">${esc(swolePrompt(OB.av))}</p><button class="oblink" data-ob="copyprompt">Copy prompt</button></details>` : ""}
      <button class="pill wide" data-ob="go:coach">Continue</button>`;
  }
  if (st === "coach") return `
    <h2 class="obh">Pick your coach</h2><p class="obp">They follow you on your path, cheer you on and nudge you when you slip.</p>
    ${OB_COACHES.map(c => `<button class="obcoach ${OB.coach === c.id ? "on" : ""}" data-ob="coach:${c.id}">
      <img src="${castImg(c.id)}" alt=""><div><b>${esc(CAST[c.id].name)}</b><span>${esc(c.tag)}</span><p>“${esc(c.line(OB.goal.label))}”</p></div></button>`).join("")}
    <button class="pill wide" data-ob="go:invite" ${OB.coach ? "" : "disabled"}>Train with ${OB.coach ? esc(CAST[OB.coach].name) : "…"}</button>`;
  if (st === "invite") return `
    <h2 class="obh">Better with a buddy</h2><p class="obp">People who train with a friend keep going. Invite one and you both get the Buddy wraps when they finish their first week.</p>
    <div class="obreward"><img src="media/items/wraps-dragon.webp" alt="Dragon wraps"><span>Buddy reward · Rare</span></div>
    <button class="pill wide" data-ob="share">Invite a buddy</button>
    <button class="oblink" data-ob="go:done">Not now</button>`;
  if (st === "done"){
    const FD = OB.avMode === "fighter" && ROSTER.find(f => f.id === OB.fighter);
    const av = FD ? `<img src="${FD.img}" alt="Your Swole" class="obfig sm">` : OB.avMode === "build" ? `<div class="obavatar">${avatarSVG(OB.av, 160)}</div>` : OB.avMode === "photo" && OB.photos[0] ? `<img class="obprev round" src="${OB.photos[0]}" style="filter:${OB_STYLES.find(s => s.id === OB.style).f}" alt="">` : `<img src="${POSE("flex")}" alt="" class="obfig sm">`;
    return `<h1 class="obbig">You're in${name ? `, ${name}` : ""}.</h1>${av}
      <div class="obsum"><span>${esc(OB.goal.label)}</span><span>${OB.plan.weeks} weeks · ${OB.plan.days}× a week</span><span>Coach: ${esc(CAST[OB.coach || "lek"].name)}</span></div>
      <button class="pill wide" data-ob="finish">Start week 1</button>
      ${OB_DEMO ? `<button class="oblink" data-ob="finishff">Demo: fast-forward 4 weeks</button>` : ""}`;
  }
  return "";
}
function obAns(q){ const v = OB.a[q.id]; if (v == null || v === "") return "Skipped"; return Array.isArray(v) ? v.join(", ") : q.unit ? `${v} ${q.unit}` : String(v); }
function obPix(){
  const c = document.getElementById("obPix"); if (!c || !OB.photos[0]) return;
  const img = new Image(); img.onload = () => { const w = 36, h = Math.round(w * img.height / img.width); const t = document.createElement("canvas"); t.width = w; t.height = h; t.getContext("2d").drawImage(img, 0, 0, w, h); c.width = w; c.height = h; c.getContext("2d").drawImage(t, 0, 0); }; img.src = OB.photos[0];
}

/* ---------- actions ---------- */
function obGo(step){ if (step === "swole:build" && !OB.avTouched && OB.a.age) OB.av.age = Math.max(0, Math.min(4, Math.floor((OB.a.age - 20) / 10))); OB.step = step; obRender(); if (step === "swole:photo") obPix(); }
function obBack(){
  const s = OB.step;
  if (s === "intake" && OB.qi > 0){ OB.qi--; obRender(); return; }
  const prev = {email:"welcome", code:"email", goal:"code", intake:"goal", plan:"intake", swole:"plan", "swole:photo":"swole", "swole:build":"swole", "swole:drawing":"swole:build", coach:"swole", invite:"coach"}[s];
  if (!OB_DEMO && SB.session && (prev === "code" || prev === "email")) return;
  if (prev){ if (prev === "intake") OB.qi = OB_Q.length - 1; obGo(prev); }
}
function obNextQ(){ OB.qi++; if (OB.qi >= OB_Q.length){ obGo("building"); } else obRender(); }
function obFinish(ff){
  const P = {name: OB.a.name || "", email: OB.email, goal: OB.goal, program: OB.plan.title, coach: OB.coach || "lek", answers: OB.a, plan: OB.plan, avatar: OB.avMode === "build" ? OB.av : null, avatarPrompt: OB.avMode === "build" ? swolePrompt(OB.av) : null, avatarStatus: OB.avMode === "build" ? "drawing" : null, style: OB.avMode === "photo" ? OB.style : null, fighter: (OB.avMode === "fighter" || OB.avMode === "build") ? OB.fighter : null};
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
  P.onboarded = true; P.start = obStartDate(); P.createdAt = new Date().toISOString(); P.v = 1;
  await save("settings", "profile", P);
  LS.set("swole:introSeen", false);
  try { await Promise.race([sbFlush(), new Promise(r => setTimeout(r, 5000))]); } catch(e){}
  location.reload();
}
document.addEventListener("click", async e => {
  const b = e.target.closest("#onb [data-ob]"); if (!b) return;
  const a = b.dataset.ob;
  if (a === "back") return obBack();
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
    if (OB_DEMO) return obGo("goal");
    b.disabled = true; b.textContent = "Checking…";
    try { await sbVerify(OB.email, v); } catch(err){ b.disabled = false; b.textContent = "Continue"; toast(sbErrText(err)); return; }
    const p = S.settings && S.settings.profile;
    if (p && p.onboarded){ toast("Welcome back."); setTimeout(() => location.reload(), 600); return; }   // an existing member on a new phone
    return obGo("goal");
  }
  if (a.startsWith("goal:")){ const [cat, label] = a.slice(5).split("|"); OB.goal = {cat, label}; OB.qi = 0; return obGo("intake"); }
  if (a === "own"){ const v = (document.getElementById("obOwn").value || "").trim(); if (!v){ toast("Write your goal first."); return; } OB.goal = {cat:"health", label:v}; OB.qi = 0; return obGo("intake"); }
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
  if (a === "share"){
    const data = {title: "Swole", text: `I'm training for "${OB.goal.label}" on Swole. Join me and we both get the Buddy wraps.`, url: location.origin + location.pathname};
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
if (OB_DEMO){ if (!demoGet("swole:demo:onboarded")) startOnboarding(); }
else {
  /* real app: someone with no profile and no training on this phone is new → sign-up.
     Mathias's own account has training data, so he never sees it. */
  const hasData = Object.keys(S.sessions || {}).length || Object.keys(S.checkins || {}).length;
  if (!(S.settings && S.settings.profile && S.settings.profile.onboarded) && !hasData) startOnboarding(SB.session ? "goal" : "welcome");
}
