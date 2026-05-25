"use client";

import { Button } from "@/components/ui/button";
import { APP_URL } from "@/constant/config";
import { cn } from "@/lib/cn";
import {
  buildSocialShareUrl,
  canNativeShare,
  copyToClipboard,
  nativeSharePost,
  squarePostShareText,
  squarePostShareUrl,
  squareProfilePostUrl,
} from "@/lib/square-share";
import { squareAuthorLabel } from "@/modules/square/square-utils";
import type { SquarePost } from "@/types/square.type";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  HiOutlineClipboardCopy,
  HiOutlineExternalLink,
  HiOutlineShare,
  HiOutlineUser,
} from "react-icons/hi";
import { FaFacebookF, FaLinkedinIn } from "react-icons/fa";
import { FaXTwitter } from "react-icons/fa6";
import { toast } from "react-toastify";

type Props = {
  post: SquarePost;
  className?: string;
};

export function SquarePostShareMenu({ post, className }: Props) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const origin =
    typeof window !== "undefined" ? window.location.origin : APP_URL;
  const shareUrl = squarePostShareUrl(post.id, origin);
  const profileUrl = squareProfilePostUrl(post, origin);
  const shareText = squarePostShareText(post);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  const copyLink = useCallback(async (url: string, label: string) => {
    const ok = await copyToClipboard(url);
    if (ok) toast.success(`Đã copy ${label}`);
    else toast.error("Không copy được");
    setOpen(false);
  }, []);

  const openSocial = (target: "facebook" | "twitter" | "linkedin" | "zalo") => {
    window.open(
      buildSocialShareUrl(target, shareUrl, shareText),
      "_blank",
      "noopener,noreferrer,width=600,height=520"
    );
    setOpen(false);
  };

  return (
    <div
      ref={rootRef}
      className={cn("relative", open && "z-[70]", className)}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition",
          open
            ? "bg-kc-accent/15 text-kc-accent"
            : "bg-kc-bg/50 text-kc-muted hover:bg-kc-bg/80 hover:text-kc-fg"
        )}
        aria-expanded={open}
        aria-haspopup="menu"
      >
        <HiOutlineShare className="h-4 w-4" />
        Chia sẻ
      </button>

      {open ? (
        <div
          role="menu"
          className="absolute bottom-full left-0 z-[80] mb-2 w-64 rounded-xl border border-kc-border bg-kc-elevated p-2 shadow-xl"
        >
          <p className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-kc-muted">
            Chia sẻ bài viết
          </p>

          <button
            type="button"
            role="menuitem"
            className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-sm text-kc-fg hover:bg-white/5"
            onClick={() => void copyLink(shareUrl, "link bài")}
          >
            <HiOutlineClipboardCopy className="h-4 w-4 shrink-0 text-kc-accent" />
            Sao chép link (OGP)
          </button>

          <Link
            href={`/square/posts/${post.id}`}
            role="menuitem"
            className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-sm text-kc-fg hover:bg-white/5"
            onClick={() => setOpen(false)}
          >
            <HiOutlineExternalLink className="h-4 w-4 shrink-0" />
            Mở trang bài viết
          </Link>

          <button
            type="button"
            role="menuitem"
            className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-sm text-kc-fg hover:bg-white/5"
            onClick={() => void copyLink(profileUrl, "link hồ sơ")}
          >
            <HiOutlineUser className="h-4 w-4 shrink-0 text-violet-300" />
            Link trên hồ sơ {squareAuthorLabel(post.author)}
          </button>

          {canNativeShare() ? (
            <button
              type="button"
              role="menuitem"
              className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-sm text-kc-fg hover:bg-white/5"
              onClick={() => {
                void nativeSharePost(post, origin).then((ok) => {
                  if (ok) setOpen(false);
                });
              }}
            >
              <HiOutlineShare className="h-4 w-4 shrink-0" />
              Chia sẻ thiết bị…
            </button>
          ) : null}

          <div className="my-1 border-t border-kc-border/80" />

          <p className="px-2 py-1 text-[10px] text-kc-muted">
            Mạng xã hội (dùng OGP của bài)
          </p>
          <div className="flex flex-wrap gap-1 px-1 pb-1">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="h-8 flex-1 gap-1 px-2 text-xs"
              onClick={() => openSocial("facebook")}
            >
              <FaFacebookF className="h-3.5 w-3.5" />
              FB
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="h-8 flex-1 gap-1 px-2 text-xs"
              onClick={() => openSocial("twitter")}
            >
              <FaXTwitter className="h-3.5 w-3.5" />
              X
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="h-8 flex-1 gap-1 px-2 text-xs"
              onClick={() => openSocial("linkedin")}
            >
              <FaLinkedinIn className="h-3.5 w-3.5" />
              in
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="h-8 flex-1 gap-1 px-2 text-xs"
              onClick={() => openSocial("zalo")}
            >
              Zalo
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
