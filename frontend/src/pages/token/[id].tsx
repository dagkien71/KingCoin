import useFetchApi from "@/hooks/useFetchApi";
import Comment from "@/modules/token/detail/comment";
import { TokenDetailChart } from "@/modules/token/detail/TokenDetailChart";
import { ITokenCrypto, isStablecoinToken } from "@/types/token.type";
import StablecoinSpecPanel from "@/modules/token/detail/stablecoin-spec";
import { formatStableDisplayPrice, QUOTE_STABLECOIN } from "@/constants/quote";
import {
  formatMarketCap,
  formatPrettyPercentPrice,
  formatTokenPrice,
  formatTotalSupply,
} from "@/utils/format-number";
import Link from "next/link";
import { useRouter } from "next/router";
import { useEffect } from "react";
import {
  FaDiscord,
  FaStar,
  FaStarHalfAlt,
  FaTelegram,
  FaTwitter,
} from "react-icons/fa";
import { HiOutlineChartBar, HiOutlineExternalLink } from "react-icons/hi";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { withQuoteUnit } from "@/constants/quote";
import PriceAlertPanel from "@/components/notifications/PriceAlertPanel";
import { tokenCryptoApiPath, tradeHref } from "@/lib/token-routes";
import { cn } from "@/lib/cn";
import useAuth from "@/hooks/useAuth";
import { getDynamicPageProps } from "@/lib/next-dynamic-slugs";

export const getServerSideProps = getDynamicPageProps;

const Stat = ({ label, value }: { label: string; value: React.ReactNode }) => (
  <div className="rounded-lg border border-kc-border bg-kc-surface/40 px-4 py-3">
    <div className="text-xs text-kc-muted">{label}</div>
    <div className="num mt-1 text-sm font-medium text-kc-fg">{value}</div>
  </div>
);

