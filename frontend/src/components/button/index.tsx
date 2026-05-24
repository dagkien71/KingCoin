export function Button({
  children,
  onClick,
  className,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 rounded-lg font-medium ${className}`}
    >
      {children}
    </button>
  );
}
