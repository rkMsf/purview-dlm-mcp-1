// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

function parsePositiveInt(envVar: string, defaultValue: number): number {
  const env = process.env[envVar];
  if (env !== undefined) {
    const value = parseInt(env, 10);
    if (!isNaN(value) && value > 0) return value;
  }
  return defaultValue;
}

/** Default timeout (ms) for PowerShell commands executed via run_powershell. */
export const COMMAND_TIMEOUT_MS = parsePositiveInt("DLM_COMMAND_TIMEOUT_MS", 180_000);