const TokenDetail = () => {
  const router = useRouter();
  const { id } = router.query;
  const { isLogin } = useAuth();

  const idKey =
    typeof id === "string" ? id : Array.isArray(id) ? id[0] : "";
  const tokenApiPath = idKey ? tokenCryptoApiPath(idKey) : "";

  const { data, refetch, loading, error } = useFetchApi<ITokenCrypto>(
    tokenApiPath
  );

  useEffect(() => {
    if (!idKey) return;
    refetch();
    const intervalId = setInterval(() => {
      refetch();
    }, 30_000);
    return () => clearInterval(intervalId);
  }, [idKey, refetch]);

  if (!router.isReady) {
    return (
      <div className="min-h-[60vh] px-4 pt-8">
        <Skeleton className="mx-auto h-96 max-w-6xl" />
      </div>
    );
  }

  if (!loading && !data) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-2 px-4 text-center text-kc-muted">
        <p>Không tìm thấy token{idKey ? ` (${idKey})` : ""}.</p>
        {error ? <p className="text-xs text-kc-down">{error}</p> : null}
        <div className="mt-2 flex flex-wrap justify-center gap-3">
          {idKey ? (
            <Button
              variant="primary"
              onClick={() => router.push(tradeHref({ id: idKey, symbol: idKey }))}
            >
              Mở Spot
            </Button>
          ) : null}
          <Button
            variant="secondary"
            onClick={() => router.push("/token/list")}
          >
            Về thị trường
          </Button>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-[60vh] px-4 pt-8">
        <Skeleton className="mx-auto h-[28rem] max-w-6xl" />
      </div>
    );
  }

  const logoSrc =
    data.logo ||
    `https://api.dicebear.com/7.x/identicon/svg?seed=${encodeURIComponent(
      data.symbol || data.id
    )}`;
  const isStable = isStablecoinToken(data);
  const peg = data.stablecoinSpec?.pegTarget ?? QUOTE_STABLECOIN.pegTarget;
  const priceFormatted = formatTokenPrice(data.decimals ?? 8, data.price ?? 0);

  return (
    <div className="min-h-screen px-4 pb-20 pt-8 sm:px-6">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6 flex flex-wrap items-center gap-3">
          <Link
            href="/token/list"
            className="text-sm text-kc-muted hover:text-kc-accent"
          >
            ← Thị trường
          </Link>
          <Badge tone="muted">{data.symbol || "—"}</Badge>
          {isStable && (
            <Badge tone="up" className="bg-emerald-600/20 text-emerald-300">
              Stablecoin
            </Badge>
          )}
        </div>

        <div className="flex flex-col gap-8 lg:flex-row lg:items-start">
          <div className="min-w-0 flex-1 space-y-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="flex items-center gap-4">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={logoSrc}
                  alt=""
                  className="h-14 w-14 rounded-xl border border-kc-border bg-kc-surface object-cover"
                />
                <div>
                  <h1 className="text-2xl font-semibold tracking-tight text-kc-fg sm:text-3xl">
                    {data.name}
                  </h1>
                  <p className="text-kc-muted">{data.symbol}</p>
                </div>
              </div>
              <Button
                variant="primary"
                size="lg"
                type="button"
                onClick={() =>
                  router.push(tradeHref(data))
                }
              >
                <HiOutlineChartBar className="h-5 w-5" />
                Giao dịch
              </Button>
            </div>

            <div className="flex flex-wrap items-baseline gap-3">
              <span className="num text-4xl font-semibold text-kc-fg">
                {isStable
                  ? formatStableDisplayPrice(priceFormatted)
                  : withQuoteUnit(priceFormatted)}
              </span>
              {isStable && (
                <span className="text-sm text-kc-muted">
                  ≈ {peg} {data.stablecoinSpec?.pegCurrency ?? "USD"} / {data.symbol}
                </span>
              )}
              {[
                { label: "1h", v: data.priceChange1h },
                { label: "24h", v: data.priceChange24h },
                { label: "7d", v: data.priceChange7d },
              ].map(({ label, v }) => (
                <span
                  key={label}
                  className={cn(
                    "num text-sm font-medium",
                    (v ?? 0) >= 0 ? "text-kc-up" : "text-kc-down"
                  )}
                >
                  {v != null
                    ? `${Number(v) >= 0 ? "+" : ""}${Number(v).toFixed(2)}%`
                    : "—"}{" "}
                  {label}
                </span>
              ))}
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <Stat
                label="Vốn hóa"
                value={formatMarketCap(data.marketCap)}
              />
              <Stat
                label="Lưu hành"
                value={formatTotalSupply(data.circulatingSupply)}
              />
              <Stat
                label="Tổng cung"
                value={formatTotalSupply(data.totalSupply)}
              />
              <Stat
                label="KL 24h"
                value={
                  data.volumes?.volume24h != null
                    ? String(data.volumes.volume24h)
                    : "—"
                }
              />
              <Stat
                label="Cung tối đa"
                value={formatTotalSupply(data.maxSupply)}
              />
            </div>

            {isLogin && !isStable ? (
              <PriceAlertPanel
                tokenId={data.id}
                marketKind="spot"
                currentPrice={data.price}
                symbol={data.symbol ?? data.name ?? undefined}
              />
            ) : null}

            {isStable && data.stablecoinSpec && (
              <StablecoinSpecPanel
                spec={data.stablecoinSpec}
                symbol={data.symbol}
              />
            )}

            <Card className="flex flex-col overflow-hidden border-kc-border bg-kc-elevated">
              <CardHeader className="shrink-0 border-kc-border py-3">
                <CardTitle className="text-sm font-medium">
                  Biểu đồ giá (dữ liệu CSDL)
                </CardTitle>
                <p className="mt-1 text-xs text-kc-muted">
                  Nguồn: bảng <code className="rounded bg-kc-bg px-1">TokenCryptoLog</code>{" "}
                  và giá token hiện tại từ API.
                </p>
              </CardHeader>
              <CardContent className="flex min-h-0 flex-1 flex-col p-0">
                <div className="flex h-[400px] min-h-[220px] w-full flex-col sm:h-[440px]">
                  <TokenDetailChart token={data} />
                </div>
              </CardContent>
            </Card>

            <Card className="border-kc-border bg-kc-elevated">
              <CardHeader className="border-kc-border">
                <CardTitle className="text-base">Liên kết & cộng đồng</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  {data.whitepaperUrl && (
                    <a href={data.whitepaperUrl} target="_blank" rel="noreferrer">
                      <Button variant="secondary" size="sm" type="button">
                        Whitepaper
                        <HiOutlineExternalLink className="h-4 w-4" />
                      </Button>
                    </a>
                  )}
                  {typeof data.communityLinks === "object" &&
                    data.communityLinks &&
                    "website" in data.communityLinks &&
                    (data.communityLinks as { website?: string }).website && (
                      <a
                        href={(data.communityLinks as { website: string }).website}
                        target="_blank"
                        rel="noreferrer"
                      >
                        <Button variant="secondary" size="sm" type="button">
                          Website
                          <HiOutlineExternalLink className="h-4 w-4" />
                        </Button>
                      </a>
                    )}
                </div>
                <div className="flex gap-3 text-kc-muted">
                  {typeof data.communityLinks === "object" &&
                    data.communityLinks &&
                    "twitter" in data.communityLinks &&
                    (data.communityLinks as { twitter?: string }).twitter && (
                      <Link
                        href={(data.communityLinks as { twitter: string }).twitter}
                        target="_blank"
                        className="hover:text-kc-accent"
                      >
                        <FaTwitter className="h-5 w-5" />
                      </Link>
                    )}
                  {typeof data.communityLinks === "object" &&
                    data.communityLinks &&
                    "discord" in data.communityLinks &&
                    (data.communityLinks as { discord?: string }).discord && (
                      <Link
                        href={(data.communityLinks as { discord: string }).discord}
                        target="_blank"
                        className="hover:text-kc-accent"
                      >
                        <FaDiscord className="h-5 w-5" />
                      </Link>
                    )}
                  {typeof data.communityLinks === "object" &&
                    data.communityLinks &&
                    "telegram" in data.communityLinks &&
                    (data.communityLinks as { telegram?: string }).telegram && (
                      <Link
                        href={(data.communityLinks as { telegram: string }).telegram}
                        target="_blank"
                        className="hover:text-kc-accent"
                      >
                        <FaTelegram className="h-5 w-5" />
                      </Link>
                    )}
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <span className="text-sm text-kc-muted">Đánh giá mẫu</span>
                  <div className="flex items-center gap-2">
                    <span className="num text-sm font-medium">4.6</span>
                    <div className="flex text-kc-accent">
                      <FaStar className="h-3.5 w-3.5" />
                      <FaStar className="h-3.5 w-3.5" />
                      <FaStar className="h-3.5 w-3.5" />
                      <FaStar className="h-3.5 w-3.5" />
                      <FaStarHalfAlt className="h-3.5 w-3.5" />
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-medium text-kc-fg">
                    Hiệu suất giá
                  </h3>
                  <div className="mt-3 flex justify-between text-xs text-kc-muted">
                    <span className="text-kc-down">Đáy</span>
                    <span className="text-kc-up">Đỉnh</span>
                  </div>
                  <div className="num mt-1 flex justify-between text-sm">
                    <span>
                      {formatTokenPrice(data.decimals ?? 8, data.atlPriceDay ?? 0)}
                    </span>
                    <span>
                      {formatTokenPrice(data.decimals ?? 8, data.athPriceDay ?? 0)}
                    </span>
                  </div>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-kc-surface">
                    <div className="h-full w-1/2 rounded-full bg-kc-accent/80" />
                  </div>
                  <div className="num mt-3 space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-kc-muted">ATH</span>
                      <span>{formatTokenPrice(data.decimals ?? 8, data.athPrice ?? 0)}</span>
                    </div>
                    <div className="flex justify-between text-kc-up">
                      <span />
                      <span>
                        +
                        {formatPrettyPercentPrice(data.athPercentage ?? 0)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-kc-muted">ATL</span>
                      <span>{formatTokenPrice(data.decimals ?? 8, data.atlPrice ?? 0)}</span>
                    </div>
                    <div className="flex justify-between text-kc-down">
                      <span />
                      <span>
                        -{formatPrettyPercentPrice(data.atlPercentage ?? 0)}
                      </span>
                    </div>
                  </div>
                </div>

                {data.description && (
                  <>
                    <Separator />
                    <p className="text-sm leading-relaxed text-kc-muted">
                      {data.description}
                    </p>
                  </>
                )}
              </CardContent>
            </Card>
          </div>

          <aside className="w-full shrink-0 lg:w-[380px] lg:min-w-[320px]">
            <Comment token={data} />
          </aside>
        </div>
      </div>
    </div>
  );
};

export default TokenDetail;
