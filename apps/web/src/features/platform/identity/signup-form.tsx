"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { apiClient } from "@/lib/api-client";
import { getApiErrorMessage } from "@/lib/api-error";
import { useAuthStore } from "@/lib/auth-store";
import { publicLinks } from "@/lib/public-links";

const employeeBands = [
  { label: "Select range", value: "" },
  { label: "1 - 10 Employees", value: "1-10" },
  { label: "11 - 50 Employees", value: "11-50" },
  { label: "51 - 200 Employees", value: "51-200" },
  { label: "201 - 500 Employees", value: "201-500" },
  { label: "501+ Employees", value: "501+" },
];

function slugifyWorkspace(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
    .slice(0, 32);
}

export function SignupForm() {
  const router = useRouter();
  const setPendingAuth = useAuthStore((state) => state.setPendingAuth);
  const [companyName, setCompanyName] = useState("");
  const [workEmail, setWorkEmail] = useState("");
  const [password, setPassword] = useState("");
  const [subdomain, setSubdomain] = useState("");
  const [employeeCount, setEmployeeCount] = useState("");
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [subdomainEdited, setSubdomainEdited] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const appDomain = process.env.NEXT_PUBLIC_APP_DOMAIN ?? 'blufield.cloud';
  const subdomainPreview = useMemo(() => {
    const slug = subdomain || slugifyWorkspace(companyName) || "yourcompany";
    return `${slug}.${appDomain}`;
  }, [companyName, subdomain, appDomain]);

  const completedFields = useMemo(() => {
    let count = 0;
    if (companyName.trim().length > 0) count++;
    if (workEmail.trim().length > 0 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(workEmail)) count++;
    if (password.trim().length >= 8) count++;
    if (subdomain.trim().length > 0) count++;
    if (employeeCount) count++;
    if (acceptedTerms) count++;
    return count;
  }, [companyName, workEmail, password, subdomain, employeeCount, acceptedTerms]);

  const progressPercentage = Math.round((completedFields / 6) * 50);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    setSuccess(null);

    if (!acceptedTerms) {
      setError("Accept the terms to create your workspace.");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await apiClient.post("/auth/signup", {
        companyName,
        workEmail,
        password,
        subdomain: subdomain || slugifyWorkspace(companyName),
        employeeCount,
      });

      const payload = response.data as {
        email: string;
        subdomain: string;
        emailDelivery: "SENT" | "FAILED";
        debugVerificationToken?: string;
      };

      const params = new URLSearchParams({
        email: payload.email,
        workspace: payload.subdomain,
        tenantId: response.data.tenantId,
        delivery: payload.emailDelivery,
      });

      if (payload.debugVerificationToken) {
        params.set("token", payload.debugVerificationToken);
      }

      setPendingAuth({
        tenantId: response.data.tenantId,
        workspace: payload.subdomain,
        email: payload.email,
      });
      setSuccess("Workspace created. Continue to email verification.");
      router.push(`/verify-email?${params.toString()}`);
    } catch (error: unknown) {
      setError(getApiErrorMessage(error, "We couldn't create your workspace right now."));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="w-full max-w-[392px] pt-[2px]">
      <div className="mb-16">
        <div className="mb-[10px] flex items-center justify-between">
          <span className="text-[14px] font-bold leading-5 text-primary">1 of 2 — Verify email next</span>
          <span className="text-[12px] font-semibold leading-4 tracking-[0.05em] text-on-surface-variant">{progressPercentage}% Complete</span>
        </div>
        <div className="h-[6px] w-full overflow-hidden rounded-full bg-zinc-200">
          <div 
            className="h-full bg-primary transition-all duration-300 ease-in-out" 
            style={{ width: `${progressPercentage}%` }} 
          />
        </div>
      </div>

      <div className="mb-10">
        <h2 className="mb-[6px] text-[24px] font-semibold leading-[1.25] tracking-[-0.02em] text-zinc-800">
          Create your workspace
        </h2>
        <p className="text-[16px] leading-[1.55] text-zinc-500">
          Join DeltCRM and transform your workforce management.
        </p>
      </div>

      {error ? (
        <div className="mb-6 rounded-[12px] border border-error/15 bg-error-container px-4 py-4 text-sm text-on-error-container">
          {error}
        </div>
      ) : null}

      {success ? (
        <div className="mb-6 rounded-[12px] border border-emerald-800/15 bg-emerald-300/20 px-4 py-4 text-sm text-emerald-900">
          {success}
        </div>
      ) : null}

      <form className="space-y-5" onSubmit={handleSubmit}>
        <div className="flex flex-col gap-[9px]">
          <label className="text-[14px] font-medium leading-5 text-zinc-800" htmlFor="company_name">
            Company name
          </label>
          <input
            id="company_name"
            autoComplete="off"
            className="h-[40px] rounded-[12px] border border-zinc-300 bg-transparent px-[15px] text-[16px] text-zinc-800 outline-none transition-all placeholder:text-zinc-300 focus:border-primary focus:ring-1 focus:ring-primary"
            placeholder="e.g. Acme Tech Solutions"
            value={companyName}
            onChange={(event) => {
              const nextCompanyName = event.target.value;
              setCompanyName(nextCompanyName);
              if (!subdomainEdited) {
                setSubdomain(slugifyWorkspace(nextCompanyName));
              }
            }}
            required
          />
        </div>

        <div className="flex flex-col gap-[9px]">
          <label className="text-[14px] font-medium leading-5 text-zinc-800" htmlFor="work_email">
            Work email
          </label>
          <input
            id="work_email"
            type="email"
            autoComplete="email"
            className="h-[40px] rounded-[12px] border border-zinc-300 bg-transparent px-[15px] text-[16px] text-zinc-800 outline-none transition-all placeholder:text-zinc-300 focus:border-primary focus:ring-1 focus:ring-primary"
            placeholder="name@company.com"
            value={workEmail}
            onChange={(event) => setWorkEmail(event.target.value)}
            required
          />
        </div>

        <div className="flex flex-col gap-[9px]">
          <label className="text-[14px] font-medium leading-5 text-zinc-800" htmlFor="password">
            Password
          </label>
          <div className="relative flex items-center">
            <input
              id="password"
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              className="h-[40px] w-full rounded-[12px] border border-zinc-300 bg-transparent pl-[15px] pr-12 text-[16px] text-zinc-800 outline-none transition-all placeholder:text-zinc-300 focus:border-primary focus:ring-1 focus:ring-primary"
              placeholder="Min. 8 characters"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
            <button
              className="absolute right-4 text-zinc-500 transition-colors hover:text-primary"
              type="button"
              aria-label="Toggle password visibility"
              onClick={() => setShowPassword((current) => !current)}
            >
              <span className="material-symbols-outlined text-[20px]">
                {showPassword ? "visibility_off" : "visibility"}
              </span>
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-[9px]">
          <label className="text-[14px] font-medium leading-5 text-zinc-800" htmlFor="subdomain">
            Choose workspace URL
          </label>
          <div className="flex items-center">
            <div className="relative flex flex-1 items-center">
              <input
                id="subdomain"
                className="h-[40px] w-full rounded-[12px] border border-zinc-300 bg-transparent px-[15px] text-[16px] text-zinc-800 outline-none transition-all placeholder:text-zinc-300 focus:border-primary focus:ring-1 focus:ring-primary"
                placeholder="yourcompany"
                value={subdomain}
                onChange={(event) => {
                  setSubdomainEdited(true);
                  setSubdomain(slugifyWorkspace(event.target.value));
                }}
                required
              />
            </div>
            <span className="ml-4 text-[16px] leading-6 text-on-surface-variant">.{appDomain}</span>
          </div>
          <p className="mt-[2px] flex items-center gap-1 text-[12px] font-semibold leading-4 tracking-[0.02em] text-primary">
            <span className="material-symbols-outlined text-[14px]">link</span>
            Live Preview: <span className="font-bold">{subdomainPreview}</span>
          </p>
        </div>

        <div className="flex flex-col gap-[9px]">
          <label className="text-[14px] font-medium leading-5 text-zinc-800" htmlFor="employee_count">
            Employee count
          </label>
          <div className="relative">
            <select
              id="employee_count"
              className="h-[40px] w-full cursor-pointer appearance-none rounded-[12px] border border-zinc-300 bg-transparent px-[15px] pr-10 text-[16px] text-zinc-800 outline-none transition-all focus:border-primary focus:ring-1 focus:ring-primary"
              value={employeeCount}
              onChange={(event) => setEmployeeCount(event.target.value)}
              required
            >
              {employeeBands.map((option) => (
                <option key={option.label} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <span className="material-symbols-outlined pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[20px] text-zinc-500">
              expand_more
            </span>
          </div>
        </div>

        <div className="flex items-start gap-3 pt-[2px]">
          <div className="flex h-5 items-center">
            <input
              id="terms"
              type="checkbox"
              className="h-[18px] w-[18px] rounded border-zinc-300 text-primary focus:ring-primary"
              checked={acceptedTerms}
              onChange={(event) => setAcceptedTerms(event.target.checked)}
            />
          </div>
          <label className="text-[14px] leading-6 text-on-surface-variant" htmlFor="terms">
            By creating a workspace, you agree to our{" "}
            <a className="font-medium text-primary hover:underline" href={publicLinks.terms} target="_blank" rel="noreferrer">
              Terms of Service
            </a>{" "}
            and{" "}
            <a className="font-medium text-primary hover:underline" href={publicLinks.privacy} target="_blank" rel="noreferrer">
              Privacy Policy
            </a>
            .
          </label>
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="mt-6 flex h-[44px] w-full items-center justify-center gap-2 rounded-[12px] bg-primary text-[20px] font-semibold leading-7 text-white shadow-[0_10px_24px_rgba(53,37,205,0.22)] transition-all hover:shadow-[0_12px_28px_rgba(53,37,205,0.28)] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-70"
        >
          {isSubmitting ? (
            <>
              <span className="material-symbols-outlined animate-spin">progress_activity</span>
              Setting up...
            </>
          ) : (
            <>
              Create workspace
              <span className="material-symbols-outlined">arrow_forward</span>
            </>
          )}
        </button>
      </form>

      <div className="mt-9 text-center">
        <p className="text-[14px] leading-6 text-on-surface-variant">
          Already have an account?{" "}
          <Link className="font-bold text-primary hover:underline" href="/login">
            Log in
          </Link>
        </p>
      </div>
    </div>
  );
}
