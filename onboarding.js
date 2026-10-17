/* ============ ONBOARDING (demo prototype) ============
   New member journey: welcome → email → code → goal → AI intake (scripted)
   → plan reveal → create your Swole (photos / build / later) → pick a coach
   → invite a buddy → done. Everything is local; nothing is sent anywhere. */
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
const AV = {
  skin:["#F6D7C3","#EDC2A2","#D9A07A","#B97A55","#8D5A3B","#5E3A26"],
  hairC:["#141010","#4A2E1E","#8A5A2B","#D9B36C","#B8461E","#C9C4BF"],
  eyes:["#4A2E1E","#2F6FA8","#3E7D4F","#7A7A7A","#1C1C1C"],
  styles:["Buzz","Short","Long","Bun","Curly","Bald"],
  builds:["Slim","Athletic","Strong"],
};
let OB = null;
const obInit = () => ({step:"welcome", email:"", a:{}, qi:0, goal:null, plan:null, av:{skin:2, hairC:0, hairS:0, eyes:0, nose:6, build:1, height:180}, avMode:null, photos:[], style:"anime", coach:null});

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

/* ---------- avatar ---------- */
function avatarSVG(v, size){
  const s = AV.skin[v.skin], h = AV.hairC[v.hairC], e = AV.eyes[v.eyes], st = AV.styles[v.hairS], K = "#141010";
  const sw = [58, 70, 84][v.build], n = v.nose;
  const hair = {
    Buzz: `<path d="M60 84 Q62 42 100 40 Q138 42 140 84 Q128 62 100 60 Q72 62 60 84Z" fill="${h}" opacity=".85"/>`,
    Short:`<path d="M57 90 Q54 38 100 34 Q148 36 143 90 Q138 66 118 60 Q104 72 78 66 Q64 72 57 90Z" fill="${h}" stroke="${K}" stroke-width="2.5"/>`,
    Long: `<path d="M56 96 Q50 36 100 32 Q150 36 144 96 L150 170 Q128 178 132 120 Q126 70 100 64 Q74 70 68 120 Q72 178 50 170Z" fill="${h}" stroke="${K}" stroke-width="2.5"/>`,
    Bun:  `<circle cx="100" cy="26" r="17" fill="${h}" stroke="${K}" stroke-width="2.5"/><path d="M58 88 Q56 40 100 38 Q144 40 142 88 Q132 62 100 60 Q68 62 58 88Z" fill="${h}" stroke="${K}" stroke-width="2.5"/>`,
    Curly:`${[[62,70],[72,50],[90,40],[110,40],[128,50],[138,70],[66,90],[134,90]].map(([x,y]) => `<circle cx="${x}" cy="${y}" r="15" fill="${h}" stroke="${K}" stroke-width="2.5"/>`).join("")}`,
    Bald: ``,
  }[st];
  const back = st === "Long" ? hair : "", front = st === "Long" ? "" : hair;
  return `<svg viewBox="0 0 200 220" width="${size}" height="${size * 1.1}" role="img" aria-label="Your Swole">
    ${back}
    <path d="M${100 - sw} 220 Q${100 - sw} 160 100 156 Q${100 + sw} 160 ${100 + sw} 220Z" fill="#141010"/>
    <path d="M${100 - sw + 10} 220 Q${100 - sw + 8} 176 86 166 L114 166 Q${100 + sw - 8} 176 ${100 + sw - 10} 220" fill="none" stroke="#FF3B2F" stroke-width="4"/>
    <rect x="88" y="128" width="24" height="34" rx="8" fill="${s}" stroke="${K}" stroke-width="2.5"/>
    <ellipse cx="60" cy="98" rx="8" ry="12" fill="${s}" stroke="${K}" stroke-width="2.5"/><ellipse cx="140" cy="98" rx="8" ry="12" fill="${s}" stroke="${K}" stroke-width="2.5"/>
    <ellipse cx="100" cy="92" rx="40" ry="48" fill="${s}" stroke="${K}" stroke-width="3"/>
    ${front}
    <path d="M78 82 L94 84" stroke="${st === "Bald" ? K : h}" stroke-width="4" stroke-linecap="round"/><path d="M122 82 L106 84" stroke="${st === "Bald" ? K : h}" stroke-width="4" stroke-linecap="round"/>
    <ellipse cx="86" cy="95" rx="7.5" ry="5.5" fill="#fff" stroke="${K}" stroke-width="2"/><ellipse cx="114" cy="95" rx="7.5" ry="5.5" fill="#fff" stroke="${K}" stroke-width="2"/>
    <circle cx="86" cy="95" r="3.6" fill="${e}"/><circle cx="114" cy="95" r="3.6" fill="${e}"/>
    <path d="M100 100 L${100 - n} 116 Q100 120 ${100 + n} 116" fill="none" stroke="${K}" stroke-width="2.5" stroke-linejoin="round"/>
    <path d="M88 126 Q100 132 112 125" fill="none" stroke="${K}" stroke-width="3" stroke-linecap="round"/>
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
  if (st === "intake"){ const log = el.querySelector(".oblog"); if (log) log.scrollTop = log.scrollHeight; const i = el.querySelector(".obin input"); if (i) setTimeout(() => i.focus(), 200); }
  if (st === "building") setTimeout(() => { if (OB.step === "building"){ OB.plan = obPlan(); OB.step = "plan"; obRender(); } }, 2400);
}
function obView(st){
  const name = OB.a.name ? esc(OB.a.name) : "";
  if (st === "welcome") return `
    <div class="obwel"><h1 class="obbig">Grow your Swole.</h1>
    <img src="${POSE("arms")}" alt="" class="obfig">
    <p class="obp">Tell us what you want to achieve. Get a plan, a coach and a character that grows every time you train.</p>
    <button class="pill wide" data-ob="go:email">Get started</button>
    <button class="oblink" data-ob="go:email">I already have an account</button></div>`;
  if (st === "email") return `
    <h2 class="obh">What's your email?</h2><p class="obp">We'll send you a code. No password to remember.</p>
    <input class="obinput" id="obEmail" type="email" inputmode="email" autocomplete="email" autocapitalize="off" placeholder="you@example.com" value="${esc(OB.email)}">
    <button class="pill wide" data-ob="email">Send me a code</button>`;
  if (st === "code") return `
    <h2 class="obh">Check your inbox</h2><p class="obp">We sent a code to <b>${esc(OB.email)}</b>.</p>
    <input class="obinput obcode" id="obCode" inputmode="numeric" autocomplete="one-time-code" maxlength="8" placeholder="123456">
    <p class="obnote">Demo: any 6 digits work.</p>
    <button class="pill wide" data-ob="code">Continue</button>`;
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
      <p class="obnote">Demo: the plan is built from a small library of training blocks. In the real app an AI tailors it within safe limits.</p>
      <button class="pill wide" data-ob="go:swole">Looks good</button>`;
  }
  if (st === "swole") return `
    <h2 class="obh">Create your Swole</h2><p class="obp">Your character starts where you are today and grows every time you train.</p>
    <button class="obopt" data-ob="go:swole:photo"><b>From photos</b><span>Take or pick 1–3 photos and choose a style.</span></button>
    <button class="obopt" data-ob="go:swole:build"><b>Build it yourself</b><span>Skin, hair, eyes, build. Like making a Memoji.</span></button>
    <button class="oblink" data-ob="go:coach">I'll do it later</button>`;
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
    const v = OB.av;
    const sw = (k, arr) => `<div class="obsw">${arr.map((c, i) => `<button class="${v[k] === i ? "on" : ""}" style="background:${c}" data-ob="av:${k}:${i}" aria-label="Colour ${i + 1}"></button>`).join("")}</div>`;
    const ch = (k, arr) => `<div class="obchips">${arr.map((c, i) => `<button class="obchip ${v[k] === i ? "on" : ""}" data-ob="av:${k}:${i}">${c}</button>`).join("")}</div>`;
    return `<h2 class="obh">Build your Swole</h2>
      <div class="obavatar" id="obAv">${avatarSVG(v, 180)}</div>
      <div class="obctl"><span>Skin</span>${sw("skin", AV.skin)}</div>
      <div class="obctl"><span>Hair</span>${ch("hairS", AV.styles)}${sw("hairC", AV.hairC)}</div>
      <div class="obctl"><span>Eyes</span>${sw("eyes", AV.eyes)}</div>
      <div class="obctl"><span>Nose</span><input type="range" min="3" max="12" value="${v.nose}" data-obr="nose"></div>
      <div class="obctl"><span>Build</span>${ch("build", AV.builds)}</div>
      <div class="obctl"><span>Height · <b id="obH">${v.height} cm</b></span><input type="range" min="150" max="210" value="${v.height}" data-obr="height"></div>
      <button class="pill wide" data-ob="avbuild">This is me</button>`;
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
    const av = OB.avMode === "build" ? `<div class="obavatar">${avatarSVG(OB.av, 160)}</div>` : OB.avMode === "photo" && OB.photos[0] ? `<img class="obprev round" src="${OB.photos[0]}" style="filter:${OB_STYLES.find(s => s.id === OB.style).f}" alt="">` : `<img src="${POSE("flex")}" alt="" class="obfig sm">`;
    return `<h1 class="obbig">You're in${name ? `, ${name}` : ""}.</h1>${av}
      <div class="obsum"><span>${esc(OB.goal.label)}</span><span>${OB.plan.weeks} weeks · ${OB.plan.days}× a week</span><span>Coach: ${esc(CAST[OB.coach || "lek"].name)}</span></div>
      <button class="pill wide" data-ob="finish">Start week 1</button>
      <button class="oblink" data-ob="finishff">Demo: fast-forward 4 weeks</button>`;
  }
  return "";
}
function obAns(q){ const v = OB.a[q.id]; if (v == null || v === "") return "Skipped"; return Array.isArray(v) ? v.join(", ") : q.unit ? `${v} ${q.unit}` : String(v); }
function obPix(){
  const c = document.getElementById("obPix"); if (!c || !OB.photos[0]) return;
  const img = new Image(); img.onload = () => { const w = 36, h = Math.round(w * img.height / img.width); const t = document.createElement("canvas"); t.width = w; t.height = h; t.getContext("2d").drawImage(img, 0, 0, w, h); c.width = w; c.height = h; c.getContext("2d").drawImage(t, 0, 0); }; img.src = OB.photos[0];
}

