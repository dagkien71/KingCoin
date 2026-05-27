import type { PaginatedMeta } from "@/lib/unwrap-paginated";
import type { IResponse } from "@/types/response";

/**
 * Chuẩn hoá body GET sau TransformInterceptor backend:
 * `{ success, data: T }` hoặc `{ success, data: T[], meta }` (paginate).
 */
export function unwrapApiGetBody<T>(body: unknown): T | null {
  if (body === undefined || body === null) return null;
  if (typeof body !== "object") return body as T;

  const wrapped = body as IResponse<unknown> & { meta?: PaginatedMeta };
  if (wrapped.success === false) return null;
  if (!("data" in wrapped)) return body as T;

  const payload = wrapped.data;
  if (payload === undefined || payload === null) return null;

  // Paginate: interceptor giữ meta ở top-level, data là mảng
  if (wrapped.meta != null && Array.isArray(payload)) {
    return { data: payload, meta: wrapped.meta } as T;
  }

  // Paginate lồng (hiếm): { data: { data, meta } }
  if (
    typeof payload === "object" &&
    !Array.isArray(payload) &&
    "data" in payload &&
    "meta" in payload
  ) {
    return payload as T;
  }

  return payload as T;
}
