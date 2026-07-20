"use client";

import { CalendarDays } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { FeatureInfo } from "@/components/help/feature-info";

export type WeeklyOffValue = Array<
  string | { weekday: string; occurrences?: number[] }
>;

type WeeklyOffEditorProps = {
  value: WeeklyOffValue;
  onChange: (value: WeeklyOffValue) => void;
  mode: "compact" | "advanced";
};

const weekdays = [
  { code: "MON", label: "Monday", short: "Mon" },
  { code: "TUE", label: "Tuesday", short: "Tue" },
  { code: "WED", label: "Wednesday", short: "Wed" },
  { code: "THU", label: "Thursday", short: "Thu" },
  { code: "FRI", label: "Friday", short: "Fri" },
  { code: "SAT", label: "Saturday", short: "Sat" },
  { code: "SUN", label: "Sunday", short: "Sun" },
] as const;

const presets = [
  { label: "Friday + Saturday", days: ["FRI", "SAT"] },
  { label: "Saturday + Sunday", days: ["SAT", "SUN"] },
  { label: "Sunday only", days: ["SUN"] },
] as const;

const occurrenceLabels = ["1st", "2nd", "3rd", "4th", "5th"];

type NormalizedPattern = { weekday: string; occurrences?: number[] };

export function WeeklyOffEditor({
  value,
  onChange,
  mode,
}: WeeklyOffEditorProps) {
  const patterns = normalizePatterns(value);
  const summary = describeWeeklyOffs(patterns);

  function commit(next: NormalizedPattern[]) {
    onChange(sortPatterns(next));
  }

  function setDay(weekday: string, checked: boolean) {
    const remaining = patterns.filter((item) => item.weekday !== weekday);
    commit(checked ? [...remaining, { weekday }] : remaining);
  }

  function applyPreset(days: readonly string[]) {
    commit(days.map((weekday) => ({ weekday })));
  }

  function setRecurrence(weekday: string, recurrence: "every" | "selected") {
    commit(
      patterns.map((item) =>
        item.weekday === weekday
          ? recurrence === "every"
            ? { weekday }
            : {
                weekday,
                occurrences: item.occurrences?.length ? item.occurrences : [1],
              }
          : item,
      ),
    );
  }

  function toggleOccurrence(
    weekday: string,
    occurrence: number,
    checked: boolean,
  ) {
    commit(
      patterns.map((item) => {
        if (item.weekday !== weekday) return item;
        const current = item.occurrences ?? [1];
        const occurrences = checked
          ? [...new Set([...current, occurrence])].sort()
          : current.filter((itemOccurrence) => itemOccurrence !== occurrence);
        return {
          weekday,
          occurrences: occurrences.length ? occurrences : current,
        };
      }),
    );
  }

  return (
    <section
      className="rounded-xl border border-surface-variant bg-zinc-50 p-5"
      aria-labelledby={`weekly-off-${mode}-title`}
    >
      <div className="flex items-start gap-3">
        <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-white text-primary shadow-sm">
          <CalendarDays className="size-5" />
        </span>
        <div className="min-w-0 flex-1">
          <h3 id={`weekly-off-${mode}-title`} className="font-semibold">
            Weekly-off pattern
          </h3>
          <p className="mt-1 text-xs leading-5 text-on-surface-variant">
            {mode === "compact"
              ? "Choose a common weekend or select any days your team takes off every week."
              : "Set every-week or occurrence-based weekly offs for each weekday."}
          </p>
        </div>
        <FeatureInfo className="ml-auto" helpKey="weekly-off" />
      </div>

      {mode === "compact" ? (
        <CompactEditor
          patterns={patterns}
          onPreset={applyPreset}
          onDayChange={setDay}
        />
      ) : (
        <AdvancedEditor
          patterns={patterns}
          onDayChange={setDay}
          onRecurrenceChange={setRecurrence}
          onOccurrenceChange={toggleOccurrence}
        />
      )}

      <div className="mt-5 rounded-lg border border-zinc-200 bg-white px-4 py-3">
        <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-outline">
          Current schedule
        </p>
        <p className="mt-1 text-sm font-medium text-[#2e2e2e]">{summary}</p>
        {mode === "compact" && (
          <p className="mt-1 text-xs text-outline">
            Occurrence-based schedules can be configured later in Company
            Settings.
          </p>
        )}
      </div>
    </section>
  );
}

