"use client";

import useFetchApi from "@/hooks/useFetchApi";
import useMutation from "@/hooks/useMutation";
import type { MmBotsDashboard } from "@/modules/admin/mm-bots/mm-bots-types";
import { useCallback, useState } from "react";
import { toast } from "react-toastify";

function botPath(email: string, suffix = "") {
  return `/admin/mm-bots/${encodeURIComponent(email)}${suffix}`;
}

export function useMmBots() {
  const { data, loading, error, refetch } = useFetchApi<MmBotsDashboard>(
    "/admin/mm-bots",
    { refreshInterval: 4000 }
  );

  const { mutate: patchBot } = useMutation("PATCH", botPath("placeholder"));
  const { mutate: postAction } = useMutation(
    "POST",
    "/admin/mm-bots/placeholder/cancel-orders"
  );

  const [busyEmail, setBusyEmail] = useState<string | null>(null);
  const [bootstrapping, setBootstrapping] = useState(false);

  const { mutate: postBootstrap } = useMutation("POST", "/admin/mm-bots/bootstrap");

  const run = useCallback(
    async (email: string, fn: () => Promise<unknown>) => {
      setBusyEmail(email);
      try {
        await fn();
        await refetch();
      } catch (e) {
        toast.error((e as Error)?.message ?? "Thao tác thất bại");
      } finally {
        setBusyEmail(null);
      }
    },
    [refetch]
  );

  const setEnabled = useCallback(
    (email: string, enabled: boolean) =>
      run(email, async () => {
        await patchBot({ enabled }, botPath(email));
        toast.success(enabled ? "Đã bật bot" : "Đã tắt bot");
      }),
    [patchBot, run]
  );

  const cancelOrders = useCallback(
    (email: string) =>
      run(email, async () => {
        const res = (await postAction(
          {},
          botPath(email, "/cancel-orders")
        )) as { cancelled?: number };
        toast.success(`Đã hủy ${res?.cancelled ?? 0} lệnh chờ`);
      }),
    [postAction, run]
  );

  const bootstrapBots = useCallback(async () => {
    setBootstrapping(true);
    try {
      const res = (await postBootstrap({})) as {
        created?: number;
        mm?: number;
        flow?: number;
      };
      toast.success(
        `Đã đồng bộ bot: ${res?.mm ?? 0} MM + ${res?.flow ?? 0} flow` +
          (res?.created ? ` (${res.created} tài khoản mới)` : "")
      );
      await refetch();
    } catch (e) {
      toast.error((e as Error)?.message ?? "Bootstrap bot thất bại");
    } finally {
      setBootstrapping(false);
    }
  }, [postBootstrap, refetch]);

  const refreshBot = useCallback(
    (email: string) =>
      run(email, async () => {
        await postAction({}, botPath(email, "/refresh"));
        toast.success("Đã refresh sổ lệnh bot");
      }),
    [postAction, run]
  );

  const mmBots = data?.bots.filter((b) => b.kind === "mm") ?? [];
  const flowBots = data?.bots.filter((b) => b.kind === "flow") ?? [];
  const runningMm = mmBots.filter((b) => b.running).length;
  const runningFlow = flowBots.filter((b) => b.running).length;

  const unconfiguredMm = mmBots.filter((b) => !b.configured).length;
  const unconfiguredFlow = flowBots.filter((b) => !b.configured).length;

  return {
    data,
    loading,
    error,
    refetch,
    unconfiguredMm,
    unconfiguredFlow,
    busyEmail,
    bootstrapping,
    bootstrapBots,
    mmBots,
    flowBots,
    runningMm,
    runningFlow,
    setEnabled,
    cancelOrders,
    refreshBot,
  };
}
