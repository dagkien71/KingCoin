import { apiFieldErrorsToForm } from "@/lib/auth/apply-api-field-errors";
import useMutation, { isMutationFailure } from "@/hooks/useMutation";
import Link from "next/link";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function VerifyEmailPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [errors, setErrors] = useState<{ email?: string; code?: string }>({});
  const verify = useMutation("POST", "/auth/verify-email");
  const resend = useMutation("POST", "/auth/resend-verification");

  useEffect(() => {
    const q = router.query.email;
    if (typeof q === "string" && q.trim()) {
      setEmail(q.trim());
    }
  }, [router.query.email]);

  const submitVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    if (!email.trim()) {
      setErrors({ email: "Email không được để trống." });
      return;
    }
    if (!/^\d{6}$/.test(code.trim())) {
      setErrors({ code: "Mã gồm 6 chữ số." });
      return;
    }
    const result = await verify.mutate({
      email: email.trim(),
      code: code.trim(),
    });
    if (isMutationFailure(result)) {
      const apiErrors = apiFieldErrorsToForm<{ email?: string; code?: string }>(
        result
      );
      if (apiErrors) setErrors(apiErrors);
      return;
    }
    toast.success("Xác nhận email thành công!");
    router.push("/account");
  };

  const onResend = async () => {
    if (!email.trim()) {
      toast.error("Nhập email trước.");
      return;
    }
    const result = await resend.mutate({ email: email.trim() });
    if (!isMutationFailure(result)) {
      toast.success("Đã gửi lại mã xác nhận qua email.");
    }
  };

  return (
    <div className="relative flex min-h-[calc(100vh-4rem)] items-center justify-center px-4 py-16">
      <Card className="w-full max-w-md border-kc-border bg-kc-elevated/95">
        <CardHeader>
          <CardTitle className="text-xl">Xác nhận email</CardTitle>
          <p className="text-sm text-kc-muted">
            Nhập mã 6 số đã gửi tới hộp thư của bạn.
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={submitVerify} className="space-y-4">
            <div>
              <label htmlFor="email" className="mb-1.5 block text-sm text-kc-muted">
                Email
              </label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
              />
              {errors.email && (
                <p className="mt-1 text-xs text-kc-down">{errors.email}</p>
              )}
            </div>
            <div>
              <label htmlFor="code" className="mb-1.5 block text-sm text-kc-muted">
                Mã xác nhận
              </label>
              <Input
                id="code"
                inputMode="numeric"
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                placeholder="000000"
              />
              {errors.code && (
                <p className="mt-1 text-xs text-kc-down">{errors.code}</p>
              )}
            </div>
            <Button
              type="submit"
              variant="primary"
              className="w-full"
              size="lg"
              disabled={verify.loading}
            >
              Xác nhận
            </Button>
          </form>
          <Button
            type="button"
            variant="ghost"
            className="mt-3 w-full text-sm"
            onClick={onResend}
            disabled={resend.loading}
          >
            Gửi lại mã
          </Button>
          <p className="mt-6 text-center text-sm text-kc-muted">
            <Link href="/login" className="text-kc-accent hover:underline">
              Đăng nhập
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
