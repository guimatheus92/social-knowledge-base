// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { I18nProvider } from "@/i18n/I18nProvider";
import { ItemTile } from "@/components/library/ItemTile";
import type { Item } from "@/lib/types";

function item(over: Partial<Item> = {}): Item {
  return {
    postId: "1",
    mediaType: "video",
    origin: "reel",
    relPath: "downloads/x/reels/1.mp4",
    fileSize: 31_654_564,
    durationS: 63,
    width: null,
    height: null,
    caption: null,
    postedAt: null,
    thumbPath: null,
    status: "downloaded",
    retries: 0,
    downloadedAt: null,
    readAt: null,
    notePath: null,
    error: null,
    downloadMs: null,
    ...over,
  };
}

function renderTile(it: Item) {
  return render(
    <I18nProvider>
      <ItemTile account="x" item={it} onSelect={() => {}} />
    </I18nProvider>,
  );
}

// The note-only affordance title, matched locale-independently (jsdom adopts en).
const NOTE_ONLY = /note only|só nota/i;
const SIZE = /\d+(\.\d+)?\s?(KB|MB|GB)/;

describe("ItemTile", () => {
  it("renders the real file size (not 0 B) for a downloaded video", () => {
    renderTile(item());
    expect(screen.queryByText("0 B")).toBeNull();
    expect(screen.getByText(SIZE)).toBeTruthy();
  });

  it("a normal video shows a play affordance, not the note one", () => {
    renderTile(item());
    expect(screen.queryByTitle(NOTE_ONLY)).toBeNull();
  });

  it("a note-only item (media freed) shows the note affordance and no size badge", () => {
    renderTile(item({ relPath: null, fileSize: null, status: "read", notePath: "notes/x/videos/1.md" }));
    expect(screen.getAllByTitle(NOTE_ONLY).length).toBeGreaterThan(0);
    expect(screen.queryByText(SIZE)).toBeNull();
  });
});
