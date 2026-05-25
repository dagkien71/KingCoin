import { APP_URL } from "@/constant/config";
import { tokenDetailPath, tradeHrefFromSlug } from "@/lib/token-routes";

export function publicBaseUrl(): string {
  return APP_URL;
}

export function appendUtm(url: string, campaign: string): string {
  const u = new URL(url, publicBaseUrl());
  u.searchParams.set("utm_source", "quest");
  u.searchParams.set("utm_medium", "share");
  u.searchParams.set("utm_campaign", campaign);
  return u.toString();
}

export function buildReferralRegisterUrl(code: string): string {
  const base = `${publicBaseUrl()}/register`;
  const u = new URL(base);
  u.searchParams.set("ref", code);
  return appendUtm(u.toString(), "referral");
}

export function buildTradeShareUrl(pairSlug: string, campaign = "share-trade"): string {
  return appendUtm(`${publicBaseUrl()}${tradeHrefFromSlug(pairSlug)}`, campaign);
}

export function buildTokenShareUrl(tokenId: string, campaign = "share-token"): string {
  return appendUtm(`${publicBaseUrl()}${tokenDetailPath(tokenId)}`, campaign);
}

export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

export async function shareUrl(
  url: string,
  opts?: { title?: string; text?: string }
): Promise<"shared" | "copied" | "failed"> {
  if (typeof navigator !== "undefined" && navigator.share) {
    try {
      await navigator.share({
        url,
        title: opts?.title ?? "KingCoin",
        text: opts?.text,
      });
      return "shared";
    } catch {
      /* user cancelled or unsupported */
    }
  }
  const ok = await copyToClipboard(url);
  return ok ? "copied" : "failed";
}
