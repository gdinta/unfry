// Point this at your deployed Next.js app (or localhost during dev).
export const WEB_APP_URL = "http://localhost:3000";

// Demo-friendly defaults; users can override via the popup later.
export const BREAK_DEFAULTS = {
  highIntensityThresholdMinutes: 20, // sustained high-intensity path
  loadScoreCeiling: 40,              // cumulative-load path
  tickIntervalMs: 15000,             // how often an active tab is sampled
};
