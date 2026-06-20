import React, { useState, useEffect, useRef, useCallback } from "react";

/* ============================================================================
   UnFry — self-contained interactive demo of the full spec.

   What's REAL here (lifted straight from the spec):
     - CognitiveLoadTracker: decay + intensity weighting + dual trigger paths
     - Classification: anchor-category matching (keyword stand-in for the local
       Transformers.js embedding step — same input/output contract)
     - The full loop: tick -> classify -> score -> trigger -> challenge -> outcome
     - Glassmorphic break overlay + dashboard with live session metrics

   What's STUBBED (can't run inside a chat artifact):
     - Real WebGPU embeddings  -> keyword anchor matcher (marked CLASSIFIER)
     - Postgres / Next.js API   -> in-memory store (marked STORE)
     - Live Gemini Flash call    -> local fallback challenge bank (marked GEMINI)
       The exact fetch() you'd swap in is in generateChallenge().
============================================================================ */

/* ---------------------------- design tokens ----------------------------- */
const C = {
  bg0: "#0B0E1A",
  bg1: "#12152B",
  panel: "rgba(255,255,255,0.06)",
  panelBorder: "rgba(255,255,255,0.12)",
  ink: "rgba(255,255,255,0.92)",
  inkDim: "rgba(255,255,255,0.58)",
  inkFaint: "rgba(255,255,255,0.34)",
  violet: "#A78BFA",
  cyan: "#5EEAD4",
  amber: "#FBBF24",
  low: "#5EEAD4",
  medium: "#A78BFA",
  high: "#FB7185",
};

/* ----------------------- CLASSIFIER (stubbed embed) ---------------------- */
// In production: pipeline("feature-extraction", "mxbai-embed-xsmall-v1") on WebGPU,
// cosine-sim against precomputed anchor vectors. Here we match keyword anchors so
// the rest of the pipeline sees identical {category, confidence, intensity}.
const ANCHORS = {
  auditing_ai_output: ["ai", "chatgpt", "claude", "generated", "fact-check", "review draft", "hallucination"],
  auditing_code: ["pull request", "code review", "github", "diff", "merge", "lint", "pr #"],
  analyzing_spreadsheet: ["sheet", "excel", "pivot", "vlookup", "sumif", "cell", "formula"],
  writing_email: ["gmail", "compose", "reply", "inbox", "email", "draft message"],
  reading_docs: ["documentation", "api reference", "docs", "readme", "guide"],
  messaging: ["slack", "teams", "chat", "dm", "thread"],
  meeting_notes: ["zoom", "meeting", "calendar", "standup", "call notes"],
  research_browsing: ["search", "wikipedia", "article", "blog", "stack overflow"],
};
const INTENSITY_MAP = {
  auditing_ai_output: "high",
  auditing_code: "high",
  analyzing_spreadsheet: "medium",
  writing_email: "medium",
  meeting_notes: "low",
  messaging: "low",
  reading_docs: "low",
  research_browsing: "low",
  other: "low",
};
function classify(title) {
  const text = title.toLowerCase();
  let best = { category: "other", score: 0.2 };
  for (const [cat, kws] of Object.entries(ANCHORS)) {
    let hits = 0;
    for (const kw of kws) if (text.includes(kw)) hits++;
    const score = hits === 0 ? 0 : Math.min(0.62 + hits * 0.12, 0.97);
    if (score > best.score) best = { category: cat, score };
  }
  return { category: best.category, confidence: best.score, intensity: INTENSITY_MAP[best.category] };
}

/* --------------------- REAL cognitive load tracker ---------------------- */
const INTENSITY_WEIGHT = { low: 1, medium: 2, high: 3 };
const DECAY_PER_MINUTE = 0.92;
class CognitiveLoadTracker {
  constructor() { this.score = 0; this.streak = 0; this.last = Date.now(); }
  ingest(intensity, now = Date.now()) {
    const mins = (now - this.last) / 60000;
    this.score *= Math.pow(DECAY_PER_MINUTE, mins);
    this.score += INTENSITY_WEIGHT[intensity];
    if (intensity === "high") this.streak += mins;
    else this.streak = Math.max(0, this.streak - mins * 0.5);
    this.last = now;
  }
  shouldTrigger(thresholdMin) { return this.streak >= thresholdMin || this.score > 40; }
  reset() { this.score = 0; this.streak = 0; this.last = Date.now(); }
}

