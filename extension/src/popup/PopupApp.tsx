import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";

function Popup() {
  const [state, setState] = useState<{ score: number; streak: number }>({ score: 0, streak: 0 });

  useEffect(() => {
    const read = () => chrome.storage.local.get("liveState").then((r) => r.liveState && setState(r.liveState));
    read();
    const id = setInterval(read, 1000);
    return () => clearInterval(id);
  }, []);

  const snooze = () => chrome.storage.local.set({ snoozedUntil: Date.now() + 30 * 60000 });

  const [firing, setFiring] = useState(false);
  const triggerNow = () => {
    setFiring(true);
    chrome.runtime.sendMessage({ type: "UNFRY_TRIGGER_NOW" }, () => {
      setTimeout(() => window.close(), 150);
    });
  };

  return (
    <div style={{ padding: 16, fontFamily: "Inter, system-ui, sans-serif",
      background: "#0B0E1A", color: "rgba(255,255,255,0.92)" }}>
      <div style={{ fontSize: 18, fontWeight: 800 }}>Un<span style={{ color: "#A78BFA" }}>Fry</span></div>
      <div style={{ fontSize: 11, color: "rgba(255,255,255,0.34)", marginBottom: 14 }}>current session</div>
      <div style={{ fontSize: 32, fontWeight: 800, color: state.score > 30 ? "#FB7185" : "#5EEAD4" }}>
        {state.score.toFixed(0)}
      </div>
      <div style={{ fontSize: 11, color: "rgba(255,255,255,0.58)" }}>cognitive load · {state.streak.toFixed(1)} min high streak</div>
      <button onClick={triggerNow} disabled={firing}
        style={{ marginTop: 14, width: "100%", padding: 10, borderRadius: 10, border: "none",
          background: "linear-gradient(135deg, #A78BFA, #5EEAD4)", color: "#0B0E1A",
          cursor: firing ? "default" : "pointer", fontSize: 13, fontWeight: 700 }}>
        {firing ? "Opening break…" : "Trigger break now"}
      </button>
      <button onClick={snooze}
        style={{ marginTop: 8, width: "100%", padding: 10, borderRadius: 10, border: "none",
          background: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.58)", cursor: "pointer", fontSize: 13 }}>
        Snooze breaks 30 min
      </button>
    </div>
  );
}

createRoot(document.getElementById("root")!).render(<Popup />);
