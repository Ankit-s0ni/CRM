# Project Structure Analysis: CRM / HRMS Monorepo

This document provides a detailed breakdown of the codebase architecture and organization found in the project.

## High-Level Architecture

The project is structured as a **Monorepo** using **pnpm workspaces** and **Turborepo** (`turbo.json`) for efficient build and task orchestration. It encompasses the complete stack for a CRM/HRMS platform, including a backend API, a web application, a mobile application, and shared packages.

### Root Configuration
*   **Package Manager:** `pnpm` (version 11.1.2)
*   **Workspaces:** Defined in `pnpm-workspace.yaml`, explicitly mapping to `apps/*` and `packages/*`.
*   **Scripts:** The root `package.json` coordinates global commands such as testing (including k6 load tests for sprints), linting, building, typechecking, and OpenAPI generation.

---

## Apps (`/apps`)

This directory contains the primary runnable applications.

### 1. API (`/apps/api`)
The backend is a **NestJS** application designed with modularity in mind.

*   **Tech Stack:** NestJS (v11), Prisma ORM (with PostgreSQL adapter), Redis / BullMQ (for background jobs), Passport (JWT auth), AWS S3 SDK.
*   **Structure:**
    *   `src/main.ts` & `src/worker.ts`: Entry points for the HTTP server and the background job processor, respectively.
    *   `src/platform/`: Contains the foundational, cross-cutting concerns of the application, particularly related to SaaS/Multi-tenancy. Modules include `access`, `audit`, `billing`, `control-plane`, `identity`, `notifications`, `organization`, `tenancy`, and `workspace`.
    *   `src/products/`: Houses domain-specific business logic and features. Currently, it includes an `attendance` module, indicating HRMS capabilities.
    *   `src/shared/`: Shared utilities, services, and decorators used across the API.

### 2. Web (`/apps/web`)
The frontend web portal is built using **Next.js** (App Router).

*   **Tech Stack:** Next.js (v16), React (v19), Tailwind CSS (v4), Zustand (state management), Shadcn UI & Base UI (component libraries).
*   **Structure (`src/app`):**
    *   **Authentication & Onboarding:** Routes like `login`, `signup`, `forgot-password`, `verify-email`, `accept-invitation`.
    *   **Core Application:** Routes structured under `app`, `dashboard`, and `platform`.
    *   **Error Handling:** `workspace-unavailable` for multi-tenancy edge cases.
*   **Styling:** Uses modern Tailwind CSS (`@tailwindcss/postcss`) with custom animations (`tw-animate-css`).

### 3. Mobile (`/apps/mobile`)
A cross-platform mobile application built with **Flutter**.

*   **Tech Stack:** Flutter / Dart.
*   **Structure (`lib/`):**
    *   Follows a feature-first architectural pattern.
    *   `core/`: Base configurations, networking, shared widgets, and utilities.
    *   `features/`: Isolated modules for specific app functionalities.
    *   `l10n/`: Localization and internationalization files.
    *   `main.dart`: The application entry point.

---

## Packages (`/packages`)

This directory contains shared code used across multiple applications within the monorepo to maintain DRY principles.

### 1. Contracts (`/packages/contracts`)
*   **Purpose:** Houses shared TypeScript definitions, API requests, and response schemas.
*   **Integration:** It appears to be heavily integrated with OpenAPI. The root package script `openapi:generate` exports the NestJS swagger spec and uses `openapi-typescript` to generate types directly into `packages/contracts/src/generated.ts`. This ensures the web client and API stay perfectly synchronized.

### 2. UI (`/packages/ui`)
*   **Purpose:** A shared UI component library.
*   **Integration:** This likely contains foundational React components, themes, or design tokens that are consumed by the `web` application, ensuring a consistent design system.

---

## Summary of Key Workflows

1.  **Type Safety & API Contracts:** The API generates an OpenAPI spec, which is converted to TypeScript types in `@hrms/contracts`, guaranteeing end-to-end type safety between the NestJS backend and the Next.js frontend.
2.  **Multi-Tenancy:** Evident from the `platform` module in the API (tenant-audit, tenancy, workspace, billing) and specific web routes (workspace-unavailable).
3.  **Background Processing:** The API runs a separate worker process (`start:worker`) utilizing BullMQ and Redis for heavy lifting asynchronously.
4.  **Load Testing:** The project has extensive k6 load testing scripts defined in the root for various features (pings, sync, live-board), ensuring scalability for high-throughput HR/Attendance functions.
