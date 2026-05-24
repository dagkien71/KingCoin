"use client";

import { Skeleton } from "@/components/ui/skeleton";
import {
  LivePairTradePriceBlock,
  LivePairTradeSubtitle,
} from "@/components/live/LiveTokenStats";
import { QUOTE_SYMBOL } from "@/constants/quote";
import useAuth from "@/hooks/useAuth";
import useMutation from "@/hooks/useMutation";
import { FuturesPairSelect } from "@/modules/futures/FuturesPairSelect";
import type { ITokenCrypto } from "@/types/token.type";
import { formatTokenPrice } from "@/utils/format-number";
import clsx from "clsx";
import Link from "next/link";
import { BiStar } from "react-icons/bi";
import { FaChevronLeft, FaStar, FaSyncAlt } from "react-icons/fa";
import { toast } from "react-toastify";

type Props = {
  token: ITokenCrypto | null;
  loading: boolean;
  pairSlug: string;
  markPrice: number;
  onRefresh: () => void;
};

export function FuturesPairToolbar({
  token,
  loading,
  pairSlug,
  markPrice,
  onRefresh,
}: Props) {
  const { watchList, isLogin, updateUserInfo } = useAuth();
  const { mutate: toggleWatch } = useMutation("POST", "/users/watch-list");
  const symbol = token?.symbol ?? pairSlug.toUpperCase();
  const logoSrc =
    token?.logo ||
    (token?.symbol
      ? `https://api.dicebear.com/7.x/identicon/svg?seed=${encodeURIComponent(token.symbol)}`
      : null);
  const inWatchlist = token?.id ? watchList?.includes(token.id) : false;

  const watchCoin = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    if (!token?.id || !isLogin) {
      toast.info("Đăng nhập để lưu vào danh sách theo dõi.");
      return;
    }
    const response = await toggleWatch([token.id] as never);
    if (response && typeof response === "object" && "success" in response) {
      const r = response as { success?: boolean; data?: { message?: string } };
      if (r.success) {
        toast.success(r.data?.message ?? "Đã cập nhật danh sách theo dõi");
        updateUserInfo();
      }
    }
  };

  if (loading && !token) {
    return (
      <div className="flex items-center gap-3 px-3 py-3 lg:px-4">
        <Skeleton className="h-9 w-9 shrink-0 rounded-lg" />
        <Skeleton className="h-10 w-10 shrink-0 rounded-full" />
        <div className="flex flex-1 items-start gap-3">
          <div className="space-y-2">
            <Skeleton className="h-6 w-28" />
            <Skeleton className="h-3 w-24" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-5 w-20" />
            <Skeleton className="h-3 w-16" />
          </div>
        </div>
      </div>
    );
  }

  if (!token) {
    return (
      <div className="px-3 py-8 text-center lg:px-4">
        <p className="text-sm font-medium text-kc-fg">Không tìm thấy cặp futures</p>
        <p className="mt-1 text-xs text-kc-muted">
          Chọn cặp từ danh sách perpetual alt/KC.
        </p>
        <Link
          href="/futures"
          className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-kc-accent hover:text-kc-accent-hover"
        >
          <FaChevronLeft className="h-3 w-3" /> Danh sách Futures
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-3 px-3 py-3 lg:px-4">
      <button
        type="button"
        onClick={watchCoin}
        className={clsx(
          "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-kc-border bg-kc-surface transition-colors",
          "hover:border-kc-border-strong hover:bg-kc-elevated"
        )}
        aria-label={inWatchlist ? "Bỏ khỏi danh sách theo dõi" : "Thêm vào danh sách theo dõi"}
      >
        {inWatchlist ? (
          <FaStar className="h-4 w-4 text-kc-accent" />
        ) : (
          <BiStar className="h-4 w-4 text-kc-fg" />
        )}
      </button>

      {logoSrc ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={logoSrc}
          alt=""
          className="h-10 w-10 shrink-0 rounded-full border border-kc-border object-cover"
        />
      ) : (
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-kc-border bg-kc-surface text-sm font-bold text-violet-300">
          {symbol.slice(0, 2)}
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-wrap items-start gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-lg font-bold tracking-tight text-kc-fg sm:text-xl">
              <span className="num">{symbol}</span>
              <span className="text-kc-fg">/{QUOTE_SYMBOL}</span>
            </h1>
            <span className="rounded-md bg-violet-500/15 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-violet-300">
              Perpetual
            </span>
          </div>
          {token.id ? <LivePairTradeSubtitle token={token} /> : null}
          <p className="num mt-0.5 text-[11px] text-kc-muted">
            Mark{" "}
            {markPrice > 0
              ? `${formatTokenPrice(4, markPrice)} ${QUOTE_SYMBOL}`
              : "—"}
          </p>
        </div>
        {token.id ? <LivePairTradePriceBlock token={token} /> : null}
      </div>

      <FuturesPairSelect
        currentTokenId={token.id}
        className="hidden max-w-[180px] rounded-lg border border-kc-border bg-kc-surface px-2 py-1.5 text-sm text-kc-fg sm:block"
      />

      <button
        type="button"
        onClick={onRefresh}
        className="ml-auto shrink-0 rounded-lg border border-kc-border bg-kc-surface p-2 text-kc-muted transition-colors hover:border-kc-border-strong hover:text-kc-fg"
        title="Làm mới"
        aria-label="Làm mới"
      >
        <FaSyncAlt className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
