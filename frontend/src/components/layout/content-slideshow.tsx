import Link from "next/link";

export default function MainContent() {
  return (
    <main className="absolute top-0 px-32 w-full flex flex-col gap-4 items-start justify-center h-screen text-left">
      <h1
        className="max-w-[900px] text-2xl md:text-6xl font-bold mb-4"
        style={{ lineHeight: "70px" }}
      >
        Trải nghiệm giao dịch tiền mã hóa cùng CoinLearn
      </h1>
      <p className="text-sm md:text-2xl text-gray-400 font-semibold mb-6">
        Sàn giao dịch tiền mã hóa an toàn và hiệu quả
      </p>
      <div className="flex space-x-6">
        <Link
          href="/trade"
          className="bg-white text-black px-14 py-5 rounded-full"
        >
          Thử làm trader
        </Link>
        <Link
          href="/issuer"
          className="bg-white text-black px-14 py-5 rounded-full"
        >
          Tạo tiền mã hoá
        </Link>
      </div>
    </main>
  );
}
