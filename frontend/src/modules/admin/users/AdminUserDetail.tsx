"use client";

import { Button } from "@/components/ui/button";
import { AdminDataTable } from "@/modules/admin/AdminDataTable";
import { AdminStatCard } from "@/modules/admin/AdminStatCard";
import { AdminSection } from "@/modules/admin/AdminSection";
import { AccountTagBadge } from "@/modules/admin/users/AccountTagBadge";
import {
  formatKc,
  pnlTone,
  renderPnl,
} from "@/modules/admin/users/admin-user-format";
import useFetchApi from "@/hooks/useFetchApi";
import { unwrapPaginatedData } from "@/lib/unwrap-paginated";
import useMutation from "@/hooks/useMutation";
import { QUOTE_SYMBOL } from "@/constants/quote";
import type {
  AdminFuturesHistory,
  AdminFuturesPosition,
  AdminLedgerEntry,
  AdminUserOrder,
  AdminUserOverview,
  Paginated,
} from "@/types/admin-user.type";
import Link from "next/link";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import { HiOutlineArrowLeft, HiOutlineRefresh } from "react-icons/hi";
import { toast } from "react-toastify";

type TabId = "overview" | "balances" | "orders" | "futures" | "ledger";

const TABS: { id: TabId; label: string }[] = [
  { id: "overview", label: "Tổng quan" },
  { id: "balances", label: "Số dư" },
  { id: "orders", label: "Lệnh spot" },
  { id: "futures", label: "Futures" },
  { id: "ledger", label: "Sổ cái" },
];

