import { describe, expect, it } from "vitest";
import { capitalize, formatBytes, formatDuration } from "@/lib/format";

describe("formatBytes", () => {
  it("formata tamanhos", () => {
    expect(formatBytes(0)).toBe("0 B");
    expect(formatBytes(1024)).toBe("1.0 KB");
    expect(formatBytes(1024 * 1024)).toBe("1.0 MB");
    expect(formatBytes(59_200_000_000)).toContain("GB");
    expect(formatBytes(null)).toBe("0 B");
  });
});

describe("formatDuration", () => {
  it("m:ss e h:mm:ss", () => {
    expect(formatDuration(0)).toBe("0:00");
    expect(formatDuration(65)).toBe("1:05");
    expect(formatDuration(3661)).toBe("1:01:01");
  });
});

describe("capitalize", () => {
  it("uppercases the first letter, keeps the rest as typed", () => {
    expect(capitalize("milhas")).toBe("Milhas");
    expect(capitalize("tech")).toBe("Tech");
    expect(capitalize("Travel")).toBe("Travel");
    expect(capitalize("iOS tips")).toBe("IOS tips");
  });
  it("leaves an empty string empty", () => {
    expect(capitalize("")).toBe("");
  });
});
