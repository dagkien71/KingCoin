import {
  getPaginatedMeta,
  unwrapPaginatedData,
  type PaginatedPayload,
} from "@/lib/unwrap-paginated";
import { useCallback, useEffect, useMemo, useState } from "react";

/**
 * Gộp nhiều trang `{ data, meta }` — dùng issuer token list (nút "Tải thêm").
 */
export default function useAccumulatedPaginated<T>(
  raw: PaginatedPayload<T> | T[] | null | undefined,
  page: number
) {
  const [items, setItems] = useState<T[]>([]);

  const batch = useMemo(() => unwrapPaginatedData(raw), [raw]);
  const meta = useMemo(() => getPaginatedMeta(raw), [raw]);

  useEffect(() => {
    if (page <= 1) {
      setItems(batch);
      return;
    }
    setItems((prev) => {
      const seen = new Set(prev.map((x) => (x as { id?: string }).id));
      const add = batch.filter((x) => {
        const id = (x as { id?: string }).id;
        return !id || !seen.has(id);
      });
      return add.length ? [...prev, ...add] : prev;
    });
  }, [batch, page]);

  const reset = useCallback(() => setItems([]), []);

  const hasMore = meta?.next != null && meta.next > 0;

  return { items, meta, hasMore, reset, total: meta?.total ?? items.length };
}
