// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import type { LogEntry } from "../logger.js";

/** Parameters for building a GitHub issue body. */
export interface IssueParams {
  title: string;
  description: string;
  category: string;
  environment?: string;
  stepsToReproduce?: string;
}

/** Result from creating a GitHub issue. */
export interface CreateIssueResult {
  url: string;
  number: number;
}

/**
 * Build a structured markdown issue body.
 * Includes session diagnostic context (command names, status, duration)
 * but deliberately excludes raw command outputs to avoid PII leakage.
 */
export function buildIssueBody(
  params: IssueParams,
  sessionLog: readonly LogEntry[],
  _diagnosticSummary: string | null,
): string {
  const sections: string[] = [];

  sections.push(`## Description\n\n${params.description}`);
  sections.push(`## Category\n\n${params.category}`);

  sections.push(
    `## Steps to Reproduce\n\n${params.stepsToReproduce || "N/A"}`,
  );

  sections.push(
    `## Environment\n\n${params.environment || "Not provided"}`,
  );

  // Session diagnostic context — command names + status only, no outputs
  sections.push(buildSessionContext(sessionLog));

  sections.push("---\n*Created via Purview DLM Diagnostics MCP*");

  return sections.join("\n\n");
}

function buildSessionContext(sessionLog: readonly LogEntry[]): string {
  const lines: string[] = [];
  lines.push("## Session Diagnostic Context");
  lines.push("");

  if (sessionLog.length === 0) {
    lines.push("No commands were executed in this session.");
    return lines.join("\n");
  }

  lines.push("| # | Command | Status | Duration |");
  lines.push("|---|---------|--------|----------|");

  for (let i = 0; i < sessionLog.length; i++) {
    const entry = sessionLog[i];
    const cmd = truncateCommand(entry.command, 80);
    const status = entry.success ? "✅" : "❌";
    const duration = `${(entry.durationMs / 1000).toFixed(1)}s`;
    lines.push(`| ${i + 1} | ${cmd} | ${status} | ${duration} |`);
  }

  const failures = sessionLog.filter((e) => !e.success).length;
  lines.push("");
  lines.push(`Summary: ${sessionLog.length} commands, ${failures} failures`);

  return lines.join("\n");
}

function truncateCommand(command: string, maxLen: number): string {
  // Replace pipe characters with unicode to avoid breaking markdown tables
  const sanitized = command.replace(/\|/g, "\\|");
  if (sanitized.length <= maxLen) return sanitized;
  return sanitized.slice(0, maxLen - 3) + "...";
}

/** Map issue category to GitHub labels. */
export function categoryToLabels(category: string): string[] {
  const map: Record<string, string[]> = {
    "retention-policy": ["area:retention-policy"],
    "retention-label": ["area:retention-label"],
    archive: ["area:archive"],
    "inactive-mailbox": ["area:inactive-mailbox"],
    ediscovery: ["area:ediscovery"],
    "audit-log": ["area:audit-log"],
    other: [],
  };
  return map[category] ?? [];
}

/** Create a GitHub issue via the REST API. */
export async function createGitHubIssue(
  token: string,
  owner: string,
  repo: string,
  title: string,
  body: string,
  labels: string[],
): Promise<CreateIssueResult> {
  const url = `https://api.github.com/repos/${owner}/${repo}/issues`;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "X-GitHub-Api-Version": "2022-11-28",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ title, body, labels }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`GitHub issue creation failed (${res.status}): ${text}`);
  }

  const data = (await res.json()) as { html_url: string; number: number };
  return { url: data.html_url, number: data.number };
}
