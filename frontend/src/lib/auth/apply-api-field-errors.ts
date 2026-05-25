import { getApiFieldErrors, type MutationFailure } from "@/lib/api-error";

/** Gộp lỗi 422 theo field — lấy message đầu tiên mỗi field. */
export function apiFieldErrorsToForm<T extends Record<string, string>>(
  err: unknown,
  keyMap?: Record<string, string>
): Partial<T> | null {
  const fields =
    err &&
    typeof err === "object" &&
    "fieldErrors" in err &&
    (err as MutationFailure).fieldErrors
      ? (err as MutationFailure).fieldErrors
      : getApiFieldErrors(err);
  if (!fields) return null;

  const out: Partial<T> = {};
  for (const [key, messages] of Object.entries(fields)) {
    const target = (keyMap?.[key] ?? key) as keyof T & string;
    if (messages[0]) {
      (out as Record<string, string>)[target] = messages[0];
    }
  }
  return Object.keys(out).length > 0 ? out : null;
}
