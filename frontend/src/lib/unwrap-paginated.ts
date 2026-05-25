export type PaginatedMeta = {
  total?: number;
  lastPage?: number;
  currentPage?: number;
  perPage?: number;
  prev?: number | null;
  next?: number | null;
};

export type PaginatedPayload<T> = {
  data?: T[];
  meta?: PaginatedMeta;
};

/** API paginate: useFetchApi có thể trả về `T[]` hoặc `{ data: T[], meta? }`. */
export function unwrapPaginatedData<T>(
  raw: PaginatedPayload<T> | T[] | null | undefined
): T[] {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  if (Array.isArray(raw.data)) return raw.data;
  return [];
}

export function getPaginatedMeta<T>(
  raw: PaginatedPayload<T> | T[] | null | undefined
): PaginatedMeta | null {
  if (!raw || Array.isArray(raw)) return null;
  return raw.meta ?? null;
}
