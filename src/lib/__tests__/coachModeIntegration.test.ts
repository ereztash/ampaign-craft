/**
 * Integration: classifyUserState → CoachMode → edge function mode key
 *
 * Verifies the full classify → request-payload pipeline so the LLM always
 * receives an explicit mode rather than defaulting silently to STRUCTURE.
 */
import { describe, it, expect } from "vitest";
import { classifyUserState } from "../userStateClassifier";
import type { CoachMode } from "../userStateClassifier";

// Edge function accepts exactly these mode strings (mirrors modeInstructions keys).
const VALID_EDGE_MODES: CoachMode[] = [
  "HOLD",
  "CLARIFY",
  "STRUCTURE",
  "CHALLENGE",
  "OPERATIONALIZE",
];

// Simulate what AiCoachChat does before calling authFetch:
// classify → extract mode → put in body
function buildRequestBody(
  message: string,
  history: { role: "user" | "assistant"; content: string }[],
  messageCount: number,
  extra: Record<string, unknown> = {},
): Record<string, unknown> {
  const { mode } = classifyUserState({ message, history, messageCount });
  return { messages: history, userMessage: message, mode, ...extra };
}

describe("coach mode integration — classify → request body", () => {
  it("includes mode field in every request body", () => {
    const body = buildRequestBody("מה אני צריך לעשות עכשיו?", [], 3);
    expect(body).toHaveProperty("mode");
  });

  it("mode is always a valid edge-function key", () => {
    const messages = [
      "אני עייף לגמרי",
      "בסדר, מה עושים?",
      "תאתגר אותי",
      "אני מבולבל",
      "רוצה clarity על הערך שלי",
      "just a generic question",
    ];
    for (const msg of messages) {
      const body = buildRequestBody(msg, [], 4);
      expect(VALID_EDGE_MODES).toContain(body.mode);
    }
  });

  it("HOLD message → mode HOLD in body (not overridden)", () => {
    const body = buildRequestBody("נשברתי, אני מותש", [], 10);
    expect(body.mode).toBe("HOLD");
  });

  it("OPERATIONALIZE message → mode OPERATIONALIZE in body", () => {
    const body = buildRequestBody("אני מוכן, בואו נבצע", [], 5);
    expect(body.mode).toBe("OPERATIONALIZE");
  });

  it("CHALLENGE message → mode CHALLENGE in body", () => {
    const body = buildRequestBody("תאתגר אותי על התוכנית", [], 4);
    expect(body.mode).toBe("CHALLENGE");
  });

  it("late conversation without keyword defaults to OPERATIONALIZE", () => {
    const body = buildRequestBody("רוצה תשובה", [], 9);
    expect(body.mode).toBe("OPERATIONALIZE");
  });

  it("early conversation without keyword defaults to CLARIFY", () => {
    const body = buildRequestBody("שאלה כללית", [], 1);
    expect(body.mode).toBe("CLARIFY");
  });

  it("HOLD takes priority over STRUCTURE even when both patterns match", () => {
    const body = buildRequestBody("אני עייף ומבולבל", [], 3);
    expect(body.mode).toBe("HOLD");
  });

  it("body preserves all other fields alongside mode", () => {
    const body = buildRequestBody("test", [], 3, { language: "he", userId: "u1" });
    expect(body).toMatchObject({ mode: expect.any(String), language: "he", userId: "u1" });
  });
});
