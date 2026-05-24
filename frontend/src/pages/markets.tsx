import { useEffect } from "react";
import { useRouter } from "next/router";

/** Alias thị trường → danh sách token */
export default function MarketsRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/token/list");
  }, [router]);
  return null;
}
