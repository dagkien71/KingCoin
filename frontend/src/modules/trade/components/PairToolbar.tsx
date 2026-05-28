"use client";

import {
  LivePairToolbarChange24,
  LivePairToolbarHigh24,
  LivePairToolbarLow24,
  LivePairToolbarPrice,
  LivePairToolbarVolumes,
  LivePairTradeSubtitle,
} from "@/components/live/LiveTokenStats";
import { Skeleton } from "@/components/ui/skeleton";
import { QUOTE_SYMBOL } from "@/constants/quote";
import { DEFAULT_TRADE_TOKEN_SLUG } from "@/constants/trade";
import useAuth from "@/hooks/useAuth";
import useMutation from "@/hooks/useMutation";
import type { ITokenCrypto } from "@/types/token.type";
import clsx from "clsx";
import Link from "next/link";
import { BiStar } from "react-icons/bi";
import { FaChevronLeft, FaStar, FaSyncAlt } from "react-icons/fa";
import { toast } from "react-toastify";

type Props = {
  token: ITokenCrypto | null;
  loading: boolean;
  pairSlug: string;
  onRefresh: () => void;
};

export function PairToolbar({ token, loading, pairSlug, onRefresh }: Props) {
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
      <div className="flex items-center gap-3 overflow-x-auto px-3 py-3 lg:px-4">
        <Skeleton className="h-9 w-9 shrink-0 rounded-lg" />
        <Skeleton className="h-10 w-10 shrink-0 rounded-full" />
        <div className="flex shrink-0 items-center gap-4 border-l border-kc-border/60 pl-3">
          <Skeleton className="h-7 w-24" />
          <Skeleton className="h-3 w-16" />
        </div>
        <div className="flex flex-1 gap-4 sm:gap-6">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="shrink-0 space-y-1.5">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-4 w-16" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!token) {
    return (
      <div className="px-3 py-8 text-center lg:px-4">
        <p className="text-sm font-medium text-kc-fg">Không tìm thấy cặp giao dịch</p>
        <p className="mt-1 text-xs text-kc-muted">
          Kiểm tra ký hiệu hoặc quay lại thị trường. Nếu môi trường mới, hãy chạy
          seed backend để tạo token{" "}
          <span className="num font-medium text-kc-fg">{DEFAULT_TRADE_TOKEN_SLUG}</span>.
        </p>
        <Link
          href="/token/list"
          className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-kc-accent hover:text-kc-accent-hover"
        >
          <FaChevronLeft className="h-3 w-3" /> Thị trường
        </Link>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 overflow-x-auto px-3 py-2.5 lg:px-4">
      <div className="flex shrink-0 items-center gap-3">
        <button
          type="button"
          onClick={watchCoin}
          className={clsx(
            "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-kc-border bg-kc-surface transition-colors",
            "hover:border-kc-border-strong hover:bg-kc-elevated",
          )}
          aria-label={
            inWatchlist ? "Bỏ khỏi danh sách theo dõi" : "Thêm vào danh sách theo dõi"
          }
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
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-kc-border bg-kc-surface text-sm font-bold text-kc-accent">
            {symbol.slice(0, 2)}
          </div>
        )}

        <div className="min-w-0 shrink-0">
          <h1 className="whitespace-nowrap text-lg font-bold tracking-tight text-kc-fg sm:text-xl">
            <span className="num">{symbol}</span>
            <span className="text-kc-fg">/{QUOTE_SYMBOL}</span>
          </h1>
          {token.id ? <LivePairTradeSubtitle token={token} /> : null}
        </div>
      </div>

      {token.id ? (
        <>
          <LivePairToolbarPrice token={token} />
          <div className="flex min-w-0 flex-1 items-start gap-4 sm:gap-5 lg:gap-6">
            <LivePairToolbarChange24 token={token} />
            <LivePairToolbarHigh24 token={token} />
            <LivePairToolbarLow24 token={token} />
            <LivePairToolbarVolumes token={token} />
          </div>
        </>
      ) : null}

      <button
        type="button"
        onClick={onRefresh}
        className="ml-auto hidden shrink-0 rounded-lg border border-kc-border bg-kc-surface p-2 text-kc-muted transition-colors hover:border-kc-border-strong hover:text-kc-fg sm:inline-flex"
        title="Làm mới"
        aria-label="Làm mới"
      >
        <FaSyncAlt className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
