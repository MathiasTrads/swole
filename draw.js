/* ============ DRAW MY SWOLE (v32) ============
   The member's own Swole is drawn by the Supabase Edge Function "draw-swole" (Magnific, lookbook recipe).
   This file starts the job, polls it while the app is open, then cuts the four red-background images
   out on the phone (lookbook cut-out recipe), uploads them to the "swoles" bucket and swaps them in.
   Until then the member trains with the closest ready-made Swole (profile.fighter). */
const DRAW_FN = SB_URL + "/functions/v1/draw-swole";
const DRAW_MOODS = ["default", "ready", "bench", "recover"];
let drawTimer = null, drawBusy = false;

async function drawCall(body){
  const t = await sbToken(); if (!t) throw new Error("Not logged in");
  const r = await fetch(DRAW_FN, {method: "POST", headers: {apikey: SB_KEY, Authorization: "Bearer " + t, "Content-Type": "application/json"}, body: JSON.stringify(body)});
  const j = await r.json().catch(() => ({}));
  if (!r.ok){ const e = new Error(j.message || j.error || ("draw " + r.status)); e.code = j.error; e.status = r.status; throw e; }
  return j;
}
const drawProfile = () => (S.settings && S.settings.profile) || null;
async function drawSetProfile(patch){ const P = {...drawProfile(), ...patch}; await save("settings", "profile", P); window.SWOLE_PROFILE = P; return P; }

/* called after every sync and when the app comes back to the front */
async function drawWatch(){
  clearTimeout(drawTimer);
  const P = drawProfile();
  if (window.SWOLE_DEMO || !SB.session || !P || P.avatarStatus !== "drawing" || !P.avatar || drawBusy) return;
  if (document.visibilityState !== "visible"){ return; }
  drawBusy = true;
  try {
    let st = await drawCall({action: "status"});
    if (st.status === "none" || (st.status === "failed" && !P.avatarDrawId)) st = await drawCall({action: "start", traits: P.avatar});
    if (st.id && st.id !== P.avatarDrawId) await drawSetProfile({avatarDrawId: st.id});
    if (st.status === "done") return await drawFinish(st);
    if (st.status === "failed"){ await drawSetProfile({avatarStatus: "failed", avatarError: st.error || "failed"}); return; }
    drawTimer = setTimeout(drawWatch, 8000);
  } catch(e){
    if (e.code === "limit" || e.code === "busy"){ await drawSetProfile({avatarStatus: "failed", avatarError: e.message}); }
    else drawTimer = setTimeout(drawWatch, 30000);   // offline or a hiccup: try again later
  } finally { drawBusy = false; }
}
document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible") drawWatch(); });

