import { describe, it, expect } from "vitest";
import { classifyUserState } from "../userStateClassifier";
import type { ClassificationInput } from "../userStateClassifier";

const base: ClassificationInput = { message: "", history: [], messageCount: 3 };

describe("classifyUserState — HOLD", () => {
  it("detects Hebrew fatigue keyword", () => {
    const r = classifyUserState({ ...base, message: "אני עייף, לא יודע לאן להמשיך" });
    expect(r.mode).toBe("HOLD");
  });
  it("detects Hebrew overwhelm", () => {
    const r = classifyUserState({ ...base, message: "אני מוצף לגמרי עם כל זה" });
    expect(r.mode).toBe("HOLD");
  });
  it("detects English exhausted", () => {
    const r = classifyUserState({ ...base, message: "I'm exhausted and don't know what to do" });
    expect(r.mode).toBe("HOLD");
  });
  it("HOLD takes priority over STRUCTURE even if both match", () => {
    const r = classifyUserState({ ...base, message: "אני עייף ומבולבל" });
    expect(r.mode).toBe("HOLD");
  });
});

describe("classifyUserState — OPERATIONALIZE", () => {
  it("detects readiness phrase", () => {
    const r = classifyUserState({ ...base, message: "בסדר, מה עושים?" });
    expect(r.mode).toBe("OPERATIONALIZE");
  });
  it("detects Hebrew 'אני מוכן'", () => {
    const r = classifyUserState({ ...base, message: "אני מוכן להתחיל" });
    expect(r.mode).toBe("OPERATIONALIZE");
  });
  it("detects 'תעשה מזה'", () => {
    const r = classifyUserState({ ...base, message: "תעשה מזה כלי" });
    expect(r.mode).toBe("OPERATIONALIZE");
  });
  it("detects 'let's do'", () => {
    const r = classifyUserState({ ...base, message: "let's do it" });
    expect(r.mode).toBe("OPERATIONALIZE");
  });
  it("OPERATIONALIZE beats CLARIFY", () => {
    const r = classifyUserState({ ...base, message: "בסדר, מה עושים עם הערך?" });
    expect(r.mode).toBe("OPERATIONALIZE");
  });
});

describe("classifyUserState — CHALLENGE", () => {
  it("detects Hebrew challenge request", () => {
    const r = classifyUserState({ ...base, message: "תאתגר אותי" });
    expect(r.mode).toBe("CHALLENGE");
  });
  it("detects English push back", () => {
    const r = classifyUserState({ ...base, message: "push back on my thinking" });
    expect(r.mode).toBe("CHALLENGE");
  });
});

describe("classifyUserState — STRUCTURE", () => {
  it("detects confusion", () => {
    const r = classifyUserState({ ...base, message: "אני מבולבל, יש כל כך הרבה כיוונים" });
    expect(r.mode).toBe("STRUCTURE");
  });
  it("detects too many options phrase", () => {
    const r = classifyUserState({ ...base, message: "too many things to deal with" });
    expect(r.mode).toBe("STRUCTURE");
  });
});

describe("classifyUserState — CLARIFY", () => {
  it("detects abstract word בהירות", () => {
    const r = classifyUserState({ ...base, message: "אני מחפש בהירות" });
    expect(r.mode).toBe("CLARIFY");
  });
  it("detects 'חכם יותר'", () => {
    const r = classifyUserState({ ...base, message: "זה לא מספיק חכם יותר" });
    expect(r.mode).toBe("CLARIFY");
  });
  it("detects English clarity", () => {
    const r = classifyUserState({ ...base, message: "I need clarity on the strategy" });
    expect(r.mode).toBe("CLARIFY");
  });
});

describe("classifyUserState — default by messageCount", () => {
  it("short conversation (≤2) → CLARIFY", () => {
    const r = classifyUserState({ ...base, message: "שלום", messageCount: 1 });
    expect(r.mode).toBe("CLARIFY");
  });
  it("long conversation (≥8) → OPERATIONALIZE", () => {
    const r = classifyUserState({ ...base, message: "שלום", messageCount: 10 });
    expect(r.mode).toBe("OPERATIONALIZE");
  });
  it("mid conversation (3-7) → STRUCTURE", () => {
    const r = classifyUserState({ ...base, message: "שלום", messageCount: 5 });
    expect(r.mode).toBe("STRUCTURE");
  });
});

describe("classifyUserState — triggerKeywords", () => {
  it("returns matched keywords for HOLD", () => {
    const r = classifyUserState({ ...base, message: "אני עייף מאוד" });
    expect(r.triggerKeywords.length).toBeGreaterThan(0);
  });
  it("returns empty array when defaulting by messageCount", () => {
    const r = classifyUserState({ ...base, message: "שלום", messageCount: 1 });
    expect(r.triggerKeywords).toEqual([]);
  });
});
