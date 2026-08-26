/** IANA time-zone identifiers available in the current runtime. */
export function listIanaTimeZones(): string[] {
  try {
    const values = Intl.supportedValuesOf("timeZone");
    return values.slice().sort((a, b) => a.localeCompare(b));
  } catch {
    return [
      "UTC",
      "America/New_York",
      "America/Chicago",
      "America/Denver",
      "America/Los_Angeles",
      "America/Puerto_Rico",
      "Europe/London",
      "Europe/Madrid",
      "America/Mexico_City",
    ];
  }
}

export function isValidIanaTimeZone(value: string): boolean {
  if (!value.trim()) {
    return false;
  }

  try {
    Intl.DateTimeFormat("en-US", { timeZone: value });
    return true;
  } catch {
    return false;
  }
}
