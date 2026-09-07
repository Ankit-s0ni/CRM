import Link from "next/link";
import { ArrowUpRight, Menu } from "lucide-react";
import { BrandMark } from "@/components/brand-mark";
import { PLATFORM_SIGNUP_URL } from "@/lib/config";

const navigation = [
  { href: "/hrms", label: "HRMS" },
  { href: "/pos", label: "POS" },
  { href: "/pricing", label: "Pricing" },
] as const;

export function SiteHeader() {
  return (
    <header className="site-header">
      <Link className="wordmark" href="/" aria-label="Liqaa home">
        <span className="brand-dot" aria-hidden="true" />
        <span>Liqaa</span>
      </Link>
      <nav aria-label="Primary navigation">
        {navigation.map((item) => (
          <Link href={item.href} key={item.href}>{item.label}</Link>
        ))}
      </nav>
      <a className="header-cta" href={PLATFORM_SIGNUP_URL}>
        Start workspace
        <ArrowUpRight aria-hidden="true" size={16} />
      </a>
      <details className="mobile-nav">
        <summary aria-label="Open navigation">
          <Menu aria-hidden="true" size={20} />
        </summary>
        <nav aria-label="Mobile navigation">
          {navigation.map((item) => (
            <Link href={item.href} key={item.href}>{item.label}</Link>
          ))}
          <a href={PLATFORM_SIGNUP_URL}>Start workspace</a>
        </nav>
      </details>
    </header>
  );
}
