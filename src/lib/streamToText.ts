// Reads the SSE envelope emitted by the ai-coach Edge Function.
// Event format:  data: {"t":"chunk_text"}\n\n
// Terminal event: data: [DONE]\n\n
//
// Yields text chunks so callers can update UI progressively.

export async function* readTextStream(
  body: ReadableStream<Uint8Array>,
): AsyncGenerator<string, void, unknown> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buf = "";
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += decoder.decode(value, { stream: true });
      const lines = buf.split("\n");
      buf = lines.pop() ?? "";
      for (const line of lines) {
        if (!line.startsWith("data: ")) continue;
        const payload = line.slice(6).trim();
        if (payload === "[DONE]") return;
        try {
          const ev = JSON.parse(payload) as { t?: string };
          if (typeof ev.t === "string") yield ev.t;
        } catch {
          // skip malformed events
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}
