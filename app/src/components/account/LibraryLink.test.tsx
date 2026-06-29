// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { I18nProvider } from "@/i18n/I18nProvider";
import { LibraryLink } from "@/components/account/LibraryLink";

// jsdom's location.assign is non-configurable, so replace the whole location.
const assign = vi.fn();
beforeEach(() => {
  assign.mockClear();
  Object.defineProperty(window, "location", {
    configurable: true,
    value: { assign, href: "http://localhost/" },
  });
});

function renderLink(hasMedia: boolean) {
  return render(
    <I18nProvider>
      <LibraryLink account="acme" hasMedia={hasMedia} />
    </I18nProvider>,
  );
}

describe("LibraryLink", () => {
  it("with media, clicking navigates to the account's library", async () => {
    renderLink(true);
    await userEvent.click(screen.getByRole("button", { name: /library|biblioteca/i }));
    expect(assign).toHaveBeenCalledWith("/library/acme");
  });

  it("without media, the control is disabled and does not navigate", async () => {
    renderLink(false);
    const btn = screen.getByRole("button", { name: /library|biblioteca/i });
    expect(btn).toHaveProperty("disabled", true);
    await userEvent.click(btn);
    expect(assign).not.toHaveBeenCalled();
  });
});
