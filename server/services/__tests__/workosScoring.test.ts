import { describe, it, expect } from "vitest";
import {
  clamp,
  daysUntil,
  urgencyScore,
  impactScorePoints,
  strategicAlignmentPoints,
  delayTolerancePenalty,
  classifyPriority,
  classifyRisk,
} from "../workosScoring.js";

describe("workosScoring Service", () => {
  describe("clamp()", () => {
    it("should clamp values within range", () => {
      expect(clamp(5, 0, 10)).toBe(5);
      expect(clamp(-5, 0, 10)).toBe(0);
      expect(clamp(15, 0, 10)).toBe(10);
    });
  });

  describe("urgencyScore()", () => {
    it("should return 0 for completed tasks", () => {
      const task = { dueDate: new Date(), status: "Completed" as const };
      expect(urgencyScore(task as any)).toBe(0);
    });

    it("should return 30 for overdue tasks", () => {
      const pastDate = new Date(Date.now() - 86400000 * 2);
      const task = { dueDate: pastDate, status: "Pending" as const };
      expect(urgencyScore(task as any)).toBe(30);
    });

    it("should return higher urgency for closer due dates", () => {
      const tomorrow = new Date(Date.now() + 86400000 * 0.5);
      const task = { dueDate: tomorrow, status: "Pending" as const };
      expect(urgencyScore(task as any)).toBe(25);
    });
  });

  describe("impactScorePoints()", () => {
    it("should convert 0-10 impact score to 0-25 points scale", () => {
      expect(impactScorePoints(10)).toBe(25);
      expect(impactScorePoints(0)).toBe(0);
      expect(impactScorePoints(5)).toBe(13);
    });
  });

  describe("classifyPriority()", () => {
    it("should map scores to priority levels correctly", () => {
      expect(classifyPriority(95)).toBe("Critical");
      expect(classifyPriority(75)).toBe("High");
      expect(classifyPriority(50)).toBe("Medium");
      expect(classifyPriority(20)).toBe("Low");
    });
  });

  describe("classifyRisk()", () => {
    it("should map risk scores correctly", () => {
      expect(classifyRisk(90)).toBe("Critical");
      expect(classifyRisk(70)).toBe("High");
      expect(classifyRisk(40)).toBe("Moderate");
      expect(classifyRisk(10)).toBe("Low");
    });
  });
});
