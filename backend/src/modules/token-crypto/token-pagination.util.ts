/** Danh sách thị trường (/token-crypto/all) — một response, có trần. */
export const TOKEN_MARKETS_LIST_MAX = 500;

/** Phân trang issuer/admin. */
export const TOKEN_LIST_DEFAULT_PER_PAGE = 50;
export const TOKEN_LIST_MAX_PER_PAGE = 100;

export function parseTokenListPagination(
  page?: string,
  perPage?: string,
  defaults?: { page?: number; perPage?: number; maxPerPage?: number },
): { page: number; perPage: number } {
  const max = defaults?.maxPerPage ?? TOKEN_LIST_MAX_PER_PAGE;
  const p = page ? Number.parseInt(page, 10) : (defaults?.page ?? 1);
  const pp = perPage
    ? Number.parseInt(perPage, 10)
    : (defaults?.perPage ?? TOKEN_LIST_DEFAULT_PER_PAGE);
  return {
    page: Number.isFinite(p) && p > 0 ? p : 1,
    perPage:
      Number.isFinite(pp) && pp > 0
        ? Math.min(pp, max)
        : Math.min(TOKEN_LIST_DEFAULT_PER_PAGE, max),
  };
}
