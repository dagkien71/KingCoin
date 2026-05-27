import { getApiErrorMessage } from "@/lib/api-error";
import { unwrapApiGetBody } from "@/lib/unwrap-api-get";
import React, { useCallback, useEffect, useRef, useState } from "react";
import useConfigApi from "./useConfigApi";

export type UseFetchApiOptions = {
  /** Tăng khi MarketLiveProvider nhận WS event → refetch (thường im lặng) */
  liveRevision?: number;
  /** Không bật loading khi refetch do liveRevision — chỉ cập nhật data */
  silentOnLive?: boolean;
  /** Poll dự phòng (ms) khi không dùng WS */
  refreshInterval?: number;
  /** Poll không bật loading — tránh remount biểu đồ khi refetch */
  silentOnPoll?: boolean;
  defaultParams?: Record<string, string | number>;
};

interface UseFetchApiResult<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  refetch: (opts?: { silent?: boolean }) => void;
  setQueryParams: React.Dispatch<
    React.SetStateAction<Record<string, string | number>>
  >;
}

const useFetchApi = <T>(
  url: string,
  options?: UseFetchApiOptions
): UseFetchApiResult<T> => {
  const Api = useConfigApi();
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [params, setParams] = useState<Record<string, string | number>>(
    options?.defaultParams || {}
  );
  const paramsRef = useRef(params);
  const liveRevision = options?.liveRevision ?? 0;
  const silentOnLive = options?.silentOnLive ?? false;
  const silentOnPoll = options?.silentOnPoll ?? false;
  const refreshInterval = options?.refreshInterval;

  const buildUrlWithParams = (
    path: string,
    queryParams?: Record<string, string | number>
  ): string => {
    if (!queryParams) return path;
    const queryString = new URLSearchParams(
      queryParams as Record<string, string>
    ).toString();
    return queryString ? `${path}?${queryString}` : path;
  };

  const isValidUrl = (path: string | null) => path && !path.includes("undefined");

  const fetchData = useCallback(async (opts?: { silent?: boolean }) => {
    if (!isValidUrl(url)) return;
    if (!opts?.silent) {
      setLoading(true);
      setError(null);
    }
    try {
      const response = await Api.get(buildUrlWithParams(url, params));
      const inner = unwrapApiGetBody<T>(response?.data);
      if (inner === undefined || inner === null) return;
      setData(inner);
    } catch (err: unknown) {
      setError(getApiErrorMessage(err));
    } finally {
      if (!opts?.silent) {
        setLoading(false);
      }
    }
  }, [url, params, Api]);

  useEffect(() => {
    if (params !== paramsRef.current) {
      paramsRef.current = params;
    }
  }, [params]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (liveRevision <= 0) return;
    void fetchData({ silent: silentOnLive });
  }, [fetchData, liveRevision, silentOnLive]);

  useEffect(() => {
    if (!refreshInterval || refreshInterval <= 0 || !isValidUrl(url)) {
      return;
    }
    const id = setInterval(
      () => void fetchData({ silent: silentOnPoll }),
      refreshInterval
    );
    return () => clearInterval(id);
  }, [fetchData, refreshInterval, silentOnPoll, url]);

  return {
    data,
    loading,
    error,
    refetch: fetchData,
    setQueryParams: setParams,
  };
};

export default useFetchApi;
