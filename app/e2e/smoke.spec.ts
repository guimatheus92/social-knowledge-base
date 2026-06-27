import { test, expect } from "@playwright/test";

// Smoke coverage: the app boots and serves its core routes without a server
// error, and the shell renders. No Instagram/network access — a fresh checkout
// has no manifests, which the server treats as an empty collection.

test("core routes respond without a server error", async ({ page }) => {
  for (const path of ["/", "/gallery", "/search"]) {
    const res = await page.goto(path, { waitUntil: "domcontentloaded" });
    expect(res, `${path} returned a response`).not.toBeNull();
    expect(res!.status(), `${path} should not be a server error`).toBeLessThan(400);
  }
});

test("dashboard renders its title", async ({ page }) => {
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
});
