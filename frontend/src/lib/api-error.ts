import axios from "axios";

export type MutationFailure = {
  _mutationFailed: true;
  message: string;
  fieldErrors: Record<string, string[]> | null;
};

export function isMutationFailure(value: unknown): value is MutationFailure {
  return (
    value != null &&
    typeof value === "object" &&
    "_mutationFailed" in value &&
    (value as MutationFailure)._mutationFailed === true
  );
}

export type ApiErrorEnvelope = {
  message?: string;
  code?: number;
  details?: unknown;
};

type ValidationDetail = Record<string, string[]>;

function normalizeDetails(
  details: unknown
): ValidationDetail | null {
  if (!details) return null;
  if (Array.isArray(details)) {
    const merged: ValidationDetail = {};
    for (const item of details) {
      if (item && typeof item === "object") {
        for (const [key, val] of Object.entries(item)) {
          if (Array.isArray(val)) {
            merged[key] = val.map(String);
          }
        }
      }
    }
    return Object.keys(merged).length > 0 ? merged : null;
  }
  if (typeof details === "object") {
    const out: ValidationDetail = {};
    for (const [key, val] of Object.entries(details as Record<string, unknown>)) {
      if (Array.isArray(val)) {
        out[key] = val.map(String);
      }
    }
    return Object.keys(out).length > 0 ? out : null;
  }
  return null;
}

export function getApiErrorEnvelope(err: unknown): ApiErrorEnvelope | null {
  if (!axios.isAxiosError(err) || !err.response?.data) return null;
  const data = err.response.data as {
    error?: ApiErrorEnvelope;
    message?: string | string[];
  };
  if (data?.error && typeof data.error === "object") {
    return data.error;
  }
  return null;
}

/** Lấy message tiếng Việt / backend từ lỗi axios */
export function getApiErrorMessage(err: unknown): string {
  if (axios.isAxiosError(err)) {
    if (!err.response) {
      return "Không kết nối được API. Hãy chạy backend (cổng 3001) và kiểm tra NEXT_PUBLIC_API_URL.";
    }
    const envelope = getApiErrorEnvelope(err);
    if (envelope?.message?.trim()) {
      return envelope.message.trim();
    }
    const data = err.response.data as {
      message?: string | string[];
    };
    if (Array.isArray(data?.message)) {
      return data.message.join(", ");
    }
    if (typeof data?.message === "string" && data.message.trim()) {
      return data.message.trim();
    }
    if (err.response.status === 401) {
      return "Phiên đăng nhập hết hạn hoặc chưa đăng nhập.";
    }
    if (err.response.status === 422) {
      const fields = getApiFieldErrors(err);
      if (fields) {
        const first = Object.entries(fields)[0];
        if (first) {
          return `${first[0]}: ${first[1][0]}`;
        }
      }
    }
    return err.message || "Yêu cầu thất bại.";
  }
  if (err instanceof Error && err.message) {
    return err.message;
  }
  return "Yêu cầu thất bại.";
}

/** Lỗi validation 422 — map field → danh sách message */
export function getApiFieldErrors(
  err: unknown
): Record<string, string[]> | null {
  const envelope = getApiErrorEnvelope(err);
  return normalizeDetails(envelope?.details ?? null);
}

/** Gộp field errors thành một chuỗi (toast / form) */
export function formatApiFieldErrors(err: unknown): string | null {
  const fields = getApiFieldErrors(err);
  if (!fields) return null;
  return Object.entries(fields)
    .map(([field, msgs]) => `${field}: ${msgs.join(", ")}`)
    .join("; ");
}
