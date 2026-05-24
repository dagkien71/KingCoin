"use client";

import useFetchApi from "@/hooks/useFetchApi";
import useMutation from "@/hooks/useMutation";
import {
  type MarketPreset,
  type PresetContext,
} from "@/modules/admin/market-control-presets";
import {
  filterAlts,
  targetLabel,
  toApplyTarget,
  type TargetMode,
} from "@/modules/admin/market-control-target";
import {
  buildModelRunBody,
  type ModelPreset,
} from "@/modules/admin/market-model-presets";
import { isStablecoinToken } from "@/types/token.type";
import { useCallback, useMemo, useState } from "react";
import { toast } from "react-toastify";
import type { Dashboard, TokenRow } from "./market-control-types";

export function useMarketControl() {
  const { data, loading, refetch } = useFetchApi<Dashboard>(
    "/admin/market-control",
    { refreshInterval: 5000 }
  );

  const { mutate: patchGlobal } = useMutation(
    "PATCH",
    "/admin/market-control/global"
  );
  const { mutate: patchBulk } = useMutation(
    "PATCH",
    "/admin/market-control/bulk/tokens"
  );
  const { mutate: patchToken } = useMutation(
    "PATCH",
    "/admin/market-control/tokens/placeholder"
  );
  const { mutate: postAction } = useMutation(
    "POST",
    "/admin/market-control/refresh"
  );

  const [selectedId, setSelectedId] = useState("");
  const [controlMethod, setControlMethod] = useState<"pp1" | "pp2">("pp1");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const [schedStart, setSchedStart] = useState("");
  const [schedEnd, setSchedEnd] = useState("");
  const [schedMin, setSchedMin] = useState("");
  const [schedMax, setSchedMax] = useState("");
  const [schedWaves, setSchedWaves] = useState("4");
  const [setPriceInput, setSetPriceInput] = useState("");
  const [spreadToken, setSpreadToken] = useState("");
  const [levelsToken, setLevelsToken] = useState("");
  const [spreadGlobal, setSpreadGlobal] = useState("");
  const [levelsGlobal, setLevelsGlobal] = useState("");
  const [targetMode, setTargetMode] = useState<TargetMode>("single");
  const [groupIds, setGroupIds] = useState<string[]>([]);

  const altTokens = useMemo(
    () => filterAlts(data?.tokens ?? []),
    [data?.tokens]
  );

  const applyTarget = useMemo(
    () => toApplyTarget(targetMode, groupIds),
    [targetMode, groupIds]
  );

  const selected: TokenRow | undefined =
    data?.tokens?.find((t) => t.id === (selectedId || data?.tokens?.[0]?.id)) ??
    data?.tokens?.[0];
  const tokenId = selected?.id ?? "";

  const run = useCallback(
    async (fn: () => Promise<unknown>, okMsg?: string) => {
      const res = await fn();
      if (res !== undefined) {
        if (okMsg) toast.success(okMsg);
        void refetch();
        return true;
      }
      return false;
    },
    [refetch]
  );

  const presetCtx: PresetContext | null = useMemo(() => {
    if (targetMode === "single" && (!tokenId || !selected)) return null;
    if (targetMode === "group" && groupIds.length === 0) return null;
    if (targetMode === "all" && altTokens.length === 0) return null;
    const refToken =
      selected ??
      altTokens.find((t) => t.id === groupIds[0]) ??
      altTokens[0];
    if (!refToken) return null;
    return {
      tokenId: refToken.id,
      price: refToken.price,
      hasSchedule:
        targetMode === "single" ? !!selected?.schedule : false,
      hasModelRun:
        targetMode === "single" ? !!selected?.modelRun?.isActive : false,
      mmEnabled: data?.mmEnabled ?? false,
      flowEnabled: data?.flowEnabled ?? false,
      applyTarget,
      post: (body, path) => postAction(body, path),
      postBulk: (body, path) => postAction(body, path),
      patchBulk: (body, path) => patchBulk(body, path),
      patchGlobal: (body) => patchGlobal(body),
      patchToken: (body, path) => patchToken(body, path),
    };
  }, [
    tokenId,
    selected,
    targetMode,
    groupIds,
    altTokens,
    applyTarget,
    data?.mmEnabled,
    data?.flowEnabled,
    postAction,
    patchGlobal,
    patchBulk,
    patchToken,
  ]);

  const selectedIsStable = selected ? isStablecoinToken(selected) : false;

  const applyModelPreset = async (preset: ModelPreset) => {
    if (targetMode === "group" && groupIds.length === 0) {
      toast.error("Chọn ít nhất một mã trong nhóm");
      return;
    }
    if (targetMode === "single" && (!tokenId || !selected)) {
      toast.error("Chọn token trước");
      return;
    }
    if (targetMode === "single" && selectedIsStable) {
      toast.error("KC là stablecoin — không chạy mô hình đường giá");
      return;
    }
    if (
      targetMode === "single" &&
      selected?.modelRun?.isActive &&
      !window.confirm("Đang có mô hình — chạy mô hình mới sẽ thay thế?")
    ) {
      return;
    }
    if (
      targetMode !== "single" &&
      !window.confirm(
        `Chạy mô hình «${preset.title}» cho ${targetLabel(targetMode, groupIds.length, altTokens.length)}?`
      )
    ) {
      return;
    }
    setBusyId(preset.id);
    try {
      const sample = buildModelRunBody(preset, selected?.price ?? 1);
      if (applyTarget.mode === "single" && tokenId) {
        await postAction(
          sample,
          `/admin/market-control/tokens/${tokenId}/model-run`
        );
        await postAction(
          {},
          `/admin/market-control/tokens/${tokenId}/refresh`
        );
        toast.success(
          `Mô hình ${preset.title} — ${selected?.symbol ?? selected?.name}`
        );
      } else {
        const res = (await postAction(
          {
            allAlts: applyTarget.mode === "all_alts",
            tokenIds:
              applyTarget.mode === "group" ? applyTarget.tokenIds : undefined,
            modelId: sample.modelId,
            presetId: preset.id,
            durationMin: sample.durationMin,
            restoreOnEnd: sample.restoreOnEnd,
          },
          "/admin/market-control/bulk/model-run"
        )) as { count?: number };
        toast.success(
          `Mô hình ${preset.title} — ${res?.count ?? groupIds.length} mã`
        );
      }
      void refetch();
    } catch {
      toast.error("Không chạy được mô hình");
    } finally {
      setBusyId(null);
    }
  };

  const cancelModelRun = async () => {
    if (!tokenId) return;
    setBusyId("cancel-model");
    try {
      await postAction(
        {},
        `/admin/market-control/tokens/${tokenId}/model-run/cancel`
      );
      toast.success("Đã hủy mô hình");
      void refetch();
    } catch {
      toast.error("Không hủy được mô hình");
    } finally {
      setBusyId(null);
    }
  };

  const applyPreset = async (preset: MarketPreset) => {
    if (!presetCtx) {
      if (targetMode === "group") {
        toast.error("Chọn ít nhất một mã trong nhóm");
      } else {
        toast.error("Chọn token trước");
      }
      return;
    }
    if (
      targetMode === "single" &&
      selectedIsStable &&
      preset.group === "schedule"
    ) {
      toast.error("KC là stablecoin — không dùng lịch pump/dump");
      return;
    }
    if (
      applyTarget.mode !== "single" &&
      (preset.group === "instant" || preset.id === "sys-reset-token")
    ) {
      toast.error("Gói này chỉ áp dụng cho một mã — chuyển chế độ «Một mã»");
      return;
    }
    if (
      applyTarget.mode !== "single" &&
      !window.confirm(
        `Áp dụng «${preset.title}» cho ${targetLabel(targetMode, groupIds.length, altTokens.length)}?`
      )
    ) {
      return;
    }
    if (preset.disabled?.(presetCtx)) {
      toast.info("Gói không khả dụng trong trạng thái hiện tại");
      return;
    }
    if (
      preset.id === "sys-reset-token" &&
      !window.confirm("Reset mọi override và lịch cho token này?")
    ) {
      return;
    }
    setBusyId(preset.id);
    try {
      await preset.run(presetCtx);
      const needsRefresh =
        (preset.group === "book" && applyTarget.mode === "single") ||
        preset.group === "instant" ||
        preset.id === "sys-refresh-book";
      if (needsRefresh) {
        const refreshPath =
          preset.scope === "global"
            ? "/admin/market-control/refresh"
            : `/admin/market-control/tokens/${tokenId}/refresh`;
        await postAction({}, refreshPath);
      }
      const scopeLabel =
        preset.scope === "global"
          ? "toàn sàn"
          : applyTarget.mode === "all_alts"
            ? `tất cả alt (${altTokens.length})`
            : applyTarget.mode === "group"
              ? `nhóm ${groupIds.length} mã`
              : (selected?.symbol ?? selected?.name ?? "token");
      toast.success(`${preset.title} (${scopeLabel})`);
      void refetch();
    } catch {
      toast.error("Không áp dụng được gói");
    } finally {
      setBusyId(null);
    }
  };

  return {
    data,
    loading,
    refetch,
    patchGlobal,
    patchToken,
    postAction,
    selectedId,
    setSelectedId,
    controlMethod,
    setControlMethod,
    showAdvanced,
    setShowAdvanced,
    busyId,
    setBusyId,
    schedStart,
    setSchedStart,
    schedEnd,
    setSchedEnd,
    schedMin,
    setSchedMin,
    schedMax,
    setSchedMax,
    schedWaves,
    setSchedWaves,
    setPriceInput,
    setSetPriceInput,
    spreadToken,
    setSpreadToken,
    levelsToken,
    setLevelsToken,
    spreadGlobal,
    setSpreadGlobal,
    levelsGlobal,
    setLevelsGlobal,
    targetMode,
    setTargetMode,
    groupIds,
    setGroupIds,
    altTokens,
    applyTarget,
    selected,
    tokenId,
    run,
    presetCtx,
    selectedIsStable,
    applyModelPreset,
    cancelModelRun,
    applyPreset,
  };
}

export type MarketControlState = ReturnType<typeof useMarketControl>;
