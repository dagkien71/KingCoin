/** Mạng xã hội / liên kết công khai trên hồ sơ user (lưu trong `User.socialLinks`). */

export type UserSocialPlatform =
  | "website"
  | "twitter"
  | "telegram"
  | "discord"
  | "facebook"
  | "youtube"
  | "github"
  | "linkedin";

export type UserSocialLinks = Partial<Record<UserSocialPlatform, string>>;

const STORAGE_PREFIX = "kc-social:v1:";

export const USER_SOCIAL_FIELDS: {
  key: UserSocialPlatform;
  label: string;
  placeholder: string;
}[] = [
  { key: "website", label: "Website", placeholder: "https://your-site.com" },
  { key: "twitter", label: "X (Twitter)", placeholder: "https://x.com/username" },
  { key: "telegram", label: "Telegram", placeholder: "https://t.me/username" },
  { key: "discord", label: "Discord", placeholder: "https://discord.gg/invite" },
  { key: "facebook", label: "Facebook", placeholder: "https://facebook.com/..." },
  { key: "youtube", label: "YouTube", placeholder: "https://youtube.com/@..." },
  { key: "github", label: "GitHub", placeholder: "https://github.com/username" },
  { key: "linkedin", label: "LinkedIn", placeholder: "https://linkedin.com/in/..." },
];

function emptyLinks(): UserSocialLinks {
  return {};
}

function isValidUrl(url: string): boolean {
  try {
    const u = new URL(url.trim());
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

/** Đọc từ `socialLinks` API (JSON blob hoặc URL thuần legacy). */
export function parseUserSocialLinks(links?: string[] | null): UserSocialLinks {
  if (!links?.length) return emptyLinks();
  const first = links[0]?.trim() ?? "";
  if (first.startsWith(STORAGE_PREFIX)) {
    try {
      const json = first.slice(STORAGE_PREFIX.length);
      const parsed = JSON.parse(json) as UserSocialLinks;
      return { ...emptyLinks(), ...parsed };
    } catch {
      return emptyLinks();
    }
  }
  if (first.startsWith("{")) {
    try {
      return { ...emptyLinks(), ...(JSON.parse(first) as UserSocialLinks) };
    } catch {
      return emptyLinks();
    }
  }
  const out = emptyLinks();
  for (const raw of links) {
    const s = raw?.trim();
    if (!s) continue;
    if (s.includes("::")) {
      const idx = s.indexOf("::");
      const key = s.slice(0, idx) as UserSocialPlatform;
      const url = s.slice(idx + 2).trim();
      if (USER_SOCIAL_FIELDS.some((f) => f.key === key) && url) {
        out[key] = url;
      }
      continue;
    }
    if (!out.website && isValidUrl(s)) out.website = s;
  }
  return out;
}

/** Ghi vào `socialLinks` — một phần tử JSON có prefix. */
export function serializeUserSocialLinks(links: UserSocialLinks): string[] {
  const cleaned: UserSocialLinks = {};
  for (const { key } of USER_SOCIAL_FIELDS) {
    const v = links[key]?.trim();
    if (v) cleaned[key] = v;
  }
  if (Object.keys(cleaned).length === 0) return [];
  return [`${STORAGE_PREFIX}${JSON.stringify(cleaned)}`];
}

export function validateUserSocialLinks(
  links: UserSocialLinks
): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const { key, label } of USER_SOCIAL_FIELDS) {
    const v = links[key]?.trim();
    if (!v) continue;
    if (!isValidUrl(v)) {
      errors[key] = `${label}: URL phải bắt đầu bằng http:// hoặc https://`;
    }
  }
  return errors;
}

export function countUserSocialLinks(links: UserSocialLinks): number {
  return USER_SOCIAL_FIELDS.filter((f) => links[f.key]?.trim()).length;
}
