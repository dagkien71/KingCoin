import PublicLayout from "@/components/layout/publicLayout";
import { SquareMessagesLayout } from "@/modules/square/SquareMessagesLayout";
import { useRouter } from "next/router";

export default function SquareMessageThreadPage() {
  const router = useRouter();
  const id = typeof router.query.id === "string" ? router.query.id : undefined;

  return (
    <PublicLayout>
      <SquareMessagesLayout conversationId={id} />
    </PublicLayout>
  );
}
