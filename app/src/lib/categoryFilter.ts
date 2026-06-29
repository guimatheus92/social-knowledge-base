/** Category filtering for the profile list (network view). Pure + testable. */

export const ALL_CATEGORIES = "__all__";
export const NO_CATEGORY = "__none__";

/** Distinct, sorted categories present across the given accounts (ignores empty). */
export function accountCategories(accounts: { category: string | null }[]): string[] {
  return Array.from(
    new Set(accounts.map((a) => a.category).filter((c): c is string => !!c)),
  ).sort((a, b) => a.localeCompare(b));
}

/** Filter accounts by a selected category (or the ALL / NO_CATEGORY sentinels). */
export function filterByCategory<T extends { category: string | null }>(
  accounts: T[],
  category: string,
): T[] {
  if (category === ALL_CATEGORIES) return accounts;
  if (category === NO_CATEGORY) return accounts.filter((a) => !a.category);
  return accounts.filter((a) => a.category === category);
}
