// Local fallback bank — served instantly if the Gemini call errors or times out.
export const FALLBACK: Record<string, any> = {
  auditing_ai_output: {
    type: "quiz",
    question: "You're auditing an AI draft that cites a 2019 study with confident specifics. Best first move?",
    options: ["Trust it — the tone is confident", "Verify the citation exists before keeping the claim", "Delete all numbers", "Rewrite in your own voice and ship"],
    correctIndex: 1,
    explanation: "Confident phrasing is not evidence — fabricated citations are the classic LLM failure mode.",
    estimatedSeconds: 25,
  },
  auditing_code: {
    type: "quiz",
    question: "A PR adds a try/catch that swallows the error and returns null. Flag it because…",
    options: ["null is slower than undefined", "It hides failures and makes debugging blind", "try/catch is deprecated", "It needs more comments"],
    correctIndex: 1,
    explanation: "Silent catches turn loud bugs into quiet ones that surface far from the cause.",
    estimatedSeconds: 25,
  },
  analyzing_spreadsheet: {
    type: "quiz",
    question: "VLOOKUP returns #N/A on values you can see in the table. Most likely cause?",
    options: ["The file is too large", "Leading/trailing spaces or text-vs-number mismatch", "VLOOKUP caps at 100 rows", "You must use XLOOKUP"],
    correctIndex: 1,
    explanation: "Whitespace and type mismatches break exact matches — TRIM and check cell format.",
    estimatedSeconds: 30,
  },
  writing_email: {
    type: "tutorial_card",
    title: "Sharper email in 3 moves",
    bulletPoints: ["Lead with the ask, not the backstory", "One email, one decision needed", "Replace 'just wanted to' with the verb itself"],
    estimatedSeconds: 20,
  },
  default: {
    type: "tutorial_card",
    title: "Two-minute reset",
    bulletPoints: ["Look 20ft away for 20 seconds", "Drop your shoulders, exhale slow", "Name your one next action before returning"],
    estimatedSeconds: 30,
  },
};
