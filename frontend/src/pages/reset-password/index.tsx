import { apiFieldErrorsToForm } from "@/lib/auth/apply-api-field-errors";
import { validatePasswordStrength } from "@/lib/auth/password-rules";
import useMutation, { isMutationFailure } from "@/hooks/useMutation";
import Link from "next/link";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const { mutate, loading } = useMutation("POST", "/auth/reset-password");

  useEffect(() => {
    const q = router.query.email;
    if (typeof q === "string" && q.trim()) setEmail(q.trim());
  }, [router.query.email]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const next: Record<string, string> = {};
    if (!email.trim()) next.email = "Email không được để trống.";
    if (!/^\d{6}$/.test(code.trim())) next.code = "Mã gồm 6 chữ số.";
    const pwErr = validatePasswordStrength(password);
    if (pwErr) next.password = pwErr;
    if (password !== confirm) next.confirmPassword = "Mật khẩu xác nhận không khớp.";
    if (Object.keys(next).length) {
      setErrors(next);
      return;
    }
    setErrors({});
    const result = await mutate({
      email: email.trim(),
      code: code.trim(),
      password,
    });
    if (isMutationFailure(result)) {
      const apiErrors = apiFieldErrorsToForm(result);
      if (apiErrors) setErrors(apiErrors as Record<string, string>);
      return;
    }
    toast.success("Đặt lại mật khẩu thành công!");
    router.push("/login");
  };

  return (
    <div className="relative flex min-h-[calc(100vh-4rem)] items-center justify-center px-4 py-16">
      <Card className="w-full max-w-md border-kc-border bg-kc-elevated/95">
        <CardHeader>
          <CardTitle className="text-xl">Đặt lại mật khẩu</CardTitle>
          <p className="text-sm text-kc-muted">Nhập mã từ email và mật khẩu mới.</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm text-kc-muted">Email</label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              {errors.email && (
                <p className="mt-1 text-xs text-kc-down">{errors.email}</p>
              )}
            </div>
            <div>
              <label className="mb-1.5 block text-sm text-kc-muted">Mã 6 số</label>
              <Input
                inputMode="numeric"
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
              />
              {errors.code && (
                <p className="mt-1 text-xs text-kc-down">{errors.code}</p>
              )}
            </div>
            <div>
              <label className="mb-1.5 block text-sm text-kc-muted">
                Mật khẩu mới
              </label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              {errors.password && (
                <p className="mt-1 text-xs text-kc-down">{errors.password}</p>
              )}
            </div>
            <div>
              <label className="mb-1.5 block text-sm text-kc-muted">
                Xác nhận mật khẩu
              </label>
              <Input
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
              />
              {errors.confirmPassword && (
                <p className="mt-1 text-xs text-kc-down">
                  {errors.confirmPassword}
                </p>
              )}
            </div>
            <Button
              type="submit"
              variant="primary"
              className="w-full"
              size="lg"
              disabled={loading}
            >
              Lưu mật khẩu
            </Button>
          </form>
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
