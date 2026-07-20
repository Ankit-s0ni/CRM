"use client";

import { LocateFixed } from "lucide-react";
import { inputClass } from "./page-primitives";

const PRIORITY_TIMEZONES = [
  "Asia/Dubai",
  "Asia/Muscat",
  "Asia/Riyadh",
  "Asia/Qatar",
  "Asia/Kuwait",
  "Asia/Bahrain",
  "Asia/Kolkata",
  "Asia/Karachi",
  "Asia/Dhaka",
] as const;

const allTimezones = supportedTimezones();
const priorityTimezones = PRIORITY_TIMEZONES.filter((timezone) =>
  allTimezones.includes(timezone),
);
const remainingTimezones = allTimezones.filter(
  (timezone) => !priorityTimezones.some((priority) => priority === timezone),
);

export function TimezoneSelect({
  value,
  onChange,
  description = "Used for shifts, attendance dates, weekly offs and reports.",
  showDetect = true,
}: {
  value: string;
  onChange: (timezone: string) => void;
  description?: string;
  showDetect?: boolean;
}) {
  function useDeviceTimezone() {
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (timezone && allTimezones.includes(timezone)) onChange(timezone);
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <select
          className={inputClass}
          value={value}
          onChange={(event) => onChange(event.target.value)}
        >
          {!value ? <option value="">Select timezone</option> : null}
          {!allTimezones.includes(value) && value ? (
            <option value={value}>{timezoneLabel(value)}</option>
          ) : null}
          <optgroup label="Gulf and nearby">
            {priorityTimezones.map((timezone) => (
              <option key={timezone} value={timezone}>
                {timezoneLabel(timezone)}
              </option>
            ))}
          </optgroup>
          <optgroup label="All timezones">
            {remainingTimezones.map((timezone) => (
              <option key={timezone} value={timezone}>
                {timezoneLabel(timezone)}
              </option>
            ))}
          </optgroup>
        </select>
        {showDetect ? (
          <button
            className="inline-flex shrink-0 items-center gap-2 rounded-lg border border-[#c7c4d8] bg-white px-3 text-xs font-semibold text-[#3525cd] hover:bg-[#f5f2ff]"
            onClick={useDeviceTimezone}
            type="button"
          >
            <LocateFixed className="size-4" /> Detect
          </button>
        ) : null}
      </div>
      <p className="text-xs text-[#777587]">{description}</p>
    </div>
  );
}

function supportedTimezones() {
  const supportedValuesOf = (
    Intl as typeof Intl & {
      supportedValuesOf?: (key: "timeZone") => string[];
    }
  ).supportedValuesOf;
  const values = supportedValuesOf?.("timeZone") ?? [
    ...PRIORITY_TIMEZONES,
    "UTC",
  ];
  return [...new Set(values)].sort((left, right) => left.localeCompare(right));
}

function timezoneLabel(timezone: string) {
  const location = timezone
    .split("/")
    .map((part) => part.replaceAll("_", " "))
    .join(" / ");
  try {
    const offset = new Intl.DateTimeFormat("en", {
      timeZone: timezone,
      timeZoneName: "shortOffset",
    })
      .formatToParts(new Date())
      .find(({ type }) => type === "timeZoneName")?.value;
    return offset ? `${location} (${offset})` : location;
  } catch {
    return location;
  }
}
