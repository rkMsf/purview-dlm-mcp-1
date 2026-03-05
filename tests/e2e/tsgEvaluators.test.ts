// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import { test, expect, beforeAll, afterAll } from "vitest";
import { startServer, stopServer, getClient } from "./fixtures/mcpServerFixture.js";
import { evaluateTsg, computeSummary, renderMarkdownReport } from "../../src/tsg-diagnostics.js";
import type { TsgCommand, TsgResult } from "../../src/tsg-diagnostics.js";
import { mkdirSync, writeFileSync } from "fs";

let testPolicy = "TestPolicy";
let testAutoApply = "TestAutoApplyPolicy";
let testUPN = "";
let testScope = "TestScope";
let testScopeFilter = "Department -eq ''Test''";
const allResults: TsgResult[] = [];

beforeAll(async () => {
  await startServer();

  testUPN = process.env.DLM_UPN ?? "";

  // Discover test data
  const policies = await runAndExpectSuccess("Get-RetentionCompliancePolicy | Select-Object -First 1 Name | ConvertTo-Json");
  try {
    testPolicy = JSON.parse(policies).Name ?? testPolicy;
  } catch {
    /* use default */
  }

  const autoApply = await runAndExpectSuccess(
    'Get-RetentionCompliancePolicy | Where-Object {$_.Type -eq "ApplyTag"} | Select-Object -First 1 Name | ConvertTo-Json',
  );
  try {
    testAutoApply = JSON.parse(autoApply).Name ?? testAutoApply;
  } catch {
    /* use default */
  }

  const scopes = await runAndExpectSuccess("Get-AdaptiveScope | Select-Object -First 1 Name, FilterQuery | ConvertTo-Json");
  try {
    const scopeData = JSON.parse(scopes);
    testScope = scopeData.Name ?? testScope;
    testScopeFilter = scopeData.FilterQuery ?? testScopeFilter;
  } catch {
    /* use default */
  }
}, 300_000);

afterAll(async () => {
  mkdirSync("test-results", { recursive: true });
  writeFileSync("test-results/tsg-report.json", JSON.stringify(allResults, null, 2));
  writeFileSync("test-results/tsg-report.md", renderMarkdownReport(allResults));
  await stopServer();
});

async function runCommand(command: string) {
  const result = await getClient().callTool({
    name: "run_powershell",
    arguments: { command },
  });
  const text = (result.content as Array<{ type: string; text: string }>).find((c) => c.type === "text")!.text;
  return JSON.parse(text);
}

async function runAndExpectSuccess(command: string): Promise<string> {
  const parsed = await runCommand(command);
  expect(parsed.success).toBe(true);
  return parsed.output;
}

async function runTsgStep(step: string, command: string, commands: TsgCommand[]): Promise<string> {
  const parsed = await runCommand(command);
  commands.push({
    step,
    command,
    success: parsed.success,
    output: parsed.output ?? "",
    durationMs: parsed.durationMs,
  });
  expect(parsed.success).toBe(true);
  return parsed.output;
}

function pushResult(tsgNumber: number, tsg: string, reference: string, commands: TsgCommand[]): void {
  const diagnostics = evaluateTsg(tsgNumber, commands);
  const summary = computeSummary(diagnostics);
  allResults.push({ tsg, tsgNumber, reference, timestamp: new Date().toISOString(), commands, diagnostics, summary });
}

// --- TSG 1: Retention Policy Not Applying ---

test("TSG 1.1 - Policy status and distribution", async () => {
  const commands: TsgCommand[] = [];
  await runTsgStep("1.1", `Get-RetentionCompliancePolicy "${testPolicy}" | FL Name, Enabled, Mode, DistributionStatus`, commands);
});

test("TSG 1.2 - Distribution detail", async () => {
  const commands: TsgCommand[] = [];
  await runTsgStep("1.2", `Get-RetentionCompliancePolicy "${testPolicy}" -DistributionDetail | FL DistributionDetail`, commands);
});

test("TSG 1.3 - Retention rule exists", async () => {
  const commands: TsgCommand[] = [];
  await runTsgStep(
    "1.3",
    `Get-RetentionComplianceRule -Policy "${testPolicy}" | FL Name, RetentionDuration, RetentionComplianceAction`,
    commands,
  );
});

