"use client";

import { Input } from "@/components/ui/input";
import { AdminDataTable } from "@/modules/admin/AdminDataTable";
import { AdminStatCard } from "@/modules/admin/AdminStatCard";
import { renderPnl } from "@/modules/admin/users/admin-user-format";
import useFetchApi from "@/hooks/useFetchApi";
import { unwrapPaginatedData } from "@/lib/unwrap-paginated";
import { isTraderUser } from "@/lib/system-accounts";
import type { AdminUserRow, Paginated } from "@/types/admin-user.type";
import Link from "next/link";
import { useMemo, useState } from "react";

/** API admin/users đã loại bot MM — chỉ trader. */
export function AdminUsersList() {
  const [q, setQ] = useState("");
  const { data: usersRes, loading, error } = useFetchApi<
    Paginated<AdminUserRow> | AdminUserRow[]
  >("/admin/users", { defaultParams: { perPage: 100, orderBy: "createdAt:desc" } });

  const traders = useMemo(() => {
    const rows = unwrapPaginatedData(usersRes).filter(isTraderUser);
    const term = q.trim().toLowerCase();
    if (!term) return rows;
    return rows.filter((u) =>
      `${u.email ?? ""} ${u.username ?? ""} ${u.role}`
        .toLowerCase()
        .includes(term)
    );
  }, [usersRes, q]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-kc-fg">Quản lý người dùng</h1>
        <p className="mt-1 text-sm text-kc-muted">
          Chỉ hiển thị <strong className="text-kc-fg">trader</strong> — tài khoản
          Market maker / flow bot không nằm trong danh sách này.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <AdminStatCard label="Trader" value={traders.length} />
        <AdminStatCard label="Đang hiển thị" value={traders.length} />
      </div>

      {error ? (
        <p className="text-sm text-kc-down">
          Không tải được danh sách — đăng nhập admin và thử lại.
        </p>
      ) : null}

      <Input
        placeholder="Lọc email, username, role…"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        className="max-w-md"
      />

      <AdminDataTable
        title={loading ? "Đang tải…" : `Trader (${traders.length})`}
        rows={traders}
        rowKey={(u) => u.id}
        emptyMessage="Không có trader"
        columns={[
          {
            key: "email",
            header: "Email",
            render: (u) => (
              <Link
                href={`/admin/users/${u.id}`}
                className="font-medium text-violet-300 hover:underline"
              >
                {u.email ?? "—"}
              </Link>
            ),
          },
          {
            key: "username",
            header: "Username",
            render: (u) => u.username ?? "—",
          },
          { key: "role", header: "Vai trò", render: (u) => u.role },
          {
            key: "daily",
            header: "PnL ngày",
            className: "num",
            render: (u) => {
              const { text, positive } = renderPnl(u.dailyPnL, u.dailyPnLPercent);
              return (
                <span className={positive ? "text-kc-up" : "text-kc-down"}>
                  {text}
                </span>
              );
            },
          },
          {
            key: "weekly",
            header: "PnL tuần",
            className: "num",
            render: (u) => {
              const { text, positive } = renderPnl(
                u.weeklyPnL,
                u.weeklyPnLPercent
              );
              return (
                <span className={positive ? "text-kc-up" : "text-kc-down"}>
                  {text}
                </span>
              );
            },
          },
          {
            key: "action",
            header: "",
            render: (u) => (
              <Link
                href={`/admin/users/${u.id}`}
                className="text-xs text-violet-400 hover:underline"
              >
                Chi tiết →
              </Link>
            ),
          },
        ]}
      />
    </div>
  );
}
