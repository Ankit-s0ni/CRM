---
name: "Next.js App Router & Shadcn UI"
description: "Guidelines and architecture for building Next.js web applications using the App Router, Shadcn UI primitives, and Tailwind CSS."
---

# Next.js App Router Architecture

When building or modifying a Next.js web application, always follow these structured, component-driven guidelines to ensure maintainability and adherence to modern React practices.

## 1. Component Architecture (Shadcn UI)
- **Never paste massive blocks of raw HTML.** All UI must be constructed using modular, reusable components.
- Use **shadcn/ui** for atomic primitives (e.g., `<Button>`, `<Input>`, `<Card>`).
- If a required primitive does not exist, run `npx shadcn@latest add <component>` to install it. Do not build raw HTML buttons or inputs if a Shadcn component can be used.
- UI components should live in `src/components/ui/`.
- Domain-specific components (e.g., `<LoginForm>`) should live in `src/components/` or co-located within the specific `src/app/` route directory if they are not reusable.

## 2. Server vs Client Components
- Keep `page.tsx` and `layout.tsx` files as **Server Components** by default (do not use `"use client"` unless absolutely necessary).
- Move interactivity, hooks (`useState`, `useEffect`), and event listeners into leaf **Client Components**.
- Example: A `login/page.tsx` (Server Component) should render a structured `<main>` and simply mount a `<LoginForm />` (Client Component) that handles the actual submission and state.

## 3. Styling & Theming
- Use **Tailwind CSS**. Avoid inline styles.
- When adapting external designs (like Stitch or Figma), extract the core color hexes and fonts into the global CSS variables (e.g., `globals.css` with `@theme inline` for Tailwind v4).
- Use Tailwind utility classes mapping to these semantic variables (e.g., `bg-primary`, `text-on-surface`) rather than hardcoding arbitrary colors in the markup.

## 4. API & State Management
- Use `axios` for external API calls, configured via a central client (e.g., `lib/api-client.ts`) that handles JWT interception.
- Use `zustand` for global client-side state (e.g., `lib/auth-store.ts`).

By adhering to this skill, the codebase will remain clean, structured, and "mannered," avoiding monolithic spaghetti code.
