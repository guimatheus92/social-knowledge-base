// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { I18nProvider } from "@/i18n/I18nProvider";
import { MediaCountBadges } from "@/components/account/MediaCountBadges";
import type { Counts } from "@/lib/types";

function counts(over: Partial<Counts> = {}): Counts {
  return {
    total: 0,
    byMedia: { image: 0, video: 0 },
    bytesByMedia: { image: 0, video: 0 },
    byStatus: {},
    byOrigin: {},
    bytesTotal: 0,
    downloaded: 0,
    unnotedVideos: 0,
    notedVideos: 0,
    notesOnly: 0,
    ...over,
  };
}

function renderBadges(c: Counts) {
  return render(
    <I18nProvider>
      <MediaCountBadges counts={c} />
    </I18nProvider>,
  );
}

// The numbers shown in the pills, in DOM order (video, image, then note-only).
const pillNumbers = () => screen.getAllByText(/^\d+$/).map((e) => e.textContent);

describe("MediaCountBadges", () => {
  it("a note-only video shows under the note badge, not the video count", () => {
    renderBadges(counts({ byMedia: { image: 0, video: 1 }, notesOnly: 1, notedVideos: 1 }));
    // video-with-media = 1 - 1 = 0; a third (note) pill shows 1
    expect(pillNumbers()).toEqual(["0", "0", "1"]);
  });

  it("without note-only items there is no note badge", () => {
    renderBadges(counts({ byMedia: { image: 2, video: 3 } }));
    expect(pillNumbers()).toEqual(["3", "2"]);
  });
});
