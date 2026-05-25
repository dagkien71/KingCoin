"use client";

import { Button } from "@/components/ui/button";
import { UserSocialIconLinks } from "@/modules/account/components/UserSocialLinksBlock";
import { SquareFeed } from "@/modules/square/SquareFeed";
import { squareAuthorLabel } from "@/modules/square/square-utils";
import { SquareCommunityLayout } from "@/modules/square/SquareCommunityLayout";
import { SquareAvatar, SquarePanel } from "@/modules/square/square-ui";
import useAuth from "@/hooks/useAuth";
import useFetchApi from "@/hooks/useFetchApi";
import { useSquareStartConversation } from "@/hooks/useSquareStartConversation";
import { parseUserSocialLinks } from "@/lib/user-social-links";
import type { SquarePublicProfile } from "@/types/square.type";
import Link from "next/link";
import { useRouter } from "next/router";
import { useMemo, useState } from "react";
import { HiOutlineArrowLeft, HiOutlineChatAlt2 } from "react-icons/hi";

type Props = {
  handle: string;
};

export function SquareProfileView({ handle }: Props) {
  const router = useRouter();
  const highlightPostId =
    typeof router.query.post === "string" ? router.query.post : null;
  const { isLogin, user } = useAuth();
  const { startWithUser, loading: startingChat } = useSquareStartConversation();
  const [feedBump, setFeedBump] = useState(0);
  const path = `/square/users/${encodeURIComponent(handle)}`;
  const { data: profile, loading, error } = useFetchApi<SquarePublicProfile>(
    path
  );

  const isOwnProfile =
    Boolean(user?.id && profile?.id && String(user.id) === String(profile.id));

  const social = useMemo(
    () => parseUserSocialLinks(profile?.socialLinks),
    [profile?.socialLinks]
  );

  if (loading && !profile) {
    return (
      <SquareCommunityLayout section="profile">
        <div className="animate-pulse space-y-4">
          <div className="h-32 rounded-2xl bg-kc-surface" />
          <div className="h-24 rounded-2xl bg-kc-surface" />
        </div>
      </SquareCommunityLayout>
    );
  }

  if (error || !profile) {
    return (
      <SquareCommunityLayout section="profile">
        <p className="py-16 text-center text-kc-muted">Không tìm thấy hồ sơ.</p>
      </SquareCommunityLayout>
    );
  }

  const author = {
    id: profile.id,
    username: profile.username,
    avatar: profile.avatar,
  };
  const feedPath = `/square/users/${encodeURIComponent(handle)}/posts`;

  return (
    <SquareCommunityLayout
      section="profile"
      showComposer={isOwnProfile}
      onPosted={() => setFeedBump((n) => n + 1)}
    >
      <Link
        href="/square"
        className="inline-flex items-center gap-1.5 text-sm text-kc-muted transition hover:text-kc-accent"
      >
        <HiOutlineArrowLeft className="h-4 w-4" />
        Về bảng tin
      </Link>

      <div className="relative overflow-hidden rounded-2xl border border-kc-border bg-kc-surface shadow-kc-glow">
        <div
          className="h-24 bg-gradient-to-r from-kc-accent/20 via-amber-500/10 to-transparent sm:h-28"
          aria-hidden
        />
        <div className="relative px-5 pb-5 sm:px-6">
          <div className="-mt-10 flex flex-wrap items-end justify-between gap-4">
            <SquareAvatar author={author} size="lg" className="ring-4 ring-kc-surface" />
            {isOwnProfile ? (
              <span className="rounded-lg border border-kc-border bg-kc-bg/50 px-3 py-2 text-xs text-kc-muted">
                Hồ sơ của bạn
              </span>
            ) : isLogin ? (
              <Button
                type="button"
                size="sm"
                className="gap-2"
                disabled={startingChat}
                onClick={() => void startWithUser(profile.id)}
              >
                <HiOutlineChatAlt2 className="h-4 w-4" />
                {startingChat ? "Đang mở…" : "Nhắn tin"}
              </Button>
            ) : (
              <Link href="/login">
                <Button type="button" size="sm" variant="secondary" className="gap-2">
                  <HiOutlineChatAlt2 className="h-4 w-4" />
                  Đăng nhập để nhắn tin
                </Button>
              </Link>
            )}
          </div>
          <h1 className="mt-3 text-xl font-bold text-kc-fg sm:text-2xl">
            {squareAuthorLabel(author)}
          </h1>
          <p className="mt-1 text-sm text-kc-muted">
            <span className="num font-medium text-kc-fg">{profile.postCount}</span>{" "}
            bài viết
          </p>
          {!isOwnProfile ? (
            <p className="mt-2 text-xs text-kc-muted">
              Nhắn tin riêng với trader này qua nút phía trên.
            </p>
          ) : null}
          {profile.introduction ? (
            <p className="mt-4 text-sm leading-relaxed text-kc-fg/90 whitespace-pre-wrap">
              {profile.introduction}
            </p>
          ) : null}
          {Object.keys(social).length > 0 ? (
            <div className="mt-4 border-t border-kc-border/60 pt-4">
              <UserSocialIconLinks
                socialLinksRaw={profile.socialLinks}
                className="justify-start"
              />
            </div>
          ) : null}
        </div>
      </div>

      <section>
        <h2 className="mb-3 px-1 text-xs font-semibold uppercase tracking-wider text-kc-muted">
          Bài viết
        </h2>
        <SquareFeed
          key={feedBump}
          feedPath={feedPath}
          highlightPostId={highlightPostId}
        />
      </section>
    </SquareCommunityLayout>
  );
}
