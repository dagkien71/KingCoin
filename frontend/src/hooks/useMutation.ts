import {
  getApiErrorMessage,
  getApiFieldErrors,
  type MutationFailure,
} from "@/lib/api-error";
import { IResponse } from "@/types/response";
import { useCallback, useState } from "react";
import { toast } from "react-toastify";
import useConfigApi from "./useConfigApi";

export type { MutationFailure } from "@/lib/api-error";
export { isMutationFailure } from "@/lib/api-error";

interface UseMutationResult<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  fieldErrors: Record<string, string[]> | null;
  /** Thành công: envelope/data. Lỗi: `MutationFailure` (đã toast). */
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

  const clearErrors = useCallback(() => {
    setError(null);
    setFieldErrors(null);
  }, []);

  const mutate = useCallback(
    async (body?: unknown, urlParams?: string) => {
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
        setLoading(false);
      }
    },
    [method, url, Api]
  );

  return { data, loading, error, fieldErrors, mutate, clearErrors };
};

export default useMutation;
