"use client";

import ActiveSetupsPanel from "@/modules/admin/ActiveSetupsPanel";
import { ADMIN_TAGLINE } from "@/modules/admin/constants";
import { MarketControlAdvanced } from "./MarketControlAdvanced";
import { MarketControlPresets } from "./MarketControlPresets";
import { MarketControlScopePanel } from "./MarketControlScopePanel";
import { MarketControlWorkbench } from "./MarketControlWorkbench";
import { useMarketControl } from "./useMarketControl";

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
      <header>
        <p className="text-xs font-medium uppercase tracking-wider text-violet-400/90">
          Điều khiển thị trường
        </p>
        <h1 className="mt-1 text-2xl font-semibold text-kc-fg">
          Bàn điều khiển MM & giá
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-kc-muted">{ADMIN_TAGLINE}</p>
        <p className="mt-2 text-xs text-kc-muted">
          Bàn nhanh theo % ở cột phải; preset PP1/PP2 và tùy chỉnh bên dưới. Dữ
          liệu làm mới mỗi 5 giây.
        </p>
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

      <div className="grid items-start gap-6 xl:grid-cols-[minmax(300px,380px)_1fr]">
        <div className="space-y-5 xl:sticky xl:top-4">
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
