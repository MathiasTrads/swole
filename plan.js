/* ============ DATES ============ */
const START = window.SWOLE_DEMO
  ? (() => { const d = new Date(); d.setHours(0,0,0,0); let ff = false; try { ff = JSON.parse(localStorage.getItem("swole:demo:ff")) === true; } catch(e){}
      const dw = (d.getDay()+6)%7;
      d.setDate(ff ? d.getDate() - dw - 28 : d.getDate() + (7 - dw) % 7); return d; })()   // demo: a new member starts next Monday; fast-forward puts you in week 5
  : new Date(2026, 9, 19);
const DAY = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];
const DAYL = ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"];
const MON = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const MONL = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const iso = d => d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0");
const parse = s => { const [y,m,d] = s.split("-").map(Number); return new Date(y,m-1,d); };
const addDays = (d,n) => { const x = new Date(d.getFullYear(), d.getMonth(), d.getDate()); x.setDate(x.getDate()+n); return x; };
const dow = d => (d.getDay()+6)%7;
const daysBetween = (a,b) => Math.round((new Date(b.getFullYear(),b.getMonth(),b.getDate()) - new Date(a.getFullYear(),a.getMonth(),a.getDate()))/864e5);
const weekNo = d => Math.floor(daysBetween(START,d)/7)+1;
const weekStart = n => addDays(START,(n-1)*7);
const fmt = d => MON[d.getMonth()]+" "+d.getDate();
const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));

/* ============ PLAN ============ */
const PHASES = [
  {key:"test", w:[1,1],  name:"Test week", tpl:"test", focus:["Find your baseline: power, strength, zone red, mobility","Find your real max heart rate (watch on for morning sessions)"]},
  {key:"f1",   w:[2,5],  name:"Foundation", tpl:"base", focus:["Knee capacity: isometrics before jumps","Base strength + low-volume jumps","Aerobic engine: 1 × zone 2 per week","Alactic sprints (10 sec): power without fatigue"]},
  {key:"d1",   w:[6,6],  name:"Deload", tpl:"base", deload:true, focus:["50–60 % volume","No max sprints. Let the body catch up."]},
  {key:"f2",   w:[7,9],  name:"Power", tpl:"base", focus:["Heavier jumps and throws","Contrast: heavy lift → explosive move","Longer zone red intervals"]},
  {key:"jul",  w:[10,11],name:"Christmas · maintain", tpl:"jul", focus:["3 short sessions per week","Keep the engine and strength ticking. No PR hunting."]},
  {key:"rt1",  w:[12,12],name:"Retest", tpl:"test", focus:["Same tests as week 1","The plan is adjusted to your numbers"]},
  {key:"f3",   w:[13,16],name:"Explosive + zone red", tpl:"base", focus:["Max velocity: plyometrics and throws","Repeated sprints with short rest","Fight-specific rounds on the air bike"]},
  {key:"d2",   w:[17,17],name:"Deload", tpl:"base", deload:true, focus:["50–60 % volume","Mobility focus"]},
  {key:"f4",   w:[18,21],name:"Gas tank", tpl:"base", focus:["Long stretches in zone 4–5","Recovery between rounds (HR drop)","Maintain power"]},
  {key:"d3",   w:[22,22],name:"Deload + retest", tpl:"test", focus:["Easy week, tests late in the week"]},
  {key:"f5",   w:[23,25],name:"Peak", tpl:"base", focus:["Low volume, high quality","Everything at fight pace","You should feel fast"]},
  {key:"end",  w:[26,26],name:"Final test", tpl:"test", focus:["See how far you've come","Swole builds the next block"]},
];
const phaseOf = w => PHASES.find(p => w >= p.w[0] && w <= p.w[1]);

const TEMPLATES = {
  base: ["kraftA","mobil","mobil","kraftB","zonered",null,"zone2"],
  test: ["testA","mobil","testMob",null,"testB",null,"testC"],
  jul:  ["kraftA",null,"mobil",null,"zonered",null,"zone2"],
};
const MT = ["mt","mtHard","mtHard","mt",null,"mtSelf",null];

