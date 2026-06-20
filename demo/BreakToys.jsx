import React, { useEffect, useRef, useState } from "react";

/* ============================================================================
   UnFry — Break Toys (standalone, zero-dependency demo)

   Same three toys as the dashboard, but self-contained: native Web Audio API
   instead of Tone.js, all inline, no imports beyond React. Drop into any React
   sandbox to demo without installing or running the Next.js app.

     1. Zen Sand Raker   — canvas heightmap, drag to carve grooves
     2. Tone Matrix      — 16x16 pentatonic sequencer, can't sound wrong
     3. Falling Sand     — cellular automaton, drag to pour sand

   All run 100% client-side: no scores, timers, fail states, or network calls.
============================================================================ */

const C = {
  bg: "#0B0E1A",
  panel: "rgba(255,255,255,0.06)",
  border: "rgba(255,255,255,0.12)",
  ink: "rgba(255,255,255,0.92)",
  dim: "rgba(255,255,255,0.58)",
  faint: "rgba(255,255,255,0.34)",
  violet: "#A78BFA",
  cyan: "#5EEAD4",
  amber: "#FBBF24",
};
const panel = {
  background: C.panel, border: `1px solid ${C.border}`, borderRadius: 20,
  backdropFilter: "blur(18px)", WebkitBackdropFilter: "blur(18px)",
};

