import React, { useState } from "react";
import { GlassPanel } from "./GlassPanel";
import { QuizCard } from "./QuizCard";
import { FALLBACK } from "./challengeBank";
import { WEB_APP_URL } from "../config";

type Props = { detail: any; onClose: () => void };

export function OverlayApp({ detail, onClose }: Props) {
  const challenge = detail.challenge || FALLBACK[detail.dominantCategory] || FALLBACK.default;
  const [done, setDone] = useState(false);

  async function respond(status: "completed" | "skipped", wasCorrect?: boolean) {
    try {
      await fetch(`${WEB_APP_URL}/api/break-events`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ breakEventId: detail.breakEventId, status, wasCorrect }),
      });
    } catch { /* offline — fine for demo */ }
    setDone(true);
    setTimeout(onClose, 250);
  }

  function openDashboard() {
    window.open(`${WEB_APP_URL}/dashboard`, "_blank", "noopener,noreferrer");
  }

  if (done) return null;

  return (
    <GlassPanel>
      <QuizCard
        challenge={challenge}
        dominantCategory={detail.dominantCategory}
        onComplete={(correct: boolean) => respond("completed", correct)}
        onSkip={() => respond("skipped")}
        onOpenDashboard={openDashboard}
      />
    </GlassPanel>
  );
}