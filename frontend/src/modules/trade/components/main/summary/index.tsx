import { TokenLogo } from "@/components/token/TokenLogo";
import { ITokenCrypto } from "@/types/token.type";
import { withQuoteUnit } from "@/constants/quote";
import {
  formatMarketCap,
  formatTokenPrice,
  formatTotalSupply,
} from "@/utils/format-number";
import { tokenDetailPath } from "@/lib/token-routes";
import Link from "next/link";
import type { ReactNode } from "react";
import {
  FaExternalLinkAlt,
  FaTelegram,
  FaTwitter,
} from "react-icons/fa";

function StatRow({
  label,
  value,
}: {
  label: string;
  value: ReactNode;
}) {
  return (
    <div className="flex justify-between gap-4 border-b border-kc-border py-2.5 text-sm last:border-0">
      <span className="text-kc-muted">{label}</span>
      <span className="num text-right font-medium text-kc-fg">{value}</span>
    </div>
  );
}

export default function Summary({ token }: { token?: ITokenCrypto }) {
  const links = token?.communityLinks;

  if (!token) {
    return (
      <div className="flex min-h-[320px] flex-col items-center justify-center gap-2 px-6 text-center">
        <p className="text-sm text-kc-muted">Chọn cặp giao dịch để xem tổng quan.</p>
      </div>
    );
  }

  const symbol = token.symbol ?? "—";
  const dec = token.decimals ?? 0;

  return (
    <div className="h-full overflow-auto font-sans text-kc-fg">
      <div className="p-4 md:p-5">
        <div className="flex flex-col gap-6 md:flex-row md:justify-between">
          <div className="min-w-0 flex-1">
            <div className="mb-4 flex flex-wrap items-center gap-3">
              <TokenLogo
                logo={token.logo}
                symbol={token.symbol}
                name={token.name}
                id={token.id}
                size="lg"
                className="rounded-lg"
              />
              <div>
                <h1 className="text-lg font-semibold md:text-xl">
                  {symbol}{" "}
                  <span className="font-normal text-kc-muted">{token.name}</span>
                </h1>
                <p className="num text-2xl font-semibold tracking-tight">
                  {withQuoteUnit(formatTokenPrice(dec, token.price ?? 0))}
                </p>
              </div>
            </div>

            {token.description ? (
              <p className="mb-4 text-sm leading-relaxed text-kc-muted">
                {token.description}
              </p>
            ) : null}

            {token.id ? (
              <Link
                href={tokenDetailPath(token.id)}
                className="text-sm font-medium text-kc-accent hover:text-kc-accent-hover"
              >
                Xem trang token →
              </Link>
            ) : null}

            <div className="mt-6 rounded-lg border border-kc-border bg-kc-surface/40">
              <StatRow
                label="Vốn hóa"
                value={formatMarketCap(token.marketCap)}
              />
              <StatRow
                label="Cung lưu hành"
                value={formatTotalSupply(token.circulatingSupply)}
              />
              <StatRow
                label="Tổng cung"
                value={formatTotalSupply(token.totalSupply)}
              />
              <StatRow
                label="Cung tối đa"
                value={formatTotalSupply(token.maxSupply)}
              />
              <StatRow
                label="Xếp hạng"
                value={token.rank ?? "—"}
              />
              <StatRow
                label="Giá khi ra mắt"
                value={
                  token.initialPrice != null
                    ? withQuoteUnit(formatTokenPrice(dec, token.initialPrice))
                    : "—"
                }
              />
              <StatRow
                label="ATH / ATL"
                value={
                  token.athPrice != null || token.atlPrice != null
                    ? `${token.athPrice != null ? withQuoteUnit(formatTokenPrice(dec, token.athPrice)) : "—"} / ${token.atlPrice != null ? withQuoteUnit(formatTokenPrice(dec, token.atlPrice)) : "—"}`
                    : "—"
                }
              />
            </div>

            <p className="mt-4 text-xs leading-relaxed text-kc-muted">
              Dữ liệu minh họa theo mã thông tin token; kiểm chứng trước khi ra
              quyết định.
            </p>
          </div>

          <div className="w-full shrink-0 md:max-w-sm md:pl-4">
            <div className="mb-4 rounded-xl border border-kc-border bg-kc-surface/50 p-4">
              <h2 className="mb-3 text-sm font-semibold text-kc-fg">
                Liên kết cộng đồng
              </h2>
              <div className="flex flex-wrap gap-2">
                {links?.website ? (
                  <a
                    href={links.website}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 rounded-lg border border-kc-border bg-kc-elevated px-3 py-2 text-xs font-medium text-kc-fg transition-colors hover:border-kc-border-strong"
                  >
                    Website
                    <FaExternalLinkAlt className="h-3 w-3 text-kc-muted" />
                  </a>
                ) : null}
                {links?.twitter ? (
                  <a
                    href={links.twitter}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 rounded-lg border border-kc-border bg-kc-elevated p-2 text-kc-fg hover:border-kc-border-strong"
                    aria-label="Twitter"
                  >
                    <FaTwitter />
                  </a>
                ) : null}
                {links?.telegram ? (
                  <a
                    href={links.telegram}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 rounded-lg border border-kc-border bg-kc-elevated p-2 text-kc-fg hover:border-kc-border-strong"
                    aria-label="Telegram"
                  >
                    <FaTelegram />
                  </a>
                ) : null}
                {token.whitepaperUrl ? (
                  <a
                    href={token.whitepaperUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 rounded-lg border border-kc-border bg-kc-elevated px-3 py-2 text-xs font-medium text-kc-fg hover:border-kc-border-strong"
                  >
                    Whitepaper
                    <FaExternalLinkAlt className="h-3 w-3 text-kc-muted" />
                  </a>
                ) : null}
                {!links?.website &&
                !links?.twitter &&
                !links?.telegram &&
                !token.whitepaperUrl ? (
                  <span className="text-xs text-kc-muted">Chưa có liên kết.</span>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