/* ----------------------------- Zen Sand Raker --------------------------- */
const ZCOLS = 120, ZROWS = 80;
function ZenSandRaker({ zenLine }) {
  const canvasRef = useRef(null);
  const heightRef = useRef(new Float32Array(ZCOLS * ZROWS));
  const grainsRef = useRef([]);
  const rafRef = useRef(0);
  const ptr = useRef({ x: 0, y: 0, px: 0, py: 0, down: false });
  const reduced = useRef(false);

  useEffect(() => {
    reduced.current = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
    const canvas = canvasRef.current, ctx = canvas.getContext("2d");
    const resize = () => {
      const r = canvas.getBoundingClientRect();
      canvas.width = Math.min(720, Math.floor(r.width));
      canvas.height = Math.floor((canvas.width * ZROWS) / ZCOLS);
    };
    resize();
    const ro = new ResizeObserver(resize); ro.observe(canvas);
    const h = heightRef.current;
    const idx = (x, y) => y * ZCOLS + x;

    function rakeAt(cx, cy) {
      const gx = (cx / canvas.width) * ZCOLS, gy = (cy / canvas.height) * ZROWS, radius = 4;
      for (let dy = -radius; dy <= radius; dy++) for (let dx = -radius; dx <= radius; dx++) {
        const x = Math.round(gx + dx), y = Math.round(gy + dy);
        if (x < 0 || y < 0 || x >= ZCOLS || y >= ZROWS) continue;
        const dist = Math.hypot(dx, dy); if (dist > radius) continue;
        const carve = (1 - dist / radius) * 0.55;
        h[idx(x, y)] -= carve;
        if (dist > radius - 1.5) h[idx(x, y)] += carve * 0.4;
        h[idx(x, y)] = Math.max(-1, Math.min(1, h[idx(x, y)]));
      }
      if (grainsRef.current.length < 240) for (let i = 0; i < 3; i++) {
        const a = Math.random() * Math.PI * 2;
        grainsRef.current.push({ x: cx + Math.cos(a) * 14, y: cy + Math.sin(a) * 14,
          vx: Math.cos(a) * 0.5, vy: Math.sin(a) * 0.5 - 0.2, life: 1 });
      }
    }
    function diffuse() {
      for (let y = 1; y < ZROWS - 1; y++) for (let x = 1; x < ZCOLS - 1; x++) {
        const i = idx(x, y);
        const avg = (h[i] + h[i - 1] + h[i + 1] + h[i - ZCOLS] + h[i + ZCOLS]) / 5;
        h[i] += (avg - h[i]) * 0.08;
      }
    }
    function draw() {
      const cw = canvas.width, ch = canvas.height;
      const g = ctx.createLinearGradient(0, 0, 0, ch);
      g.addColorStop(0, "#3b2f4a"); g.addColorStop(0.55, "#8a6a7e"); g.addColorStop(1, "#e7b48c");
      ctx.fillStyle = g; ctx.fillRect(0, 0, cw, ch);
      const cellW = cw / ZCOLS, cellH = ch / ZROWS;
      for (let y = 0; y < ZROWS; y++) for (let x = 0; x < ZCOLS; x++) {
        const v = h[idx(x, y)]; if (v === 0) continue;
        ctx.fillStyle = v < 0
          ? `rgba(40,20,40,${Math.min(0.5, -v * 0.6)})`
          : `rgba(255,240,220,${Math.min(0.5, v * 0.6)})`;
        ctx.fillRect(x * cellW, y * cellH, cellW + 1, cellH + 1);
      }
      const grains = grainsRef.current;
      ctx.fillStyle = "rgba(255,245,225,0.85)";
      for (let i = grains.length - 1; i >= 0; i--) {
        const gr = grains[i];
        gr.x += gr.vx; gr.y += gr.vy; gr.vy += 0.04; gr.life -= 0.02;
        if (gr.life <= 0) { grains.splice(i, 1); continue; }
        ctx.globalAlpha = gr.life; ctx.fillRect(gr.x, gr.y, 1.6, 1.6);
      }
      ctx.globalAlpha = 1;
      if (zenLine) {
        ctx.font = "16px Inter, system-ui, sans-serif";
        ctx.fillStyle = "rgba(255,255,255,0.78)"; ctx.textAlign = "center";
        ctx.fillText(zenLine, cw / 2, ch - 22);
      }
    }
    function loop() { if (!reduced.current) diffuse(); draw(); rafRef.current = requestAnimationFrame(loop); }
    loop();

    const toLocal = (e) => {
      const r = canvas.getBoundingClientRect();
      return { x: (e.clientX - r.left) * (canvas.width / r.width), y: (e.clientY - r.top) * (canvas.height / r.height) };
    };
    const onDown = (e) => { const p = toLocal(e); ptr.current = { x: p.x, y: p.y, px: p.x, py: p.y, down: true };
      canvas.setPointerCapture(e.pointerId); rakeAt(p.x, p.y); };
    const onMove = (e) => {
      if (!ptr.current.down) return;
      const p = toLocal(e);
      const steps = Math.max(1, Math.floor(Math.hypot(p.x - ptr.current.px, p.y - ptr.current.py) / 4));
      for (let s = 1; s <= steps; s++) rakeAt(
        ptr.current.px + ((p.x - ptr.current.px) * s) / steps,
        ptr.current.py + ((p.y - ptr.current.py) * s) / steps);
      ptr.current.px = p.x; ptr.current.py = p.y;
    };
    const onUp = () => { ptr.current.down = false; };
    canvas.addEventListener("pointerdown", onDown);
    canvas.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      cancelAnimationFrame(rafRef.current); ro.disconnect();
      canvas.removeEventListener("pointerdown", onDown);
      canvas.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, [zenLine]);

  return <canvas ref={canvasRef}
    style={{ width: "100%", display: "block", borderRadius: 14, cursor: "crosshair", touchAction: "none" }}
    aria-label="Zen sand raker. Drag to rake patterns into the sand." />;
}

/* ------------------------------ Tone Matrix ----------------------------- */
const TSIZE = 16;
const PENT = ["C", "D", "E", "G", "A"];
// note -> frequency (equal temperament, A4 = 440)
const SEMI = { C: -9, D: -7, E: -5, G: -2, A: 0 };
function freqOf(note, octave) {
  const n = SEMI[note] + (octave - 4) * 12;
  return 440 * Math.pow(2, n / 12);
}
function ToneMatrix({ dominantCategory }) {
  const [grid, setGrid] = useState(() => new Array(TSIZE * TSIZE).fill(false));
  const [playhead, setPlayhead] = useState(0);
  const [ready, setReady] = useState(false);
  const audioRef = useRef(null);
  const gridRef = useRef(grid); gridRef.current = grid;
  const timerRef = useRef(null);

  const ambient = ["auditing_code", "auditing_ai_output", "analyzing_spreadsheet"].includes(dominantCategory);
  const accent = ambient ? C.violet : C.cyan;

  function rowToNote(row) {
    const fromBottom = TSIZE - 1 - row;
    return { note: PENT[fromBottom % PENT.length], octave: 3 + Math.floor(fromBottom / PENT.length) };
  }
  function playColumn(col, ctx) {
    const g = gridRef.current;
    for (let r = 0; r < TSIZE; r++) {
      if (!g[r * TSIZE + col]) continue;
      const { note, octave } = rowToNote(r);
      const osc = ctx.createOscillator(), gain = ctx.createGain();
      osc.type = ambient ? "sine" : "triangle";
      osc.frequency.value = freqOf(note, octave);
      const t = ctx.currentTime;
      const peak = ambient ? 0.12 : 0.18, rel = ambient ? 1.4 : 0.4;
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(peak, t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + rel);
      osc.connect(gain).connect(ctx.destination);
      osc.start(t); osc.stop(t + rel + 0.05);
    }
  }
  function ensureAudio() {
    if (audioRef.current) return;
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    audioRef.current = ctx;
    let col = 0;
    timerRef.current = setInterval(() => {
      playColumn(col, ctx);
      setPlayhead(col);
      col = (col + 1) % TSIZE;
    }, 1000 * (60 / 96) / 2); // 96bpm, 8th notes
    setReady(true);
  }
  function toggle(i) { ensureAudio(); setGrid((g) => { const n = g.slice(); n[i] = !n[i]; return n; }); }

  useEffect(() => () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (audioRef.current) audioRef.current.close();
  }, []);

  return (
    <div>
      <div style={{ fontSize: 12, color: C.faint, marginBottom: 10 }}>
        Tap squares to paint a melody. {ready ? "Playing." : "Tap any square to start sound."}
      </div>
      <div role="grid" aria-label="Pentatonic tone matrix"
        style={{ display: "grid", gridTemplateColumns: `repeat(${TSIZE},1fr)`, gap: 3,
          aspectRatio: "1 / 1", width: "100%", maxWidth: 520, margin: "0 auto" }}>
        {grid.map((on, i) => {
          const isHead = i % TSIZE === playhead;
          return <button key={i} onClick={() => toggle(i)} aria-pressed={on}
            style={{ border: "none", borderRadius: 4, cursor: "pointer", padding: 0,
              background: on ? accent : isHead ? "rgba(255,255,255,0.10)" : "rgba(255,255,255,0.04)",
              boxShadow: on && isHead ? `0 0 12px ${accent}` : "none",
              transition: "background .12s, box-shadow .12s" }} />;
        })}
      </div>
    </div>
  );
}

