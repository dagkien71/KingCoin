/** Lấy `data` từ envelope API sau useMutation (`{ success, data }` hoặc payload thẳng). */
export function unwrapMutationPayload<T extends Record<string, unknown>>(
  result: unknown
): T | null {
  if (!result || typeof result !== "object") return null;
  if ("_mutationFailed" in result) return null;
  const r = result as Record<string, unknown>;
  if (r.data && typeof r.data === "object" && !Array.isArray(r.data)) {
    return r.data as T;
  }
  return r as T;
}
