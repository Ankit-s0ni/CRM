import type { ReactNode } from "react";
import { FeatureInfo, RouteFeatureInfo } from "@/features/platform/help/feature-info";
import type { AttendanceHelpKey } from "@/content/attendance-help";

export function AdminPage({
  title,
  description,
  action,
  children,
}: {
  title: string;
  description: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="mx-auto w-full max-w-[1440px] p-5 lg:p-8">
      <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-bold tracking-tight text-zinc-900">
              {title}
            </h1>
            <RouteFeatureInfo />
          </div>
          <p className="mt-1 text-sm text-on-surface-variant">{description}</p>
        </div>
        {action}
      </div>
      {children}
    </div>
  );
}

export function Panel({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`rounded-xl border border-surface-variant bg-white shadow-sm ${className}`}
    >
      {children}
    </section>
  );
}

export function PrimaryButton(
  props: React.ButtonHTMLAttributes<HTMLButtonElement>,
) {
  return (
    <button
      {...props}
      className={`inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-container disabled:opacity-50 ${props.className ?? ""}`}
    />
  );
}

export function Field({
  label,
  children,
  helpKey,
}: {
  label: string;
  children: ReactNode;
  helpKey?: AttendanceHelpKey;
}) {
  return (
    <div className="relative">
      <label className="grid gap-2 text-sm font-medium text-zinc-900">
        <span className={helpKey ? "min-h-9 pr-10" : undefined}>{label}</span>
        {children}
      </label>
      {helpKey && (
        <FeatureInfo
          className="absolute right-0 top-0 min-h-9 min-w-9"
          helpKey={helpKey}
        />
      )}
    </div>
  );
}

export const inputClass =
  "h-11 w-full rounded-lg border border-zinc-300 bg-white px-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15";

export function LoadingState() {
  return (
    <div className="grid gap-3">
      {[0, 1, 2].map((item) => (
        <div
          key={item}
          className="h-16 animate-pulse rounded-xl bg-zinc-50"
        />
      ))}
    </div>
  );
}
export function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="grid min-h-56 place-items-center p-8 text-center">
      <div>
        <h3 className="text-lg font-semibold">{title}</h3>
        <p className="mt-2 max-w-md text-sm text-outline">{body}</p>
      </div>
    </div>
  );
}
export function ErrorState({ message }: { message: string }) {
  return (
    <div className="rounded-xl border border-red-300 bg-error-container p-4 text-sm text-on-error-container">
      {message}
    </div>
  );
}