/* ------------------------------ Falling Sand ---------------------------- */
const SW = 140, SH = 90, EMPTY = 0;
const SAND_PALETTE = ["#A78BFA", "#5EEAD4", "#FBBF24", "#F0ABFC", "#7DD3FC"];
function FallingSand() {
  const canvasRef = useRef(null);
  const gridRef = useRef(new Uint8Array(SW * SH));
  const rafRef = useRef(0);
  const ptr = useRef({ down: false, x: 0, y: 0 });
  const hue = useRef(0);
  const reduced = useRef(false);

  useEffect(() => {
    reduced.current = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
    const canvas = canvasRef.current, ctx = canvas.getContext("2d");
    canvas.width = SW; canvas.height = SH; ctx.imageSmoothingEnabled = false;
    const grid = gridRef.current;
    const idx = (x, y) => y * SW + x;

    function dropAt(cx, cy) {
      const color = (hue.current % SAND_PALETTE.length) + 1;
      for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) {
        const x = cx + dx, y = cy + dy;
        if (x < 0 || y < 0 || x >= SW || y >= SH) continue;
        if (Math.random() < 0.5 && grid[idx(x, y)] === EMPTY) grid[idx(x, y)] = color;
      }
    }
    function stepSim() {
      for (let y = SH - 2; y >= 0; y--) {
        const ltr = y % 2 === 0;
        for (let k = 0; k < SW; k++) {
          const x = ltr ? k : SW - 1 - k, i = idx(x, y), v = grid[i];
          if (v === EMPTY) continue;
          const below = idx(x, y + 1);
          if (grid[below] === EMPTY) { grid[below] = v; grid[i] = EMPTY; continue; }
          const dl = x > 0 ? idx(x - 1, y + 1) : -1, dr = x < SW - 1 ? idx(x + 1, y + 1) : -1;
          const canL = dl >= 0 && grid[dl] === EMPTY, canR = dr >= 0 && grid[dr] === EMPTY;
          if (canL && canR) { if (Math.random() < 0.5) grid[dl] = v; else grid[dr] = v; grid[i] = EMPTY; }
          else if (canL) { grid[dl] = v; grid[i] = EMPTY; }
          else if (canR) { grid[dr] = v; grid[i] = EMPTY; }
        }
      }
    }
    function draw() {
      const img = ctx.createImageData(SW, SH);
      for (let i = 0; i < grid.length; i++) {
        const v = grid[i], o = i * 4;
        if (v === EMPTY) { img.data[o] = 11; img.data[o + 1] = 14; img.data[o + 2] = 26; img.data[o + 3] = 255; }
        else {
          const hex = SAND_PALETTE[v - 1];
          img.data[o] = parseInt(hex.slice(1, 3), 16);
          img.data[o + 1] = parseInt(hex.slice(3, 5), 16);
          img.data[o + 2] = parseInt(hex.slice(5, 7), 16);
          img.data[o + 3] = 255;
        }
      }
      ctx.putImageData(img, 0, 0);
    }
    function loop() {
      if (ptr.current.down) { dropAt(ptr.current.x, ptr.current.y); hue.current += 0.02; }
      if (!reduced.current || ptr.current.down) stepSim();
      draw();
      rafRef.current = requestAnimationFrame(loop);
    }
    loop();

    const toCell = (e) => {
      const r = canvas.getBoundingClientRect();
      return { x: Math.floor(((e.clientX - r.left) / r.width) * SW), y: Math.floor(((e.clientY - r.top) / r.height) * SH) };
    };
    const onDown = (e) => { const c = toCell(e); ptr.current = { down: true, x: c.x, y: c.y }; canvas.setPointerCapture(e.pointerId); };
    const onMove = (e) => { if (!ptr.current.down) return; const c = toCell(e); ptr.current.x = c.x; ptr.current.y = c.y; };
    const onUp = () => { ptr.current.down = false; };
    canvas.addEventListener("pointerdown", onDown);
    canvas.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      cancelAnimationFrame(rafRef.current);
      canvas.removeEventListener("pointerdown", onDown);
      canvas.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, []);

  return (
    <div>
      <div style={{ fontSize: 12, color: C.faint, marginBottom: 10 }}>Click and drag to pour sand. It piles up on its own.</div>
      <canvas ref={canvasRef}
        style={{ width: "100%", display: "block", borderRadius: 14, cursor: "crosshair",
          imageRendering: "pixelated", touchAction: "none", background: C.bg }}
        aria-label="Falling sand sandbox. Drag to pour cascading sand." />
    </div>
  );
}

