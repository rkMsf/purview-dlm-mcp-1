// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import { describe, test, expect } from "vitest";
import { validateCommand, allowedCmdlets } from "../../src/powershell/allowlist.js";

describe("CmdletAllowlist", () => {
  test.each([
    "Get-Mailbox -ResultSize 1",
    "Get-RetentionCompliancePolicy | FL Name",
    "Get-OrganizationConfig | FL AutoExpandingArchiveEnabled",
    "Get-Recipient -ResultSize 1 | FL Name, RecipientType",
    "Get-User -ResultSize 1",
    "Test-ArchiveConnectivity user@example.com",
    "Export-MailboxDiagnosticLogs user@example.com",
    "Get-AdminAuditLogConfig | FL UnifiedAuditLogIngestionEnabled",
    "Get-UnifiedAuditLogRetentionPolicy | FL Name, RetentionDuration",
    "Get-MailboxAuditBypassAssociation -Identity user@example.com",
    "Get-AppRetentionCompliancePolicy -DistributionDetail | FL Name",
    "Get-AppRetentionComplianceRule -Policy TestPolicy | FL Name",
  ])("allows whitelisted cmdlet: %s", (command) => {
    const result = validateCommand(command);
    expect(result.valid).toBe(true);
  });

  test.each([
    "Get-Mailbox | Where-Object {$_.ArchiveStatus -eq 'Active'}",
    "Get-RetentionCompliancePolicy | Select-Object Name | ConvertTo-Json",
    "Get-Mailbox -ResultSize 1 | Format-List DisplayName",
    "Get-RetentionCompliancePolicy | Sort-Object Name | Measure-Object",
  ])("allows safe builtins: %s", (command) => {
    const result = validateCommand(command);
    expect(result.valid).toBe(true);
  });

  test.each([
    ["Set-Mailbox -Identity test", "Set-"],
    ["Remove-RetentionCompliancePolicy -Identity test", "Remove-"],
    ["New-RetentionComplianceRule -Policy test", "New-"],
    ["Start-ManagedFolderAssistant -Identity test", "Start-"],
    ["Invoke-WebRequest -Uri https://example.com", "Invoke-"],
    ["Enable-Mailbox -Identity test", "Enable-"],
    ["Disable-Mailbox -Identity test", "Disable-"],
    ["Add-MailboxPermission -Identity test", "Add-"],
  ] as [string, string][])("blocks mutating cmdlet: %s", (command, expectedPrefix) => {
    const result = validateCommand(command);
    expect(result.valid).toBe(false);
    expect(result.violation).toContain(expectedPrefix);
  });

  test("blocks unknown cmdlet", () => {
    const result = validateCommand("Get-FooBaz");
    expect(result.valid).toBe(false);
    expect(result.violation).toContain("not in the allowlist");
  });

  test("blocks pipeline with blocked cmdlet", () => {
    const result = validateCommand("Get-Mailbox | Set-Mailbox -Name test");
    expect(result.valid).toBe(false);
    expect(result.violation).toContain("Set-");
  });

  test("allows Write-Host and Write-Output", () => {
    expect(validateCommand("Write-Host 'ready'").valid).toBe(true);
    expect(validateCommand("Write-Output 'test'").valid).toBe(true);
  });

  test("allowed cmdlets contains expected count", () => {
    expect(allowedCmdlets.size).toBe(33);
  });
});