export function AdminUserDetail() {
  const router = useRouter();
  const userId = typeof router.query.id === "string" ? router.query.id : "";
  const [tab, setTab] = useState<TabId>("overview");
  const [orderFilter, setOrderFilter] = useState<
    "pending" | "complete" | "cancel" | ""
  >("pending");

  const {
    data: overview,
    loading: overviewLoading,
    refetch: refetchOverview,
  } = useFetchApi<AdminUserOverview>(
    userId ? `/admin/users/${userId}/overview` : "",
    { refreshInterval: 15_000, silentOnPoll: true }
  );

  const {
    data: ordersRes,
    loading: ordersLoading,
    refetch: refetchOrders,
    setQueryParams: setOrderParams,
  } = useFetchApi<Paginated<AdminUserOrder> | AdminUserOrder[]>(
    userId ? `/admin/users/${userId}/orders` : "",
    {
      defaultParams: { status: "pending", perPage: 50 },
      refreshInterval: tab === "orders" ? 8_000 : undefined,
      silentOnPoll: true,
    }
  );

  useEffect(() => {
    if (!userId || tab !== "orders") return;
    setOrderParams(
      orderFilter ? { status: orderFilter, perPage: 50 } : { perPage: 50 }
    );
  }, [userId, tab, orderFilter, setOrderParams]);

  const { data: positions, refetch: refetchFutures } = useFetchApi<
    AdminFuturesPosition[]
  >(userId && tab === "futures" ? `/admin/users/${userId}/futures/positions` : "", {
    refreshInterval: 8_000,
    silentOnPoll: true,
  });

  const { data: futuresHistory } = useFetchApi<AdminFuturesHistory[]>(
    userId && tab === "futures"
      ? `/admin/users/${userId}/futures/history?limit=30`
      : ""
  );

  const { data: ledgerRes, loading: ledgerLoading } = useFetchApi<
    Paginated<AdminLedgerEntry> | AdminLedgerEntry[]
  >(userId && tab === "ledger" ? `/admin/users/${userId}/ledger` : "", {
    defaultParams: { perPage: 40 },
  });

  const { mutate: patchUser, loading: patching } = useMutation(
    "PATCH",
    userId ? `/admin/users/${userId}` : ""
  );

  const user = overview?.user;
  const stats = overview?.stats;
  const balances = overview?.balances;
  const orders = unwrapPaginatedData(ordersRes);
  const ledger = unwrapPaginatedData(ledgerRes);
  const isBot = overview?.isLiquidityBot ?? false;

  const refreshAll = () => {
    void refetchOverview();
    void refetchOrders();
    void refetchFutures();
  };

  const changeRole = async (role: string) => {
    const res = await patchUser({ role } as never);
    if (res !== undefined) {
      toast.success("Đã cập nhật vai trò");
      refetchOverview();
    }
  };

  if (!userId) return null;

  const daily = renderPnl(user?.dailyPnL, user?.dailyPnLPercent);
  const weekly = renderPnl(user?.weeklyPnL, user?.weeklyPnLPercent);
  const totalPnlSpotFutures =
    (stats?.futuresRealizedPnlKc ?? 0) + (stats?.futuresUnrealizedPnlKc ?? 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link
            href="/admin/users"
            className="mb-2 inline-flex items-center gap-1 text-xs text-kc-muted hover:text-violet-300"
          >
            <HiOutlineArrowLeft className="h-3.5 w-3.5" />
            Danh sách user
          </Link>
          <h1 className="text-2xl font-semibold text-kc-fg">
            {user?.email ?? user?.username ?? userId}
          </h1>
          <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-kc-muted">
            <span>
              {user?.username ? `@${user.username}` : ""} · {user?.role} ·{" "}
              {user?.status ?? "active"}
            </span>
            {user ? <AccountTagBadge user={user} /> : null}
          </p>
          {isBot ? (
            <p className="mt-2 rounded-lg border border-amber-500/25 bg-amber-500/10 px-3 py-2 text-xs text-amber-100/90">
              Tài khoản bot thanh khoản — chỉ dùng treo lệnh / khớp MM, không
              tính vào thống kê trader.
            </p>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" size="sm" type="button" onClick={refreshAll}>
            <HiOutlineRefresh className="h-4 w-4" />
            Làm mới
          </Button>
          {user?.role !== "admin" ? (
            <Button
              variant="secondary"
              size="sm"
              type="button"
              disabled={patching}
              onClick={() => changeRole("admin")}
            >
              Gán admin
            </Button>
          ) : null}
          {user?.role !== "user" ? (
            <Button
              variant="secondary"
              size="sm"
              type="button"
              disabled={patching}
              onClick={() => changeRole("user")}
            >
              Gán user
            </Button>
          ) : null}
        </div>
      </div>

      <div className="flex flex-wrap gap-2 border-b border-violet-500/15 pb-2">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
              tab === t.id
                ? "bg-violet-500/20 text-violet-200"
                : "text-kc-muted hover:text-kc-fg"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "overview" && (
        <div className="space-y-6">
          {overviewLoading && !overview ? (
            <p className="text-sm text-kc-muted">Đang tải…</p>
          ) : null}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <AdminStatCard
              label={`NAV (${QUOTE_SYMBOL})`}
              value={formatKc(stats?.navKc)}
              hint="Quote + alt theo giá spot"
            />
            <AdminStatCard
              label={`KC (${QUOTE_SYMBOL})`}
              value={formatKc(stats?.quoteKc)}
            />
            <AdminStatCard
              label="Giá trị alt"
              value={formatKc(stats?.altValueKc)}
            />
            <AdminStatCard
              label="PnL ngày"
              value={daily.text}
              tone={pnlTone(user?.dailyPnL ?? 0)}
            />
            <AdminStatCard
              label="PnL tuần"
              value={weekly.text}
              tone={pnlTone(user?.weeklyPnL ?? 0)}
            />
            <AdminStatCard
              label="Lệnh spot mở"
              value={stats?.openSpotOrders ?? 0}
              tone={(stats?.openSpotOrders ?? 0) > 0 ? "warn" : "muted"}
            />
            <AdminStatCard
              label="Khớp spot"
              value={stats?.spotFillCount ?? 0}
              hint={`Vol ~${formatKc(stats?.spotVolumeKc, 0)} KC`}
            />
            <AdminStatCard
              label="Futures PnL (ước)"
              value={formatKc(totalPnlSpotFutures)}
              hint={`Realized ${formatKc(stats?.futuresRealizedPnlKc)} · U.PnL ${formatKc(stats?.futuresUnrealizedPnlKc)}`}
              tone={pnlTone(totalPnlSpotFutures)}
            />
          </div>

          <AdminSection title="Thống kê lệnh">
            <div className="grid gap-3 sm:grid-cols-3">
              <AdminStatCard
                label="Đang chờ"
                value={stats?.openSpotOrders ?? 0}
              />
              <AdminStatCard
                label="Đã khớp / hoàn tất"
                value={stats?.completedSpotOrders ?? 0}
              />
              <AdminStatCard
                label="Đã hủy"
                value={stats?.canceledSpotOrders ?? 0}
              />
              <AdminStatCard
                label="Vị thế futures mở"
                value={stats?.openFuturesPositions ?? 0}
              />
              <AdminStatCard
                label="Ký quỹ futures"
                value={formatKc(stats?.futuresMarginKc)}
              />
              <AdminStatCard
                label="Lỗ/lãi futures (đã đóng)"
                value={formatKc(stats?.futuresRealizedPnlKc)}
                tone={pnlTone(stats?.futuresRealizedPnlKc ?? 0)}
              />
            </div>
          </AdminSection>
        </div>
      )}

      {tab === "balances" && (
        <AdminDataTable
          title={`Số dư · KC ${formatKc(balances?.quoteKc)}`}
          rows={[
            {
              id: "kc",
              symbol: QUOTE_SYMBOL,
              amount: balances?.quoteKc ?? 0,
            },
            ...(balances?.tokens ?? []).map((t) => ({
              id: t.tokenId,
              symbol: t.symbol ?? t.tokenId.slice(0, 8),
              amount: t.amount,
            })),
          ]}
          rowKey={(r) => r.id}
          emptyMessage="Không có số dư"
          columns={[
            { key: "sym", header: "Token", render: (r) => r.symbol },
            {
              key: "amt",
              header: "Số lượng",
              className: "num",
              render: (r) => r.amount.toLocaleString("vi-VN"),
            },
          ]}
        />
      )}

      {tab === "orders" && (
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2">
            {(
              [
                ["pending", "Đang mở"],
                ["complete", "Hoàn tất"],
                ["cancel", "Đã hủy"],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => setOrderFilter(id)}
                className={`rounded-lg px-3 py-1 text-xs font-medium ${
                  orderFilter === id
                    ? "bg-violet-500/25 text-violet-200"
                    : "bg-white/5 text-kc-muted"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <AdminDataTable
            title={ordersLoading ? "Đang tải lệnh…" : `Lệnh spot (${orders.length})`}
            rows={orders}
            rowKey={(o) => o.id}
            emptyMessage="Không có lệnh"
            columns={[
              {
                key: "pair",
                header: "Cặp",
                render: (o) => o.pair ?? o.symbol ?? "—",
              },
              {
                key: "type",
                header: "Loại",
                render: (o) => (
                  <span
                    className={
                      o.type === "buy" ? "text-kc-up" : "text-kc-down"
                    }
                  >
                    {o.type}
                  </span>
                ),
              },
              {
                key: "price",
                header: "Giá",
                className: "num",
                render: (o) => formatKc(o.price, 4),
              },
              {
                key: "qty",
                header: "KL",
                className: "num",
                render: (o) =>
                  `${o.matchedQuantity}/${o.quantity}`.toLocaleString(),
              },
              { key: "st", header: "TT", render: (o) => o.status },
              {
                key: "at",
                header: "Tạo",
                render: (o) =>
                  new Date(o.createdAt).toLocaleString("vi-VN"),
              },
            ]}
          />
        </div>
      )}

      {tab === "futures" && (
        <div className="space-y-6">
          <AdminDataTable
            title={`Vị thế mở (${positions?.length ?? 0})`}
            rows={positions ?? []}
            rowKey={(p) => p.id}
            emptyMessage="Không có vị thế mở"
            columns={[
              {
                key: "sym",
                header: "Cặp",
                render: (p) => p.symbol ?? p.tokenId.slice(0, 6),
              },
              { key: "side", header: "Side", render: (p) => p.side },
              {
                key: "lev",
                header: "Đòn",
                className: "num",
                render: (p) => `${p.leverage}x`,
              },
              {
                key: "size",
                header: "Size",
                className: "num",
                render: (p) => p.size,
              },
              {
                key: "entry",
                header: "Entry",
                className: "num",
                render: (p) => formatKc(p.entryPrice, 4),
              },
              {
                key: "upnl",
                header: "U.PnL",
                className: "num",
                render: (p) => (
                  <span
                    className={
                      p.unrealizedPnlKc >= 0 ? "text-kc-up" : "text-kc-down"
                    }
                  >
                    {formatKc(p.unrealizedPnlKc)}
                  </span>
                ),
              },
              {
                key: "margin",
                header: "Margin",
                className: "num",
                render: (p) => formatKc(p.marginKc),
              },
            ]}
          />
          <AdminDataTable
            title="Lịch sử đóng / thanh lý"
            rows={futuresHistory ?? []}
            rowKey={(p) => p.id}
            emptyMessage="Chưa có lịch sử"
            columns={[
              {
                key: "sym",
                header: "Token",
                render: (p) => p.symbol ?? "—",
              },
              { key: "side", header: "Side", render: (p) => p.side },
              {
                key: "pnl",
                header: "Realized",
                className: "num",
                render: (p) => (
                  <span
                    className={
                      p.realizedPnlKc >= 0 ? "text-kc-up" : "text-kc-down"
                    }
                  >
                    {formatKc(p.realizedPnlKc)}
                  </span>
                ),
              },
              { key: "st", header: "TT", render: (p) => p.status },
              {
                key: "closed",
                header: "Đóng",
                render: (p) =>
                  p.closedAt
                    ? new Date(p.closedAt).toLocaleString("vi-VN")
                    : "—",
              },
            ]}
          />
        </div>
      )}

      {tab === "ledger" && (
        <AdminDataTable
          title={ledgerLoading ? "Đang tải…" : `Sổ cái (${ledger.length})`}
          rows={ledger}
          rowKey={(e) => e.id}
          emptyMessage="Chưa có bút toán"
          columns={[
            {
              key: "ref",
              header: "Loại",
              render: (e) => e.refType,
            },
            {
              key: "amt",
              header: "Số tiền",
              className: "num",
              render: (e) => (
                <span className={e.amount >= 0 ? "text-kc-up" : "text-kc-down"}>
                  {e.amount >= 0 ? "+" : ""}
                  {formatKc(e.amount)} {e.currency}
                </span>
              ),
            },
            {
              key: "after",
              header: "Sau GD",
              className: "num",
              render: (e) => formatKc(e.balanceAfter),
            },
            {
              key: "note",
              header: "Ghi chú",
              render: (e) => e.note ?? "—",
            },
            {
              key: "at",
              header: "Thời gian",
              render: (e) =>
                new Date(e.createdAt).toLocaleString("vi-VN"),
            },
          ]}
        />
      )}
    </div>
  );
}
