import { describe, it, expect } from "vitest";
import { sanitizeHTML, escapeHTML } from "../sanitize";

describe("sanitize", () => {
  // ── sanitizeHTML ──────────────────────────────────────────────────────

  describe("sanitizeHTML", () => {
    it("returns empty string for empty input", () => {
      expect(sanitizeHTML("")).toBe("");
    });

    it("returns empty string for non-string input", () => {
      expect(sanitizeHTML(null as never)).toBe("");
      expect(sanitizeHTML(undefined as never)).toBe("");
    });

    it("removes script tags and their content", () => {
      const dirty = '<p>Hello</p><script>alert("xss")</script>';
      expect(sanitizeHTML(dirty)).not.toContain("<script");
      expect(sanitizeHTML(dirty)).not.toContain("alert");
    });

    it("removes iframe tags", () => {
      const dirty = '<p>Content</p><iframe src="evil.com"></iframe>';
      expect(sanitizeHTML(dirty)).not.toContain("<iframe");
    });

    it("removes object tags", () => {
      const dirty = '<object data="x.swf"></object>';
      expect(sanitizeHTML(dirty)).not.toContain("<object");
    });

    it("removes embed tags", () => {
      const dirty = '<embed src="plugin.swf">';
      expect(sanitizeHTML(dirty)).not.toContain("<embed");
    });

    it("removes form tags", () => {
      const dirty = '<form action="evil.com"><input type="text" /></form>';
      expect(sanitizeHTML(dirty)).not.toContain("<form");
      expect(sanitizeHTML(dirty)).not.toContain("<input");
    });

    it("removes style tags", () => {
      const dirty = "<style>body { display: none; }</style>";
      expect(sanitizeHTML(dirty)).not.toContain("<style");
    });

    it("removes onclick event handlers", () => {
      const dirty = '<a href="#" onclick="evil()">click</a>';
      const result = sanitizeHTML(dirty);
      expect(result).not.toContain("onclick");
    });

    it("removes onerror event handlers", () => {
      const dirty = '<img src="x" onerror="alert(1)">';
      const result = sanitizeHTML(dirty);
      expect(result).not.toContain("onerror");
    });

    it("removes javascript: URLs in href", () => {
      const dirty = '<a href="javascript:alert(1)">click</a>';
      const result = sanitizeHTML(dirty);
      expect(result.toLowerCase()).not.toContain("javascript:");
    });

    it("removes javascript: URLs in src", () => {
      const dirty = '<img src="javascript:alert(1)">';
      const result = sanitizeHTML(dirty);
      expect(result.toLowerCase()).not.toContain("javascript:");
    });

    it("removes data: URLs with text/html", () => {
      const dirty = '<a href="data:text/html,<script>evil</script>">click</a>';
      const result = sanitizeHTML(dirty);
      expect(result.toLowerCase()).not.toContain("data:text/html");
    });

    it("preserves safe HTML tags", () => {
      const clean = "<p>Hello <strong>world</strong></p>";
      const result = sanitizeHTML(clean);
      expect(result).toContain("<p>");
      expect(result).toContain("<strong>");
      expect(result).toContain("Hello");
    });

    it("preserves safe href links", () => {
      const clean = '<a href="https://example.com">link</a>';
      const result = sanitizeHTML(clean);
      expect(result).toContain('href="https://example.com"');
    });

    it("removes textarea tags", () => {
      const dirty = "<textarea>malicious content</textarea>";
      expect(sanitizeHTML(dirty)).not.toContain("<textarea");
    });

    it("handles case-insensitive script tags", () => {
      const dirty = '<SCRIPT>alert("xss")</SCRIPT>';
      const result = sanitizeHTML(dirty);
      expect(result.toLowerCase()).not.toContain("script");
    });

    it("handles whitespace in script tags", () => {
      const dirty = '<  script  >evil()<  /  script  >';
      const result = sanitizeHTML(dirty);
      // Should strip the tag
      expect(result.toLowerCase()).not.toContain("evil()");
    });
  });

  // ── escapeHTML ────────────────────────────────────────────────────────

  describe("escapeHTML", () => {
    it("returns empty string for empty input", () => {
      expect(escapeHTML("")).toBe("");
    });

    it("returns empty string for non-string input", () => {
      expect(escapeHTML(null as never)).toBe("");
      expect(escapeHTML(undefined as never)).toBe("");
    });

    it("escapes ampersands", () => {
      expect(escapeHTML("a & b")).toBe("a &amp; b");
    });

    it("escapes less-than sign", () => {
      expect(escapeHTML("<script>")).toBe("&lt;script&gt;");
    });

    it("escapes greater-than sign", () => {
      expect(escapeHTML("a > b")).toBe("a &gt; b");
    });

    it("escapes double quotes", () => {
      expect(escapeHTML('"hello"')).toBe("&quot;hello&quot;");
    });

    it("escapes single quotes", () => {
      expect(escapeHTML("it's")).toBe("it&#39;s");
    });

    it("escapes all special characters together", () => {
      const input = '<script>alert("xss")&\'evil\'</script>';
      const result = escapeHTML(input);
      expect(result).not.toContain("<");
      expect(result).not.toContain(">");
      expect(result).not.toContain('"');
      expect(result).not.toContain("'");
      expect(result).not.toContain("&s"); // &s (raw ampersand before 's')
      expect(result).toContain("&amp;");
      expect(result).toContain("&lt;");
      expect(result).toContain("&gt;");
    });

    it("preserves plain text without special characters", () => {
      expect(escapeHTML("Hello world 123")).toBe("Hello world 123");
    });
  });
});
