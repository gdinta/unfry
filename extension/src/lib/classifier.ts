// Local activity classifier — runs entirely in the extension, never hits a server.
//
// NOTE: The embedding model (Transformers.js / onnxruntime) cannot load inside
// an MV3 service worker — there's no WebGPU/WASM backend available there, which
// throws "no available backend found". So this uses a fast keyword-anchor matcher
// instead. Same input/output contract as the embedding version.

export type Category =
  | "writing_email" | "auditing_code" | "analyzing_spreadsheet"
  | "reading_docs" | "auditing_ai_output" | "messaging"
  | "meeting_notes" | "research_browsing" | "other";

export type Intensity = "low" | "medium" | "high";

const ANCHOR_KEYWORDS: Record<Exclude<Category, "other">, string[]> = {
  auditing_ai_output: ["ai", "chatgpt", "claude", "gemini", "copilot", "generated", "fact-check", "hallucinat", "prompt"],
  auditing_code: ["pull request", "code review", "github", "gitlab", "diff", "merge", "lint", "pr #", "commit"],
  analyzing_spreadsheet: ["sheet", "excel", "pivot", "vlookup", "sumif", "formula", "cell", "csv"],
  writing_email: ["gmail", "compose", "reply", "inbox", "email", "outlook", "draft message"],
  reading_docs: ["documentation", "api reference", "docs", "readme", "guide", "manual"],
  messaging: ["slack", "teams", "discord", "chat", "dm", "thread", "message"],
  meeting_notes: ["zoom", "meet", "meeting", "calendar", "standup", "call notes", "webex"],
  research_browsing: ["search", "wikipedia", "article", "blog", "stack overflow", "stackoverflow", "news"],
};

const INTENSITY_MAP: Record<Category, Intensity> = {
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

// kept async to preserve the original call signature in tabMonitor.ts
export async function initClassifier(): Promise<void> {
  return;
}

export async function classifyTabActivity(title: string, headingText: string) {
  const text = `${title} ${headingText}`.toLowerCase();

  let best: { category: Category; score: number } = { category: "other", score: 0.2 };
  for (const [category, kws] of Object.entries(ANCHOR_KEYWORDS)) {
    let hits = 0;
    for (const kw of kws) if (text.includes(kw)) hits++;
    if (hits === 0) continue;
    const score = Math.min(0.62 + hits * 0.12, 0.97);
    if (score > best.score) best = { category: category as Category, score };
  }

  return {
    category: best.category,
    confidence: best.score,
    intensity: INTENSITY_MAP[best.category],
  };
}

export { INTENSITY_MAP };