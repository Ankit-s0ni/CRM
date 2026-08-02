import { ArrowDown, ArrowUpRight, Check, MoveRight } from "lucide-react";
import { BrandMark } from "@/components/brand-mark";

const activity = [
  ["Attendance", "96%", "Live"],
  ["Sales pipeline", "$182k", "+18%"],
  ["Orders today", "248", "+32"],
] as const;

export function Hero() {
  return (
    <section className="hero" aria-labelledby="hero-title">
      <div className="hero-copy">
        <p className="eyebrow">DeltCRM business operating system</p>
        <h1 id="hero-title">
          Your whole business,
          <span>moving as one.</span>
        </h1>
        <p className="hero-summary">
          People, customers, commerce and communication share one operating
          layer, without forcing every team into the same tool.
        </p>
        <div className="hero-actions">
          <a className="primary-action" href="https://blufield.cloud/signup">
            Start your workspace
            <ArrowUpRight aria-hidden="true" size={17} />
          </a>
          <a className="text-action" href="#platform">
            See how it connects
            <MoveRight aria-hidden="true" size={17} />
          </a>
        </div>
      </div>

      <div className="hero-product" aria-label="DeltCRM connected workspace preview">
        <div className="product-bar">
          <span className="product-dots" aria-hidden="true"><i /><i /><i /></span>
          <span>Operations / Today</span>
          <span className="product-live"><i /> Live</span>
        </div>
        <div className="product-layout">
          <aside className="product-rail" aria-hidden="true">
            <BrandMark />
            <span className="rail-active" />
            <span />
            <span />
            <span />
          </aside>
          <div className="product-content">
            <div className="product-heading">
              <div>
                <small>MONDAY, 02 AUGUST</small>
                <strong>Good morning, Maya.</strong>
              </div>
              <span className="product-avatar">MP</span>
            </div>
            <div className="product-metrics">
              {activity.map(([label, value, change]) => (
                <div className="product-metric" key={label}>
                  <small>{label}</small>
                  <strong>{value}</strong>
                  <span>{change}</span>
                </div>
              ))}
            </div>
            <div className="product-flow">
              <div className="flow-title">
                <strong>Business pulse</strong>
                <span>This morning</span>
              </div>
              {[
                "Payroll inputs approved",
                "New opportunity moved to proposal",
                "Low-stock alert resolved",
              ].map((item) => (
                <div className="flow-row" key={item}>
                  <span className="flow-check"><Check size={12} /></span>
                  <span>{item}</span>
                  <i />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <a className="scroll-cue" href="#fragmentation">
        Scroll to connect
        <ArrowDown aria-hidden="true" size={16} />
      </a>
    </section>
  );
}