test("TSG 1.4 - Policy scope", async () => {
  const commands: TsgCommand[] = [];
  await runTsgStep(
    "1.4",
    `Get-RetentionCompliancePolicy "${testPolicy}" | FL ExchangeLocation, SharePointLocation, OneDriveLocation, TeamsChannelLocation, AdaptiveScopeLocation`,
    commands,
  );
});

test("TSG 1.5 - Hold stamp and evaluate", async () => {
  const commands: TsgCommand[] = [];
  await runTsgStep("1.1", `Get-RetentionCompliancePolicy "${testPolicy}" | FL Name, Enabled, Mode, DistributionStatus`, commands);
  await runTsgStep("1.2", `Get-RetentionCompliancePolicy "${testPolicy}" -DistributionDetail | FL DistributionDetail`, commands);
  await runTsgStep(
    "1.3",
    `Get-RetentionComplianceRule -Policy "${testPolicy}" | FL Name, RetentionDuration, RetentionComplianceAction`,
    commands,
  );
  await runTsgStep(
    "1.4",
    `Get-RetentionCompliancePolicy "${testPolicy}" | FL ExchangeLocation, SharePointLocation, OneDriveLocation, TeamsChannelLocation, AdaptiveScopeLocation`,
    commands,
  );
  await runTsgStep("1.5", `Get-Mailbox ${testUPN} | FL InPlaceHolds, RetentionPolicy, LitigationHoldEnabled`, commands);
  pushResult(1, "Retention Policy Not Applying", "retention-policy-not-applying.md", commands);
});

// --- TSG 2: Policy Stuck in Error ---

test("TSG 2 - Full evaluation", async () => {
  const commands: TsgCommand[] = [];
  await runTsgStep(
    "2.1",
    `Get-RetentionCompliancePolicy "${testPolicy}" | FL Name, Guid, DistributionStatus, Enabled, WhenChanged`,
    commands,
  );
  await runTsgStep("2.2", `Get-RetentionCompliancePolicy "${testPolicy}" | FL Mode, Type, WhenCreated, WhenChanged`, commands);
  await runTsgStep(
    "2.3",
    `Get-RetentionCompliancePolicy "${testPolicy}" | FL ExchangeLocation, SharePointLocation, TeamsChannelLocation, AdaptiveScopeLocation`,
    commands,
  );
  await runTsgStep(
    "2.4",
    `Get-Recipient -Filter "EmailAddresses -eq 'smtp:${testUPN}'" | FL Name, RecipientType, Guid`,
    commands,
  );
  pushResult(2, "Policy Stuck in Error", "policy-stuck-error.md", commands);
});

// --- TSG 3: Items Not Moving to Archive ---

test("TSG 3 - Full evaluation", async () => {
  const commands: TsgCommand[] = [];
  await runTsgStep(
    "3.1",
    `Get-Mailbox ${testUPN} | FL ArchiveStatus, ArchiveGuid, RetentionPolicy, RetentionHoldEnabled, ElcProcessingDisabled, AccountDisabled, IsShared`,
    commands,
  );
  await runTsgStep(
    "3.2",
    'Get-RetentionPolicyTag | Where-Object {$_.RetentionAction -eq "MoveToArchive"} | FL Name, Type, AgeLimitForRetention, RetentionEnabled',
    commands,
  );
  await runTsgStep(
    "3.3",
    `Get-MailboxPlan (Get-Mailbox ${testUPN}).MailboxPlan | Select-Object -ExpandProperty PersistedCapabilities`,
    commands,
  );
  await runTsgStep("3.4", "Get-OrganizationConfig | FL ElcProcessingDisabled", commands);
  await runTsgStep(
    "3.5",
    `$logs = Export-MailboxDiagnosticLogs ${testUPN} -ExtendedProperties; ([xml]$logs.MailboxLog).Properties.MailboxTable.Property | Where-Object {$_.Name -eq "ELCLastSuccessTimestamp"}`,
    commands,
  );
  await runTsgStep(
    "3.6",
    `Get-MoveRequest ${testUPN} -ErrorAction SilentlyContinue | FL Status, PercentComplete`,
    commands,
  );
  pushResult(3, "Items Not Moving to Archive", "items-not-moving-to-archive.md", commands);
});

// --- TSG 4: Auto-Expanding Archive ---

