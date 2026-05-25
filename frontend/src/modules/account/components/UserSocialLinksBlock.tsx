"use client";

import {
  countUserSocialLinks,
  parseUserSocialLinks,
  USER_SOCIAL_FIELDS,
  type UserSocialLinks,
  type UserSocialPlatform,
} from "@/lib/user-social-links";
import { cn } from "@/lib/cn";
import type { IconType } from "react-icons";
import {
  FaDiscord,
  FaExternalLinkAlt,
  FaFacebook,
  FaGithub,
  FaGlobe,
  FaLinkedin,
  FaTelegram,
  FaTwitter,
  FaYoutube,
} from "react-icons/fa";

const ICONS: Record<UserSocialPlatform, IconType> = {
  website: FaGlobe,
  twitter: FaTwitter,
  telegram: FaTelegram,
  discord: FaDiscord,
  facebook: FaFacebook,
  youtube: FaYoutube,
  github: FaGithub,
  linkedin: FaLinkedin,
};

export function UserSocialIconLinks({
  socialLinksRaw,
  size = "md",
  className,
}: {
  socialLinksRaw?: string[] | null;
  size?: "sm" | "md";
  className?: string;
}) {
  const links = parseUserSocialLinks(socialLinksRaw);
  const filled = USER_SOCIAL_FIELDS.filter((f) => links[f.key]?.trim());

  if (!filled.length) return null;

  const box =
    size === "sm"
      ? "h-8 w-8 text-sm"
      : "h-9 w-9 text-base";

  return (
    <div className={cn("flex flex-wrap justify-center gap-2", className)}>
      {filled.map(({ key, label }) => {
        const Icon = ICONS[key];
        const href = links[key]!.trim();
        return (
          <a
            key={key}
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            title={label}
            aria-label={label}
            className={cn(
              "inline-flex items-center justify-center rounded-lg border border-kc-border bg-kc-surface text-kc-muted transition hover:border-kc-accent/50 hover:text-kc-accent",
              box
            )}
          >
            <Icon />
          </a>
        );
      })}
    </div>
  );
}

export function UserSocialLinksList({
  socialLinksRaw,
}: {
  socialLinksRaw?: string[] | null;
}) {
  const links = parseUserSocialLinks(socialLinksRaw);
  const filled = USER_SOCIAL_FIELDS.filter((f) => links[f.key]?.trim());

  if (!filled.length) {
    return (
      <span className="text-kc-muted">Chưa thêm liên kết mạng xã hội.</span>
    );
  }

  return (
    <ul className="space-y-2 text-left sm:text-right">
      {filled.map(({ key, label }) => {
        const Icon = ICONS[key];
        const href = links[key]!.trim();
        return (
          <li key={key}>
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex max-w-full items-center gap-2 text-sm text-kc-accent hover:underline"
            >
              <Icon className="h-4 w-4 shrink-0 opacity-80" />
              <span className="truncate">{label}</span>
              <FaExternalLinkAlt className="h-3 w-3 shrink-0 opacity-60" />
            </a>
          </li>
        );
      })}
    </ul>
  );
}

export function UserSocialLinksEditor({
  value,
  onChange,
  errors,
}: {
  value: UserSocialLinks;
  onChange: (next: UserSocialLinks) => void;
  errors?: Record<string, string>;
}) {
  return (
    <div className="max-h-[min(60vh,420px)] space-y-3 overflow-y-auto pr-1">
      <p className="text-xs text-kc-muted">
        Để trống nếu không dùng. Chỉ hiển thị các mục bạn điền URL hợp lệ.
      </p>
      {USER_SOCIAL_FIELDS.map(({ key, label, placeholder }) => {
        const Icon = ICONS[key];
        return (
          <div key={key}>
            <label className="mb-1 flex items-center gap-2 text-xs font-medium text-kc-fg">
              <Icon className="h-3.5 w-3.5 text-kc-muted" />
              {label}
            </label>
            <input
              type="url"
              value={value[key] ?? ""}
              onChange={(e) =>
                onChange({ ...value, [key]: e.target.value })
              }
              placeholder={placeholder}
              className={cn(
                "w-full rounded-lg border bg-kc-bg px-3 py-2 text-sm text-kc-fg focus:outline-none focus:ring-2 focus:ring-kc-accent/40",
                errors?.[key]
                  ? "border-kc-down"
                  : "border-kc-border"
              )}
            />
            {errors?.[key] ? (
              <p className="mt-1 text-xs text-kc-down">{errors[key]}</p>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

export function userSocialSummary(socialLinksRaw?: string[] | null): string {
  const n = countUserSocialLinks(parseUserSocialLinks(socialLinksRaw));
  if (n === 0) return "Chưa có";
  return `${n} liên kết`;
}
