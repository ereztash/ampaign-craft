import { describe, it, expect } from "vitest";
import {
  calculateBurstiness,
  calculatePerplexity,
  analyzeRegisterShifts,
  analyzeAIDetection,
} from "../perplexityBurstiness";

describe("Perplexity & Burstiness Engine", () => {
  // ═══════════════════════════════════════════════
  // BURSTINESS
  // ═══════════════════════════════════════════════

  describe("calculateBurstiness", () => {
    it("returns high burstiness for varied sentence lengths", () => {
      // Mix of very short and very long sentences
      const text = "עצור. חשוב על זה. כי מה שאני עומד לספר לך עכשיו הוא דבר שישנה לחלוטין את הדרך שבה אתה מסתכל על השיווק הדיגיטלי של העסק שלך ואולי אפילו על החיים שלך. פשוט. ככה זה.";
      const result = calculateBurstiness(text);
      expect(result.sentenceLengthCV).toBeGreaterThan(0.3);
      expect(result.overallBurstiness).toBeGreaterThan(20);
    });

    it("returns low burstiness for uniform sentence lengths", () => {
      // All sentences roughly same length
      const text = "זה משפט בינוני באורכו. גם זה משפט בינוני באורכו. עוד משפט בינוני באורכו כאן. ומשפט אחרון בינוני באורכו.";
      const result = calculateBurstiness(text);
      expect(result.sentenceLengthCV).toBeLessThan(0.3);
    });

    it("handles empty text", () => {
      const result = calculateBurstiness("");
      expect(result.overallBurstiness).toBe(0);
      expect(result.sentenceLengthCV).toBe(0);
    });

    it("handles single sentence", () => {
      const result = calculateBurstiness("משפט אחד בלבד.");
      expect(result.sentenceLengthCV).toBe(0);
    });

    it("calculates paragraph length CV for multi-paragraph text", () => {
      const text = "פסקה קצרה.\n\nפסקה ארוכה יותר עם יותר מילים ותוכן מפורט שנותן הקשר נוסף ומסביר את הנושא בצורה מעמיקה יותר לקורא.\n\nקצר.";
      const result = calculateBurstiness(text);
      expect(result.paragraphLengthCV).toBeGreaterThan(0);
    });
  });

  // ═══════════════════════════════════════════════
  // PERPLEXITY
  // ═══════════════════════════════════════════════

  describe("calculatePerplexity", () => {
    it("detects rare words vs common words", () => {
      // Text with mostly common words
      const commonText = "אני לא יודע מה זה אבל הוא אמר שזה טוב מאוד";
      const commonResult = calculatePerplexity(commonText);

      // Text with domain-specific/rare words
      const rareText = "האלגוריתם הנוירולינגוויסטי מנתח סטילומטריה קוגניטיבית במרחב הסמנטי";
      const rareResult = calculatePerplexity(rareText);

      expect(rareResult.rareWordRatio).toBeGreaterThan(commonResult.rareWordRatio);
    });

    it("calculates bigram surprise score", () => {
      // Repetitive text (low surprise)
      const repetitive = "אני רוצה לדעת. אני רוצה לדעת. אני רוצה לדעת.";
      const repResult = calculatePerplexity(repetitive);

      // Diverse text (high surprise)
      const diverse = "השוק משתנה. הלקוחות דורשים. הטכנולוגיה מתפתחת. המתחרים צומחים.";
      const divResult = calculatePerplexity(diverse);

      expect(divResult.bigramSurpriseScore).toBeGreaterThan(repResult.bigramSurpriseScore);
    });

    it("handles empty text", () => {
      const result = calculatePerplexity("");
      expect(result.rareWordRatio).toBe(0);
      expect(result.bigramSurpriseScore).toBe(0);
      expect(result.lexicalSurprise).toBe(0);
    });

    it("handles text with no Hebrew", () => {
      const result = calculatePerplexity("This is English text only");
      expect(result.rareWordRatio).toBe(0);
    });
  });

  // ═══════════════════════════════════════════════
  // REGISTER SHIFTS
  // ═══════════════════════════════════════════════

  describe("analyzeRegisterShifts", () => {
    it("detects no shifts in uniform casual text", () => {
      const text = "יאללה סבבה אחלה. כאילו כזה פשוט. בקיצור סבבה.";
      const result = analyzeRegisterShifts(text);
      expect(result.shiftCount).toBe(0);
      expect(result.consistency).toBe(100);
    });

    it("detects shift from formal to casual", () => {
      const text = "לפיכך יש לציין כי המחקר מצביע על שיפור משמעותי בהתאם לנתונים. יאללה תכלס זה עובד סבבה.";
      const result = analyzeRegisterShifts(text);
      expect(result.shiftCount).toBeGreaterThanOrEqual(1);
      expect(result.segments.length).toBeGreaterThanOrEqual(2);
    });

    it("handles single sentence", () => {
      const result = analyzeRegisterShifts("משפט אחד בלבד.");
      expect(result.shiftCount).toBe(0);
      expect(result.consistency).toBe(100);
    });

    it("handles empty text", () => {
      const result = analyzeRegisterShifts("");
      expect(result.shiftCount).toBe(0);
    });
  });

  // ═══════════════════════════════════════════════
  // AI DETECTION
  // ═══════════════════════════════════════════════

  describe("analyzeAIDetection", () => {
    it("returns scores in valid ranges", () => {
      const text = "זה טקסט לדוגמה. הוא מכיל כמה משפטים. כל משפט שונה מהקודם. יש גם משפט ארוך יותר שמכיל יותר מילים ונותן הקשר.";
      const result = analyzeAIDetection(text);

      expect(result.humanScore).toBeGreaterThanOrEqual(0);
      expect(result.humanScore).toBeLessThanOrEqual(100);
      expect(result.burstiness.overallBurstiness).toBeGreaterThanOrEqual(0);
      expect(result.perplexity.lexicalSurprise).toBeGreaterThanOrEqual(0);
    });

    it("assigns correct verdict based on humanScore", () => {
      const text = "טקסט קצר.";
      const result = analyzeAIDetection(text);
      const validVerdicts = ["human", "likely-human", "uncertain", "likely-ai", "ai"];
      expect(validVerdicts).toContain(result.verdict);
    });

    it("provides actionable tips", () => {
      // Very uniform text should generate tips
      const uniformText = "משפט רגיל בינוני. משפט רגיל בינוני. משפט רגיל בינוני. משפט רגיל בינוני.";
      const result = analyzeAIDetection(uniformText);
      // Tips should have both he and en
      for (const tip of result.tips) {
        expect(tip.he).toBeDefined();
        expect(tip.en).toBeDefined();
        expect(tip.he.length).toBeGreaterThan(0);
        expect(tip.en.length).toBeGreaterThan(0);
      }
    });

    it("handles empty text gracefully", () => {
      const result = analyzeAIDetection("");
      expect(result.humanScore).toBeGreaterThanOrEqual(0);
      expect(result.verdict).toBeDefined();
    });

    it("scores varied human-like text higher than uniform AI-like text", () => {
      const humanLike = "עצור! חשוב על זה רגע. כי מה שאני עומד לספר לך עכשיו — וזה לא קלישאה, תכלס — ישנה את הגישה שלך לשיווק. לגמרי. המחקר מצביע על שיפור של 47.3% בהמרות. בקיצור? תפסיק לנחש ותתחיל למדוד.";
      const aiLike = "שיפור ביצועים הוא חשוב מאוד. כל עסק צריך לשפר את הביצועים שלו. ניתן לשפר ביצועים בדרכים שונות. שיפור הביצועים מוביל לתוצאות טובות יותר.";

      const humanResult = analyzeAIDetection(humanLike);
      const aiResult = analyzeAIDetection(aiLike);

      expect(humanResult.humanScore).toBeGreaterThan(aiResult.humanScore);
    });
  });
});