/* -------------------------------- Switcher ------------------------------ */
const TOYS = [
  { id: "zen", name: "Zen Sand Raker", blurb: "Rake smooth grooves into a dry garden.", accent: C.amber },
  { id: "tone", name: "Tone Matrix", blurb: "Paint a melody — it can't sound wrong.", accent: C.cyan },
  { id: "sand", name: "Falling Sand", blurb: "Pour cascading sand and watch it pile.", accent: C.violet },
];

export default function BreakToysDemo({ dominantCategory }) {
  const [active, setActive] = useState(null);
  const current = TOYS.find((t) => t.id === active);
  const zenLine = "Breathe. The pattern will keep.";

  return (
    <div style={{ minHeight: "100%", background: `radial-gradient(900px 500px at 80% -10%, #12152B, ${C.bg})`,
      fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif", color: C.ink, padding: 24 }}>
      <style>{`
        @keyframes bt-rise { from {opacity:0; transform:translateY(10px)} to {opacity:1; transform:translateY(0)} }
        @media (prefers-reduced-motion: reduce){ .bt-anim{animation:none!important} }
      `}</style>
      <div style={{ maxWidth: 720, margin: "0 auto" }}>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 6 }}>
          <h2 style={{ fontSize: 22, fontWeight: 800, margin: 0 }}>
            Un<span style={{ color: C.violet }}>Fry</span> · break toys
          </h2>
          {active && (
            <button onClick={() => setActive(null)}
              style={{ padding: "7px 14px", borderRadius: 10, border: `1px solid ${C.border}`,
                background: "transparent", color: C.dim, fontSize: 13, cursor: "pointer" }}>Done</button>
          )}
        </div>
        <p style={{ color: C.faint, fontSize: 12, margin: "0 0 16px" }}>
          Run entirely in your browser — no scores, no timers, nothing uploaded. Close any of them whenever you like.
        </p>

        {!active && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 14 }}>
            {TOYS.map((t) => (
              <button key={t.id} onClick={() => setActive(t.id)}
                style={{ ...panel, textAlign: "left", padding: 18, cursor: "pointer", color: "inherit", fontFamily: "inherit" }}>
                <div style={{ width: 10, height: 10, borderRadius: 999, background: t.accent,
                  boxShadow: `0 0 12px ${t.accent}`, marginBottom: 12 }} />
                <div style={{ fontSize: 15, fontWeight: 700 }}>{t.name}</div>
                <div style={{ fontSize: 12.5, color: C.dim, marginTop: 4 }}>{t.blurb}</div>
              </button>
            ))}
          </div>
        )}

        {current && (
          <div className="bt-anim" style={{ ...panel, padding: 20, animation: "bt-rise .4s ease both" }}>
            <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 12, color: current.accent }}>{current.name}</div>
            {active === "zen" && <ZenSandRaker zenLine={zenLine} />}
            {active === "tone" && <ToneMatrix dominantCategory={dominantCategory} />}
            {active === "sand" && <FallingSand />}
          </div>
        )}
      </div>
    </div>
  );
}