async function drawFinish(st){
  const uid = sbUid(), tag = String(st.id).slice(0, 8), art = {};
  for (const m of DRAW_MOODS){
    const cut = await swoleCutout(st.images[m]);
    art[m] = await drawUpload(`${uid}/${m}`, await canvasBlob(cut), tag);
    if (m === "default") art.face = await drawUpload(`${uid}/face`, await canvasBlob(faceCrop(cut)), tag);
  }
  await drawSetProfile({avatarStatus: "ready", avatarArt: art, avatarError: null});
  try { await sbFlush(); } catch(e){}
  toast("Your Swole is here.");
  setTimeout(() => location.reload(), 1200);
}
function canvasBlob(c){
  return new Promise(res => c.toBlob(b => {
    if (b && b.type === "image/webp") return res(b);
    c.toBlob(res, "image/png");   // Safari can't encode WebP: PNG keeps the transparency
  }, "image/webp", 0.82));
}
async function drawUpload(path, blob, tag){
  const ext = blob.type === "image/webp" ? "webp" : "png", full = `${path}.${ext}`;
  const t = await sbToken();
  const r = await fetch(`${SB_URL}/storage/v1/object/swoles/${full}`, {method: "POST", headers: {apikey: SB_KEY, Authorization: "Bearer " + t, "x-upsert": "true", "Content-Type": blob.type}, body: blob});
  if (!r.ok) throw new Error("upload " + r.status);
  return `${SB_URL}/storage/v1/object/public/swoles/${full}?v=${tag}`;
}
/* "Try again" in Settings after a failed draw */
async function drawRetry(){
  const P = drawProfile(); if (!P || !P.avatar) return;
  try { const st = await drawCall({action: "start", traits: P.avatar}); await drawSetProfile({avatarStatus: "drawing", avatarDrawId: st.id, avatarError: null}); toast("Drawing your Swole. It takes a few minutes."); drawWatch(); }
  catch(e){ toast(e.message || "Couldn't start. Try again later."); }
}
/* every file in the member's folder goes before the account is deleted */
async function drawDeleteFiles(){
  const uid = sbUid(), t = await sbToken(); if (!uid || !t) return;
  const h = {apikey: SB_KEY, Authorization: "Bearer " + t, "Content-Type": "application/json"};
  const r = await fetch(`${SB_URL}/storage/v1/object/list/swoles`, {method: "POST", headers: h, body: JSON.stringify({prefix: uid + "/", limit: 100})});
  const files = r.ok ? await r.json() : [];
  if (files.length) await fetch(`${SB_URL}/storage/v1/object/swoles`, {method: "DELETE", headers: h, body: JSON.stringify({prefixes: files.map(f => `${uid}/${f.name}`)})});
}
function drawSettingsBlock(){
  const P = drawProfile(); if (!P || !P.avatar) return "";
  const s = P.avatarStatus;
  const line = s === "ready" ? "Your own Swole, drawn from the traits you picked."
    : s === "drawing" ? "Being drawn. It usually takes a few minutes. You train with the closest ready-made Swole until it's here."
    : `We couldn't draw your Swole this time.${P.avatarError && /used|tomorrow/.test(P.avatarError) ? " " + esc(P.avatarError) : ""} You train with the closest ready-made Swole.`;
  return `<div class="block"><h3>Your Swole<small>${s === "ready" ? "Ready" : s === "drawing" ? "Drawing…" : "Not drawn"}</small></h3>
    <p class="verdict-l" style="text-align:left;max-width:none;margin:6px 0 10px">${line}</p>
    ${s === "failed" ? `<div class="opts" style="margin:0 0 12px"><button class="btn" data-sb="redraw">Try again</button></div>` : ""}</div>`;
}

/* ---------- cut-out (lookbook recipe, in the browser) ----------
   red key: hue < 13° or > 345°, saturation > 0.42, value > 0.10
   background = red regions touching the border, red regions > 800 px, and small vivid enclosed holes
   (> 15 px, > 60 % at sat > 0.65 and value > 0.7). Then a 6 px clear border, specks < 3000 px dropped,
   0.8 px alpha blur, crop to the figure, 1200 px tall. Thresholds are for ~1500–2600 px tall sources. */
