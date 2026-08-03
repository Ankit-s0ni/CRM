import Link from "next/link";
import { ArrowUpRight, Menu } from "lucide-react";
import { BrandMark } from "@/components/brand-mark";

const navigation = [
  { href: "/hrms", label: "HRMS" },
  { href: "/pos", label: "POS" },
  { href: "/pricing", label: "Pricing" },
] as const;

export function SiteHeader() {
  return (
    <header className="site-header">
      <Link className="wordmark" href="/" aria-label="DeltCRM home">
        <BrandMark />
        <span>DeltCRM</span>
      </Link>
      <nav aria-label="Primary navigation">
        {navigation.map((item) => (
          <Link href={item.href} key={item.href}>{item.label}</Link>
        ))}
      </nav>
      <Link className="header-cta" href="https://blufield.cloud/signup">
        Start workspace
        <ArrowUpRight aria-hidden="true" size={16} />
      </Link>
      <details className="mobile-nav">
        <summary aria-label="Open navigation">
          <Menu aria-hidden="true" size={20} />
        </summary>
        <nav aria-label="Mobile navigation">
          {navigation.map((item) => (
            <Link href={item.href} key={item.href}>{item.label}</Link>
          ))}
          <Link href="https://blufield.cloud/signup">Start workspace</Link>
        </nav>
      </details>
    </header>
  );
}
