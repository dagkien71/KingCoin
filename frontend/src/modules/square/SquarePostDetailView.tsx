"use client";

import { SquareCommunityLayout } from "@/modules/square/SquareCommunityLayout";
import { SquarePostCard } from "@/modules/square/SquarePostCard";
import { squareAuthorLabel, squareProfilePath } from "@/modules/square/square-utils";
import type { SquarePost } from "@/types/square.type";
import Link from "next/link";
import { HiOutlineArrowLeft } from "react-icons/hi";

type Props = {
  post: SquarePost;
};

export function SquarePostDetailView({ post }: Props) {
  return (
    <SquareCommunityLayout section="feed">
      <Link
        href="/square"
        className="inline-flex items-center gap-1.5 text-sm text-kc-muted transition hover:text-kc-accent"
      >
        <HiOutlineArrowLeft className="h-4 w-4" />
        Về bảng tin
      </Link>

      <p className="text-sm text-kc-muted">
        Bài viết của{" "}
        <Link
          href={squareProfilePath(post.author)}
          className="font-medium text-kc-accent hover:underline"
        >
          {squareAuthorLabel(post.author)}
        </Link>
      </p>

      <SquarePostCard post={post} hideProfileLink />
    </SquareCommunityLayout>
  );
}
