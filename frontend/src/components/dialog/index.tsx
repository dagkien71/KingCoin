import { Button } from "../button";

export function Dialog({
  open,
  onOpenChange,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 ">
      <div className="bg-white p-6 rounded-lg shadow-lg min-w-[800px]">
        {children}
        <Button
          onClick={() => onOpenChange(false)}
          className="mt-4 text-red-600 w-full border border-red-600"
        >
          Close
        </Button>
      </div>
    </div>
  );
}

export function DialogContent({ children }: { children: React.ReactNode }) {
  return <div className="space-y-4">{children}</div>;
}

export function DialogHeader({ children }: { children: React.ReactNode }) {
  return <div className="mb-4">{children}</div>;
}

export function DialogTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="text-xl font-bold">{children}</h2>;
}