test("TSG 4 - Full evaluation", async () => {
  const commands: TsgCommand[] = [];
  await runTsgStep("4.1", "Get-OrganizationConfig | FL AutoExpandingArchiveEnabled", commands);
  await runTsgStep(
    "4.2",
    `Get-Mailbox ${testUPN} | FL AutoExpandingArchiveEnabled, ArchiveStatus, ArchiveState, ArchiveGuid, ArchiveQuota, LitigationHoldEnabled`,
    commands,
  );
  await runTsgStep("4.3", `Get-MailboxStatistics ${testUPN} -Archive | FL TotalItemSize, TotalDeletedItemSize`, commands);
  await runTsgStep("4.4", `Get-Mailbox ${testUPN} | Select-Object -ExpandProperty MailboxLocations`, commands);
  await runTsgStep(
    "4.5",
    `Test-ArchiveConnectivity ${testUPN} -IncludeArchiveMRMConfiguration | Select-Object -ExpandProperty Result`,
    commands,
  );
  pushResult(4, "Auto-Expanding Archive", "auto-expanding-archive.md", commands);
});

// --- TSG 5: Inactive Mailbox ---

test("TSG 5 - Full evaluation", async () => {
  const commands: TsgCommand[] = [];
  await runTsgStep(
    "5.1",
    "Get-Mailbox -InactiveMailboxOnly -ResultSize 5 | FL UserPrincipalName, IsInactiveMailbox, InPlaceHolds, LitigationHoldEnabled",
    commands,
  );
  await runTsgStep(
    "5.2",
    "Get-Mailbox -SoftDeletedMailbox -ResultSize 5 | FL UserPrincipalName, WhenSoftDeleted, InPlaceHolds",
    commands,
  );
  await runTsgStep(
    "5.3",
    'Get-RetentionCompliancePolicy | Where-Object {$_.ExchangeLocation -eq "All"} | FL Name, Enabled, Mode',
    commands,
  );
  pushResult(5, "Inactive Mailbox", "inactive-mailbox.md", commands);
});

// --- TSG 6: SubstrateHolds / RI Quota ---

test("TSG 6 - Full evaluation", async () => {
  const commands: TsgCommand[] = [];
  await runTsgStep(
    "6.1",
    `Get-MailboxFolderStatistics ${testUPN} -FolderScope RecoverableItems | FL Name, FolderSize, ItemsInFolder, FolderPath`,
    commands,
  );
  await runTsgStep(
    "6.2",
    `Get-Mailbox ${testUPN} | FL InPlaceHolds, LitigationHoldEnabled, LitigationHoldDuration, ComplianceTagHoldApplied, DelayHoldApplied, DelayReleaseHoldApplied, RetentionHoldEnabled`,
    commands,
  );
  await runTsgStep("6.3", "(Get-OrganizationConfig).InPlaceHolds", commands);
  await runTsgStep(
    "6.4",
    `$logs = Export-MailboxDiagnosticLogs ${testUPN} -ExtendedProperties; ([xml]$logs.MailboxLog).Properties.MailboxTable.Property | Where-Object {$_.Name -eq "DumpsterExpirationLastSuccessRunTimestamp"}`,
    commands,
  );
  await runTsgStep(
    "6.5",
    `$mbx = Get-Mailbox ${testUPN}; $stats = Get-MailboxStatistics ${testUPN}; Write-Host "TotalItemSize: $($stats.TotalItemSize) / ProhibitSendReceiveQuota: $($mbx.ProhibitSendReceiveQuota)"; Write-Host "TotalDeletedItemSize: $($stats.TotalDeletedItemSize) / RecoverableItemsQuota: $($mbx.RecoverableItemsQuota)"`,
    commands,
  );
  pushResult(6, "SubstrateHolds / RI Quota", "substrateholds-quota.md", commands);
});

// --- TSG 7: Teams Messages Not Deleting ---

