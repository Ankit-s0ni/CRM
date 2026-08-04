import Link from "next/link";
import { ArrowRight, Check, Layers3 } from "lucide-react";
import { MarketingFooter } from "@/components/marketing-footer";
import { SiteHeader } from "@/components/site-header";
import type { MarketingProduct } from "@/content/products";

export function ProductPage({ product }: { product: MarketingProduct }) {
  return (
    <main className={`marketing-page product-page product-${product.accent}`}>
      <SiteHeader />

      <section className="page-hero product-hero">
        <div className="page-hero-copy">
          <p className="eyebrow">{product.eyebrow}</p>
          <span className="availability-pill">{product.status}</span>
          <h1>{product.headline}</h1>
          <p>{product.summary}</p>
          <div className="page-actions">
            <Link className="primary-action" href="https://blufield.cloud/signup">
              Start your workspace <ArrowRight aria-hidden="true" size={17} />
            </Link>
            <Link className="text-action" href="/pricing">
              View pricing <ArrowRight aria-hidden="true" size={17} />
            </Link>
          </div>
        </div>
        <div className="product-signal" aria-label={`${product.name} overview`}>
          <div className="signal-head">
            <span>{product.name}</span>
            <i>Live system</i>
          </div>
          <div className="signal-grid">
            {product.metrics.map((metric) => (
              <div key={metric.label}>
                <strong>{metric.value}</strong>
                <span>{metric.label}</span>
              </div>
            ))}
          </div>
          <div className="signal-flow">
            {product.workflow.map((step) => (
              <span key={step.title}><Check aria-hidden="true" size={14} /> {step.title}</span>
            ))}
          </div>
        </div>
      </section>

      <section className="feature-section">
        <div className="section-heading">
          <p className="eyebrow">What is included</p>
          <h2>Built around the work, not disconnected screens.</h2>
        </div>
        <div className="feature-grid">
          {product.features.map((feature, index) => (
            <article className="feature-card" key={feature.title}>
              <span>{String(index + 1).padStart(2, "0")}</span>
              <Layers3 aria-hidden="true" size={23} />
              <h3>{feature.title}</h3>
              <p>{feature.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="workflow-section">
        <div className="section-heading">
          <p className="eyebrow">A clear operating rhythm</p>
          <h2>From setup to daily control in three deliberate steps.</h2>
        </div>
        <ol>
          {product.workflow.map((step, index) => (
            <li key={step.title}>
              <span>{index + 1}</span>
              <div><h3>{step.title}</h3><p>{step.description}</p></div>
            </li>
          ))}
        </ol>
      </section>

      <section className="cta-band">
        <p className="eyebrow">One business operating system</p>
        <h2>Start with {product.name.replace("DeltCRM ", "")}. Keep room for everything next.</h2>
        <Link href="https://blufield.cloud/signup">Create your workspace <ArrowRight aria-hidden="true" size={18} /></Link>
      </section>
      <MarketingFooter />
    </main>
  );
}
