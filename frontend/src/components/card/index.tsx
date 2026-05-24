import clsx from "clsx";

export function Card({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`bg-white shadow-md rounded-lg p-4 ${className}`}>
      {children}
    </div>
  );
}

export function CardHeader({ children }: { children: React.ReactNode }) {
  return <div className="mb-2">{children}</div>;
}

export function CardTitle({
  className,
  children,
}: {
  className: string;
  children: React.ReactNode;
}) {
  return <h2 className={clsx("text-lg font-bold", className)}>{children}</h2>;
}

export function CardContent({ children }: { children: React.ReactNode }) {
  return <div className="text-gray-600">{children}</div>;
}