function loadImg(src){ return new Promise((res, rej) => { const i = new Image(); i.crossOrigin = "anonymous"; i.onload = () => res(i); i.onerror = () => rej(new Error("image")); i.src = src; }); }
async function swoleCutout(src){
  const img = await loadImg(src);
  const W = img.naturalWidth, H = img.naturalHeight, N = W * H;
  const c = document.createElement("canvas"); c.width = W; c.height = H;
  const x = c.getContext("2d", {willReadFrequently: true}); x.drawImage(img, 0, 0);
  const id = x.getImageData(0, 0, W, H), d = id.data;
  const red = new Uint8Array(N), vivid = new Uint8Array(N);
  for (let i = 0, p = 0; i < N; i++, p += 4){
    const r = d[p] / 255, g = d[p+1] / 255, b = d[p+2] / 255, mx = Math.max(r, g, b), mn = Math.min(r, g, b), df = mx - mn;
    const s = mx ? df / mx : 0;
    let h = 0;
    if (df){ h = mx === r ? ((g - b) / df) % 6 : mx === g ? (b - r) / df + 2 : (r - g) / df + 4; h *= 60; if (h < 0) h += 360; }
    if ((h < 13 || h > 345) && s > 0.42 && mx > 0.10){ red[i] = 1; if (s > 0.65 && mx > 0.7) vivid[i] = 1; }
  }
  // label the red regions
  const lab = new Int32Array(N), stack = new Int32Array(N);
  const bg = new Uint8Array(N);
  let n = 0;
  for (let i = 0; i < N; i++){
    if (!red[i] || lab[i]) continue;
    n++; let sp = 0, size = 0, viv = 0, edge = false; stack[sp++] = i; lab[i] = n;
    const members = [];
    while (sp){
      const k = stack[--sp]; members.push(k); size++; viv += vivid[k];
      const px = k % W, py = (k / W) | 0;
      if (px === 0 || py === 0 || px === W - 1 || py === H - 1) edge = true;
      if (px > 0 && red[k-1] && !lab[k-1]){ lab[k-1] = n; stack[sp++] = k - 1; }
      if (px < W - 1 && red[k+1] && !lab[k+1]){ lab[k+1] = n; stack[sp++] = k + 1; }
      if (py > 0 && red[k-W] && !lab[k-W]){ lab[k-W] = n; stack[sp++] = k - W; }
      if (py < H - 1 && red[k+W] && !lab[k+W]){ lab[k+W] = n; stack[sp++] = k + W; }
    }
    if (edge || size > 800 || (size > 15 && viv / size > 0.6)) for (const k of members) bg[k] = 1;
  }
  // 6 px clear border
  for (let y = 0; y < H; y++) for (let xx = 0; xx < W; xx++) if (xx < 6 || y < 6 || xx >= W - 6 || y >= H - 6) bg[y * W + xx] = 1;
  // drop foreground specks < 3000 px
  const seen = new Uint8Array(N);
  for (let i = 0; i < N; i++){
    if (bg[i] || seen[i]) continue;
    let sp = 0; stack[sp++] = i; seen[i] = 1; const members = [];
    while (sp){
      const k = stack[--sp]; members.push(k);
      const px = k % W;
      if (px > 0 && !bg[k-1] && !seen[k-1]){ seen[k-1] = 1; stack[sp++] = k - 1; }
      if (px < W - 1 && !bg[k+1] && !seen[k+1]){ seen[k+1] = 1; stack[sp++] = k + 1; }
      if (k >= W && !bg[k-W] && !seen[k-W]){ seen[k-W] = 1; stack[sp++] = k - W; }
      if (k < N - W && !bg[k+W] && !seen[k+W]){ seen[k+W] = 1; stack[sp++] = k + W; }
    }
    if (members.length < 3000) for (const k of members) bg[k] = 1;
  }
  // alpha with a light blur (≈0.8 px gaussian, 3×3 kernel)
  const A = new Float32Array(N); for (let i = 0; i < N; i++) A[i] = bg[i] ? 0 : 255;
  const K = [0.11, 0.78, 0.11];
  const T = new Float32Array(N);
  for (let y = 0; y < H; y++) for (let xx = 0; xx < W; xx++){ const i = y * W + xx; T[i] = K[0] * A[xx ? i - 1 : i] + K[1] * A[i] + K[2] * A[xx < W - 1 ? i + 1 : i]; }
  let x0 = W, y0 = H, x1 = -1, y1 = -1;
  for (let y = 0; y < H; y++) for (let xx = 0; xx < W; xx++){
    const i = y * W + xx, a = K[0] * T[y ? i - W : i] + K[1] * T[i] + K[2] * T[y < H - 1 ? i + W : i];
    d[i * 4 + 3] = a;
    if (a > 8){ if (xx < x0) x0 = xx; if (xx > x1) x1 = xx; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  }
  x.putImageData(id, 0, 0);
  if (x1 < 0) throw new Error("empty cut-out");
  const cw = x1 - x0 + 1, ch = y1 - y0 + 1, outH = 1200, outW = Math.round(cw * outH / ch);
  const o = document.createElement("canvas"); o.width = outW; o.height = outH;
  const ox = o.getContext("2d"); ox.imageSmoothingQuality = "high"; ox.drawImage(c, x0, y0, cw, ch, 0, 0, outW, outH);
  return o;
}
/* 256 px head crop from the default pose: square around the head at the top of the figure */
function faceCrop(c){
  const W = c.width, H = c.height, d = c.getContext("2d").getImageData(0, 0, W, Math.round(H * 0.12)).data;
  let sx = 0, cnt = 0;
  for (let y = 0; y < Math.round(H * 0.12); y++) for (let xx = 0; xx < W; xx++) if (d[(y * W + xx) * 4 + 3] > 128){ sx += xx; cnt++; }
  const cx = cnt ? sx / cnt : W / 2, side = Math.round(H * 0.15), left = Math.max(0, Math.min(W - side, Math.round(cx - side / 2)));
  const o = document.createElement("canvas"); o.width = 256; o.height = 256;
  const ox = o.getContext("2d"); ox.imageSmoothingQuality = "high"; ox.drawImage(c, left, 0, Math.min(side, W), side, 0, 0, Math.min(side, W) * 256 / side, 256);
  return o;
}
