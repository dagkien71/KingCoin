"use client";

import ActiveSetupsPanel from "@/modules/admin/ActiveSetupsPanel";
import { ADMIN_TAGLINE } from "@/modules/admin/constants";
import { MarketControlAdvanced } from "./MarketControlAdvanced";
import { MarketControlPresets } from "./MarketControlPresets";
import { MarketControlScopePanel } from "./MarketControlScopePanel";
import { MarketControlWorkbench } from "./MarketControlWorkbench";
import { useMarketControl } from "./useMarketControl";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { HiOutlineChip, HiOutlineRefresh, HiOutlineTrendingUp } from "react-icons/hi";

export function MarketControlView() {
  const mc = useMarketControl();
  const {
    data,
    loading,
    refetch,
    busyId,
    setBusyId,
    setSelectedId,
    setTargetMode,
    postAction,
  } = mc;

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
        <p className="text-xs font-medium uppercase tracking-wider text-violet-400/90">
          Điều khiển thị trường
        </p>
        <h1 className="mt-1 text-2xl font-semibold text-kc-fg">
          Bàn điều khiển MM & giá
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-kc-muted">{ADMIN_TAGLINE}</p>
        <p className="mt-2 text-xs text-kc-muted">
          Refresh mỗi 5 giây. Pump/dump nhanh dùng “kịch bản”; PP1/PP2 là preset & mô hình.
        </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            disabled={loading}
            onClick={() => void refetch()}
            className="gap-1.5"
          >
            <HiOutlineRefresh className="h-4 w-4" />
            Làm mới
          </Button>
          <Link href="/admin/mm-bots">
            <Button type="button" variant="ghost" size="sm" className="gap-1.5">
              <HiOutlineChip className="h-4 w-4" />
              Bot MM
            </Button>
          </Link>
          <Link href="/admin/market-settings">
            <Button type="button" variant="ghost" size="sm" className="gap-1.5">
              <HiOutlineTrendingUp className="h-4 w-4" />
              Cài đặt MM
            </Button>
          </Link>
        </div>
      </header>

      <ActiveSetupsPanel
        tokens={data?.tokens ?? []}
        loading={loading}
        busyId={busyId}
        onBusyChange={setBusyId}
        onRefetch={refetch}
        postAction={postAction}
        onSelectToken={(id) => {
          setSelectedId(id);
          setTargetMode("single");
        }}
      />

      <div className="grid items-start gap-6 xl:grid-cols-[minmax(320px,420px)_1fr]">
        <div className="space-y-5 xl:sticky xl:top-5">
          <MarketControlScopePanel mc={mc} />
        </div>

        <div className="min-w-0 space-y-5">
          <MarketControlWorkbench mc={mc} />
          <MarketControlPresets mc={mc} />
          <MarketControlAdvanced mc={mc} />
        </div>
      </div>

      {loading && !data && (
        <p className="text-center text-sm text-kc-muted">Đang tải…</p>
      )}
    </div>
  );
}

export default MarketControlView;
