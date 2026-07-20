"use client";

import { CircleHelp, Info, ShieldCheck, Sparkles } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { MouseEvent } from "react";
import {
  attendanceHelpEntry,
  type AttendanceHelpEntry,
  type AttendanceHelpKey,
} from "@/content/attendance-help";
import {
  portalHelpEntryForPath,
  type PortalHelpEntry,
} from "@/content/portal-help";
import {
  attendanceHelpKeyForPath,
  isAttendanceWorkspacePath,
} from "@/lib/attendance-navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

type FeatureInfoProps = {
  helpKey: AttendanceHelpKey;
  className?: string;
  label?: boolean;
  tone?: "default" | "inverse";
};

export function FeatureInfo({
  helpKey,
  className,
  label = false,
  tone = "default",
}: FeatureInfoProps) {
  const entry = attendanceHelpEntry(helpKey);
  const stopCardNavigation = (event: MouseEvent) => event.stopPropagation();

  return (
    <Dialog>
      <DialogTrigger
        render={
          <Button
            aria-label={`About ${entry.title}`}
            className={cn(
              "min-h-11 min-w-11 gap-2 rounded-full",
              tone === "inverse"
                ? "text-surface-variant hover:bg-white/10 hover:text-white"
                : "text-on-surface-variant hover:bg-zinc-50 hover:text-primary",
              label && "px-3",
              className,
            )}
            onClick={stopCardNavigation}
            size={label ? "default" : "icon"}
            variant="ghost"
          />
        }
      >
        <Info aria-hidden="true" className="size-[18px]" />
        {label && <span>How this works</span>}
      </DialogTrigger>
      <FeatureHelpDrawer entry={entry} />
    </Dialog>
  );
}

export function FeatureHelpDrawer({
  entry,
}: {
  entry: AttendanceHelpEntry | PortalHelpEntry;
}) {
  return (
    <DialogContent className="max-h-[88vh] overflow-y-auto border border-zinc-200 bg-white p-0 shadow-2xl sm:max-w-xl">
      <DialogHeader className="bg-zinc-700 px-6 py-6 pr-14 text-white">
        <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-zinc-200">
          <Sparkles className="size-4" />
          Feature guide
        </div>
        <DialogTitle className="text-2xl font-bold leading-tight">
          {entry.title}
        </DialogTitle>
        <DialogDescription className="mt-2 text-sm leading-6 text-surface-variant">
          {entry.summary}
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-6 px-6 py-6 text-zinc-700">
        <HelpSection title="Use this when">
          <p>{entry.useWhen}</p>
        </HelpSection>

        <HelpSection title="How to use it">
          <ol className="space-y-3">
            {entry.steps.map((step, index) => (
              <li className="flex gap-3" key={step}>
                <span className="grid size-6 shrink-0 place-items-center rounded-full bg-zinc-100 text-xs font-bold text-primary">
                  {index + 1}
                </span>
                <span className="pt-0.5">{step}</span>
              </li>
            ))}
          </ol>
        </HelpSection>

        {entry.effect && (
          <div className="rounded-xl border border-zinc-300 bg-zinc-50 p-4">
            <h3 className="flex items-center gap-2 text-sm font-bold">
              <ShieldCheck className="size-4 text-primary" />
              What it affects
            </h3>
            <p className="mt-2 text-sm leading-6 text-zinc-500">
              {entry.effect}
            </p>
          </div>
        )}

        {(entry.access || entry.dependencies?.length) && (
          <div className="grid gap-4 sm:grid-cols-2">
            {entry.access && (
              <HelpSection title="Who can use it">
                <p>{entry.access}</p>
              </HelpSection>
            )}
            {entry.dependencies?.length && (
              <HelpSection title="Before you begin">
                <ul className="space-y-1">
                  {entry.dependencies.map((dependency) => (
                    <li key={dependency}>- {dependency}</li>
                  ))}
                </ul>
              </HelpSection>
            )}
          </div>
        )}

        {entry.related?.length && (
          <HelpSection title="Related workflows">
            <div className="flex flex-wrap gap-2">
              {entry.related.map((related) => (
                <Link
                  className="rounded-full border border-outline-variant px-3 py-2 text-xs font-semibold text-primary hover:bg-zinc-50"
                  href={related.href}
                  key={related.href}
                >
                  {related.label}
                </Link>
              ))}
            </div>
          </HelpSection>
        )}
      </div>
    </DialogContent>
  );
}

export function RouteFeatureInfo({
  className,
  label = false,
}: {
  className?: string;
  label?: boolean;
}) {
  const pathname = usePathname();
  if (!isAttendanceWorkspacePath(pathname)) return null;
  return (
    <FeatureInfo
      className={className}
      helpKey={attendanceHelpKeyForPath(pathname)}
      label={label}
    />
  );
}

export function HeaderContextHelp() {
  const pathname = usePathname();
  if (!isAttendanceWorkspacePath(pathname)) {
    return (
      <Dialog>
        <DialogTrigger
          render={
            <Button
              aria-label={`About ${portalHelpEntryForPath(pathname).title}`}
              className="min-h-11 min-w-11 rounded-full text-on-surface-variant"
              size="icon"
              variant="ghost"
            />
          }
        >
          <CircleHelp className="size-[18px]" />
        </DialogTrigger>
        <FeatureHelpDrawer entry={portalHelpEntryForPath(pathname)} />
      </Dialog>
    );
  }
  return <FeatureInfo helpKey={attendanceHelpKeyForPath(pathname)} />;
}

function HelpSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h3 className="mb-2 text-sm font-bold text-zinc-900">{title}</h3>
      <div className="text-sm leading-6 text-zinc-500">{children}</div>
    </section>
  );
}
