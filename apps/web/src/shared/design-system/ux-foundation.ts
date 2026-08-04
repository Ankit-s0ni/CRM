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
  pageTitle: "reference-home-serif text-[34px] font-semibold leading-tight text-[#151515] md:text-[42px]",
  sectionTitle: "text-xl font-bold text-[#151515]",
  panelTitle: "text-sm font-bold text-[#151515]",
  body: "text-sm leading-6 text-foreground",
  helper: "text-xs leading-5 text-[#5f6572]",
  label: "text-sm font-semibold text-[#151515]",
  metric: "text-2xl font-bold tabular-nums text-[#151515]",
} as const;

export const uxFocusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#151515] focus-visible:ring-offset-2 focus-visible:ring-offset-[#fbfaf6]";

export const uxPanel =
  "rounded-[6px] border border-[#beb8ad] bg-[#fffefa] text-[#151515] shadow-[0_2px_8px_rgba(20,20,20,0.04)]";

export const uxInput =
  "min-h-11 w-full rounded-[6px] border border-[#beb8ad] bg-[#fffefa] px-3 py-2 text-sm text-[#151515] outline-none transition placeholder:text-[#7d817f] disabled:cursor-not-allowed disabled:bg-[#f3efe6] disabled:text-[#8c867c] focus-visible:border-[#151515] focus-visible:ring-2 focus-visible:ring-[#151515]/20 aria-invalid:border-red-500 aria-invalid:ring-red-500/20";

export const uxTable = {
  wrapper: "overflow-x-auto rounded-[6px] border border-[#beb8ad] bg-[#fffefa] shadow-[0_2px_8px_rgba(20,20,20,0.04)]",
  table: "w-full min-w-[760px] border-collapse text-left text-sm",
  head: "bg-[#f3efe6] text-xs font-bold uppercase tracking-wide text-[#5f6572]",
  headCell: "px-4 py-3",
  row: "border-t border-[#ded7ca] transition-colors hover:bg-[#fbfaf6]",
  cell: "px-4 py-3 align-middle text-[#151515]",
} as const;

export const uxStatusTones = {
  neutral: "border-[#beb8ad] bg-[#f3efe6] text-[#5f6572]",
  info: "border-[#beb8ad] bg-[#f3efe6] text-[#151515]",
  success: "border-emerald-200 bg-emerald-50 text-emerald-800",
  warning: "border-amber-200 bg-amber-50 text-amber-900",
  danger: "border-red-200 bg-red-50 text-red-800",
  pending: "border-sky-200 bg-sky-50 text-sky-800",
} as const;

export type UxStatusTone = keyof typeof uxStatusTones;
