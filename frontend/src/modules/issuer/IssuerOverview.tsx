"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { QUOTE_SYMBOL } from "@/constants/quote";
import useAuth from "@/hooks/useAuth";
import useFetchApi from "@/hooks/useFetchApi";
import {
  getPaginatedMeta,
  unwrapPaginatedData,
  type PaginatedPayload,
} from "@/lib/unwrap-paginated";
import { TOKEN_LISTING_FEE_KC, ISSUER_TAGLINE } from "@/modules/issuer/constants";
import type { ITokenCrypto } from "@/types/token.type";
import { tokenDetailPath } from "@/lib/token-routes";
import Link from "next/link";
import { useRouter } from "next/router";
import {
  HiOutlineCollection,
  HiOutlineCurrencyDollar,
  HiOutlineLightningBolt,
  HiOutlinePlusCircle,
} from "react-icons/hi";

export function IssuerOverview() {
  const router = useRouter();
  const { user, isLogin } = useAuth();
  const { data, loading } = useFetchApi<
    PaginatedPayload<ITokenCrypto> | ITokenCrypto[]
  >(isLogin ? "/token-crypto" : "", {
    defaultParams: { page: 1, perPage: 20 },
  });
  const tokens = unwrapPaginatedData(data);
  const tokenCount = getPaginatedMeta(data)?.total ?? tokens.length;

  const steps = [
    {
      icon: HiOutlineCurrencyDollar,
      title: "Chuẩn bị KC",
      desc: `Đảm bảo ví có ít nhất ${TOKEN_LISTING_FEE_KC} ${QUOTE_SYMBOL} cho phí niêm yết.`,
    },
    {
      icon: HiOutlinePlusCircle,
      title: "Phát hành token",
      desc: "Đặt tên, cung, giá khởi điểm và logo — token gắn với tài khoản của bạn.",
    },
    {
      icon: HiOutlineLightningBolt,
      title: "Niêm yết & chia sẻ",
      desc: "Token xuất hiện trên thị trường; mời cộng đồng giao dịch và bình luận.",
    },
  ];

  return (
    <div className="space-y-8">
      <section>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-400/90">
          Nhà phát hành
        </p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-kc-fg sm:text-3xl">
          {isLogin && user?.username
            ? `Xin chào, ${user.username}`
            : "KingCoin Studio"}
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-kc-muted">
          {ISSUER_TAGLINE}
        </p>
      </section>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="border-emerald-500/20 bg-emerald-500/5">
          <CardContent className="p-5">
            <p className="text-xs text-kc-muted">Token đã phát hành</p>
            <p className="mt-1 text-2xl font-semibold text-kc-fg">
              {loading ? "…" : tokenCount}
            </p>
          </CardContent>
        </Card>
        <Card className="border-kc-border/60 bg-kc-elevated/40 sm:col-span-2">
          <CardContent className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-medium text-kc-fg">Sẵn sàng phát hành?</p>
              <p className="text-xs text-kc-muted">
                Phí niêm yết {TOKEN_LISTING_FEE_KC} {QUOTE_SYMBOL} / token
              </p>
            </div>
            <Button
              type="button"
              className="bg-emerald-600 hover:bg-emerald-500"
              onClick={() => router.push("/issuer/create")}
            >
              <HiOutlinePlusCircle className="h-5 w-5" />
              Phát hành token mới
            </Button>
          </CardContent>
        </Card>
      </div>

      <section>
        <h2 className="mb-4 text-lg font-medium text-kc-fg">Quy trình</h2>
        <div className="grid gap-4 md:grid-cols-3">
          {steps.map((step, i) => (
            <Card
              key={step.title}
              className="border-kc-border/50 bg-[#0d141f]/60"
            >
              <CardContent className="p-5">
                <div className="flex items-center gap-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-300">
                    <step.icon className="h-5 w-5" />
                  </span>
                  <span className="text-xs font-medium text-kc-muted">
                    Bước {i + 1}
                  </span>
                </div>
                <h3 className="mt-3 font-medium text-kc-fg">{step.title}</h3>
                <p className="mt-1 text-sm text-kc-muted">{step.desc}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {tokenCount > 0 ? (
        <section>
          <div className="mb-3 flex items-center justify-between gap-2">
            <h2 className="text-lg font-medium text-kc-fg">Token gần đây</h2>
            <Link
              href="/issuer/tokens"
              className="text-sm text-emerald-400 hover:underline"
            >
              Xem tất cả
            </Link>
          </div>
          <ul className="space-y-2">
            {tokens.slice(0, 3).map((t) => (
              <li key={t.id}>
                <Link
                  href={tokenDetailPath(t.id)}
                  className="flex items-center justify-between rounded-lg border border-kc-border/50 bg-kc-elevated/30 px-4 py-3 text-sm hover:border-emerald-500/30"
                >
                  <span className="font-medium text-kc-fg">
                    {t.symbol} · {t.name}
                  </span>
                  <span className="text-kc-muted">
                    {t.price?.toLocaleString()} {QUOTE_SYMBOL}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : (
        <Card className="border-dashed border-kc-border/60 bg-transparent">
          <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
            <HiOutlineCollection className="h-10 w-10 text-kc-muted/50" />
            <p className="text-sm text-kc-muted">
              Bạn chưa phát hành token nào. Bắt đầu từ nút phía trên.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
