export const uxSpacing = {
  0: "0",
  1: "0.25rem",
  2: "0.5rem",
  3: "0.75rem",
  4: "1rem",
  5: "1.25rem",
  6: "1.5rem",
  8: "2rem",
  10: "2.5rem",
  12: "3rem",
} as const;

export const uxTypography = {
  pageTitle: "reference-home-serif text-[34px] font-semibold leading-tight text-foreground md:text-[42px]",
  sectionTitle: "text-xl font-bold text-foreground",
  panelTitle: "text-sm font-bold text-foreground",
  body: "text-sm leading-6 text-foreground",
  helper: "text-xs leading-5 text-muted-foreground",
  label: "text-sm font-semibold text-foreground",
  metric: "text-2xl font-bold tabular-nums text-foreground",
} as const;

export const uxFocusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background";

export const uxPanel =
  "rounded-[6px] border border-border bg-card text-foreground shadow-[0_2px_8px_rgba(20,20,20,0.04)]";

export const uxInput =
  "min-h-11 w-full rounded-[6px] border border-border bg-card px-3 py-2 text-sm text-foreground outline-none transition placeholder:text-muted-foreground/65 disabled:cursor-not-allowed disabled:bg-muted disabled:text-outline focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/20 aria-invalid:border-destructive aria-invalid:ring-destructive/20";

export const uxTable = {
  wrapper: "overflow-x-auto rounded-[6px] border border-border bg-card shadow-[0_2px_8px_rgba(20,20,20,0.04)]",
  table: "w-full min-w-[760px] border-collapse text-left text-sm",
  head: "bg-muted text-xs font-bold uppercase tracking-wide text-muted-foreground",
  headCell: "px-4 py-3",
  row: "border-t border-outline-variant transition-colors hover:bg-background",
  cell: "px-4 py-3 align-middle text-foreground",
} as const;

export const uxStatusTones = {
  neutral: "dashboard-tone dashboard-tone-neutral border",
  info: "dashboard-tone dashboard-tone-neutral border",
  success: "dashboard-tone dashboard-tone-emerald border",
  warning: "dashboard-tone dashboard-tone-amber border",
  danger: "dashboard-tone dashboard-tone-red border",
  pending: "dashboard-tone dashboard-tone-sky border",
} as const;

export type UxStatusTone = keyof typeof uxStatusTones;
