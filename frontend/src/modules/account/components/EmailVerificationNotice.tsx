"use client";

import { Button } from "@/components/ui/button";
import useMutation, { isMutationFailure } from "@/hooks/useMutation";
import Link from "next/link";
import { HiOutlineMail } from "react-icons/hi";
import { toast } from "react-toastify";

type Props = {
  email: string;
  onVerified?: () => void;
};

export function EmailVerificationNotice({ email, onVerified }: Props) {
  const resend = useMutation("POST", "/auth/resend-verification");

  const sendCode = async () => {
    if (!email.trim()) return;
    const result = await resend.mutate({ email: email.trim() });
    if (isMutationFailure(result)) return;
    toast.success("Đã gửi mã 6 số tới email — kiểm tra cả hộp thư spam.");
    onVerified?.();
  };

  return (
    <div className="mb-6 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex gap-3">
          <HiOutlineMail className="mt-0.5 h-5 w-5 shrink-0 text-amber-300" />
          <div>
            <p className="text-sm font-medium text-amber-100">
              Email chưa xác minh
            </p>
            <p className="mt-1 text-xs leading-relaxed text-amber-100/80">
              Bạn vẫn dùng KingCoin bình thường. Xác minh email để nhận thông báo
              bảo mật và khôi phục mật khẩu qua email.
            </p>
          </div>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            variant="secondary"
            disabled={resend.loading}
            onClick={() => void sendCode()}
          >
            {resend.loading ? "Đang gửi…" : "Gửi mã"}
          </Button>
          <Link
            href={`/register/verify?email=${encodeURIComponent(email.trim())}`}
          >
            <Button type="button" size="sm" variant="ghost">
              Nhập mã
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
