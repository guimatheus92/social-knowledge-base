import { beforeEach, describe, expect, it, vi } from "vitest";

// notes.ts pulls in the DB + config; stub them so resolveNoteLanguage is pure-ish.
vi.mock("@/server/db/repository", () => ({
  getAccount: vi.fn(),
  getItem: vi.fn(),
  markRead: vi.fn(),
  listItems: vi.fn(),
  exportJson: vi.fn(),
}));
vi.mock("@/server/config/mcp", () => ({ getAnalysisConfig: vi.fn() }));

import { resolveNoteLanguage } from "@/server/engine/notes";
import * as repo from "@/server/db/repository";
import { getAnalysisConfig } from "@/server/config/mcp";

/* eslint-disable @typescript-eslint/no-explicit-any */
describe("resolveNoteLanguage (override → account → global → default)", () => {
  beforeEach(() => {
    vi.mocked(repo.getAccount).mockReturnValue(null as any);
    vi.mocked(getAnalysisConfig).mockReturnValue({ noteLanguage: "en" } as any);
  });

  it("explicit override wins even when an account language is set", () => {
    vi.mocked(repo.getAccount).mockReturnValue({ noteLanguage: "es" } as any);
    expect(resolveNoteLanguage("acc", "fr")).toBe("fr");
  });

  it("uses the account language when there is no override", () => {
    vi.mocked(repo.getAccount).mockReturnValue({ noteLanguage: "es" } as any);
    expect(resolveNoteLanguage("acc")).toBe("es");
  });

  it("uses the global config when the account has none", () => {
    vi.mocked(repo.getAccount).mockReturnValue({ noteLanguage: null } as any);
    vi.mocked(getAnalysisConfig).mockReturnValue({ noteLanguage: "pt" } as any);
    expect(resolveNoteLanguage("acc")).toBe("pt");
  });

  it("falls back to the default when config is empty", () => {
    vi.mocked(getAnalysisConfig).mockReturnValue({ noteLanguage: "" } as any);
    expect(resolveNoteLanguage("acc")).toBe("en");
  });
});
