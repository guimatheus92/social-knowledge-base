import { describe, expect, it } from "vitest";
import { DEFAULT_NOTE_LANG, noteLangEnglish, noteLangNative } from "@/lib/languages";

describe("note language helpers", () => {
  it("maps a known code to its English prompt name", () => {
    expect(noteLangEnglish("en")).toBe("English");
    expect(noteLangEnglish("pt")).toBe("Brazilian Portuguese");
  });

  it("falls back to English for an unknown/empty code (prompt must stay valid)", () => {
    expect(noteLangEnglish("xx")).toBe("English");
    expect(noteLangEnglish("")).toBe("English");
  });

  it("maps a known code to its native UI label", () => {
    expect(noteLangNative("pt")).toBe("Português (BR)");
    expect(noteLangNative("ja")).toBe("日本語");
  });

  it("falls back to the raw code (not English) for an unknown native label", () => {
    // Diverges from noteLangEnglish on purpose — keep them from being unified.
    expect(noteLangNative("xx")).toBe("xx");
  });

  it("defaults to English", () => {
    expect(DEFAULT_NOTE_LANG).toBe("en");
    expect(noteLangNative(DEFAULT_NOTE_LANG)).toBe("English");
  });
});
