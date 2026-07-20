"use client";

import {
  getCountries,
  getCountryCallingCode,
  parsePhoneNumberFromString,
  type CountryCode,
} from "libphonenumber-js";
import { useEffect, useRef, useState } from "react";
import { inputClass } from "./page-primitives";

const regionNames = new Intl.DisplayNames(["en"], { type: "region" });
const countries = getCountries()
  .map((country) => ({
    country,
    label: regionNames.of(country) ?? country,
    callingCode: getCountryCallingCode(country),
  }))
  .sort((left, right) => left.label.localeCompare(right.label));

function parts(value: string, fallback: CountryCode) {
  const parsed = value ? parsePhoneNumberFromString(value) : undefined;
  return {
    country: parsed?.country ?? fallback,
    nationalNumber: parsed?.nationalNumber ?? "",
  };
}

export function InternationalPhoneInput({
  value,
  onChange,
  defaultCountry = "IN",
}: {
  value: string;
  onChange: (value: string) => void;
  defaultCountry?: CountryCode;
}) {
  const initial = parts(value, defaultCountry);
  const [country, setCountry] = useState<CountryCode>(initial.country);
  const [nationalNumber, setNationalNumber] = useState(initial.nationalNumber);
  const emittedValue = useRef(value);

  useEffect(() => {
    if (value === emittedValue.current) return;
    const next = parts(value, defaultCountry);
    setCountry(next.country);
    setNationalNumber(next.nationalNumber);
  }, [defaultCountry, value]);

  function emit(nextCountry: CountryCode, rawNumber: string) {
    const digits = rawNumber.replace(/\D/g, "");
    setNationalNumber(digits);
    if (!digits) {
      emittedValue.current = "";
      onChange("");
      return;
    }

    const parsed = parsePhoneNumberFromString(digits, nextCountry);
    const normalized =
      parsed?.number ??
      `+${getCountryCallingCode(nextCountry)}${digits.replace(/^0+/, "")}`;
    emittedValue.current = normalized;
    onChange(normalized);
  }

  return (
    <div className="grid grid-cols-[minmax(150px,0.8fr)_minmax(0,1.4fr)] gap-2">
      <select
        aria-label="Country code"
        className={inputClass}
        value={country}
        onChange={(event) => {
          const nextCountry = event.target.value as CountryCode;
          setCountry(nextCountry);
          emit(nextCountry, nationalNumber);
        }}
      >
        {countries.map((option) => (
          <option key={option.country} value={option.country}>
            {option.label} (+{option.callingCode})
          </option>
        ))}
      </select>
      <input
        aria-label="Phone number"
        className={inputClass}
        inputMode="numeric"
        onChange={(event) => emit(country, event.target.value)}
        placeholder="9876543210"
        type="tel"
        value={nationalNumber}
      />
    </div>
  );
}
