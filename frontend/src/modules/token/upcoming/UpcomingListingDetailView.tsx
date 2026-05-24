"use client";

import { TokenLogo } from "@/components/token/TokenLogo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { QUOTE_SYMBOL, withQuoteUnit } from "@/constants/quote";
import useAuth from "@/hooks/useAuth";
import useFetchApi from "@/hooks/useFetchApi";
import useMutation from "@/hooks/useMutation";
import { CountdownBlocks } from "@/modules/markets/components/ListingCountdown";
import { cn } from "@/lib/cn";
import type { IUpcomingListingDetail } from "@/types/upcoming-listing.type";
import { formatListingDate } from "@/types/upcoming-listing.type";
import { formatTokenPrice } from "@/utils/format-number";
import Link from "next/link";
import { useRouter } from "next/router";
import { FormEvent, useEffect, useState } from "react";
import {
  HiOutlineArrowLeft,
  HiOutlineBell,
  HiOutlineClock,
  HiOutlineSparkles,
} from "react-icons/hi";
import { toast } from "react-toastify";

const STATUS_LABEL: Record<string, string> = {
  scheduled: "Đã lên lịch",
  review: "Đang duyệt",
  announced: "Đã công bố",
};

const STATUS_STYLE: Record<string, string> = {
  scheduled: "bg-emerald-500/15 text-emerald-300",
  review: "bg-amber-500/15 text-amber-300",
  announced: "bg-sky-500/15 text-sky-300",
};