/* ---------- actions ---------- */
function obGo(step){ OB.step = step; obRender(); if (step === "swole:photo") obPix(); }
function obBack(){
  const s = OB.step;
  if (s === "intake" && OB.qi > 0){ OB.qi--; obRender(); return; }
  const prev = {email:"welcome", code:"email", goal:"code", intake:"goal", plan:"intake", swole:"plan", "swole:photo":"swole", "swole:build":"swole", coach:"swole", invite:"coach"}[s];
  if (prev){ if (prev === "intake") OB.qi = OB_Q.length - 1; obGo(prev); }
}
function obNextQ(){ OB.qi++; if (OB.qi >= OB_Q.length){ obGo("building"); } else obRender(); }
function obFinish(ff){
  const P = {name: OB.a.name || "", email: OB.email, goal: OB.goal, program: OB.plan.title, coach: OB.coach || "lek", answers: OB.a, plan: OB.plan, avatar: OB.avMode === "build" ? OB.av : null, style: OB.avMode === "photo" ? OB.style : null};
  demoPut("swole:demo:profile", P);
  demoPut("swole:demo:onboarded", true);
  demoPut("swole:introSeen", false);
  if (ff) demoPut("swole:demo:ff", true);
  location.reload();
}
document.addEventListener("click", async e => {
  const b = e.target.closest("#onb [data-ob]"); if (!b) return;
  const a = b.dataset.ob;
  if (a === "back") return obBack();
  if (a.startsWith("go:")) return obGo(a.slice(3));
  if (a === "email"){ const v = (document.getElementById("obEmail").value || "").trim(); if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v)){ toast("That doesn't look like an email."); return; } OB.email = v; return obGo("code"); }
  if (a === "code"){ const v = (document.getElementById("obCode").value || "").replace(/\D/g, ""); if (v.length < 6){ toast("Type the 6-digit code."); return; } return obGo("goal"); }
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
  if (a.startsWith("av:")){ const [, k, i] = a.split(":"); OB.av[k] = Number(i); return obRender(); }
  if (a === "avphoto"){ OB.avMode = "photo"; return obGo("coach"); }
  if (a === "avbuild"){ OB.avMode = "build"; return obGo("coach"); }
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
function startOnboarding(){ OB = obInit(); document.documentElement.classList.add("ob-open"); obRender(); }
if (window.SWOLE_DEMO && !demoGet("swole:demo:onboarded")) startOnboarding();
