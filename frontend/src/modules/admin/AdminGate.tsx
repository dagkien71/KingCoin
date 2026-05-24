"use client";

import { Button } from "@/components/ui/button";
import useAuth from "@/hooks/useAuth";
import { useRouter } from "next/router";
import { ReactNode } from "react";
import { HiOutlineShieldCheck } from "react-icons/hi";

type Props = {
  children: ReactNode;
};

export function AdminGate({ children }: Props) {
  const router = useRouter();
  const { isAdmin, isLogin } = useAuth();

  if (!isLogin) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 px-4 text-center">
        <HiOutlineShieldCheck className="h-12 w-12 text-violet-400/50" />
        <p className="text-sm text-kc-muted">Đăng nhập để truy cập KingCoin Control.</p>
        <Button type="button" variant="primary" onClick={() => router.push("/login")}>
          Đăng nhập
        </Button>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 px-4 text-center">
        <HiOutlineShieldCheck className="h-12 w-12 text-kc-down/80" />
        <h2 className="text-lg font-semibold text-kc-fg">Không có quyền truy cập</h2>
        <p className="max-w-sm text-sm text-kc-muted">
          Khu vực này chỉ dành cho tài khoản quản trị (admin).
        </p>
        <Button type="button" variant="secondary" onClick={() => router.push("/home")}>
          Về trang chủ
        </Button>
      </div>
    );
  }

  return <>{children}</>;
}
