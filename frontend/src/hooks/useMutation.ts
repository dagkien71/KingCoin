import {
  getApiErrorMessage,
  getApiFieldErrors,
  type MutationFailure,
} from "@/lib/api-error";
import { IResponse } from "@/types/response";
import { useCallback, useRef, useState } from "react";
import { toast } from "react-toastify";
import useConfigApi from "./useConfigApi";

export type { MutationFailure } from "@/lib/api-error";
export { isMutationFailure } from "@/lib/api-error";

interface UseMutationResult<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  fieldErrors: Record<string, string[]> | null;
  /** Thành công: envelope/data. Lỗi: `MutationFailure` (đã toast). Bỏ qua nếu đang gọi. */
  mutate: (body?: unknown, url?: string) => Promise<T | MutationFailure | undefined>;
  clearErrors: () => void;
}

const useMutation = <T>(
  method: "POST" | "PATCH" | "DELETE",
  url: string
): UseMutationResult<T> => {
  const Api = useConfigApi();
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<
    string,
    string[]
  > | null>(null);
  const inFlightRef = useRef(false);

  const clearErrors = useCallback(() => {
    setError(null);
    setFieldErrors(null);
  }, []);

  const mutate = useCallback(
    async (body?: unknown, urlParams?: string) => {
      if (inFlightRef.current) {
        return {
          _mutationFailed: true,
          message: "Đang xử lý yêu cầu trước đó…",
          fieldErrors: null,
        } satisfies MutationFailure;
      }

      inFlightRef.current = true;
      setLoading(true);
      setError(null);
      setFieldErrors(null);
      try {
        const response = await Api.request<IResponse<T>>({
          method,
          url: urlParams ? urlParams : url,
          data: body,
        });
        const envelope = response.data;
        const inner =
          envelope &&
          typeof envelope === "object" &&
          "data" in envelope &&
          envelope.success !== false
            ? envelope.data
            : (envelope as T);
        setData(inner as T);
        return envelope as T;
      } catch (err: unknown) {
        const msg = getApiErrorMessage(err);
        const fields = getApiFieldErrors(err);
        toast.error(msg);
        setError(msg);
        setFieldErrors(fields);
        const failure: MutationFailure = {
          _mutationFailed: true,
          message: msg,
          fieldErrors: fields,
        };
        return failure;
      } finally {
        inFlightRef.current = false;
        setLoading(false);
      }
    },
    [method, url, Api]
  );

  return { data, loading, error, fieldErrors, mutate, clearErrors };
};

export default useMutation;

/** Khóa idempotency cho chuyển ví / thanh toán — gửi lại cùng key → backend trả bản ghi cũ */
export function newIdempotencyKey(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `idem-${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
}
