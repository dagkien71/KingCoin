"use client";

import useFetchApi from "@/hooks/useFetchApi";
import useMutation, { isMutationFailure } from "@/hooks/useMutation";
import type {
  MarketSettingsPatch,
  MarketSettingsResponse,
} from "@/modules/admin/market-settings/market-settings-types";
import { toast } from "react-toastify";

export function useMarketSettings() {
  const { data, loading, error, refetch } = useFetchApi<MarketSettingsResponse>(
    "/admin/market-settings",
    { refreshInterval: 5000, silentOnPoll: true }
  );

  const patch = useMutation<MarketSettingsResponse>("PATCH", "/admin/market-settings");
  const reset = useMutation<MarketSettingsResponse>(
    "POST",
    "/admin/market-settings/reset-env"
  );

  const save = async (body: MarketSettingsPatch) => {
    const result = await patch.mutate(body);
    if (isMutationFailure(result)) return false;
    toast.success("Đã lưu cài đặt — áp dụng ngay, không cần redeploy env.");
    void refetch();
    return true;
  };

  const resetToEnv = async () => {
    const result = await reset.mutate({});
    if (isMutationFailure(result)) return false;
    toast.info("Đã xóa ghi đè DB — dùng lại giá trị từ env Render.");
    void refetch();
    return true;
  };

  return {
    data,
    loading,
    error,
    refetch,
    saving: patch.loading,
    resetting: reset.loading,
    save,
    resetToEnv,
  };
}
