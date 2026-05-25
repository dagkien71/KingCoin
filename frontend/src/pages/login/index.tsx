import { apiFieldErrorsToForm } from "@/lib/auth/apply-api-field-errors";
import useMutation, { isMutationFailure } from "@/hooks/useMutation";
import { useAppDispatch } from "@/store/hook";
import { setAuthState } from "@/store/slice/authSlice";
import { setSessionState } from "@/store/slice/sessionTokenSlice";
import { IResponse } from "@/types/response";
import Link from "next/link";
import { useRouter } from "next/router";
import React, { useState } from "react";
import { toast } from "react-toastify";
import { validateForm } from "@/lib/auth/login-validation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const Login = () => {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const [form, setForm] = useState({ email: "", password: "" });
  const [errors, setErrors] = useState<{ email?: string; password?: string }>(
    {}
  );
  const { mutate } = useMutation<IResponse>("POST", "/auth/login");

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setForm((prevForm) => ({
      ...prevForm,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const { email, password } = form;

    const validationErrors = validateForm(email, password);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }
    setErrors({});

    const result = await mutate({
      email: email.trim(),
      password,
    });

    if (isMutationFailure(result)) {
      const apiErrors = apiFieldErrorsToForm<{ email?: string; password?: string }>(
        result
      );
      if (apiErrors) setErrors(apiErrors);
      return;
    }

    const body = result as { data?: unknown } | undefined;
    if (!body?.data) {
      return;
    }

    const auth = body.data as {
      accessToken: string;
      refreshToken: string;
      user?: unknown;
    };

    const { accessToken, refreshToken } = auth;

    if (accessToken && refreshToken) {
      toast.success("Đăng nhập thành công!");
      const cookieRes = await fetch("/api/auth", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ data: auth }),
      });
      const res = await cookieRes.json();
      dispatch(setSessionState({ sessionToken: res?.data?.accessToken }));
      dispatch(setAuthState({ userInfo: res?.data?.user, isLogin: true }));
      router.push("/account");
    }
  };

  return (
    <div className="relative flex min-h-[calc(100vh-4rem)] items-center justify-center px-4 py-16">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_60%_40%_at_50%_0%,rgba(212,160,18,0.08),transparent)]" />
      <Card className="relative z-10 w-full max-w-md border-kc-border bg-kc-elevated/95 shadow-kc backdrop-blur-sm">
        <CardHeader className="border-kc-border pb-2">
          <CardTitle className="text-xl">Đăng nhập</CardTitle>
          <p className="text-sm text-kc-muted">
            Chào mừng trở lại KingCoin
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
                name="email"
                value={form.email}
                onChange={handleChange}
                placeholder="you@example.com"
                autoComplete="email"
              />
              {errors.email && (
                <p className="mt-1 text-xs text-kc-down">{errors.email}</p>
              )}
            </div>
            <div>
              <label
                htmlFor="password"
                className="mb-1.5 block text-sm text-kc-muted"
              >
                Mật khẩu
              </label>
              <Input
                id="password"
                type="password"
                name="password"
                value={form.password}
                onChange={handleChange}
                placeholder="≥6 ký tự, chữ + số/ký tự đặc biệt"
                autoComplete="current-password"
              />
              {errors.password && (
                <p className="mt-1 text-xs text-kc-down">{errors.password}</p>
              )}
            </div>
            <Button type="submit" variant="primary" className="w-full" size="lg">
              Đăng nhập
            </Button>
          </form>
          <p className="mt-6 text-center text-sm text-kc-muted">
            Chưa có tài khoản?{" "}
            <Link href="/register" className="font-medium text-kc-accent hover:underline">
              Đăng ký
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default Login;
