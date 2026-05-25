import PublicLayout from "@/components/layout/publicLayout";
import { SquareProfileView } from "@/modules/square/SquareProfileView";
import { useRouter } from "next/router";

export default function SquareProfilePage() {
  const router = useRouter();
  const handle =
    typeof router.query.handle === "string" ? router.query.handle : "";

  return (
    <PublicLayout>
      {handle ? <SquareProfileView handle={handle} /> : null}
    </PublicLayout>
  );
}
