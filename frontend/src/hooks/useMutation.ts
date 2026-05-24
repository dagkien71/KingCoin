import { getApiErrorMessage } from "@/lib/api-error";
import { IResponse } from "@/types/response";
import { useCallback, useState } from "react";
import { toast } from "react-toastify";
import useConfigApi from "./useConfigApi";

interface UseMutationResult<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  /** Trả về envelope API hoặc `undefined` khi lỗi (đã toast). Không throw. */
  mutate: (body?: unknown, url?: string) => Promise<T | undefined>;
}

const useMutation = <T>(
  method: "POST" | "PATCH" | "DELETE",
  url: string
): UseMutationResult<T> => {
  const Api = useConfigApi();
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const mutate = useCallback(
    async (body?: unknown, urlParams?: string) => {
      setLoading(true);
      setError(null);
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
        toast.error(msg);
        setError(msg);
        return undefined;
      } finally {
        setLoading(false);
      }
    },
    [method, url, Api]
  );

  return { data, loading, error, mutate };
};

export default useMutation;
