"use client";

import { Button } from "@/components/ui/button";
import { AdminDataTable } from "@/modules/admin/AdminDataTable";
import { AdminStatCard } from "@/modules/admin/AdminStatCard";
import { ADMIN_TAGLINE } from "@/modules/admin/constants";
import {
  ageLabel,
  BotRoleBadge,
  formatOrderTime,
  SideBadge,
} from "@/modules/admin/liquidity-orders/liquidity-orders-utils";
import type {
  LiquidityFillRow,
  LiquidityPendingOrderRow,
} from "@/modules/admin/liquidity-orders/liquidity-orders-types";
import { useLiquidityOrders } from "@/modules/admin/liquidity-orders/useLiquidityOrders";
import { formatInputPrice, formatToolbarVolume } from "@/utils/format-number";
import clsx from "clsx";
import Link from "next/link";
import { useState } from "react";
import { HiOutlineChip, HiOutlineRefresh } from "react-icons/hi";

type TabId = "pending" | "fills";

export function LiquidityOrdersView() {
  const {
    data,
    loading,
    error,
    refetch,
    tokenId,
    setTokenId,
    role,
    setRole,
  } = useLiquidityOrders();
  const [tab, setTab] = useState<TabId>("pending");

  const summary = data?.summary;

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-violet-400/90">
            Giám sát
          </p>
          <h1 className="mt-1 text-2xl font-semibold text-kc-fg">
            Lệnh MM & Flow
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-kc-muted">{ADMIN_TAGLINE}</p>
          <p className="mt-1 text-xs text-kc-muted">
            Lệnh treo (limit trên sổ) và khớp gần đây từ bot thanh khoản — tự làm
            mới 3 giây.
            {data?.at ? (
              <span className="num ml-1 text-kc-fg/70">
                · {formatOrderTime(new Date(data.at).toISOString())}
              </span>
            ) : null}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
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
        </div>
      </header>

      {error ? (
        <p className="rounded-lg border border-kc-down/30 bg-kc-down/10 px-4 py-3 text-sm text-kc-down">
          {error}
        </p>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <AdminStatCard
          label="Lệnh treo"
          value={summary?.pendingTotal ?? (loading ? "…" : 0)}
          hint={`MM ${summary?.pendingMm ?? 0} · Flow ${summary?.pendingFlow ?? 0}`}
        />
        <AdminStatCard
          label="Treo · MM"
          value={summary?.pendingMm ?? (loading ? "…" : 0)}
          hint="Market maker limit"
        />
        <AdminStatCard
          label="Treo · Flow"
          value={summary?.pendingFlow ?? (loading ? "…" : 0)}
          hint="Taker bot"
        />
        <AdminStatCard
          label="Khớp (mẫu)"
          value={summary?.fillsShown ?? (loading ? "…" : 0)}
          hint="150 fill gần nhất"
        />
        <AdminStatCard
          label="Vol khớp (mẫu)"
          value={
            summary != null
              ? `${formatToolbarVolume(summary.fillsVolumeKc)} KC`
              : loading
                ? "…"
                : "0"
          }
          hint="Tổng notional trong danh sách"
        />
      </div>

      <div className="flex flex-wrap items-end gap-3 rounded-xl border border-violet-500/15 bg-[#0c0a14]/60 p-4">
        <label className="flex min-w-[10rem] flex-col gap-1 text-xs text-kc-muted">
          Token
          <select
            value={tokenId}
            onChange={(e) => setTokenId(e.target.value)}
            className="rounded-lg border border-kc-border bg-kc-bg px-2 py-1.5 text-sm text-kc-fg"
          >
            <option value="">Tất cả</option>
            {(data?.tokens ?? []).map((t) => (
              <option key={t.id} value={t.id}>
                {t.symbol}
              </option>
            ))}
          </select>
        </label>
        <label className="flex min-w-[8rem] flex-col gap-1 text-xs text-kc-muted">
          Loại bot
          <select
            value={role}
            onChange={(e) =>
              setRole(e.target.value as "" | "mm" | "flow" | "user_bot")
            }
            className="rounded-lg border border-kc-border bg-kc-bg px-2 py-1.5 text-sm text-kc-fg"
          >
            <option value="">Tất cả</option>
            <option value="mm">MM</option>
            <option value="flow">Flow</option>
            <option value="user_bot">User-bot</option>
          </select>
        </label>
      </div>

      <div className="flex gap-1 border-b border-violet-500/15">
        {(
          [
            ["pending", `Lệnh treo (${summary?.pendingTotal ?? 0})`],
            ["fills", `Đã khớp (${summary?.fillsShown ?? 0})`],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={clsx(
              "border-b-2 px-4 py-2 text-sm font-medium transition-colors",
              tab === id
                ? "border-violet-400 text-violet-200"
                : "border-transparent text-kc-muted hover:text-kc-fg",
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "pending" ? (
        <AdminDataTable<LiquidityPendingOrderRow>
          title="Lệnh limit đang chờ khớp (bot đặt)"
          rows={data?.pendingOrders ?? []}
          rowKey={(r) => r.id}
          emptyMessage={
            loading ? "Đang tải…" : "Không có lệnh treo từ bot (hoặc đã khớp hết)."
          }
          columns={[
            {
              key: "role",
              header: "Bot",
              render: (r) => (
                <div className="space-y-0.5">
                  <BotRoleBadge role={r.botRole} />
                  <p className="max-w-[11rem] truncate text-xs text-kc-muted">
                    {r.botEmail}
                  </p>
                </div>
              ),
            },
            {
              key: "pair",
              header: "Cặp",
              render: (r) => (
                <span className="num font-medium text-kc-fg">{r.pair}</span>
              ),
            },
            {
              key: "side",
              header: "Chiều",
              render: (r) => <SideBadge side={r.type} />,
            },
            {
              key: "price",
              header: "Giá",
              className: "text-right",
              render: (r) => (
                <span className="num text-kc-fg">{formatInputPrice(r.price)}</span>
              ),
            },
            {
              key: "qty",
              header: "SL",
              className: "text-right",
              render: (r) => (
                <span className="num text-kc-muted">
                  {formatToolbarVolume(r.remaining)}
                  {r.matchedQuantity > 0 ? (
                    <span className="block text-[10px] text-kc-fg/60">
                      khớp {formatToolbarVolume(r.matchedQuantity)}
                    </span>
                  ) : null}
                </span>
              ),
            },
            {
              key: "kc",
              header: "≈ KC",
              className: "text-right",
              render: (r) => (
                <span className="num text-kc-fg">
                  {formatToolbarVolume(r.notionalKc)}
                </span>
              ),
            },
            {
              key: "age",
              header: "Treo",
              render: (r) => (
                <div className="text-xs">
                  <p className="text-kc-fg">{ageLabel(r.createdAt)}</p>
                  <p className="text-kc-muted">{formatOrderTime(r.createdAt)}</p>
                </div>
              ),
            },
          ]}
        />
      ) : (
        <AdminDataTable<LiquidityFillRow>
          title="Khớp lệnh gần đây (có bot tham gia)"
          rows={data?.fills ?? []}
          rowKey={(r) => r.id}
          emptyMessage={loading ? "Đang tải…" : "Chưa có khớp nào trong mẫu."}
          columns={[
            {
              key: "time",
              header: "Thời gian",
              render: (r) => (
                <span className="text-xs text-kc-muted">
                  {formatOrderTime(r.createdAt)}
                </span>
              ),
            },
            {
              key: "pair",
              header: "Cặp",
              render: (r) => (
                <span className="num font-medium text-kc-fg">{r.pair}</span>
              ),
            },
            {
              key: "price",
              header: "Giá",
              className: "text-right",
              render: (r) => (
                <span className="num text-kc-fg">{formatInputPrice(r.price)}</span>
              ),
            },
            {
              key: "qty",
              header: "KL",
              className: "text-right",
              render: (r) => (
                <span className="num">{formatToolbarVolume(r.quantity)}</span>
              ),
            },
            {
              key: "kc",
              header: "KC",
              className: "text-right",
              render: (r) => (
                <span className="num font-medium text-kc-up">
                  {formatToolbarVolume(r.notionalKc)}
                </span>
              ),
            },
            {
              key: "buyer",
              header: "Bên mua",
              render: (r) => (
                <div className="max-w-[10rem] truncate text-xs">
                  <p className="text-kc-fg">{r.buyerEmail}</p>
                  {r.buyerRole ? <BotRoleBadge role={r.buyerRole} /> : null}
                </div>
              ),
            },
            {
              key: "seller",
              header: "Bên bán",
              render: (r) => (
                <div className="max-w-[10rem] truncate text-xs">
                  <p className="text-kc-fg">{r.sellerEmail}</p>
                  {r.sellerRole ? <BotRoleBadge role={r.sellerRole} /> : null}
                </div>
              ),
            },
            {
              key: "taker",
              header: "Bot taker",
              render: (r) =>
                r.takerRole && r.takerSide ? (
                  <div className="flex items-center gap-1">
                    <BotRoleBadge role={r.takerRole} />
                    <SideBadge side={r.takerSide} />
                  </div>
                ) : (
                  <span className="text-xs text-kc-muted">User</span>
                ),
            },
          ]}
        />
      )}

      {data?.bots?.some((b) => !b.configured) ? (
        <p className="text-xs text-amber-400/90">
          Một số email bot chưa có user trong DB — chạy bootstrap tại trang Bot MM.
        </p>
      ) : null}
    </div>
  );
}
