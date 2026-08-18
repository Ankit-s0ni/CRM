export function BrandMark({ className = "brand-mark" }: { className?: string }) {
  return (
    <img
      src="/logo-square.png"
      alt="Liqaa Logo"
      className={className}
    />
  );
}