const SESS = {
  testA:{title:"Test A · Power & strength", kind:"test", dur:"60 min", sub:"Broad jump, throw, trap bar, pull-ups",
    note:"Watch on. Enter your numbers under Tests while you're in the gym.",
    blocks:[
      {name:"Warm-up", t:"12 min", ex:[
        ["Air bike, easy","4 min",""],["90/90 hip switches","2 × 8",""],["World's greatest stretch","3 / side",""],
        ["Glute bridge","2 × 10",""],["Low pogo hops","2 × 10","Stop if the knee complains.","jump"],["Warm-up jumps","3 × 70 %","","jump"]]},
      {name:"Test 1 · Broad jump", t:"8 min", ex:[["Two-foot, from standing","3 attempts","2 min rest. Measure to the rearmost heel. Log the best."]]},
      {name:"Test 2 · Rotational throw", t:"8 min", ex:[["4 kg med ball, for distance","3 / side","Needs space. No space? Skip it."]]},
      {name:"Test 3 · Trap bar deadlift", t:"15 min", ex:[["Warm-up sets","10 / 5 / 3 / 1","About 40 / 60 / 75 / 85 % of your guessed max."],["Test set","3–5 reps","Heavy, one rep in reserve. No grinding, no rounded back."]]},
      {name:"Test 4 · Pull-ups", t:"5 min", ex:[["Max reps","1 set","From dead hang, chin over the bar. No kipping."]]},
      {name:"Finish", t:"5 min", ex:[["Spanish squat, isometric","3 × 30 sec","Band behind the knees, lean back. Good for the kneecap."]]}]},
  testMob:{title:"Test · Mobility", kind:"test", dur:"45 min", sub:"Ankle, hip, squat + easy zone 2",
    note:"Hard Muay Thai tonight. Keep it easy.",
    blocks:[
      {name:"Mobility tests", t:"20 min", ex:[
        ["Knee-to-wall","L + R","Foot flat, knee touches the wall. Measure toe-to-wall in cm."],
        ["90/90 hip rotation","L + R, 1–5","1 = can't sit upright, 5 = upright and lean forward with no hands."],
        ["Deep squat hold","max sec","Heels down, chest up. Stop at 120 sec."]]},
      {name:"Zone 2", t:"20 min", ex:[["Bike, HR 112–130","20 min","Easy. You should be able to talk."]]}]},
  testB:{title:"Test B · Zone red", kind:"test", dur:"45 min", sub:"6 × 15 sec all-out + HR recovery",
    note:"Watch on with heart rate. This is your max HR test.",
    timer:[{label:"Sprint",reps:6,work:15,rest:45}],
    blocks:[
      {name:"Warm-up", t:"12 min", ex:[["Air bike, building","10 min",""],["Accelerations","2 × 6 sec","Hard, but not max."]]},
      {name:"Test · 6 × 15 sec", t:"6 min", ex:[["All-out sprint","6 × 15 sec","45 sec very easy between. Log calories for each sprint."],["Max HR","log","The highest number the watch shows."]]},
      {name:"HR recovery", t:"1 min", ex:[["Stop completely after the last sprint","60 sec","Log HR at 0 and 60 sec. The difference is your HR recovery."]]},
      {name:"Cool-down", t:"10 min", ex:[["Easy bike + stretching","10 min",""]]}]},
  testC:{title:"Test C · Aerobic base", kind:"test", dur:"40 min", sub:"30 min with HR locked at 125",
    note:"Same machine every time so the numbers compare.",
    blocks:[
      {name:"Warm-up", t:"5 min", ex:[["Easy bike/row","5 min",""]]},
      {name:"Test", t:"30 min", ex:[["Bike or row, HR 125","30 min","Adjust pace to keep HR at 123–127. Log average watts or distance."]]},
      {name:"Cool-down", t:"5 min", ex:[["Easy","5 min",""]]}]},
  kraftA:{title:"Power A · Legs & jumps", kind:"strength", dur:"60 min", sub:"Isometrics → jumps → heavy",
    blocks:[
      {name:"Warm-up", t:"10 min", ex:[["Air bike","3 min",""],["90/90 hip switches","2 × 8",""],["Couch stretch","45 sec / side",""],["Pogo hops","2 × 10","Stiff ankles, quick contacts.","jump"]]},
      {name:"Knee primer", t:"5 min", ex:[["Spanish squat, isometric","3 × 45 sec","About 70 % effort. Calms kneecap pain and preps the knee."]]},
      {name:"Jumps", t:"8 min", ex:[["Box jump, step down","4 × 3","Explosive up, silent landing. 60–90 sec rest.","jump"]]},
      {name:"Strength", t:"30 min", ex:[["Trap bar deadlift","4 × 4","About 80 %, RPE 7–8. 2–3 min rest. Fast up."],["Bulgarian split squat","3 × 6 / side","3 sec down, explosive up."],["KB Romanian deadlift","3 × 8",""]]},
      {name:"Core & shins", t:"7 min", ex:[["Pallof press","3 × 10 / side",""],["Tibialis raise","2 × 15","Tougher shins and knees."]]}]},
  kraftB:{title:"Power B · Upper body & rotation", kind:"strength", dur:"60 min", sub:"Throws, press, pull, neck",
    blocks:[
      {name:"Warm-up", t:"8 min", ex:[["Rower","3 min",""],["Band pull-apart","2 × 15",""],["T-spine open book","8 / side",""],["Shoulder CARs","5 / side",""]]},
      {name:"Power", t:"12 min", ex:[["Med ball rotational throw to wall","4 × 4 / side","Power comes from the hip. Think roundhouse."],["Med ball slam","3 × 5","Max speed every rep."]]},
      {name:"Strength", t:"25 min", ex:[["Push press","4 × 4","Explosive dip and drive."],["Weighted pull-ups","4 × 5","Controlled lowering."],["Dumbbell bench press","3 × 6","Fast up, 2 sec down."]]},
      {name:"Fight-specific", t:"12 min", ex:[["Heavy KB swing","3 × 10",""],["Neck isometrics","2 × 20 sec × 4 directions","Hand against head. Ready for the clinch."],["Farmer carry","3 × 30 m",""]]}]},
  zonered:{title:"Zone red · Intervals", kind:"conditioning", dur:"45 min", sub:"8 × 10 sec + 4 × 30 sec, air bike",
    note:"Watch on. Log your max HR afterwards.",
    timer:[{label:"Block 1 · All-out",reps:8,work:10,rest:50},{label:"Rest",reps:1,work:0,rest:240},{label:"Block 2 · Hard",reps:4,work:30,rest:90}],
    blocks:[
      {name:"Warm-up", t:"10 min", ex:[["Air bike, building","8 min",""],["Accelerations","2 × 6 sec",""]]},
      {name:"Block 1 · Alactic power", t:"8 min", ex:[["All-out","8 × 10 sec","50 sec easy. Max watts from the first second. The long rest is the point.","sprint"]]},
      {name:"Rest", t:"4 min", ex:[["Easy spin","4 min",""]]},
      {name:"Block 2 · Glycolytic", t:"8 min", ex:[["Hard, about 90 %","4 × 30 sec","90 sec easy. Hold the same watts in all four.","sprint"]]},
      {name:"Cool-down", t:"5 min", ex:[["Easy + log max HR","5 min",""]]}]},
  zone2:{title:"Zone 2 · The engine", kind:"conditioning", dur:"60 min", sub:"HR 112–130, easy",
    note:"Use the watch. Bike, rower or incline treadmill walk. Don't run on pavement; spare the knee.",
    blocks:[
      {name:"Zone 2", t:"45–50 min", ex:[["Bike / row / incline walk","45–50 min","HR 112–130 the whole way. You should be able to speak in full sentences."]]},
      {name:"Mobility", t:"10 min", ex:[["Couch stretch","60 sec / side",""],["90/90 hip switches","2 × 8",""],["Knee-to-wall rocks","2 × 10 / side",""]]}]},
  mobil:{title:"Mobility · optional", kind:"mobility", dur:"15 min", sub:"Only if you're stiff",
    note:"Optional. Do it if you're stiff. Skip it if you're tired.",
    blocks:[{name:"Flow", t:"15 min", ex:[["Knee-to-wall rocks","2 × 10 / side",""],["90/90 hip switches","2 × 8",""],["Couch stretch","60 sec / side",""],["Spanish squat, isometric","2 × 30 sec",""],["T-spine open book","8 / side",""]]}]},
  mt:{title:"Muay Thai · Class", kind:"mt", dur:"90 min", sub:"Technique, pads, light sparring", blocks:[]},
  mtHard:{title:"Muay Thai · Hard class", kind:"mt", dur:"90 min", sub:"Sparring / high intensity",
    note:"Eat a meal with carbs 2–3 hours before.", blocks:[]},
  mtSelf:{title:"Muay Thai · Solo", kind:"mt", dur:"60 min", sub:"Bag and shadow",
    note:"E.g. 6 × 3 min rounds, 1 min rest. Technique before pace.", blocks:[]},
};
const KIND_LABEL = {strength:"Strength", conditioning:"Conditioning", mobility:"Mobility", test:"Test", mt:"Muay Thai"};

