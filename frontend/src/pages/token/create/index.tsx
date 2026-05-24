import { useEffect } from "react";
import { useRouter } from "next/router";

/** Chuyển hướng sang KingCoin Studio (route cũ giữ tương thích). */
export default function LegacyCreateTokenRedirect() {
  const router = useRouter();
  useEffect(() => {
    void router.replace("/issuer/create");
  }, [router]);
  return (
    <p className="px-4 py-16 text-center text-sm text-kc-muted">
      Đang chuyển sang KingCoin Studio…
    </p>
  );
}
