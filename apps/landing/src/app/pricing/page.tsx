import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";
import { MarketingFooter } from "@/components/marketing-footer";
import { SiteHeader } from "@/components/site-header";

export const metadata: Metadata = {
  title: "Liqaa Pricing | Plans That Grow With Your Operation",
  description: "Flexible Liqaa plans for growing teams, multi-location businesses and enterprise operations.",
};

const plans = [
  {
    name: "Essential",
    audience: "For small teams building a dependable operating foundation.",
    action: "Start workspace",
    featured: false,
    features: ["Employee directory", "Attendance and leave", "Core reports", "One office", "Standard support"],
  },
  {
    name: "Growth",
    audience: "For active teams that need stronger controls and visibility.",
    action: "Choose Growth",
    featured: true,
    features: ["Everything in Essential", "Multiple offices", "Advanced policies", "Security monitoring", "Priority support"],
  },
  {
    name: "Scale",
    audience: "For complex organizations with regional and integration needs.",
    action: "Talk to sales",
    featured: false,
    features: ["Everything in Growth", "Regional localization", "Custom roles", "Integration support", "Dedicated onboarding"],
  },
] as const;

export default function PricingPage() {
  return (
    <main className="marketing-page pricing-page">
      <SiteHeader />
      <section className="pricing-hero">
        <p className="eyebrow">Pricing without the guesswork</p>
        <h1>Start focused. Expand when the operation does.</h1>
        <p>Plans are priced for your team size, selected services and operating region.</p>
        <span>Regional currency and applicable taxes are confirmed during workspace setup.</span>
      </section>

      <section className="pricing-grid" aria-label="DeltCRM plans">
        {plans.map((plan) => (
          <article className={`price-card${plan.featured ? " price-featured" : ""}`} key={plan.name}>
            {plan.featured && <span className="plan-badge">Most popular</span>}
            <p className="plan-name">{plan.name}</p>
            <h2>Custom regional quote</h2>
            <p className="plan-audience">{plan.audience}</p>
            <ul>
              {plan.features.map((feature) => <li key={feature}><Check aria-hidden="true" size={16} /> {feature}</li>)}
            </ul>
            <Link href="https://platform.blufield.cloud/signup">{plan.action} <ArrowRight aria-hidden="true" size={17} /></Link>
          </article>
        ))}
      </section>

      <section className="comparison-band">
        <div><p className="eyebrow">Modular by design</p><h2>Only add the services your business is ready to use.</h2></div>
        <div className="service-pricing-links">
          <Link href="/hrms"><span>Available now</span><strong>HRMS</strong><ArrowRight size={19} /></Link>
          <Link href="/pos"><span>Early access</span><strong>POS</strong><ArrowRight size={19} /></Link>
        </div>
      </section>

      <section className="faq-section">
        <div><p className="eyebrow">Practical answers</p><h2>Before you choose a plan.</h2></div>
        <div>
          <article><h3>How is the final price calculated?</h3><p>By enabled services, active users, operating region and any implementation requirements.</p></article>
          <article><h3>Can we start with only HRMS?</h3><p>Yes. DeltCRM is modular, so your team can begin with HRMS and add connected services later.</p></article>
          <article><h3>Is onboarding included?</h3><p>Every plan includes guided setup. Larger or more complex deployments can include dedicated onboarding.</p></article>
        </div>
      </section>
      <MarketingFooter />
    </main>
  );
}
