import useAuth from "@/hooks/useAuth";
import useMutation, { isMutationFailure } from "@/hooks/useMutation";
import { useRouter } from "next/router";
import { useCallback } from "react";
import { toast } from "react-toastify";

function conversationIdFromMutationResult(
  res: unknown
): string | null {
  if (!res || typeof res !== "object" || isMutationFailure(res)) return null;
  if ("data" in res) {
    const data = (res as { data?: { id?: string } }).data;
    if (data?.id) return data.id;
  }
  if ("id" in res && typeof (res as { id: unknown }).id === "string") {
    return (res as { id: string }).id;
  }
  return null;
}

/** Mở hoặc tạo hội thoại 1-1 — không cho nhắn chính mình. */
export function useSquareStartConversation() {
  const router = useRouter();
  const { isLogin, user } = useAuth();
  const { mutate: startConv, loading } = useMutation<{ id: string }>(
    "POST",
    "/square/conversations"
  );

  const startWithUser = useCallback(
    async (targetUserId: string) => {
      if (!isLogin || !user?.id) {
        void router.push("/login");
        return;
      }
      if (String(user.id) === String(targetUserId)) {
        toast.info("Không thể nhắn tin với chính mình");
        return;
      }
      const res = await startConv({ targetUserId });
      const convId = conversationIdFromMutationResult(res);
      if (convId) void router.push(`/square/messages/${convId}`);
    },
    [isLogin, user?.id, router, startConv]
  );

  return { startWithUser, loading, currentUserId: user?.id ?? null };
}