/* ------------------- GEMINI stub: local challenge bank ------------------ */
// Live swap-in (server route /api/challenge/generate):
//   const r = await fetch("/api/challenge/generate", { method:"POST",
//     body: JSON.stringify({ breakEventId, dominantTopic, recentCategories }) });
//   return (await r.json()).challenge.generatedContent;
const BANK = {
  auditing_ai_output: [{
    type: "quiz", question: "You're auditing an AI draft that cites a 2019 study with confident specifics. Best first move?",
    options: ["Trust it — the tone is confident", "Verify the citation exists before keeping the claim", "Delete all numbers", "Rewrite in your own voice and ship"],
    correctIndex: 1, explanation: "Confident phrasing is not evidence — fabricated citations are the classic LLM failure mode.", estimatedSeconds: 25,
  }],
  auditing_code: [{
    type: "quiz", question: "A PR adds a try/catch that swallows the error and returns null. The reviewer should flag it because…",
    options: ["null is slower than undefined", "It hides failures and makes debugging blind", "try/catch is deprecated", "It needs more comments"],
    correctIndex: 1, explanation: "Silent catches turn loud bugs into quiet ones that surface far from the cause.", estimatedSeconds: 25,
  }],
  analyzing_spreadsheet: [{
    type: "quiz", question: "VLOOKUP keeps returning #N/A on values you can see in the table. Most likely cause?",
    options: ["The file is too large", "Leading/trailing spaces or text-vs-number mismatch", "VLOOKUP only works on 100 rows", "You need XLOOKUP for any lookup"],
    correctIndex: 1, explanation: "Whitespace and type mismatches break exact matches — TRIM and check the cell format.", estimatedSeconds: 30,
  }],
  writing_email: [{
    type: "tutorial_card", title: "Sharper email in 3 moves",
    bulletPoints: ["Lead with the ask, not the backstory", "One email, one decision needed", "Replace 'just wanted to' with the verb itself"],
    estimatedSeconds: 20,
  }],
  default: [{
    type: "tutorial_card", title: "Two-minute reset",
    bulletPoints: ["Unfocus your eyes — look 20ft away for 20 seconds", "Drop your shoulders, exhale slow", "Name the one next action before you return"],
    estimatedSeconds: 30,
  }],
};
function generateChallenge(category) {
  const list = BANK[category] || BANK.default;
  return list[Math.floor(Math.random() * list.length)];
}

/* ------------------------- simulated tab stream ------------------------- */
// Stands in for chrome.tabs.onActivated + content-script scraping.
const STREAMS = {
  "Deep audit run": [
    "Claude — reviewing generated marketing copy",
    "ChatGPT response fact-check: revenue claims",
    "GitHub PR #482 — diff review, auth module",
    "Reviewing AI-generated SQL for hallucinated columns",
    "Claude draft — correcting AI suggestions inline",
    "GitHub code review comments thread",
  ],
  "Mixed knowledge work": [
    "Gmail — compose reply to vendor",
    "Q3 budget.xlsx — VLOOKUP pivot table",
    "Slack #engineering thread",
    "API reference guide — auth endpoints",
    "Gmail inbox — draft message to colleague",
    "Google Sheets data analysis — formulas",
  ],
  "Light browsing": [
    "Wikipedia — article on tardigrades",
    "Slack DM with Priya",
    "Zoom standup — meeting notes",
    "Stack Overflow — search results",
    "Reading blog: weekend recipes",
  ],
};

/* --------------------------------- UI ----------------------------------- */
const cardStyle = {
  background: C.panel, border: `1px solid ${C.panelBorder}`,
  borderRadius: 20, backdropFilter: "blur(18px)", WebkitBackdropFilter: "blur(18px)",
};

