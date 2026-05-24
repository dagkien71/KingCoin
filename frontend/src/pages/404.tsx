import Head from "next/head";
import Link from "next/link";

export default function Custom404() {
  return (
    <>
      <Head>
        <title>404 — KingCoin</title>
      </Head>
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-4 text-center">
        <h1 className="text-xl font-semibold text-zinc-100">Trang không tồn tại</h1>
        <p className="max-w-md text-sm text-zinc-400">
          Đường dẫn bạn mở không có trong ứng dụng.
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          <Link
            href="/"
            className="rounded-lg border border-zinc-600 bg-zinc-900 px-4 py-2 text-sm font-medium text-amber-400 hover:border-zinc-500"
          >
            Trang chủ
          </Link>
          <Link
            href="/token/list"
            className="rounded-lg border border-zinc-600 bg-transparent px-4 py-2 text-sm font-medium text-zinc-300 hover:border-zinc-500"
          >
            Thị trường
          </Link>
        </div>
      </div>
    </>
  );
}
