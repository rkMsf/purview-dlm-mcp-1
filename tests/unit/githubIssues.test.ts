// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import { describe, test, expect } from "vitest";
import { buildIssueBody, categoryToLabels } from "../../src/github/issues.js";
import type { LogEntry } from "../../src/logger.js";

describe("buildIssueBody", () => {
  const baseParams = {
    title: "Test issue",
    description: "Something is broken",
    category: "retention-policy",
  };

  test("empty log produces valid markdown with no-commands message", () => {
    const body = buildIssueBody(baseParams, [], null);
    expect(body).toContain("## Description");
    expect(body).toContain("Something is broken");
    expect(body).toContain("No commands were executed in this session.");
    expect(body).toContain("Created via Purview DLM Diagnostics MCP");
  });

  test("populated log includes command table rows", () => {
    const entries: LogEntry[] = [
      { timestamp: "2026-01-01T00:00:00Z", command: "Get-Mailbox -Identity user@example.com", success: true, output: "some output", durationMs: 1200 },
      { timestamp: "2026-01-01T00:00:02Z", command: "Get-RetentionCompliancePolicy", success: false, output: "", error: "Not found", durationMs: 500 },
    ];
    const body = buildIssueBody(baseParams, entries, null);
    expect(body).toContain("| 1 |");
    expect(body).toContain("| 2 |");
    expect(body).toContain("Get-Mailbox");
    expect(body).toContain("✅");
    expect(body).toContain("❌");
    expect(body).toContain("1.2s");
    expect(body).toContain("2 commands, 1 failures");
  });

  test("command outputs are NOT included in issue body (PII protection)", () => {
    const entries: LogEntry[] = [
      { timestamp: "2026-01-01T00:00:00Z", command: "Get-Mailbox", success: true, output: "SensitiveUserData@contoso.com", durationMs: 100 },
    ];
    const body = buildIssueBody(baseParams, entries, null);
    expect(body).not.toContain("SensitiveUserData@contoso.com");
  });

  test("optional fields handled when absent", () => {
    const body = buildIssueBody(baseParams, [], null);
    expect(body).toContain("## Steps to Reproduce\n\nN/A");
    expect(body).toContain("## Environment\n\nNot provided");
  });

  test("optional fields included when provided", () => {
    const params = {
      ...baseParams,
      environment: "Contoso tenant, E5 license",
      stepsToReproduce: "1. Create policy\n2. Wait 24 hours",
    };
    const body = buildIssueBody(params, [], null);
    expect(body).toContain("Contoso tenant, E5 license");
    expect(body).toContain("1. Create policy");
  });

  test("long commands are truncated in table", () => {
    const longCmd = "Get-RetentionCompliancePolicy -Identity " + "A".repeat(100);
    const entries: LogEntry[] = [
      { timestamp: "2026-01-01T00:00:00Z", command: longCmd, success: true, output: "", durationMs: 100 },
    ];
    const body = buildIssueBody(baseParams, entries, null);
    expect(body).toContain("...");
    // The full long command should not appear
    expect(body).not.toContain("A".repeat(100));
  });

  test("pipe characters in commands are escaped for markdown table", () => {
    const entries: LogEntry[] = [
      { timestamp: "2026-01-01T00:00:00Z", command: "Get-Mailbox | FL", success: true, output: "", durationMs: 100 },
    ];
    const body = buildIssueBody(baseParams, entries, null);
    expect(body).toContain("Get-Mailbox \\| FL");
  });
});

describe("categoryToLabels", () => {
  test("known categories return labels", () => {
    expect(categoryToLabels("retention-policy")).toEqual(["area:retention-policy"]);
    expect(categoryToLabels("archive")).toEqual(["area:archive"]);
    expect(categoryToLabels("ediscovery")).toEqual(["area:ediscovery"]);
  });

  test("other category returns empty labels", () => {
    expect(categoryToLabels("other")).toEqual([]);
  });

  test("unknown category returns empty labels", () => {
    expect(categoryToLabels("nonexistent")).toEqual([]);
  });
});
