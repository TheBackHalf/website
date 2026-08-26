export type AssertionFailure = {
  message: string;
  detail?: string;
};

export class EvalAssertionError extends Error {
  readonly detail?: string;

  constructor(message: string, detail?: string) {
    super(message);
    this.name = "EvalAssertionError";
    this.detail = detail;
  }
}

export function assert(condition: unknown, message: string, detail?: string): asserts condition {
  if (!condition) {
    throw new EvalAssertionError(message, detail);
  }
}

export function assertEqual<T>(actual: T, expected: T, message: string): void {
  if (actual !== expected) {
    throw new EvalAssertionError(
      message,
      `expected=${JSON.stringify(expected)} actual=${JSON.stringify(actual)}`,
    );
  }
}

export function assertIncludes(
  haystack: string,
  needle: string,
  message: string,
): void {
  if (!haystack.includes(needle)) {
    throw new EvalAssertionError(message, `missing=${JSON.stringify(needle)}`);
  }
}

export function assertNotIncludes(
  haystack: string,
  needle: string,
  message: string,
): void {
  if (haystack.includes(needle)) {
    throw new EvalAssertionError(message, `found=${JSON.stringify(needle)}`);
  }
}

export function assertMatches(
  value: string,
  pattern: RegExp,
  message: string,
): void {
  if (!pattern.test(value)) {
    throw new EvalAssertionError(message, `pattern=${pattern}`);
  }
}

export function assertNonEmptyString(value: unknown, message: string): asserts value is string {
  assert(typeof value === "string" && value.trim().length > 0, message);
}

/** Never log secret-like payloads — only structural summaries. */
export function safeSummary(value: unknown): string {
  if (value == null) {
    return String(value);
  }
  if (typeof value === "string") {
    return `string(len=${value.length})`;
  }
  if (Array.isArray(value)) {
    return `array(len=${value.length})`;
  }
  if (typeof value === "object") {
    return `object(keys=${Object.keys(value as object).join(",")})`;
  }
  return typeof value;
}
