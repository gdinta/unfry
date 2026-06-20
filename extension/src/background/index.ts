// Service worker entry: wires sampling → load tracking → break triggering → sync.
import { CognitiveLoadTracker } from "./loadTracker";
import { startSampling, type Tick } from "./tabMonitor";
import { WEB_APP_URL, BREAK_DEFAULTS } from "../config";

const tracker = new CognitiveLoadTracker();
let sessionId: string | null = null;
let recent: Tick[] = [];
let tickBuffer: Tick[] = [];

async function ensureSession() {
  if (sessionId) return sessionId;
  const stored = await chrome.storage.local.get("sessionId");
  sessionId = stored.sessionId || crypto.randomUUID();
  await chrome.storage.local.set({ sessionId });
  return sessionId;
}

function dominantCategory(ticks: Tick[]): string {
  const counts: Record<string, number> = {};
  for (const t of ticks) counts[t.category] = (counts[t.category] || 0) + 1;
  return Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] || "other";
}

async function flushTicks() {
  if (!tickBuffer.length) return;
  const sid = await ensureSession();
  const batch = tickBuffer.splice(0, tickBuffer.length);
  try {
    await fetch(`${WEB_APP_URL}/api/ticks`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId: sid, ticks: batch }),
    });
  } catch {
    // offline: keep them buffered in storage for later sync
    const prev = (await chrome.storage.local.get("pendingTicks")).pendingTicks || [];
    await chrome.storage.local.set({ pendingTicks: [...prev, ...batch] });
  }
}

async function triggerBreak() {
  const sid = await ensureSession();
  const dominant = dominantCategory(recent);
  const breakEventId = crypto.randomUUID();

  let challenge: any = null;
  try {
    const ctrl = new AbortController();
    const timeout = setTimeout(() => ctrl.abort(), 3000); // demo safety
    const res = await fetch(`${WEB_APP_URL}/api/challenge/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: ctrl.signal,
      body: JSON.stringify({
        breakEventId,
        dominantTopic: dominant,
        recentCategories: recent.slice(-8).map((t) => t.category),
        userSkillLevel: "intermediate",
        preferredChallengeType: dominant === "writing_email" ? "tutorial_card" : "quiz",
      }),
    });
    clearTimeout(timeout);
    challenge = (await res.json()).challenge?.generatedContent;
  } catch {
    challenge = null; // overlay falls back to its built-in card
  }

  const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
  if (!tab?.id || !tab.url || tab.url.startsWith("chrome")) {
    tracker.reset();
    return;
  }


  await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: (payload) => {
      console.log("Dispatching UNFRY_BREAK event:", payload);
      window.dispatchEvent(new CustomEvent("UNFRY_BREAK", { detail: payload }));
    },
    args: [{ breakEventId, dominantCategory: dominant, challenge, sessionId: sid }],
  }).catch((err) => {
    console.error("Event dispatch failed:", err);
  });



  tracker.reset();
}

function onTick(tick: Tick) {
  tracker.ingestTick(tick.intensity);
  recent = [...recent, tick].slice(-12);
  tickBuffer.push(tick);
  if (tickBuffer.length >= 5) flushTicks();

  const { score, streak } = tracker.getState();
  chrome.storage.local.set({ liveState: { score, streak } });

  if (tracker.shouldTriggerBreak(BREAK_DEFAULTS.highIntensityThresholdMinutes, BREAK_DEFAULTS.loadScoreCeiling)) {
    triggerBreak();
  }
}

// Manual trigger from the popup ("Trigger break now").
chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg?.type === "UNFRY_TRIGGER_NOW") {
    triggerBreak().then(() => sendResponse({ ok: true }));
    return true; // keep the channel open for the async response
  }
});

startSampling(onTick);
