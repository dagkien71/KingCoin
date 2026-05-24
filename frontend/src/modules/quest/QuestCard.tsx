"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DEFAULT_TRADE_TOKEN_SLUG } from "@/constants/trade";
import { defaultTradeHref } from "@/lib/token-routes";
import {
  appendUtm,
  buildReferralRegisterUrl,
  buildTradeShareUrl,
  publicBaseUrl,
  shareUrl,
} from "@/lib/share";
import type { IQuest, IReferralStats } from "@/types/trade.type";
import Link from "next/link";
import { useEffect, useState } from "react";
import { toast } from "react-toastify";

type Props = {
  quest: IQuest;
  referral?: IReferralStats | null;
  claiming: boolean;
  onEngage: (questId: string) => Promise<void>;
  onClaim: (questId: string) => Promise<void>;
};

function needsEngage(q: IQuest): boolean {
  return (
    q.verifyMode === "delayed_honor" ||
    q.verifyMode === "external_then_claim"
  );
}

export function QuestCard({
  quest: q,
  referral,
  claiming,
  onEngage,
  onClaim,
}: Props) {
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!q.canClaimAt || q.eligible) return;
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, [q.canClaimAt, q.eligible, tick]);

  const canClaimNow =
    q.eligible &&
    !q.completed &&
    (!q.canClaimAt || new Date(q.canClaimAt).getTime() <= Date.now());

  const waitSec =
    q.canClaimAt && !canClaimNow
      ? Math.max(
          0,
          Math.ceil((new Date(q.canClaimAt).getTime() - Date.now()) / 1000)
        )
      : 0;

  const handleDoNow = async () => {
    if (q.externalUrl) {
      window.open(q.externalUrl, "_blank", "noopener,noreferrer");
    }
    if (q.slug === "share-trade-link") {
      const url = buildTradeShareUrl(DEFAULT_TRADE_TOKEN_SLUG, q.slug);
      const r = await shareUrl(url, {
        title: "KingCoin Trade",
        text: "Giao dịch mô phỏng trên KingCoin",
      });
      if (r === "copied") toast.success("Đã copy link giao dịch");
      if (r === "shared") toast.success("Đã mở chia sẻ");
    } else if (q.slug === "share-token-page") {
      const url = appendUtm(`${publicBaseUrl()}/token/list`, q.slug);
      const r = await shareUrl(url, {
        title: "KingCoin Token",
        text: "Khám phá token trên KingCoin",
      });
      if (r === "copied") toast.success("Đã copy link");
    } else if (q.slug === "share-referral-card" && referral?.code) {
      const url = buildReferralRegisterUrl(referral.code);
      const r = await shareUrl(url, {
        title: "Tham gia KingCoin",
        text: `Dùng mã ${referral.code} khi đăng ký`,
      });
      if (r === "copied") toast.success("Đã copy link mời");
    } else if (q.slug === "share-my-token") {
      toast.info("Mở trang token bạn đã tạo và dùng nút chia sẻ trình duyệt.");
    }

    if (needsEngage(q)) {
      await onEngage(q.id);
      toast.info("Hoàn tất bước trên, đợi vài giây rồi nhận KC.");
    }
  };

  const ctaHref = (): string | null => {
    switch (q.slug) {
      case "onboarding-profile":
        return "/account";
      case "first-trade":
      case "weekly-active-trader":
        return defaultTradeHref();
      case "add-watchlist-3":
        return "/markets";
      case "convert-first":
        return "/convert";
      case "create-token":
      case "share-my-token":
        return "/issuer/create";
      case "referral-first-friend":
      case "referral-3-friends":
        return null;
      default:
        return null;
    }
  };

  const href = ctaHref();

  return (
    <Card className="border-kc-border bg-kc-elevated">
      <CardHeader className="flex-row items-start justify-between space-y-0">
        <div className="min-w-0 pr-3">
          <CardTitle className="text-base">{q.title}</CardTitle>
          {q.description ? (
            <p className="mt-1 text-sm text-kc-muted">{q.description}</p>
          ) : null}
          {q.progress ? (
            <p className="mt-2 text-xs text-kc-accent">
              Tiến độ: {q.progress.current}/{q.progress.target}
            </p>
          ) : null}
          {q.eligibleReason && !q.completed && !canClaimNow ? (
            <p className="mt-1 text-xs text-kc-muted">{q.eligibleReason}</p>
          ) : null}
          {waitSec > 0 ? (
            <p className="mt-1 text-xs text-amber-400/90">
              Nhận thưởng sau {waitSec}s…
            </p>
          ) : null}
        </div>
        <span className="num shrink-0 text-lg font-semibold text-kc-accent">
          +{q.rewardKc} KC
        </span>
      </CardHeader>
      <CardContent className="flex flex-wrap gap-2">
        {href ? (
          <Link href={href}>
            <Button size="sm" variant="secondary" type="button">
              {q.ctaLabel ?? "Mở"}
            </Button>
          </Link>
        ) : null}
        {(needsEngage(q) || q.externalUrl || q.slug.startsWith("share-")) &&
        !q.completed ? (
          <Button
            size="sm"
            variant="secondary"
            type="button"
            disabled={claiming}
            onClick={() => void handleDoNow()}
          >
            {q.ctaLabel ?? "Làm ngay"}
          </Button>
        ) : null}
        <Button
          size="sm"
          variant="primary"
          type="button"
          disabled={q.completed || claiming || !canClaimNow}
          onClick={() => void onClaim(q.id)}
        >
          {q.completed ? "Đã nhận" : canClaimNow ? "Nhận KC" : "Chưa đủ điều kiện"}
        </Button>
      </CardContent>
    </Card>
  );
}
