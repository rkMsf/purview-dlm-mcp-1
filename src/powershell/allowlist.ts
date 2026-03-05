// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

/** Explicitly allowed cmdlets (read-only diagnostic commands). */
export const allowedCmdlets = new Set([
  // Security & Compliance (IPPSSession)
  "get-retentioncompliancepolicy",
  "get-retentioncompliancerule",
  "get-adaptivescope",
  "get-compliancetag",

  // Exchange Online
  "get-mailbox",
  "get-recipient",
  "get-mailboxstatistics",
  "get-mailboxfolderstatistics",
  "get-retentionpolicy",
  "get-retentionpolicytag",
  "get-mailboxplan",
  "get-organizationconfig",
  "get-moverequest",
  "get-unifiedgroup",
  "get-user",
  "test-archiveconnectivity",
  "export-mailboxdiagnosticlogs",
]);

/** Verb prefixes that are NEVER allowed (mutating cmdlets). */
const blockedPrefixes = [
  "set-",
  "new-",
  "remove-",
  "enable-",
  "start-",
  "disable-",
  "stop-",
  "invoke-",
  "add-",
  "clear-",
  "uninstall-",
  "update-",
  "register-",
  "revoke-",
  "grant-",
];

/** PowerShell built-in / formatting cmdlets that are always safe. */
const safeBuiltins = new Set([
  "write-host",
  "write-output",
  "write-warning",
  "write-error",
  "select-object",
  "where-object",
  "foreach-object",
  "format-table",
  "format-list",
  "convertto-json",
  "convertfrom-json",
  "group-object",
  "sort-object",
  "measure-object",
  "out-string",
  "join-string",
  "compare-object",
  "tee-object",
  "get-member",
  "get-date",
  "get-childitem",
]);

/** Regex matching Verb-Noun cmdlet patterns. */
const cmdletPattern = /\b([A-Z][a-z]+-[A-Z][A-Za-z]+)\b/g;

export interface ValidationResult {
  valid: boolean;
  violation?: string;
}

/**
 * Validate a PowerShell command string against the allowlist.
 * Returns { valid: true } when safe, or { valid: false, violation } when blocked.
 */
export function validateCommand(command: string): ValidationResult {
  const matches = command.matchAll(cmdletPattern);

  for (const match of matches) {
    const cmdlet = match[1];
    const cmdletLower = cmdlet.toLowerCase();

    // Connection cmdlets are only used during init, never from user code
    if (cmdletLower === "connect-exchangeonline" || cmdletLower === "connect-ippssession") {
      continue;
    }

    // Check blocked prefixes first (fast-fail)
    for (const prefix of blockedPrefixes) {
      if (cmdletLower.startsWith(prefix)) {
        return {
          valid: false,
          violation: `Blocked cmdlet: ${cmdlet} \u2014 ${prefix.charAt(0).toUpperCase() + prefix.slice(1)}* cmdlets are not allowed`,
        };
      }
    }

    // Must be in the explicit allowlist or safe builtins
    if (!allowedCmdlets.has(cmdletLower) && !safeBuiltins.has(cmdletLower)) {
      return {
        valid: false,
        violation: `Unknown cmdlet: ${cmdlet} \u2014 not in the allowlist`,
      };
    }
  }

  return { valid: true };
}