function CompactEditor({
  patterns,
  onPreset,
  onDayChange,
}: {
  patterns: NormalizedPattern[];
  onPreset: (days: readonly string[]) => void;
  onDayChange: (weekday: string, checked: boolean) => void;
}) {
  return (
    <>
      <div className="mt-5 flex flex-wrap gap-2" aria-label="Weekend presets">
        {presets.map((preset) => {
          const active = matchesEveryWeekDays(patterns, preset.days);
          return (
            <Button
              key={preset.label}
              type="button"
              size="sm"
              variant="outline"
              aria-pressed={active}
              className={
                active
                  ? "border-primary bg-zinc-50 text-primary"
                  : "bg-white"
              }
              onClick={() => onPreset(preset.days)}
            >
              {preset.label}
            </Button>
          );
        })}
      </div>
      <div className="mt-4 grid grid-cols-4 gap-2 sm:grid-cols-7">
        {weekdays.map((day) => {
          const checked = patterns.some((item) => item.weekday === day.code);
          return (
            <Label
              key={day.code}
              htmlFor={`compact-weekly-off-${day.code}`}
              className={`grid cursor-pointer justify-items-center gap-2 rounded-lg border px-2 py-3 text-center transition ${
                checked
                  ? "border-primary bg-white text-primary shadow-sm"
                  : "border-zinc-200 bg-white/60 text-on-surface-variant hover:border-zinc-400"
              }`}
            >
              <Checkbox
                id={`compact-weekly-off-${day.code}`}
                checked={checked}
                onCheckedChange={(nextChecked) =>
                  onDayChange(day.code, nextChecked)
                }
              />
              <span className="text-xs font-semibold">{day.short}</span>
            </Label>
          );
        })}
      </div>
    </>
  );
}

function AdvancedEditor({
  patterns,
  onDayChange,
  onRecurrenceChange,
  onOccurrenceChange,
}: {
  patterns: NormalizedPattern[];
  onDayChange: (weekday: string, checked: boolean) => void;
  onRecurrenceChange: (
    weekday: string,
    recurrence: "every" | "selected",
  ) => void;
  onOccurrenceChange: (
    weekday: string,
    occurrence: number,
    checked: boolean,
  ) => void;
}) {
  return (
    <div className="mt-5 grid gap-3">
      {weekdays.map((day) => {
        const pattern = patterns.find((item) => item.weekday === day.code);
        const selected = Boolean(pattern);
        const selectedWeeks = Boolean(pattern?.occurrences?.length);
        return (
          <fieldset
            key={day.code}
            aria-label={`${day.label} weekly off`}
            className={`rounded-lg border bg-white p-4 transition ${selected ? "border-zinc-400" : "border-surface-variant"}`}
          >
            <div className="flex flex-wrap items-center gap-4">
              <Label
                htmlFor={`advanced-weekly-off-${day.code}`}
                className="min-w-32 cursor-pointer"
              >
                <Checkbox
                  id={`advanced-weekly-off-${day.code}`}
                  checked={selected}
                  onCheckedChange={(checked) => onDayChange(day.code, checked)}
                />
                {day.label}
              </Label>
              {selected && (
                <select
                  aria-label={`${day.label} recurrence`}
                  className="h-9 rounded-lg border border-zinc-300 bg-white px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
                  value={selectedWeeks ? "selected" : "every"}
                  onChange={(event) =>
                    onRecurrenceChange(
                      day.code,
                      event.target.value as "every" | "selected",
                    )
                  }
                >
                  <option value="every">Every week</option>
                  <option value="selected">Selected weeks</option>
                </select>
              )}
            </div>
            {selected && selectedWeeks && (
              <div className="mt-4 flex flex-wrap gap-x-5 gap-y-3 border-t border-zinc-100 pt-4">
                {occurrenceLabels.map((label, index) => {
                  const occurrence = index + 1;
                  const checked =
                    pattern?.occurrences?.includes(occurrence) ?? false;
                  return (
                    <Label
                      key={label}
                      htmlFor={`${day.code}-occurrence-${occurrence}`}
                      className="cursor-pointer text-xs"
                    >
                      <Checkbox
                        id={`${day.code}-occurrence-${occurrence}`}
                        checked={checked}
                        onCheckedChange={(nextChecked) =>
                          onOccurrenceChange(day.code, occurrence, nextChecked)
                        }
                      />
                      {label}
                    </Label>
                  );
                })}
              </div>
            )}
          </fieldset>
        );
      })}
    </div>
  );
}

function normalizePatterns(value: WeeklyOffValue): NormalizedPattern[] {
  return sortPatterns(
    value.map((item) =>
      typeof item === "string"
        ? { weekday: item.toUpperCase() }
        : {
            weekday: item.weekday.toUpperCase(),
            ...(item.occurrences?.length
              ? { occurrences: [...new Set(item.occurrences)].sort() }
              : {}),
          },
    ),
  );
}

function sortPatterns(patterns: NormalizedPattern[]) {
  return [...patterns].sort(
    (left, right) => weekdayIndex(left.weekday) - weekdayIndex(right.weekday),
  );
}

function weekdayIndex(code: string) {
  return weekdays.findIndex((day) => day.code === code);
}

function matchesEveryWeekDays(
  patterns: NormalizedPattern[],
  days: readonly string[],
) {
  return (
    patterns.length === days.length &&
    patterns.every(
      (pattern) =>
        !pattern.occurrences?.length && days.includes(pattern.weekday),
    )
  );
}

function describeWeeklyOffs(patterns: NormalizedPattern[]) {
  if (!patterns.length) return "No recurring weekly off (seven-day operation)";
  return patterns
    .map((pattern) => {
      const label =
        weekdays.find((day) => day.code === pattern.weekday)?.label ??
        pattern.weekday;
      if (!pattern.occurrences?.length) return `Every ${label}`;
      const occurrences = pattern.occurrences
        .map((occurrence) => occurrenceLabels[occurrence - 1])
        .join(" and ");
      return `${occurrences} ${label}`;
    })
    .join(", ");
}
