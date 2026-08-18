import Link from "next/link";
import { ArrowRight, Network, Sparkles } from "lucide-react";
import { platformServices, productDomains } from "@/content/platform";

export function PlatformStory() {
  return (
    <>
      <section className="story-section fragmentation" id="fragmentation">
        <div className="section-index">01 / Before Liqaa</div>
        <div className="fragment-copy">
          <p className="eyebrow">Work became fragmented</p>
          <h2>The business moved. Its software did not.</h2>
          <p>
            Attendance in one tool. Payroll in another. Customer data somewhere
            else. Every handoff loses context.
          </p>
        </div>
        <div className="fragment-cloud" aria-label="Disconnected business tools">
          {[
            "Attendance",
            "Payroll",
            "Mail",
            "Inventory",
            "Deals",
            "Projects",
            "Finance",
          ].map((label, index) => (
            <span key={label} className={`fragment fragment-${index + 1}`}>
              {label}
            </span>
          ))}
          <div className="fragment-convergence" aria-hidden="true">
            <img src="/logo-square.png" alt="Liqaa" className="h-10 w-10 object-contain" />
            <span>One connected core</span>
          </div>
        </div>
      </section>

      <section className="story-section platform-reveal" id="platform">
        <div className="section-index">02 / The platform</div>
        <div className="platform-heading">
          <p className="eyebrow">The shared foundation</p>
          <h2>Independent products. One source of truth.</h2>
        </div>
        <div className="platform-core">
          <div className="core-label">
            <img src="/logo-square.png" alt="Liqaa" className="h-7 w-7 object-contain inline-block" />
            <span>Liqaa core</span>
          </div>
          <div className="service-ring">
            {platformServices.map((service) => (
              <span key={service}>{service}</span>
            ))}
          </div>
        </div>
      </section>

      <section className="story-section domains" id="domains">
        <div className="section-index">03 / Connected domains</div>
        <div className="domains-heading domain-intro">
          <p className="eyebrow">Built to expand</p>
          <h2>A product family, not a feature pile.</h2>
          <p>
            Begin with HRMS today. Connect CRM, commerce, mail and finance as
            your operation grows. The shared foundation stays the same.
          </p>
        </div>
        <div className="domain-atlas">
          <div className="domain-stack">
            {productDomains.map((domain, index) => (
              <article
                className={`domain-card ${domain.status === "available" ? "domain-available" : ""}`}
                key={domain.id}
              >
                <div className="domain-card-top">
                  <span className="domain-number">0{index + 1}</span>
                  <span className="domain-status">{domain.status}</span>
                </div>
                <div className="domain-card-body">
                  <div>
                    <h3>{domain.name}</h3>
                    <p>{domain.statement}</p>
                    {(domain.id === "hrms" || domain.id === "pos") && (
                      <Link className="domain-link" href={`/${domain.id}`}>
                        Explore {domain.name} <ArrowRight aria-hidden="true" size={17} />
                      </Link>
                    )}
                  </div>
                  <ul aria-label={`${domain.name} modules`}>
                    {domain.modules.map((module, moduleIndex) => (
                      <li key={module}>
                        <span>{String(moduleIndex + 1).padStart(2, "0")}</span>
                        {module}
                        <ArrowRight aria-hidden="true" size={16} />
                      </li>
                    ))}
                  </ul>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="story-section intelligence" id="intelligence">
        <div className="section-index">04 / Intelligence</div>
        <div className="intelligence-panel">
          <Sparkles aria-hidden="true" size={28} />
          <p className="eyebrow">One intelligence layer</p>
          <h2>The system does more than store work. It understands it.</h2>
          <p>
            Shared data lets Liqaa surface patterns, automate routine work,
            and move every team with the same context.
          </p>
          <a href="https://platform.liqaahq.com/signup">
            Build your operating system
            <ArrowRight aria-hidden="true" size={18} />
          </a>
        </div>
      </section>
    </>
  );
}
