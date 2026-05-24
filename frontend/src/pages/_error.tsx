import type { NextPageContext } from "next";
import Head from "next/head";
import Link from "next/link";

export type ErrorPageProps = {
  statusCode?: number;
  /** Thông điệp từ Next (dev) để debug nhanh */
  title?: string;
};

/**
 * Trang lỗi Pages Router — giảm tình huống “missing required error components”
 * khi dev server chưa ensure được bundle /_error nội bộ.
 */
export default function ErrorPage({ statusCode, title }: ErrorPageProps) {
  const code = statusCode ?? 500;
  const is404 = code === 404;

  return (
    <>
      <Head>
        <title>{is404 ? "Không tìm thấy" : "Lỗi"} — KingCoin</title>
      </Head>
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-4 text-center">
        <h1 className="text-xl font-semibold text-zinc-100">
          {title ??
            (is404 ? "Không tìm thấy trang" : "Đã xảy ra lỗi")}
        </h1>
        <p className="max-w-md text-sm text-zinc-400">
          Mã trạng thái: <span className="font-mono text-zinc-300">{code}</span>.
          Thử tải lại. Nếu vẫn lặp, dừng mọi <code className="rounded bg-zinc-800 px-1">next dev</code>, xóa thư mục{" "}
          <code className="rounded bg-zinc-800 px-1">.next</code> rồi chạy lại.
        </p>
        <Link
          href="/"
          className="rounded-lg border border-zinc-600 bg-zinc-900 px-4 py-2 text-sm font-medium text-amber-400 hover:border-zinc-500"
        >
          Về trang chủ
        </Link>
      </div>
    </>
  );
}

ErrorPage.getInitialProps = ({
  res,
  err,
}: NextPageContext): ErrorPageProps => {
  const statusCode = res?.statusCode ?? err?.statusCode ?? 404;
  return { statusCode };
};
