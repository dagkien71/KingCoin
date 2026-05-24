/** API paginate: useFetchApi có thể trả về `T[]` hoặc `{ data: T[], meta? }`. */
export function unwrapPaginatedData<T>(
  raw: { data?: T[] } | T[] | null | undefined
): T[] {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  if (Array.isArray(raw.data)) return raw.data;
  return [];
}
