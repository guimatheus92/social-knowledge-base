import { describe, it, expect } from "vitest";
import { ALL_CATEGORIES, NO_CATEGORY, accountCategories, filterByCategory } from "@/lib/categoryFilter";

const accs = [
  { account: "a", category: "Travel" },
  { account: "b", category: "Tech" },
  { account: "c", category: "Travel" },
  { account: "d", category: null },
];

describe("accountCategories", () => {
  it("returns distinct, sorted categories and ignores empty ones", () => {
    expect(accountCategories(accs)).toEqual(["Tech", "Travel"]);
    expect(accountCategories([{ category: null }, { category: "" }])).toEqual([]);
  });
});

describe("filterByCategory", () => {
  it("ALL returns everything", () => {
    expect(filterByCategory(accs, ALL_CATEGORIES)).toHaveLength(4);
  });
  it("a category returns only its accounts", () => {
    expect(filterByCategory(accs, "Travel").map((a) => a.account)).toEqual(["a", "c"]);
  });
  it("NO_CATEGORY returns the uncategorized ones", () => {
    expect(filterByCategory(accs, NO_CATEGORY).map((a) => a.account)).toEqual(["d"]);
  });
  it("an unknown category returns nothing", () => {
    expect(filterByCategory(accs, "Food")).toEqual([]);
  });
});