function Pill({ intensity }) {
  const col = { low: C.low, medium: C.medium, high: C.high }[intensity];
  return (
    <span style={{
      fontSize: 11, fontWeight: 600, letterSpacing: ".04em", textTransform: "uppercase",
      color: col, background: `${col}1A`, border: `1px solid ${col}40`,
      borderRadius: 999, padding: "2px 9px",
    }}>{intensity}</span>
  );
}

function readable(cat) {
  return cat.replace(/_/g, " ");
}

/* ----------------------------- Break Overlay ---------------------------- */
function BreakOverlay({ event, onComplete, onSkip }) {
  const [picked, setPicked] = useState(null);
  const ch = event.challenge;
  const isQuiz = ch.type === "quiz";

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 99, display: "flex",
      alignItems: "center", justifyContent: "center", padding: 16,
      background: "linear-gradient(135deg, rgba(11,14,26,0.55), rgba(67,56,160,0.35), rgba(11,14,26,0.6))",
      backdropFilter: "blur(22px)", WebkitBackdropFilter: "blur(22px)",
      animation: "uf-fade .6s ease both",
    }}>
      <div style={{ ...cardStyle, width: "100%", maxWidth: 440, padding: 30,
        boxShadow: "0 8px 40px rgba(31,38,135,0.4)", animation: "uf-rise .5s ease both" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
          <span style={{ width: 8, height: 8, borderRadius: 999, background: C.amber,
            boxShadow: `0 0 12px ${C.amber}` }} />
          <span style={{ color: C.inkDim, fontSize: 12, letterSpacing: ".06em", textTransform: "uppercase" }}>
            Time to unfry · 2 min
          </span>
        </div>
        <div style={{ color: C.inkFaint, fontSize: 12.5, marginBottom: 18 }}>
          You've been deep in <b style={{ color: C.violet }}>{readable(event.dominantCategory)}</b>.
          Here's a palate cleanser, not more work.
        </div>

        {isQuiz ? (
          <>
            <div style={{ color: C.ink, fontSize: 16.5, fontWeight: 600, lineHeight: 1.35, marginBottom: 16 }}>
              {ch.question}
            </div>
            <div style={{ display: "grid", gap: 9 }}>
              {ch.options.map((opt, i) => {
                const isCorrect = i === ch.correctIndex;
                const show = picked !== null;
                let bd = C.panelBorder, bgc = "rgba(255,255,255,0.04)", col = C.ink;
                if (show && isCorrect) { bd = `${C.cyan}80`; bgc = `${C.cyan}18`; col = C.cyan; }
                else if (show && i === picked) { bd = `${C.high}80`; bgc = `${C.high}18`; col = C.high; }
                return (
                  <button key={i} disabled={show} onClick={() => setPicked(i)}
                    style={{ textAlign: "left", padding: "12px 14px", borderRadius: 13,
                      border: `1px solid ${bd}`, background: bgc, color: col,
                      fontSize: 14, cursor: show ? "default" : "pointer", transition: "all .25s" }}>
                    {opt}
                  </button>
                );
              })}
            </div>
            {picked !== null && (
              <div style={{ marginTop: 14, padding: "11px 13px", borderRadius: 12,
                background: "rgba(255,255,255,0.04)", color: C.inkDim, fontSize: 13, lineHeight: 1.45,
                animation: "uf-fade .4s ease both" }}>
                {picked === ch.correctIndex ? "Nice — " : "Not quite. "}{ch.explanation}
              </div>
            )}
          </>
        ) : (
          <>
            <div style={{ color: C.ink, fontSize: 17, fontWeight: 600, marginBottom: 14 }}>{ch.title}</div>
            <div style={{ display: "grid", gap: 10 }}>
              {ch.bulletPoints.map((b, i) => (
                <div key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                  <span style={{ color: C.cyan, marginTop: 2, fontSize: 13 }}>—</span>
                  <span style={{ color: C.inkDim, fontSize: 14, lineHeight: 1.4 }}>{b}</span>
                </div>
              ))}
            </div>
          </>
        )}

        <div style={{ display: "flex", gap: 10, marginTop: 22 }}>
          <button onClick={() => onComplete(isQuiz ? picked === ch.correctIndex : true)}
            disabled={isQuiz && picked === null}
            style={{ flex: 1, padding: "12px", borderRadius: 13, border: "none",
              background: (isQuiz && picked === null) ? "rgba(255,255,255,0.08)" : `linear-gradient(135deg, ${C.violet}, ${C.cyan})`,
              color: (isQuiz && picked === null) ? C.inkFaint : "#0B0E1A", fontWeight: 700, fontSize: 14,
              cursor: (isQuiz && picked === null) ? "not-allowed" : "pointer", transition: "all .25s" }}>
            Back to work
          </button>
          <button onClick={onSkip}
            style={{ padding: "12px 16px", borderRadius: 13, border: `1px solid ${C.panelBorder}`,
              background: "transparent", color: C.inkDim, fontSize: 14, cursor: "pointer" }}>
            Skip
          </button>
        </div>
      </div>
    </div>
  );
}

