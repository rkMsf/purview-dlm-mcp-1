// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

/** Escape a string for safe use inside a PowerShell single-quoted string. */
export function escapeForPs(input: string): string {
  return input.replace(/'/g, "''");
}

/** Try to parse a string as JSON. Returns undefined on failure. */
export function tryParseJson<T>(text: string): T | undefined {
  try {
    return JSON.parse(text) as T;
  } catch {
    return undefined;
  }
}

/** Truncate a string for display if it exceeds maxLen characters. */
export function truncate(text: string, maxLen = 500): string {
  if (text.length <= maxLen) return text;
  return text.slice(0, maxLen) + "\u2026 (truncated)";
}
