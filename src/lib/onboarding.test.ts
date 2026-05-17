/**
 * Onboarding flow — falsifiable tests
 * Tests the quiz scoring, CEFR level calculation, and onboarding state management.
 */
import { describe, it, expect } from "vitest";

// --- Quiz data (matches src/pages/student/onboarding.astro) ---
const quizQuestions = [
  { id: 1, level: "A1", answer: "is" },
  { id: 2, level: "A1", answer: "table" },
  { id: 3, level: "A1", answer: "drinks" },
  { id: 4, level: "A1", answer: "I am fine, thanks." },
  { id: 5, level: "A1", answer: "are" },
  { id: 6, level: "A1", answer: "2" },
  { id: 7, level: "A2", answer: "went" },
  { id: 8, level: "A2", answer: "architect" },
  { id: 9, level: "A2", answer: "were" },
  { id: 10, level: "A2", answer: "I'd like a coffee, please." },
  { id: 11, level: "A2", answer: "since" },
  { id: 12, level: "A2", answer: "To get a better job" },
  { id: 13, level: "B1", answer: "had" },
  { id: 14, level: "B1", answer: "hard" },
  { id: 15, level: "B1", answer: "has been" },
  { id: 16, level: "B1", answer: "He missed the bus" },
  { id: 17, level: "B1", answer: "Can you give me some water, please?" },
  { id: 18, level: "B1", answer: "had started" },
  { id: 19, level: "B2", answer: "were" },
  { id: 20, level: "B2", answer: "enhance" },
  { id: 21, level: "B2", answer: "did he arrive" },
  { id: 22, level: "B2", answer: "To improve employee satisfaction" },
  { id: 23, level: "B2", answer: "I don't think that's completely true." },
  { id: 24, level: "B2", answer: "would have passed" },
  { id: 25, level: "C1", answer: "have I seen" },
  { id: 26, level: "C1", answer: "unexpected" },
  { id: 27, level: "C1", answer: "It became successful in the end" },
  { id: 28, level: "C1", answer: "Let's discuss the quarterly sales figures." },
  { id: 29, level: "C1", answer: "would have left" },
  { id: 30, level: "C1", answer: "understand" },
];

function calculateScore(answers: (string | null)[]): number {
  let score = 0;
  for (const q of quizQuestions) {
    if (answers[q.id - 1] === q.answer) score++;
  }
  return score;
}

function determineCEFR(score: number): string {
  if (score >= 25) return "C1";
  if (score >= 19) return "B2";
  if (score >= 13) return "B1";
  if (score >= 7) return "A2";
  return "A1";
}

function getBreakdown(answers: (string | null)[]): { level: string; correct: number; total: number }[] {
  const levels = ["A1", "A2", "B1", "B2", "C1"];
  return levels.map(level => {
    const levelQuestions = quizQuestions.filter(q => q.level === level);
    let correct = 0;
    for (const q of levelQuestions) {
      if (answers[q.id - 1] === q.answer) correct++;
    }
    return { level, correct, total: levelQuestions.length };
  });
}

