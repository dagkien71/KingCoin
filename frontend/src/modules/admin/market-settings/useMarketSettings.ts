"use client";

import useFetchApi from "@/hooks/useFetchApi";
import useMutation, { isMutationFailure } from "@/hooks/useMutation";
import type {
  MarketSettingsPatch,
  MarketSettingsResponse,
  VolatilityLevelId,
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
  const applyPreset = useMutation<MarketSettingsResponse>(
    "POST",
    "/admin/market-settings/presets/normal-steady"
  );

  const applyVolatilityMutation = useMutation<MarketSettingsResponse>(
    "POST",
    "/admin/market-settings/presets/volatility/stable"
  );

  const applyVolatility = async (level: VolatilityLevelId) => {
    const result = await applyVolatilityMutation.mutate(
      {},
      `/admin/market-settings/presets/volatility/${level}`
    );
    if (isMutationFailure(result)) return false;

    const labels: Record<VolatilityLevelId, string> = {
      gentle: "Nhẹ — ít lệnh, khớp chậm",
      moderate: "Vừa — nhịp tự nhiên",
      stable: "Ổn định — mặc định",
      strong: "Mạnh — khớp dày, giá theo volume",
      extreme: "Cực mạnh — thị trường sôi động",
    };
    toast.success(
      `Đã áp ${labels[level]} — lưu DB, chuyển mượt ~45s, giá từ khớp lệnh.`
    );
    void refetch();
    return true;
  };

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

  const applyNormalSteady = async () => {
    const result = await applyPreset.mutate({});
    if (isMutationFailure(result)) return false;
    toast.success("Đã áp preset bình thường — sổ nhanh, giá ±~0.1%.");
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
    applyingPreset: applyPreset.loading || applyVolatilityMutation.loading,
    save,
    resetToEnv,
    applyNormalSteady,
    applyVolatility,
  };
}
