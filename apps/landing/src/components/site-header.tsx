import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { BrandMark } from "@/components/brand-mark";

export function SiteHeader() {
  return (
    <header className="site-header">
      <Link className="wordmark" href="/" aria-label="DeltCRM home">
        <BrandMark />
        <span>DeltCRM</span>
      </Link>
      <nav aria-label="Primary navigation">
        <Link href="#platform">Platform</Link>
        <Link href="#domains">Ecosystem</Link>
        <Link href="#intelligence">Intelligence</Link>
      </nav>
      <Link className="header-cta" href="https://blufield.cloud/signup">
        Explore DeltCRM
        <ArrowUpRight aria-hidden="true" size={16} />
      </Link>
    </header>
  );
}
