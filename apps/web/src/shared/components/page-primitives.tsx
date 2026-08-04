import type { ReactNode } from "react";
import { FeatureInfo, RouteFeatureInfo } from "@/features/platform/help/feature-info";
import type { AttendanceHelpKey } from "@/content/attendance-help";
import { cn } from "@/lib/utils";
import { Button } from "@/shared/ui/button";
import {
  uxFocusRing,
  uxInput,
  uxPanel,
  uxStatusTones,
  uxTable,
  uxTypography,
  type UxStatusTone,
} from "@/shared/design-system/ux-foundation";

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
    <div className="min-h-[calc(100vh-76px)] bg-[#fbfaf6] bg-[radial-gradient(#e8e1d4_0.7px,transparent_0.7px)] p-4 [background-size:14px_14px] md:p-5 lg:p-8">
      <div className="mx-auto w-full max-w-[1440px]">
      <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className={uxTypography.pageTitle}>
              {title}
            </h1>
            <RouteFeatureInfo />
          </div>
          <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
            {description}
          </p>
        </div>
        {action}
      </div>
      {children}
      </div>
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
      className={cn(uxPanel, className)}
    >
      {children}
    </section>
  );
}

export function PrimaryButton(
  props: React.ButtonHTMLAttributes<HTMLButtonElement>,
) {
  return (
    <Button
      {...props}
      className={cn("min-h-11 rounded-[6px] px-5 font-semibold shadow-sm", props.className)}
    />
  );
}

export function Field({
  label,
  children,
  helpKey,
  hint,
  error,
}: {
  label: string;
  children: ReactNode;
  helpKey?: AttendanceHelpKey;
  hint?: string;
  error?: string;
}) {
  return (
    <div className="relative">
      <label className="grid gap-2 text-sm font-medium text-foreground">
        <span className={helpKey ? "min-h-9 pr-10" : undefined}>
          {label}
        </span>
        {children}
      </label>
      {hint && !error && (
        <p className="mt-1 text-xs leading-5 text-muted-foreground">{hint}</p>
      )}
      {error && (
        <p className="mt-1 text-xs leading-5 text-destructive" role="alert">
          {error}
        </p>
      )}
      {helpKey && (
        <FeatureInfo
          className="absolute right-0 top-0 min-h-9 min-w-9"
          helpKey={helpKey}
        />
      )}
    </div>
  );
}

export function FilterField({
  label,
  children,
  className = "",
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label className={cn("grid gap-1.5", className)}>
      <span className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      {children}
    </label>
  );
}

export const inputClass =
  uxInput;

export function LoadingState({
  rows = 3,
  className = "",
}: {
  rows?: number;
  className?: string;
}) {
  return (
    <div className={cn("grid gap-3", className)} aria-busy="true">
      {Array.from({ length: rows }, (_, item) => (
        <div
          key={item}
          className="h-16 animate-pulse rounded-[6px] border border-[#ded7ca] bg-[#f3efe6]"
        />
      ))}
    </div>
  );
}

export function EmptyState({
  title,
  body,
  action,
}: {
  title: string;
  body: string;
  action?: ReactNode;
}) {
  return (
    <div className="grid min-h-56 place-items-center rounded-[6px] border border-dashed border-[#beb8ad] bg-[#fffefa] p-8 text-center">
      <div>
        <h3 className={uxTypography.sectionTitle}>{title}</h3>
        <p className="mt-2 max-w-md text-sm leading-6 text-[#5f6572]">{body}</p>
        {action && <div className="mt-5">{action}</div>}
      </div>
    </div>
  );
}

