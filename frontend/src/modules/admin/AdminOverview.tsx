"use client";

import { Button } from "@/components/ui/button";
import useAuth from "@/hooks/useAuth";
import useFetchApi from "@/hooks/useFetchApi";
import {
  getPaginatedMeta,
  unwrapPaginatedData,
} from "@/lib/unwrap-paginated";
import { ADMIN_TAGLINE } from "@/modules/admin/constants";
import { AdminDataTable } from "@/modules/admin/AdminDataTable";
import { AdminStatCard } from "@/modules/admin/AdminStatCard";
import { isStablecoinToken } from "@/types/stablecoin.type";
import type { ITokenCrypto } from "@/types/token.type";
import { TokenIdentity } from "@/components/token/TokenLogo";
import Link from "next/link";
import { useRouter } from "next/router";
import { motion } from "framer-motion";
import {
  HiOutlineChartSquareBar,
  HiOutlineChip,
  HiOutlineTrendingUp,
} from "react-icons/hi";

type UserRow = { id: string; email: string; role: string };

type Dashboard = {
  mmEnabled: boolean;
  flowEnabled: boolean;
  envMmEnabled: boolean;
  tokens: { id: string; symbol?: string; tokenKind?: string }[];
};

export function AdminOverview() {
  const router = useRouter();
  const { user } = useAuth();
  const { data: users } = useFetchApi<{ data: UserRow[] } | UserRow[]>(
    "/admin/users",
    {
      defaultParams: {
        perPage: 50,
        scope: "traders",
        orderBy: "createdAt:desc",
        page: 1,
      },
    }
  );
  const { data: tokens } = useFetchApi<
    { data: ITokenCrypto[] } | ITokenCrypto[]
  >("/admin/token-crypto", {
    defaultParams: { perPage: 100, orderBy: "marketCap:desc" },
  });
  const { data: dashboard } = useFetchApi<Dashboard>("/admin/market-control", {
    refreshInterval: 10_000,
  });

  const userRows = unwrapPaginatedData(users);
  const userMeta = getPaginatedMeta(users);
  const traderTotal = userMeta?.total ?? userRows.length;
  const tokenRows = unwrapPaginatedData(tokens);
  const altCount =
    dashboard?.tokens?.filter((t) => !isStablecoinToken(t)).length ?? 0;

  const bento = [
    {
      title: "Điều khiển thị trường",
      desc: "MM, preset giá, spread, pause token.",
      href: "/admin/market-control",
      icon: HiOutlineTrendingUp,
      accent: "from-violet-600/30 to-fuchsia-600/10",
    },
    {
      title: "Bot MM",
      desc: "10 bot/token — bật/tắt, bootstrap, số dư KC.",
      href: "/admin/mm-bots",
      icon: HiOutlineChip,
      accent: "from-fuchsia-600/25 to-violet-600/10",
    },
    {
      title: "Lưới biểu đồ",
      desc: "OHLC đồng thời mọi mã alt.",
      href: "/admin/charts",
      icon: HiOutlineChartSquareBar,
      accent: "from-indigo-600/25 to-violet-600/10",
    },
  ];

  return (
    <div className="space-y-8">
      <motion.header
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-violet-400/90">
          Command center
        </p>
        <h1 className="mt-2 bg-gradient-to-r from-kc-fg via-violet-200 to-amber-200/80 bg-clip-text text-3xl font-semibold tracking-tight text-transparent">
          {user?.username ? `Xin chào, ${user.username}` : "Trung tâm điều hành"}
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-kc-muted">
          {ADMIN_TAGLINE}
        </p>
      </motion.header>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <AdminStatCard
          label="Tổng user"
          value={traderTotal}
          hint="Không gồm bot MM/flow"
        />
        <AdminStatCard label="Token" value={tokenRows.length} />
        <AdminStatCard
          label="MM runtime"
          value={dashboard?.mmEnabled ? "Bật" : "Tắt"}
          tone={dashboard?.mmEnabled ? "success" : "muted"}
        />
        <AdminStatCard
          label="Alt trên sàn"
          value={altCount}
          hint="Không tính KC"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {bento.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.href}
              type="button"
              onClick={() => router.push(item.href)}
              className={`group relative overflow-hidden rounded-2xl border border-violet-500/20 bg-gradient-to-br ${item.accent} p-5 text-left transition hover:border-violet-400/40`}
            >
              <Icon className="h-8 w-8 text-violet-300/90" />
              <h2 className="mt-4 text-lg font-semibold text-kc-fg">{item.title}</h2>
              <p className="mt-1 text-sm text-kc-muted">{item.desc}</p>
              <span className="mt-4 inline-block text-sm font-medium text-violet-300 group-hover:underline">
                Mở →
              </span>
            </button>
          );
        })}
      </div>

      <AdminDataTable
        title="Người dùng"
        rows={userRows.slice(0, 8)}
        rowKey={(u) => u.id}
        columns={[
          {
            key: "email",
            header: "Email",
            render: (u) => (
              <Link
                href={`/admin/users/${u.id}`}
                className="text-violet-300 hover:underline"
              >
                {u.email}
              </Link>
            ),
          },
          { key: "role", header: "Vai trò", render: (u) => u.role },
        ]}
      />
      <p className="text-center text-xs text-kc-muted">
        <Link href="/admin/users" className="text-violet-400 hover:underline">
          Quản lý user đầy đủ →
        </Link>{" "}
        (số dư, lệnh mở, PnL, futures)
      </p>

      <AdminDataTable
        title="Token niêm yết"
        rows={tokenRows}
        rowKey={(t) => t.id}
        columns={[
          {
            key: "sym",
            header: "Token",
            render: (t) => (
              <TokenIdentity
                logo={t.logo}
                symbol={t.symbol}
                name={t.name}
                id={t.id}
                size="xs"
              />
            ),
          },
          {
            key: "price",
            header: "Giá",
            className: "num",
            render: (t) => t.price?.toLocaleString() ?? "—",
          },
          {
            key: "mcap",
            header: "Vốn hoá",
            className: "num",
            render: (t) => t.marketCap?.toLocaleString() ?? "—",
          },
        ]}
      />

      <p className="text-xs text-kc-muted">
        Bot MM / flow:{" "}
        <Link href="/admin/mm-bots" className="text-violet-400 hover:underline">
          quản lý bot
        </Link>
        {" · "}
        <Link
          href="/admin/market-control"
          className="text-violet-400 hover:underline"
        >
          điều khiển thị trường
        </Link>
      </p>
    </div>
  );
}