test("TSG 7 - Full evaluation", async () => {
  const commands: TsgCommand[] = [];
  await runTsgStep(
    "7.1",
    `Get-RetentionCompliancePolicy "${testPolicy}" | FL TeamsChannelLocation, TeamsChatLocation, Enabled, DistributionStatus`,
    commands,
  );
  await runTsgStep(
    "7.2",
    `Get-RetentionComplianceRule -Policy "${testPolicy}" | FL RetentionDuration, RetentionComplianceAction`,
    commands,
  );
  await runTsgStep(
    "7.3",
    `Get-MailboxFolderStatistics ${testUPN} -FolderScope RecoverableItems | Where-Object {$_.Name -eq "SubstrateHolds"} | FL FolderSize, ItemsInFolder`,
    commands,
  );
  await runTsgStep(
    "7.4",
    `Get-Mailbox ${testUPN} | FL InPlaceHolds, LitigationHoldEnabled, ComplianceTagHoldApplied; Get-Mailbox -GroupMailbox -ResultSize 5 | FL DisplayName, InPlaceHolds`,
    commands,
  );
  pushResult(7, "Teams Messages Not Deleting", "teams-messages-not-deleting.md", commands);
});

// --- TSG 8: MRM / Purview Conflict ---

test("TSG 8 - Full evaluation", async () => {
  const commands: TsgCommand[] = [];
  await runTsgStep(
    "8.1",
    `Get-Mailbox ${testUPN} | FL RetentionPolicy, RetentionHoldEnabled, InPlaceHolds, LitigationHoldEnabled, ComplianceTagHoldApplied`,
    commands,
  );
  await runTsgStep(
    "8.2",
    'Get-RetentionPolicyTag | Where-Object {$_.RetentionAction -ne "MoveToArchive"} | FL Name, Type, AgeLimitForRetention, RetentionAction, RetentionEnabled',
    commands,
  );
  await runTsgStep(
    "8.3",
    'Get-RetentionCompliancePolicy | Where-Object {$_.ExchangeLocation -eq "All"} | FL Name, Guid',
    commands,
  );
  await runTsgStep(
    "8.4",
    `(Export-MailboxDiagnosticLogs ${testUPN} -ComponentName TracingFai).MailboxLog | ConvertFrom-Json`,
    commands,
  );
  pushResult(8, "MRM / Purview Conflict", "mrm-purview-conflict.md", commands);
});

// --- TSG 9: Adaptive Scope ---

test("TSG 9 - Full evaluation", async () => {
  const commands: TsgCommand[] = [];
  await runTsgStep(
    "9.1",
    `Get-AdaptiveScope "${testScope}" | FL Name, LocationType, FilterQuery, WhenCreated, WhenChanged`,
    commands,
  );
  await runTsgStep(
    "9.2",
    `Get-Recipient -Filter "${testScopeFilter}" -ResultSize 10 | FL Name, RecipientType, RecipientTypeDetails`,
    commands,
  );
  await runTsgStep(
    "9.3",
    `Get-User -Filter "${testScopeFilter}" -ResultSize 10 | Measure-Object; Get-Recipient -RecipientTypeDetails UserMailbox -Filter "${testScopeFilter}" -ResultSize 10 | Measure-Object`,
    commands,
  );
  await runTsgStep(
    "9.4",
    "Get-RetentionCompliancePolicy | Where-Object {$_.AdaptiveScopeLocation -ne $null} | Select-Object -First 1 Name, DistributionStatus, AdaptiveScopeLocation | FL",
    commands,
  );
  pushResult(9, "Adaptive Scope", "adaptive-scope.md", commands);
});

// --- TSG 10: Auto-Apply Labels ---

test("TSG 10 - Full evaluation", async () => {
  const commands: TsgCommand[] = [];
  await runTsgStep(
    "10.1",
    `Get-RetentionCompliancePolicy "${testAutoApply}" | FL Name, Guid, Enabled, Mode, Type, DistributionStatus, WhenCreated`,
    commands,
  );
  await runTsgStep(
    "10.2",
    `Get-RetentionComplianceRule -Policy "${testAutoApply}" | FL Name, ContentMatchQuery, ContentContainsSensitiveInformation, PublishComplianceTag, RetentionDuration, Mode`,
    commands,
  );
  await runTsgStep(
    "10.3",
    "Get-ComplianceTag | FL Name, Guid, RetentionDuration, RetentionAction, IsRecordLabel",
    commands,
  );
  await runTsgStep(
    "10.4",
    'Get-RetentionCompliancePolicy | Where-Object {$_.Type -eq "ApplyTag"} | Measure-Object',
    commands,
  );
  pushResult(10, "Auto-Apply Labels", "auto-apply-labels.md", commands);
});
