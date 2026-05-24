"use client";

import { Badge } from "@/components/ui/badge";
import {
  accountTagLabel,
  isLiquidityBotUser,
} from "@/lib/system-accounts";

type Props = {
  user: { email?: string | null; accountTags?: string[] | null };
};

export function AccountTagBadge({ user }: Props) {
  const tags = user.accountTags?.length
    ? user.accountTags
    : isLiquidityBotUser(user)
      ? ["liquidity_bot"]
      : [];

  if (!tags.length) return null;

  return (
    <span className="inline-flex flex-wrap gap-1">
      {tags.map((tag) => (
        <Badge
          key={tag}
          tone="muted"
          className="border-amber-500/30 bg-amber-500/10 text-[10px] text-amber-200/90"
        >
          {accountTagLabel(tag)}
        </Badge>
      ))}
    </span>
  );
}
