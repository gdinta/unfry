// Cognitive load scoring + dual trigger paths. Pure logic, fully unit-testable.
import type { Intensity } from "../lib/classifier";

const INTENSITY_WEIGHT: Record<Intensity, number> = { low: 1, medium: 2, high: 3 };
const DECAY_PER_MINUTE = 0.92; // load decays when you switch to lighter work

export class CognitiveLoadTracker {
  private score = 0;
  private highIntensityStreakMinutes = 0;
  private lastTickTime = Date.now();

  ingestTick(intensity: Intensity, now = Date.now()) {
    const minutesElapsed = (now - this.lastTickTime) / 60000;
    this.score *= Math.pow(DECAY_PER_MINUTE, minutesElapsed);
    this.score += INTENSITY_WEIGHT[intensity];

    if (intensity === "high") {
      this.highIntensityStreakMinutes += minutesElapsed;
    } else {
      this.highIntensityStreakMinutes = Math.max(
        0, this.highIntensityStreakMinutes - minutesElapsed * 0.5
      );
    }
    this.lastTickTime = now;
  }

  // Two paths: sustained high-intensity OR cumulative context-switch load.
  shouldTriggerBreak(thresholdMinutes: number, scoreCeiling = 40): boolean {
    return this.highIntensityStreakMinutes >= thresholdMinutes || this.score > scoreCeiling;
  }

  getState() { return { score: this.score, streak: this.highIntensityStreakMinutes }; }
  reset() { this.score = 0; this.highIntensityStreakMinutes = 0; this.lastTickTime = Date.now(); }
}
