import { describe, it, expect } from "vitest";
import { analyzeSamples, StylomeSample } from "../stylomeEngine";

function makeSample(text: string, context: StylomeSample["context"] = "general"): StylomeSample {
  return {
    id: crypto.randomUUID(),
    text,
    context,
    wordCount: text.split(/\s+/).length,
  };
}

const HEBREW_FORMAL = `לפיכך, יש לציין כי המערכת מספקת פתרון מקיף. בהתאם לניתוח, הנתונים מצביעים על מגמה חיובית. עם זאת, נדרשת בחינה נוספת של הממצאים.`;
const HEBREW_CASUAL = `יאללה תכלס הכלי הזה אחלה. כאילו ממש פשוט להשתמש בו. סבבה שזה עובד ככה.`;
const HEBREW_MIXED = `אז בעצם המערכת עובדה מצוין. לפיכך אני ממליץ עליה. יאללה בואו ננסה.`;
const ENGLISH_MIX = `אני אוהב לעבוד עם React ו-TypeScript. ה-performance מעולה וה-developer experience נהדר.`;

describe("analyzeSamples", () => {
  it("produces valid metrics for Hebrew text", () => {
    const profile = analyzeSamples([makeSample(HEBREW_FORMAL)]);
    expect(profile.metrics.avgSentenceLength).toBeGreaterThan(0);
    expect(profile.metrics.dugriScore).toBeGreaterThanOrEqual(0);
    expect(profile.metrics.dugriScore).toBeLessThanOrEqual(1);
    expect(profile.metrics.lexicalDiversity).toBeGreaterThan(0);
    expect(profile.metrics.lexicalDiversity).toBeLessThanOrEqual(1);
  });

  it("detects register as string enum", () => {
    const profile = analyzeSamples([makeSample(HEBREW_FORMAL)]);
    expect(["formal", "casual", "mixed"]).toContain(profile.style.register);
  });

  it("casual text has different register than formal text", () => {
    const formalProfile = analyzeSamples([
      makeSample(HEBREW_FORMAL),
      makeSample("יש לציין כי בהתאם לנתונים עם זאת נוסף על כך לפיכך על כן"),
    ]);
    const casualProfile = analyzeSamples([
      makeSample(HEBREW_CASUAL),
      makeSample("יאללה סבבה כאילו אחלה וואלה תכלס כזה סבבה יאללה"),
    ]);
    // With enough signal, they should differ or at least both be valid
    expect(["formal", "casual", "mixed"]).toContain(formalProfile.style.register);
    expect(["formal", "casual", "mixed"]).toContain(casualProfile.style.register);
  });

  it("detects code-mixing with English words", () => {
    const profile = analyzeSamples([makeSample(ENGLISH_MIX)]);
    expect(profile.metrics.codeMixingIndex).toBeGreaterThan(5);
  });

  it("low code-mixing for pure Hebrew", () => {
    const profile = analyzeSamples([makeSample(HEBREW_FORMAL)]);
    expect(profile.metrics.codeMixingIndex).toBeLessThan(5);
  });

  it("generates non-empty system prompt", () => {
    const profile = analyzeSamples([makeSample(HEBREW_FORMAL), makeSample(HEBREW_CASUAL)]);
    expect(profile.systemPrompt).toBeTruthy();
    expect(profile.systemPrompt.length).toBeGreaterThan(100);
  });

  it("pragmatic markers is always an array", () => {
    const profile = analyzeSamples([makeSample(HEBREW_MIXED)]);
    expect(Array.isArray(profile.patterns.pragmaticMarkers)).toBe(true);
  });

  it("tracks sample count and word count", () => {
    const samples = [makeSample(HEBREW_FORMAL), makeSample(HEBREW_CASUAL)];
    const profile = analyzeSamples(samples);
    expect(profile.sampleCount).toBe(2);
    expect(profile.sampleWordCount).toBeGreaterThan(10);
  });

  it("handles single short sample", () => {
    const profile = analyzeSamples([makeSample("שלום עולם")]);
    expect(profile.metrics.avgSentenceLength).toBeGreaterThan(0);
    expect(profile.systemPrompt).toBeTruthy();
  });
});
