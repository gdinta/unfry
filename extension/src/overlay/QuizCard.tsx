import React, { useState } from "react";

const ink = "rgba(255,255,255,0.92)";
const dim = "rgba(255,255,255,0.58)";
const faint = "rgba(255,255,255,0.34)";
const violet = "#A78BFA";
const cyan = "#5EEAD4";
const rose = "#FB7185";
const amber = "#FBBF24";

export function QuizCard({ challenge, dominantCategory, onComplete, onSkip, onOpenDashboard }: any) {
  const [picked, setPicked] = useState<number | null>(null);
  const isQuiz = challenge.type === "quiz";

  return (
    <>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
        <span style={{ width: 8, height: 8, borderRadius: 999, background: amber, boxShadow: `0 0 12px ${amber}` }} />
        <span style={{ color: dim, fontSize: 12, letterSpacing: ".06em", textTransform: "uppercase" }}>
          Time to unfry · 2 min
        </span>
      </div>
      <div style={{ color: faint, fontSize: 12.5, marginBottom: 18 }}>
        You've been deep in <b style={{ color: violet }}>{String(dominantCategory).replace(/_/g, " ")}</b>.
        A palate cleanser, not more work.
      </div>

      {isQuiz ? (
        <>
          <div style={{ color: ink, fontSize: 16.5, fontWeight: 600, lineHeight: 1.35, marginBottom: 16 }}>
            {challenge.question}
          </div>
          <div style={{ display: "grid", gap: 9 }}>
            {challenge.options.map((opt: string, i: number) => {
              const show = picked !== null;
              const correct = i === challenge.correctIndex;
              let bd = "rgba(255,255,255,0.12)", bg = "rgba(255,255,255,0.04)", col = ink;
              if (show && correct) { bd = `${cyan}80`; bg = `${cyan}18`; col = cyan; }
              else if (show && i === picked) { bd = `${rose}80`; bg = `${rose}18`; col = rose; }
              return (
                <button key={i} disabled={show} onClick={() => setPicked(i)}
                  style={{ textAlign: "left", padding: "12px 14px", borderRadius: 13,
                    border: `1px solid ${bd}`, background: bg, color: col, fontSize: 14,
                    cursor: show ? "default" : "pointer", transition: "all .25s" }}>
                  {opt}
                </button>
              );
            })}
          </div>
          {picked !== null && (
            <div style={{ marginTop: 14, padding: "11px 13px", borderRadius: 12,
              background: "rgba(255,255,255,0.04)", color: dim, fontSize: 13, lineHeight: 1.45 }}>
              {picked === challenge.correctIndex ? "Nice — " : "Not quite. "}{challenge.explanation}
            </div>
          )}
        </>
      ) : (
        <>
          <div style={{ color: ink, fontSize: 17, fontWeight: 600, marginBottom: 14 }}>{challenge.title}</div>
          <div style={{ display: "grid", gap: 10 }}>
            {challenge.bulletPoints.map((b: string, i: number) => (
              <div key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                <span style={{ color: cyan, marginTop: 2, fontSize: 13 }}>—</span>
                <span style={{ color: dim, fontSize: 14, lineHeight: 1.4 }}>{b}</span>
              </div>
            ))}
          </div>
        </>
      )}

      <div style={{ display: "flex", gap: 10, marginTop: 22 }}>
        <button onClick={() => onComplete(isQuiz ? picked === challenge.correctIndex : true)}
          disabled={isQuiz && picked === null}
          style={{ flex: 1, padding: 12, borderRadius: 13, border: "none",
            background: (isQuiz && picked === null) ? "rgba(255,255,255,0.08)" : `linear-gradient(135deg, ${violet}, ${cyan})`,
            color: (isQuiz && picked === null) ? faint : "#0B0E1A", fontWeight: 700, fontSize: 14,
            cursor: (isQuiz && picked === null) ? "not-allowed" : "pointer" }}>
          Back to work
        </button>
        <button onClick={onSkip}
          style={{ padding: "12px 16px", borderRadius: 13, border: "1px solid rgba(255,255,255,0.12)",
            background: "transparent", color: dim, fontSize: 14, cursor: "pointer" }}>
          Skip
        </button>
      </div>

      {onOpenDashboard && (
        <button
          onClick={onOpenDashboard}
          style={{ width: "100%", marginTop: 10, padding: "10px 14px", borderRadius: 13,
            border: "1px dashed rgba(255,255,255,0.12)", background: "transparent", color: faint,
            fontSize: 12.5, cursor: "pointer", display: "flex", alignItems: "center",
            justifyContent: "center", gap: 7, transition: "all .2s" }}
          onMouseEnter={(e: any) => { e.currentTarget.style.color = violet; e.currentTarget.style.borderColor = `${violet}80`; }}
          onMouseLeave={(e: any) => { e.currentTarget.style.color = faint; e.currentTarget.style.borderColor = "rgba(255,255,255,0.12)"; }}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
            strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
            <polyline points="15 3 21 3 21 9" />
            <line x1="10" y1="14" x2="21" y2="3" />
          </svg>
          Open dashboard instead
        </button>
      )}
    </>
  );
}