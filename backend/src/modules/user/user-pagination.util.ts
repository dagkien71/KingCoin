export const USER_LIST_DEFAULT_PER_PAGE = 50;
export const USER_LIST_MAX_PER_PAGE = 200;

export function parseUserListPagination(
  page?: string,
  perPage?: string,
  defaults?: { page?: number; perPage?: number; maxPerPage?: number },
): { page: number; perPage: number } {
  const max = defaults?.maxPerPage ?? USER_LIST_MAX_PER_PAGE;
  const p = page ? Number.parseInt(page, 10) : (defaults?.page ?? 1);
  const pp = perPage
    ? Number.parseInt(perPage, 10)
    : (defaults?.perPage ?? USER_LIST_DEFAULT_PER_PAGE);
  return {
    page: Number.isFinite(p) && p > 0 ? p : 1,
    perPage:
      Number.isFinite(pp) && pp > 0
        ? Math.min(pp, max)
        : Math.min(USER_LIST_DEFAULT_PER_PAGE, max),
  };
}
