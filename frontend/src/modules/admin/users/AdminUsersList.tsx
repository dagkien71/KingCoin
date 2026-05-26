"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AdminDataTable } from "@/modules/admin/AdminDataTable";
import { AdminStatCard } from "@/modules/admin/AdminStatCard";
import { AccountTagBadge } from "@/modules/admin/users/AccountTagBadge";
import { renderPnl } from "@/modules/admin/users/admin-user-format";
import useFetchApi from "@/hooks/useFetchApi";
import {
  getPaginatedMeta,
  unwrapPaginatedData,
} from "@/lib/unwrap-paginated";
import type { AdminUserRow, Paginated } from "@/types/admin-user.type";
import Link from "next/link";
import { useMemo, useState } from "react";

type UserScope = "traders" | "all" | "bots";

const PER_PAGE = 50;

export function AdminUsersList() {
  const [q, setQ] = useState("");
  const [scope, setScope] = useState<UserScope>("traders");
  const [page, setPage] = useState(1);

  const { data: usersRes, loading, error, setQueryParams } = useFetchApi<
    Paginated<AdminUserRow> | AdminUserRow[]
  >("/admin/users", {
    defaultParams: {
      perPage: PER_PAGE,
      orderBy: "createdAt:desc",
      scope: "traders",
      page: 1,
    },
  });

  const applyScope = (next: UserScope) => {
    setScope(next);
    setPage(1);
    setQueryParams({
      perPage: PER_PAGE,
      orderBy: "createdAt:desc",
      scope: next,
      page: 1,
    });
  };

  const goPage = (p: number) => {
    setPage(p);
    setQueryParams({
      perPage: PER_PAGE,
      orderBy: "createdAt:desc",
      scope,
      page: p,
    });
  };

  const meta = getPaginatedMeta(usersRes);
  const total = meta?.total ?? unwrapPaginatedData(usersRes).length;

  const rows = useMemo(() => {
    const list = unwrapPaginatedData(usersRes);
    const term = q.trim().toLowerCase();
    if (!term) return list;
    return list.filter((u) =>
      `${u.email ?? ""} ${u.username ?? ""} ${u.role} ${(u.accountTags ?? []).join(" ")}`
        .toLowerCase()
        .includes(term)
    );
  }, [usersRes, q]);

  const scopeHint =
    scope === "traders"
      ? "Trader thật — không gồm bot MM/flow."
      : scope === "bots"
        ? "Chỉ tài khoản bot thanh khoản."
        : "Mọi bản ghi user trong DB (gồm bot MM).";

  const totalLabel =
    scope === "traders"
      ? "Tổng user"
      : scope === "bots"
        ? "Tổng bot MM"
        : "Tổng (mọi bản ghi)";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-kc-fg">Quản lý người dùng</h1>
        <p className="mt-1 text-sm text-kc-muted">{scopeHint}</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {(
          [
            ["traders", "Trader"],
            ["bots", "Bot MM"],
            ["all", "Toàn DB"],
          ] as const
        ).map(([id, label]) => (
          <Button
            key={id}
            type="button"
            size="sm"
            variant={scope === id ? "primary" : "secondary"}
            onClick={() => applyScope(id)}
          >
            {label}
          </Button>
        ))}
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <AdminStatCard label={totalLabel} value={total} />
        <AdminStatCard label="Trang hiện tại" value={rows.length} />
        <AdminStatCard
          label="Phân trang"
          value={
            meta?.currentPage && meta?.lastPage
              ? `${meta.currentPage} / ${meta.lastPage}`
              : "—"
          }
        />
      </div>

      {error ? (
        <p className="text-sm text-kc-down">
          Không tải được danh sách — đăng nhập admin và thử lại.
        </p>
      ) : null}

      <Input
        placeholder="Lọc email, username, role… (trên trang này)"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        className="max-w-md"
      />

      <AdminDataTable
        title={
          loading
            ? "Đang tải…"
            : `User (${rows.length} trên trang · tổng ${total})`
        }
        rows={rows}
        rowKey={(u) => u.id}
        emptyMessage="Không có user"
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
          {
            key: "tags",
            header: "Tag",
            render: (u) => <AccountTagBadge user={u} />,
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

      {meta && (meta.lastPage ?? 1) > 1 ? (
        <div className="flex flex-wrap items-center justify-center gap-3">
          <Button
            type="button"
            size="sm"
            variant="secondary"
            disabled={loading || page <= 1}
            onClick={() => goPage(page - 1)}
          >
            ← Trước
          </Button>
          <span className="text-sm text-kc-muted">
            Trang {meta.currentPage ?? page} / {meta.lastPage}
          </span>
          <Button
            type="button"
            size="sm"
            variant="secondary"
            disabled={loading || !meta.next}
            onClick={() => goPage(page + 1)}
          >
            Sau →
          </Button>
        </div>
      ) : null}
    </div>
  );
}