export function UpcomingListingDetailView() {
  const router = useRouter();
  const slug = typeof router.query.slug === "string" ? router.query.slug : "";
  const { isLogin } = useAuth();

  const apiKey = slug
    ? `/token-crypto/upcoming/listings/${encodeURIComponent(slug)}`
    : "";

  const { data, loading, refetch } = useFetchApi<IUpcomingListingDetail>(apiKey);

  const { mutate: placePreorder, loading: placing } = useMutation<{
    amountKc: number;
  }>("POST", apiKey ? `${apiKey}/preorder` : "");

  const { mutate: cancelPreorder, loading: cancelling } = useMutation(
    "DELETE",
    apiKey ? `${apiKey}/preorder` : ""
  );

  const listing = data?.listing;
  const [amount, setAmount] = useState("");

  useEffect(() => {
    if (isLogin && slug) void refetch();
  }, [isLogin, slug, refetch]);

  if (!router.isReady) {
    return <p className="px-4 py-12 text-sm text-kc-muted">Đang tải…</p>;
  }

  if (!loading && !listing) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <p className="text-kc-muted">Không tìm thấy token sắp niêm yết.</p>
        <Button
          variant="secondary"
          className="mt-4"
          onClick={() => router.push("/token/list")}
        >
          Về thị trường
        </Button>
      </div>
    );
  }

  const price =
    listing?.initialPrice != null && listing.initialPrice > 0
      ? withQuoteUnit(formatTokenPrice(4, listing.initialPrice))
      : null;

  const handlePreorder = async (e: FormEvent) => {
    e.preventDefault();
    if (!isLogin) {
      toast.info("Đăng nhập để đặt trước");
      router.push("/login");
      return;
    }
    const kc = Number(amount);
    if (!Number.isFinite(kc) || kc <= 0) {
      toast.error("Nhập số KC hợp lệ");
      return;
    }
    const res = await placePreorder({ amountKc: kc });
    if (res && typeof res === "object" && "success" in res && res.success) {
      toast.success(`Đã đặt trước ${kc} ${QUOTE_SYMBOL}`);
      setAmount("");
      void refetch();
    }
  };

  const handleCancel = async () => {
    const res = await cancelPreorder();
    if (res && typeof res === "object" && "success" in res && res.success) {
      toast.info("Đã huỷ đặt trước");
      void refetch();
    }
  };

  return (
    <div className="mx-auto max-w-3xl px-4 pb-16 pt-6 sm:px-6">
      <Link
        href="/token/list"
        className="mb-6 inline-flex items-center gap-1.5 text-xs text-kc-muted hover:text-kc-accent"
      >
        <HiOutlineArrowLeft className="h-3.5 w-3.5" />
        Thị trường
      </Link>

      {loading || !listing ? (
        <div className="animate-pulse space-y-4">
          <div className="h-24 rounded-2xl bg-kc-surface" />
          <div className="h-40 rounded-2xl bg-kc-surface" />
        </div>
      ) : (
        <>
          <header className="mb-6 flex flex-wrap items-start gap-4">
            <TokenLogo
              logo={listing.logo}
              symbol={listing.symbol}
              name={listing.name}
              id={listing.id}
              size="lg"
              className="h-16 w-16"
            />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-bold text-kc-fg">{listing.name}</h1>
                {listing.isFeatured ? (
                  <span className="text-xs text-kc-accent">★ Hot</span>
                ) : null}
                <span
                  className={cn(
                    "rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase",
                    STATUS_STYLE[listing.status] ?? STATUS_STYLE.scheduled
                  )}
                >
                  {STATUS_LABEL[listing.status] ?? listing.status}
                </span>
              </div>
              <p className="text-lg font-medium text-kc-accent">{listing.symbol}</p>
              {listing.category ? (
                <p className="text-xs text-kc-muted">{listing.category}</p>
              ) : null}
              {listing.tagline ? (
                <p className="mt-2 text-sm text-kc-fg/90">{listing.tagline}</p>
              ) : null}
            </div>
          </header>

          <section className="mb-6 rounded-2xl border border-kc-accent/25 bg-kc-accent/[0.04] p-5">
            <p className="mb-3 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-kc-muted">
              <HiOutlineClock className="h-4 w-4" />
              Niêm yết sau
            </p>
            <CountdownBlocks targetIso={listing.listingAt} />
            <p className="mt-3 text-sm text-kc-muted">
              {formatListingDate(listing.listingAt)}
            </p>
          </section>

          {listing.description ? (
            <p className="mb-6 text-sm leading-relaxed text-kc-muted">
              {listing.description}
            </p>
          ) : null}

          {listing.features?.length ? (
            <div className="mb-6 flex flex-wrap gap-1.5">
              {listing.features.map((f) => (
                <span
                  key={f}
                  className="rounded-full border border-kc-border px-2.5 py-0.5 text-[11px] text-kc-muted"
                >
                  {f}
                </span>
              ))}
            </div>
          ) : null}

          {listing.specs?.length ? (
            <dl className="mb-6 grid grid-cols-2 gap-3 rounded-xl border border-kc-border bg-kc-elevated/50 p-4 sm:grid-cols-2">
              {listing.specs.map((s) => (
                <div key={s.label}>
                  <dt className="text-[10px] uppercase text-kc-muted">{s.label}</dt>
                  <dd className="num text-sm font-semibold text-kc-fg">{s.value}</dd>
                </div>
              ))}
            </dl>
          ) : null}

          <div className="mb-6 flex flex-wrap gap-4 text-sm">
            {price ? (
              <div>
                <span className="text-kc-muted">Giá mở cửa </span>
                <span className="num font-bold text-kc-accent">{price}</span>
              </div>
            ) : null}
            <div>
              <span className="text-kc-muted">Đặt trước </span>
              <span className="num font-semibold text-kc-fg">
                {data?.preorderCount ?? 0} người
              </span>
              {(data?.totalPreorderKc ?? 0) > 0 ? (
                <span className="text-kc-muted">
                  {" "}
                  · ~{data?.totalPreorderKc?.toLocaleString()} {QUOTE_SYMBOL}
                </span>
              ) : null}
            </div>
          </div>

          <section className="rounded-2xl border border-kc-border bg-kc-elevated/60 p-5">
            <h2 className="mb-1 flex items-center gap-2 text-sm font-bold text-kc-fg">
              <HiOutlineSparkles className="h-4 w-4 text-kc-accent" />
              Đặt trước
            </h2>
            <p className="mb-4 text-xs text-kc-muted">
              Ghi nhận số {QUOTE_SYMBOL} bạn dự định mua khi mở Spot — chưa trừ ví,
              chỉ cam kết mô phỏng. Nhận thông báo khi list.
            </p>

            {data?.myPreorder ? (
              <div className="rounded-lg border border-kc-accent/30 bg-kc-accent/10 px-4 py-3">
                <p className="text-sm text-kc-fg">
                  Bạn đã đặt trước{" "}
                  <span className="num font-bold text-kc-accent">
                    {data.myPreorder.amountKc} {QUOTE_SYMBOL}
                  </span>
                </p>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="mt-2 text-kc-down"
                  disabled={cancelling}
                  onClick={() => void handleCancel()}
                >
                  Huỷ đặt trước
                </Button>
              </div>
            ) : isLogin ? (
              <form onSubmit={(e) => void handlePreorder(e)} className="flex gap-2">
                <Input
                  type="number"
                  min={0}
                  step="any"
                  placeholder={`Số ${QUOTE_SYMBOL} dự kiến`}
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="flex-1"
                />
                <Button type="submit" disabled={placing}>
                  {placing ? "…" : "Đặt trước"}
                </Button>
              </form>
            ) : (
              <Button type="button" onClick={() => router.push("/login")}>
                Đăng nhập để đặt trước
              </Button>
            )}

            <p className="mt-3 flex items-center gap-1.5 text-[10px] text-kc-muted">
              <HiOutlineBell className="h-3.5 w-3.5" />
              Chưa thể giao dịch Spot cho đến ngày niêm yết.
            </p>
          </section>
        </>
      )}
    </div>
  );
}
