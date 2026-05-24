"use client";

import { Button } from "@/components/ui/button";
import { TokenIdentity } from "@/components/token/TokenLogo";
import { cn } from "@/lib/cn";
import {
  collectActiveSetups,
  formatSetupRemaining,
  formatSetupTime,
  type ActiveSetupRow,
} from "@/modules/admin/market-active-setups";
import { useMemo } from "react";
import { toast } from "react-toastify";

type TokenWithPaths = Parameters<typeof collectActiveSetups>[0][number];

type Props = {
  tokens: TokenWithPaths[];
  loading?: boolean;
  busyId: string | null;
  onBusyChange: (id: string | null) => void;
  onRefetch: () => void | Promise<unknown>;
  postAction: (body: unknown, path: string) => Promise<unknown>;
  onSelectToken: (tokenId: string) => void;
};

function SetupKindBadge({ kind }: { kind: ActiveSetupRow["kind"] }) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 rounded-md px-2 py-0.5 text-xs font-medium",
        kind === "pp2"
          ? "bg-violet-500/20 text-violet-200"
          : "bg-amber-500/20 text-amber-200"
      )}
    >
      {kind === "pp2" ? "PP2" : "PP1"}
    </span>
  );
}

function ProgressBar({
  kind,
  progress,
}: {
  kind: ActiveSetupRow["kind"];
  progress: number;
}) {
  const pct = Math.round((progress ?? 0) * 100);
  return (
    <div className="flex min-w-[88px] items-center gap-2">
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/10">
        <div
          className={cn(
            "h-full transition-all",
            kind === "pp2" ? "bg-violet-400" : "bg-amber-400"
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="num w-9 shrink-0 text-right text-xs text-kc-muted">
        {pct}%
      </span>
    </div>
  );
}

function SetupRowCard({
  row,
  now,
  busyId,
  onSelectToken,
  onCancel,
}: {
  row: ActiveSetupRow;
  now: number;
  busyId: string | null;
  onSelectToken: (id: string) => void;
  onCancel: (row: ActiveSetupRow) => void;
}) {
  const remain = row.endAt - now;
  const busy = busyId === `cancel-${row.tokenId}`;

  return (
    <div className="rounded-lg border border-amber-500/15 bg-[#0c0a14]/50 p-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <TokenIdentity
          logo={row.logo}
          symbol={row.symbol}
          name={row.name}
          id={row.tokenId}
          size="sm"
          nameFirst
          className="min-w-0 max-w-[min(100%,220px)]"
        />
        <div className="flex shrink-0 items-center gap-1.5">
          <SetupKindBadge kind={row.kind} />
          <span className="text-xs text-kc-muted">{row.status}</span>
        </div>
      </div>

      <p className="mt-2 text-sm text-kc-fg">{row.label}</p>
      <p className="num text-xs text-kc-muted">{row.detail}</p>
      {row.currentTarget != null && (
        <p className="num mt-0.5 text-xs text-violet-200">
          → {row.currentTarget}
        </p>
      )}

      <div className="mt-3 grid gap-2 text-xs text-kc-muted sm:grid-cols-2">
        <div>
          <span className="block">{formatSetupTime(row.startAt)}</span>
          <span className="block">→ {formatSetupTime(row.endAt)}</span>
          <span className="mt-0.5 block text-amber-200/90">
            còn {formatSetupRemaining(remain)}
          </span>
        </div>
        <div className="flex items-center sm:justify-end">
          <ProgressBar kind={row.kind} progress={row.progress} />
        </div>
      </div>

      <div className="mt-3 flex justify-end gap-1 border-t border-white/[0.06] pt-2">
        <Button
          type="button"
          size="sm"
          variant="ghost"
          disabled={busyId !== null}
          onClick={() => onSelectToken(row.tokenId)}
        >
          Xem
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="text-amber-200 hover:bg-amber-500/15"
          disabled={busyId !== null}
          onClick={() => void onCancel(row)}
        >
          {busy ? "…" : "Hủy"}
        </Button>
      </div>
    </div>
  );
}

export default function ActiveSetupsPanel({
  tokens,
  loading,
  busyId,
  onBusyChange,
  onRefetch,
  postAction,
  onSelectToken,
}: Props) {
  const rows = useMemo(() => collectActiveSetups(tokens), [tokens]);
  const now = Date.now();

  const cancelOne = async (row: ActiveSetupRow) => {
    const label = `${row.symbol} · ${row.label}`;
    if (!window.confirm(`Hủy setup «${label}»?`)) return;
    onBusyChange(`cancel-${row.tokenId}`);
    try {
      const path =
        row.kind === "pp2"
          ? `/admin/market-control/tokens/${row.tokenId}/model-run/cancel`
          : `/admin/market-control/tokens/${row.tokenId}/schedule/cancel`;
      await postAction({}, path);
      await postAction(
        {},
        `/admin/market-control/tokens/${row.tokenId}/refresh`
      );
      toast.success(`Đã hủy ${label}`);
      await onRefetch();
    } catch {
      toast.error("Không hủy được setup");
    } finally {
      onBusyChange(null);
    }
  };

  const cancelAll = async () => {
    if (rows.length === 0) return;
    if (
      !window.confirm(
        `Hủy ${rows.length} setup đang chạy trên ${rows.length} mã?`
      )
    ) {
      return;
    }
    onBusyChange("cancel-all-active");
    try {
      const res = (await postAction(
        { tokenIds: rows.map((r) => r.tokenId) },
        "/admin/market-control/bulk/cancel-paths"
      )) as { count?: number };
      await postAction({}, "/admin/market-control/refresh");
      toast.success(`Đã hủy setup trên ${res?.count ?? rows.length} mã`);
      await onRefetch();
    } catch {
      toast.error("Không hủy hàng loạt được");
    } finally {
      onBusyChange(null);
    }
  };

  return (
    <section className="overflow-hidden rounded-2xl border border-amber-500/25 bg-gradient-to-br from-amber-500/[0.08] to-[#0c0a14]/80 p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="flex flex-wrap items-center gap-2 text-sm font-semibold text-kc-fg">
            Setup đang chạy
            {!loading && (
              <span className="rounded-full bg-amber-500/25 px-2 py-0.5 text-xs font-medium text-amber-100">
                {rows.length}
              </span>
            )}
          </h2>
          <p className="mt-1 text-xs leading-relaxed text-kc-muted">
            Lịch PP1 và mô hình PP2 còn hiệu lực (đang chạy hoặc chờ giờ bắt
            đầu). Tự làm mới mỗi 5 giây.
          </p>
        </div>
        {rows.length > 0 ? (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="shrink-0 border border-amber-500/40 text-amber-200 hover:bg-amber-500/15"
            disabled={busyId !== null}
            onClick={() => void cancelAll()}
          >
            Hủy tất cả
          </Button>
        ) : null}
      </div>

      {loading && rows.length === 0 ? (
        <p className="mt-4 text-sm text-kc-muted">Đang tải…</p>
      ) : rows.length === 0 ? (
        <p className="mt-4 rounded-lg border border-dashed border-amber-500/20 bg-[#0a0812]/60 px-4 py-6 text-center text-sm text-kc-muted">
          Không có setup đường giá nào đang chạy. Bật preset PP1 hoặc mô hình
          PP2 bên dưới để xuất hiện tại đây.
        </p>
      ) : (
        <>
          <div className="mt-4 space-y-2 lg:hidden">
            {rows.map((row) => (
              <SetupRowCard
                key={`${row.tokenId}-${row.kind}`}
                row={row}
                now={now}
                busyId={busyId}
                onSelectToken={onSelectToken}
                onCancel={cancelOne}
              />
            ))}
          </div>

          <div className="mt-4 hidden overflow-x-auto rounded-lg border border-violet-500/15 bg-[#0c0a14]/60 lg:block">
            <table className="w-full min-w-[720px] table-fixed text-left text-sm">
              <colgroup>
                <col className="w-[22%]" />
                <col className="w-[12%]" />
                <col className="w-[24%]" />
                <col className="w-[18%]" />
                <col className="w-[12%]" />
                <col className="w-[12%]" />
              </colgroup>
              <thead>
                <tr className="border-b border-violet-500/10 bg-[#14101f]/95 text-xs uppercase tracking-wide text-kc-muted">
                  <th className="px-3 py-2.5 font-medium">Mã</th>
                  <th className="px-3 py-2.5 font-medium">Loại</th>
                  <th className="px-3 py-2.5 font-medium">Chi tiết</th>
                  <th className="px-3 py-2.5 font-medium">Thời gian</th>
                  <th className="px-3 py-2.5 font-medium">Tiến độ</th>
                  <th className="px-3 py-2.5 text-right font-medium">
                    Thao tác
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  const remain = row.endAt - now;
                  const busy = busyId === `cancel-${row.tokenId}`;
                  return (
                    <tr
                      key={`${row.tokenId}-${row.kind}`}
                      className="border-b border-white/[0.04] last:border-0 hover:bg-white/[0.02]"
                    >
                      <td className="px-3 py-2.5 align-top">
                        <TokenIdentity
                          logo={row.logo}
                          symbol={row.symbol}
                          name={row.name}
                          id={row.tokenId}
                          size="sm"
                          nameFirst
                          className="min-w-0"
                        />
                      </td>
                      <td className="px-3 py-2.5 align-top">
                        <SetupKindBadge kind={row.kind} />
                        <span className="mt-1 block text-xs text-kc-muted">
                          {row.status}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 align-top">
                        <span className="line-clamp-2 text-kc-fg">
                          {row.label}
                        </span>
                        <span className="num mt-0.5 block truncate text-xs text-kc-muted">
                          {row.detail}
                        </span>
                        {row.currentTarget != null && (
                          <span className="num mt-0.5 block text-xs text-violet-200">
                            → {row.currentTarget}
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2.5 align-top text-xs text-kc-muted">
                        <span className="whitespace-nowrap">
                          {formatSetupTime(row.startAt)}
                        </span>
                        <span className="block whitespace-nowrap">
                          → {formatSetupTime(row.endAt)}
                        </span>
                        <span className="mt-0.5 block whitespace-nowrap text-amber-200/90">
                          còn {formatSetupRemaining(remain)}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 align-middle">
                        <ProgressBar kind={row.kind} progress={row.progress} />
                      </td>
                      <td className="px-3 py-2.5 align-middle text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            disabled={busyId !== null}
                            onClick={() => onSelectToken(row.tokenId)}
                          >
                            Xem
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            className="text-amber-200 hover:bg-amber-500/15"
                            disabled={busyId !== null}
                            onClick={() => void cancelOne(row)}
                          >
                            {busy ? "…" : "Hủy"}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </section>
  );
}