function plannedFor(d){
  const out = [], w = weekNo(d), dw = dow(d);
  if (w >= 1 && w <= 26){ const ph = phaseOf(w); const am = TEMPLATES[ph.tpl][dw]; if (am) out.push({slot:"am", id:am}); }
  if (MT[dw]) out.push({slot:"pm", id:MT[dw]});
  return out;
}
const slotTime = it => it.slot === "am" ? "Morning" : (it.id === "mtSelf" ? "Flexible" : "18:00");

const TESTS = [
  {id:"broad", name:"Broad jump", how:"Best of 3, in cm.", fields:[["v","cm"]]},
  {id:"mbthrow", name:"Rotational throw 4 kg", how:"Best per side, in metres. Skip if there's no space.", fields:[["l","L (m)"],["r","R (m)"]]},
  {id:"trapbar", name:"Trap bar deadlift", how:"Heaviest set of 3–5 reps.", fields:[["kg","kg"],["reps","reps"]], calc:v => v.kg && v.reps ? "≈ "+Math.round(v.kg*(1+v.reps/30))+" kg 1RM" : ""},
  {id:"pullups", name:"Max pull-ups", how:"One set, dead hang.", fields:[["v","reps"]]},
  {id:"sprint", name:"6 × 15 sec air bike", how:"Calories: first sprint, last sprint and total.", fields:[["first","1st (kcal)"],["last","6th (kcal)"],["total","Total"]], calc:v => v.first && v.last ? "Drop-off: "+Math.round((1-v.last/v.first)*100)+" %" : ""},
  {id:"maxhr", name:"Max heart rate", how:"Highest HR seen on the watch.", fields:[["v","bpm"]], calc:v => v.v ? "Zone 5 starts at about "+Math.round(v.v*.9)+" bpm" : ""},
  {id:"hrr", name:"HR recovery 60 sec", how:"HR at stop minus HR after 60 sec.", fields:[["v","beats"]]},
  {id:"z2", name:"Aerobic test, HR 125", how:"Average watts or distance over 30 min.", fields:[["v","watts / m"]]},
  {id:"ktw", name:"Knee-to-wall", how:"Toe to wall in cm.", fields:[["l","L (cm)"],["r","R (cm)"]]},
  {id:"hip", name:"90/90 hip", how:"Score 1–5.", fields:[["l","L"],["r","R"]]},
  {id:"squat", name:"Deep squat hold", how:"Seconds, max 120.", fields:[["v","sec"]]},
  {id:"weight", name:"Body weight", how:"Monday morning, before breakfast.", fields:[["v","kg"]]},
];