export function ErrorState({
  message,
  action,
}: {
  message: string;
  action?: ReactNode;
}) {
  return (
    <div
      className="rounded-[6px] border border-red-200 bg-red-50 p-4 text-sm text-red-800 shadow-[0_2px_8px_rgba(20,20,20,0.04)]"
      role="alert"
    >
      <div>{message}</div>
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}

export function PageSection({
  title,
  description,
  action,
  children,
  className = "",
}: {
  title?: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("grid gap-3", className)}>
      {(title || description || action) && (
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            {title && <h2 className={uxTypography.sectionTitle}>{title}</h2>}
            {description && (
              <p className="mt-1 text-sm leading-6 text-[#5f6572]">
                {description}
              </p>
            )}
          </div>
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

export function Toolbar({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-2 rounded-[6px] border border-[#beb8ad] bg-[#fffefa] p-3 shadow-[0_2px_8px_rgba(20,20,20,0.04)]",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function StatusBadge({
  children,
  tone = "neutral",
  className = "",
}: {
  children: ReactNode;
  tone?: UxStatusTone;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex min-h-6 items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold",
        uxStatusTones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

export function StepList({
  steps,
  currentStep = 0,
  className = "",
}: {
  steps: Array<{
    title: string;
    body?: string;
  }>;
  currentStep?: number;
  className?: string;
}) {
  return (
    <ol
      className={cn(
        "grid gap-3 rounded-lg border border-border bg-card p-3 shadow-sm md:grid-cols-3",
        className,
      )}
    >
      {steps.map((step, index) => {
        const complete = index < currentStep;
        const active = index === currentStep;
        return (
          <li
            className={cn(
              "flex min-w-0 gap-3 rounded-md border p-3",
              active
                ? "border-[#151515] bg-[#f3efe6]"
                : "border-[#ded7ca] bg-[#fbfaf6]",
            )}
            key={step.title}
          >
            <span
              className={cn(
                "grid size-8 shrink-0 place-items-center rounded-full text-xs font-bold",
                complete || active
                  ? "bg-[#151515] text-white"
                  : "bg-[#f3efe6] text-[#5f6572]",
              )}
            >
              {index + 1}
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-semibold text-foreground">
                {step.title}
              </span>
              {step.body && (
                <span className="mt-0.5 block text-xs leading-5 text-muted-foreground">
                  {step.body}
                </span>
              )}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

export function TableShell({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={cn(uxTable.wrapper, className)}>{children}</div>;
}

export function DataTable({
  children,
  minWidth = "760px",
  className = "",
}: {
  children: ReactNode;
  minWidth?: string;
  className?: string;
}) {
  return (
    <TableShell className={className}>
      <table className={tableClass} style={{ minWidth }}>
        {children}
      </table>
    </TableShell>
  );
}

export function DataTableHeader({ children }: { children: ReactNode }) {
  return <thead className={tableHeadClass}>{children}</thead>;
}

export function DataTableRow({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return <tr className={cn(tableRowClass, className)}>{children}</tr>;
}

export function DataTableHeadCell({
  children,
  className = "",
}: {
  children?: ReactNode;
  className?: string;
}) {
  return <th className={cn(tableHeadCellClass, className)}>{children}</th>;
}

export function DataTableCell({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return <td className={cn(tableCellClass, className)}>{children}</td>;
}

export function PaginationBar({
  label,
  pageLabel,
  previousLabel,
  nextLabel,
  canPrevious,
  canNext,
  onPrevious,
  onNext,
}: {
  label: ReactNode;
  pageLabel: ReactNode;
  previousLabel: string;
  nextLabel: string;
  canPrevious: boolean;
  canNext: boolean;
  onPrevious: () => void;
  onNext: () => void;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-5 py-4">
      <p className="text-sm text-muted-foreground">{label}</p>
      <div className="flex items-center gap-2">
        <Button
          aria-label={previousLabel}
          disabled={!canPrevious}
          onClick={onPrevious}
          size="sm"
          type="button"
          variant="outline"
        >
          {previousLabel}
        </Button>
        <span className="px-2 text-sm font-semibold text-foreground">
          {pageLabel}
        </span>
        <Button
          aria-label={nextLabel}
          disabled={!canNext}
          onClick={onNext}
          size="sm"
          type="button"
          variant="outline"
        >
          {nextLabel}
        </Button>
      </div>
    </div>
  );
}

export const tableClass = uxTable.table;
export const tableHeadClass = uxTable.head;
export const tableHeadCellClass = uxTable.headCell;
export const tableRowClass = uxTable.row;
export const tableCellClass = uxTable.cell;
export const focusRingClass = uxFocusRing;
