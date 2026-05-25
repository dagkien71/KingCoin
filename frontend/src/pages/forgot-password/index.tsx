import { apiFieldErrorsToForm } from "@/lib/auth/apply-api-field-errors";
import useMutation, { isMutationFailure } from "@/hooks/useMutation";
import Link from "next/link";
import { useRouter } from "next/router";
import { useState } from "react";
import { toast } from "react-toastify";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [errors, setErrors] = useState<{ email?: string }>({});
  const { mutate, loading } = useMutation("POST", "/auth/forgot-password");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    if (!email.trim()) {
      setErrors({ email: "Email không được để trống." });
      return;
    }
    const result = await mutate({ email: email.trim() });
    if (isMutationFailure(result)) {
      const apiErrors = apiFieldErrorsToForm<{ email?: string }>(result);
      if (apiErrors) setErrors(apiErrors);
      return;
    }
    toast.success(
      "Nếu email tồn tại, mã đặt lại mật khẩu đã được gửi. Kiểm tra hộp thư."
    );
    router.push(
      `/reset-password?email=${encodeURIComponent(email.trim())}`
    );
  };

  return (
    <div className="relative flex min-h-[calc(100vh-4rem)] items-center justify-center px-4 py-16">
      <Card className="w-full max-w-md border-kc-border bg-kc-elevated/95">
        <CardHeader>
          <CardTitle className="text-xl">Quên mật khẩu</CardTitle>
          <p className="text-sm text-kc-muted">
            Nhập email đăng ký — chúng tôi gửi mã 6 số để đặt lại mật khẩu.
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
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
            <Button
              type="submit"
              variant="primary"
              className="w-full"
              size="lg"
              disabled={loading}
            >
              Gửi mã
            </Button>
          </form>
          <p className="mt-6 text-center text-sm text-kc-muted">
            <Link href="/login" className="text-kc-accent hover:underline">
              Quay lại đăng nhập
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