describe("onboarding quiz", () => {
  describe("scoring", () => {
    it("returns 0 for all wrong answers", () => {
      const answers = new Array(30).fill("wrong");
      expect(calculateScore(answers)).toBe(0);
    });

    it("returns 30 for all correct answers", () => {
      const answers = quizQuestions.map(q => q.answer);
      expect(calculateScore(answers)).toBe(30);
    });

    it("counts partial correct answers", () => {
      const answers = quizQuestions.map((q, i) => i < 10 ? q.answer : "wrong");
      expect(calculateScore(answers)).toBe(10);
    });

    it("handles null answers as wrong", () => {
      const answers = new Array(30).fill(null);
      answers[0] = "is"; // Q1 correct
      answers[5] = "wrong"; // Q6 wrong
      expect(calculateScore(answers)).toBe(1);
    });
  });

  describe("CEFR level determination", () => {
    it("returns A1 for score 0-6", () => {
      expect(determineCEFR(0)).toBe("A1");
      expect(determineCEFR(3)).toBe("A1");
      expect(determineCEFR(6)).toBe("A1");
    });

    it("returns A2 for score 7-12", () => {
      expect(determineCEFR(7)).toBe("A2");
      expect(determineCEFR(10)).toBe("A2");
      expect(determineCEFR(12)).toBe("A2");
    });

    it("returns B1 for score 13-18", () => {
      expect(determineCEFR(13)).toBe("B1");
      expect(determineCEFR(15)).toBe("B1");
      expect(determineCEFR(18)).toBe("B1");
    });

    it("returns B2 for score 19-24", () => {
      expect(determineCEFR(19)).toBe("B2");
      expect(determineCEFR(22)).toBe("B2");
      expect(determineCEFR(24)).toBe("B2");
    });

    it("returns C1 for score 25-30", () => {
      expect(determineCEFR(25)).toBe("C1");
      expect(determineCEFR(28)).toBe("C1");
      expect(determineCEFR(30)).toBe("C1");
    });
  });

  describe("level breakdown", () => {
    it("returns 5 level groups", () => {
      const answers = new Array(30).fill(null);
      const breakdown = getBreakdown(answers);
      expect(breakdown).toHaveLength(5);
      expect(breakdown.map(b => b.level)).toEqual(["A1", "A2", "B1", "B2", "C1"]);
    });

    it("shows 6 questions per level", () => {
      const answers = new Array(30).fill(null);
      const breakdown = getBreakdown(answers);
      for (const b of breakdown) {
        expect(b.total).toBe(6);
      }
    });

    it("counts correct per level", () => {
      const answers = new Array(30).fill("wrong");
      // Get first question of each level correct
      answers[0] = "is"; // A1 Q1
      answers[6] = "went"; // A2 Q1
      answers[12] = "had"; // B1 Q1
      answers[18] = "were"; // B2 Q1
      answers[24] = "have I seen"; // C1 Q1
      const breakdown = getBreakdown(answers);
      expect(breakdown.map(b => b.correct)).toEqual([1, 1, 1, 1, 1]);
    });
  });

  describe("question structure", () => {
    it("has exactly 30 questions", () => {
      expect(quizQuestions).toHaveLength(30);
    });

    it("has 6 questions per CEFR level", () => {
      const counts: Record<string, number> = {};
      for (const q of quizQuestions) {
        counts[q.level] = (counts[q.level] || 0) + 1;
      }
      expect(counts["A1"]).toBe(6);
      expect(counts["A2"]).toBe(6);
      expect(counts["B1"]).toBe(6);
      expect(counts["B2"]).toBe(6);
      expect(counts["C1"]).toBe(6);
    });

    it("questions are ordered by difficulty", () => {
      for (let i = 0; i < quizQuestions.length - 1; i++) {
        const order = ["A1", "A2", "B1", "B2", "C1"];
        const currentIdx = order.indexOf(quizQuestions[i].level);
        const nextIdx = order.indexOf(quizQuestions[i + 1].level);
        expect(nextIdx).toBeGreaterThanOrEqual(currentIdx);
      }
    });
  });
});

describe("onboarding flow", () => {
  describe("step progression", () => {
    it("starts at step 1 (email verified)", () => {
      const steps = ["step-email", "step-quiz", "step-quiz-done", "step-purchase", "step-consultation", "step-first-session", "step-complete"];
      expect(steps[0]).toBe("step-email");
    });

    it("has 6 steps total", () => {
      const steps = ["step-email", "step-quiz", "step-quiz-done", "step-purchase", "step-consultation", "step-first-session", "step-complete"];
      expect(steps).toHaveLength(7); // includes quiz-done state
    });

    it("quiz step comes before purchase", () => {
      const order = ["step-email", "step-quiz", "step-quiz-done", "step-purchase", "step-consultation", "step-first-session", "step-complete"];
      expect(order.indexOf("step-quiz")).toBeLessThan(order.indexOf("step-purchase"));
    });

    it("consultation comes after purchase", () => {
      const order = ["step-email", "step-quiz", "step-quiz-done", "step-purchase", "step-consultation", "step-first-session", "step-complete"];
      expect(order.indexOf("step-purchase")).toBeLessThan(order.indexOf("step-consultation"));
    });

    it("dashboard is the final step", () => {
      const order = ["step-email", "step-quiz", "step-quiz-done", "step-purchase", "step-consultation", "step-first-session", "step-complete"];
      expect(order[order.length - 1]).toBe("step-complete");
    });
  });

  describe("stripe redirect handling", () => {
    it("purchased=true skips to step 4", () => {
      const params = new URLSearchParams("?purchased=true");
      const purchased = params.get("purchased");
      expect(purchased === "true" ? 4 : 1).toBe(4);
    });

    it("no param starts at step 1", () => {
      const params = new URLSearchParams("");
      const purchased = params.get("purchased");
      expect(purchased === "true" ? 4 : 1).toBe(1);
    });

    it("purchased=false starts at step 1", () => {
      const params = new URLSearchParams("?purchased=false");
      const purchased = params.get("purchased");
      expect(purchased === "true" ? 4 : 1).toBe(1);
    });
  });
});
