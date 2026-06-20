// Samples the active tab on focus change and on a recurring alarm.
import { classifyTabActivity } from "../lib/classifier";
import { BREAK_DEFAULTS } from "../config";

export type Tick = {
  timestamp: string;
  category: string;
  intensity: "low" | "medium" | "high";
  confidenceScore: number;
  domainBucket: string;
};

function domainBucket(hostname: string): string {
  const map: Record<string, string> = {
    "mail.google.com": "gmail", "github.com": "github",
    "docs.google.com": "gdocs", "sheets.google.com": "sheets",
    "slack.com": "slack", "zoom.us": "zoom",
  };
  for (const k in map) if (hostname.includes(k)) return map[k];
  return hostname.split(".").slice(-2, -1)[0] || "other";
}

export async function sampleActiveTab(): Promise<Tick | null> {
  const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
  if (!tab?.id || !tab.url || tab.url.startsWith("chrome")) return null;

  let ctx: any;
  try {
    ctx = await chrome.tabs.sendMessage(tab.id, { type: "UNFRY_SCRAPE" });
  } catch {
    ctx = { title: tab.title || "", url: new URL(tab.url).hostname, headingText: "" };
  }
  if (!ctx) return null;

  const { category, confidence, intensity } = await classifyTabActivity(ctx.title, ctx.headingText);
  return {
    timestamp: new Date().toISOString(),
    category, intensity,
    confidenceScore: confidence,
    domainBucket: domainBucket(ctx.url),
  };
}

export function startSampling(onTick: (t: Tick) => void) {
  chrome.alarms.create("unfry-sample", { periodInMinutes: BREAK_DEFAULTS.tickIntervalMs / 60000 });
  chrome.alarms.onAlarm.addListener(async (a) => {
    if (a.name !== "unfry-sample") return;
    const tick = await sampleActiveTab();
    if (tick) onTick(tick);
  });
  chrome.tabs.onActivated.addListener(async () => {
    const tick = await sampleActiveTab();
    if (tick) onTick(tick);
  });
}
