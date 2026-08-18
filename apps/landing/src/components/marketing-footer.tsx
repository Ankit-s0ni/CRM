import Link from "next/link";
import { BrandMark } from "@/components/brand-mark";

export function MarketingFooter() {
  return (
    <footer className="marketing-footer">
      <div className="footer-brand">
        <BrandMark />
        <div>
          <strong>Liqaa</strong>
          <p>One connected system for the business you are becoming.</p>
        </div>
      </div>
      <nav aria-label="Footer navigation">
        <Link href="/hrms">HRMS</Link>
        <Link href="/pos">POS</Link>
        <Link href="/pricing">Pricing</Link>
        <Link href="/privacy">Privacy Policy</Link>
        <Link href="/terms">Terms of Service</Link>
      </nav>
      <span>© {new Date().getFullYear()} Liqaa</span>
    </footer>
  );
}
