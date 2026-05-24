export default function FaqPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-12 text-kc-fg">
      <h1 className="text-2xl font-semibold">Câu hỏi thường gặp</h1>
      <dl className="mt-6 space-y-6 text-sm">
        <div>
          <dt className="font-medium text-kc-fg">KC là gì?</dt>
          <dd className="mt-1 text-kc-muted">
            KingCoin (KC) là đơn vị quote nội bộ để mua/bán token trên sàn mô
            phỏng. Kiếm KC qua tab Nhiệm vụ.
          </dd>
        </div>
        <div>
          <dt className="font-medium text-kc-fg">Phí phát hành token?</dt>
          <dd className="mt-1 text-kc-muted">
            Mặc định 1000 KC (cấu hình qua TOKEN_LISTING_FEE_KC trên server).
          </dd>
        </div>
        <div>
          <dt className="font-medium text-kc-fg">Có rút tiền thật không?</dt>
          <dd className="mt-1 text-kc-muted">Không — môi trường mô phỏng off-chain.</dd>
        </div>
      </dl>
    </main>
  );
}