/* --------------------------------- App ---------------------------------- */
export default function UnFry() {
  const [running, setRunning] = useState(false);
  const [streamKey, setStreamKey] = useState("Deep audit run");
  const [threshold, setThreshold] = useState(0.4); // demo minutes for high-intensity streak
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [ticks, setTicks] = useState([]);          // STORE: activityTicks
  const [curve, setCurve] = useState([]);           // load over time, for chart
  const [activeBreak, setActiveBreak] = useState(null);
  const [stats, setStats] = useState({ triggered: 0, completed: 0, skipped: 0, correct: 0, quizzes: 0 });

  const tracker = useRef(new CognitiveLoadTracker());
  const stepRef = useRef(0);
  const timeRef = useRef(Date.now());

  const reset = useCallback(() => {
    tracker.current.reset(); stepRef.current = 0; timeRef.current = Date.now();
    setScore(0); setStreak(0); setTicks([]); setCurve([]); setActiveBreak(null);
    setStats({ triggered: 0, completed: 0, skipped: 0, correct: 0, quizzes: 0 });
  }, []);

  useEffect(() => {
    if (!running || activeBreak) return;
    const id = setInterval(() => {
      // simulate ~12s of real time per tick so the demo crosses thresholds fast
      timeRef.current += 12000;
      const now = timeRef.current;
      const stream = STREAMS[streamKey];
      const title = stream[stepRef.current % stream.length];
      stepRef.current++;

      const { category, confidence, intensity } = classify(title); // CLASSIFIER
      tracker.current.ingest(intensity, now);
      const s = tracker.current.score, st = tracker.current.streak;
      setScore(s); setStreak(st);

      setTicks(t => [{ title, category, confidence, intensity, t: now }, ...t].slice(0, 8));
      setCurve(c => [...c, { x: c.length, y: s }].slice(-40));

      if (tracker.current.shouldTrigger(threshold)) {
        // dominant = most frequent recent high/med category
        setTicks(curTicks => {
          const counts = {};
          curTicks.forEach(tk => { counts[tk.category] = (counts[tk.category] || 0) + 1; });
          const dominant = Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] || category;
          const challenge = generateChallenge(dominant); // GEMINI stub
          setActiveBreak({ dominantCategory: dominant, loadAtTrigger: s, challenge });
          setStats(p => ({ ...p, triggered: p.triggered + 1 }));
          tracker.current.reset();
          setScore(0); setStreak(0);
          return curTicks;
        });
      }
    }, 850);
    return () => clearInterval(id);
  }, [running, activeBreak, streamKey, threshold]);

  const closeBreak = (completed, wasCorrect) => {
    setStats(p => {
      const isQuiz = activeBreak.challenge.type === "quiz";
      return {
        ...p,
        completed: p.completed + (completed ? 1 : 0),
        skipped: p.skipped + (completed ? 0 : 1),
        quizzes: p.quizzes + (completed && isQuiz ? 1 : 0),
        correct: p.correct + (completed && isQuiz && wasCorrect ? 1 : 0),
      };
    });
    setActiveBreak(null);
    timeRef.current = Date.now();
    tracker.current.last = Date.now();
  };

  const loadPct = Math.min(100, (score / 45) * 100);
  const loadColor = score > 35 ? C.high : score > 18 ? C.medium : C.low;
  const maxY = Math.max(45, ...curve.map(p => p.y));

  return (
    <div style={{ minHeight: "100%", background: `radial-gradient(900px 500px at 80% -10%, ${C.bg1}, ${C.bg0})`,
      fontFamily: "ui-sans-serif, system-ui, -apple-system, Inter, sans-serif", color: C.ink, padding: 20 }}>
      <style>{`
        @keyframes uf-fade { from {opacity:0} to {opacity:1} }
        @keyframes uf-rise { from {opacity:0; transform:translateY(14px)} to {opacity:1; transform:translateY(0)} }
        @media (prefers-reduced-motion: reduce){ *{animation:none!important; transition:none!important} }
      `}</style>

      <div style={{ maxWidth: 920, margin: "0 auto" }}>
        {/* header */}
        <div style={{ display: "flex", alignItems: "baseline", gap: 12, marginBottom: 4 }}>
          <h1 style={{ fontSize: 30, fontWeight: 800, letterSpacing: "-.02em", margin: 0 }}>
            Un<span style={{ color: C.violet }}>Fry</span>
          </h1>
          <span style={{ color: C.inkFaint, fontSize: 13 }}>
            local activity sensing · forced micro-breaks · context-aware learning
          </span>
        </div>
        <div style={{ color: C.inkFaint, fontSize: 12, marginBottom: 20 }}>
          Live demo of the full loop. Classification runs locally; the Gemini call is shown as a local
          challenge bank here. Real time is compressed so thresholds trip in seconds.
        </div>

        {/* controls */}
        <div style={{ ...cardStyle, padding: 16, marginBottom: 16, display: "flex",
          gap: 14, flexWrap: "wrap", alignItems: "center" }}>
          <button onClick={() => running ? setRunning(false) : (reset(), setRunning(true))}
            style={{ padding: "10px 18px", borderRadius: 12, border: "none",
              background: running ? `${C.high}22` : `linear-gradient(135deg, ${C.violet}, ${C.cyan})`,
              color: running ? C.high : "#0B0E1A", fontWeight: 700, fontSize: 14, cursor: "pointer" }}>
            {running ? "Pause session" : "Start session"}
          </button>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <span style={{ fontSize: 11, color: C.inkFaint, textTransform: "uppercase", letterSpacing: ".05em" }}>Work pattern</span>
            <div style={{ display: "flex", gap: 6 }}>
              {Object.keys(STREAMS).map(k => (
                <button key={k} onClick={() => { setStreamKey(k); reset(); }}
                  style={{ padding: "6px 11px", borderRadius: 9, fontSize: 12.5, cursor: "pointer",
                    border: `1px solid ${streamKey === k ? C.violet : C.panelBorder}`,
                    background: streamKey === k ? `${C.violet}22` : "transparent",
                    color: streamKey === k ? C.violet : C.inkDim }}>{k}</button>
              ))}
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4, marginLeft: "auto" }}>
            <span style={{ fontSize: 11, color: C.inkFaint, textTransform: "uppercase", letterSpacing: ".05em" }}>
              High-intensity streak trigger: {threshold.toFixed(1)} min
            </span>
            <input type="range" min={0.2} max={1.5} step={0.1} value={threshold}
              onChange={e => setThreshold(+e.target.value)} style={{ accentColor: C.violet, width: 180 }} />
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          {/* LEFT: live load */}
          <div style={{ ...cardStyle, padding: 18 }}>
            <div style={{ fontSize: 12, color: C.inkFaint, textTransform: "uppercase", letterSpacing: ".05em", marginBottom: 12 }}>
              Cognitive load
            </div>
            <div style={{ display: "flex", alignItems: "flex-end", gap: 10, marginBottom: 4 }}>
              <span style={{ fontSize: 40, fontWeight: 800, color: loadColor, lineHeight: 1 }}>{score.toFixed(0)}</span>
              <span style={{ color: C.inkFaint, fontSize: 12, marginBottom: 6 }}>/ 40 trip · or {threshold.toFixed(1)}min high streak</span>
            </div>
            <div style={{ height: 8, background: "rgba(255,255,255,0.07)", borderRadius: 999, overflow: "hidden", marginTop: 8 }}>
              <div style={{ height: "100%", width: `${loadPct}%`, background: loadColor, borderRadius: 999, transition: "width .4s, background .4s" }} />
            </div>
            <div style={{ fontSize: 12, color: C.inkDim, marginTop: 10 }}>
              High-intensity streak: <b style={{ color: streak > threshold * 0.7 ? C.high : C.ink }}>{streak.toFixed(2)} min</b>
            </div>

            {/* sparkline */}
            <svg viewBox="0 0 280 70" style={{ width: "100%", marginTop: 14, display: "block" }}>
              <polyline fill="none" stroke={loadColor} strokeWidth="2"
                points={curve.map((p, i) => `${(i / Math.max(1, curve.length - 1)) * 280},${70 - (p.y / maxY) * 64}`).join(" ")} />
            </svg>
          </div>

          {/* RIGHT: session stats */}
          <div style={{ ...cardStyle, padding: 18 }}>
            <div style={{ fontSize: 12, color: C.inkFaint, textTransform: "uppercase", letterSpacing: ".05em", marginBottom: 14 }}>
              This session
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              {[
                ["Breaks triggered", stats.triggered, C.amber],
                ["Completed", stats.completed, C.cyan],
                ["Skipped", stats.skipped, C.inkDim],
                ["Quiz accuracy", stats.quizzes ? `${Math.round((stats.correct / stats.quizzes) * 100)}%` : "—", C.violet],
              ].map(([label, val, col]) => (
                <div key={label}>
                  <div style={{ fontSize: 28, fontWeight: 800, color: col }}>{val}</div>
                  <div style={{ fontSize: 11.5, color: C.inkFaint }}>{label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* activity stream */}
        <div style={{ ...cardStyle, padding: 18, marginTop: 16 }}>
          <div style={{ fontSize: 12, color: C.inkFaint, textTransform: "uppercase", letterSpacing: ".05em", marginBottom: 12,
            display: "flex", justifyContent: "space-between" }}>
            <span>Activity stream (classified locally)</span>
            <span style={{ color: C.inkFaint }}>title → category · confidence</span>
          </div>
          {ticks.length === 0 && (
            <div style={{ color: C.inkFaint, fontSize: 13, padding: "8px 0" }}>
              Start a session — tabs get classified and load builds until a break trips.
            </div>
          )}
          <div style={{ display: "grid", gap: 8 }}>
            {ticks.map((tk, i) => (
              <div key={tk.t + i} style={{ display: "flex", alignItems: "center", gap: 12,
                padding: "8px 0", borderTop: i ? `1px solid ${C.panelBorder}` : "none",
                opacity: 1 - i * 0.07 }}>
                <span style={{ flex: 1, fontSize: 13, color: C.ink, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {tk.title}
                </span>
                <span style={{ fontSize: 12, color: C.inkDim, minWidth: 130, textAlign: "right" }}>
                  {readable(tk.category)}
                </span>
                <span style={{ fontSize: 11.5, color: C.inkFaint, minWidth: 36, textAlign: "right" }}>
                  {(tk.confidence * 100).toFixed(0)}%
                </span>
                <Pill intensity={tk.intensity} />
              </div>
            ))}
          </div>
        </div>
      </div>

      {activeBreak && (
        <BreakOverlay
          event={activeBreak}
          onComplete={(wasCorrect) => closeBreak(true, wasCorrect)}
          onSkip={() => closeBreak(false)}
        />
      )}
    </div>
  );
}
