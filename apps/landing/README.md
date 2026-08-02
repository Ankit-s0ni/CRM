# DeltCRM Landing

Independent Next.js marketing experience for the DeltCRM business operating system.

## Product model

All landing-page content follows one hierarchy:

1. **Platform**: DeltCRM, the shared operating layer.
2. **Domains**: HRMS, CRM, POS, Communication, Finance, Projects, and AI.
3. **Modules**: Attendance and Payroll within HRMS; Business Mail within Communication; Inventory within POS; and so on.
4. **Features**: The capabilities delivered inside each module.

Add future products in `src/content/platform.ts`. A new capability should become a feature of an existing module, a module in an existing domain, or a new domain only when it represents a distinct business function.

## Local development

```bash
pnpm dev:landing
```

The landing app runs on `http://localhost:4003`.

## Motion architecture

The scaffold includes CSS motion and reduced-motion support. Use Lenis for optional smooth scrolling, Framer Motion for component transitions, and GSAP only for pinned scroll chapters or timeline choreography. Keep Three.js deferred until a scene materially improves the platform story.
