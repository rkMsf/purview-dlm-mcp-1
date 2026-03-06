#!/usr/bin/env node
// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { PsExecutor } from "./powershell/executor.js";
import { ExecutionLog } from "./logger.js";
import { lookup, formatResponse } from "./asklearn.js";

async function main(): Promise<void> {
  process.stderr.write("[DLM Diagnostics MCP] Starting\u2026\n");

  // Create singletons
  const log = new ExecutionLog();
  const executor = new PsExecutor();

  // Create MCP server
  const server = new McpServer(
    { name: "dlm-diagnostics", version: "2.0.0" },
    {
      instructions:
        "You are a Purview DLM diagnostic assistant with 3 tools.\n\n" +
        "TOOL SELECTION RULES:\n" +
        "1. User reports a PROBLEM, ERROR, or SYMPTOM → use `run_powershell` to investigate.\n" +
        "2. User asks a HOW-TO or WHAT-IS question → use `ask_learn`.\n" +
        "3. User asks to review/audit/summarize commands already run → use `get_execution_log`.\n\n" +
        "Default to `run_powershell` for anything that sounds like troubleshooting.",
    },
  );

  // ─── Tool: run_powershell ───

  server.tool(
    "run_powershell",
    "Diagnose Purview DLM issues by running read-only PowerShell commands against Exchange Online. " +
      "USE THIS TOOL WHEN: the user reports a problem, error, or unexpected behavior — " +
      "e.g., retention policy not applying, items not archiving, mailbox not becoming inactive, " +
      "policy stuck in Error, Teams messages not deleting, SubstrateHolds growing. " +
      "Examples: Get-RetentionCompliancePolicy, Get-Mailbox, Get-MailboxStatistics, Get-ComplianceTag. " +
      "Only Get-*/Test-*/Export-* cmdlets are allowed; mutating commands are blocked. " +
      "Returns JSON: { success, output, error, durationMs, logIndex }.",
    { command: z.string().describe("The PowerShell cmdlet to execute (e.g., 'Get-RetentionCompliancePolicy \"PolicyName\" | FL').") },
    async ({ command }) => {
      const start = Date.now();
      const result = await executor.execute(command);
      const durationMs = Date.now() - start;

      log.append({
        timestamp: new Date().toISOString(),
        command,
        success: result.success,
        output: result.output,
        error: result.error,
        durationMs,
      });

      const response = {
        success: result.success,
        output: result.output,
        error: result.error ?? null,
        durationMs,
        logIndex: log.count(),
      };

      return {
        content: [{ type: "text" as const, text: JSON.stringify(response, null, 2) }],
      };
    },
  );

  // ─── Tool: get_execution_log ───

  server.tool(
    "get_execution_log",
    "Review the audit trail of all PowerShell commands run in this session. " +
      "USE THIS TOOL WHEN: the user asks to review, audit, or summarize the investigation so far. " +
      "Returns Markdown with timestamps, commands, outputs, errors, and durations. " +
      "Do NOT use this for running new diagnostics — use run_powershell instead.",
    {},
    async () => {
      return {
        content: [{ type: "text" as const, text: log.toMarkdown() }],
      };
    },
  );

  // ─── Tool: ask_learn ───

  server.tool(
    "ask_learn",
    "Look up Microsoft Purview documentation from Microsoft Learn. " +
      "USE THIS TOOL WHEN: the user asks a how-to, setup, or conceptual question — " +
      "e.g., 'how do I create a retention policy', 'what is eDiscovery', 'how do adaptive scopes work'. " +
      "Do NOT use this for troubleshooting active issues — use run_powershell instead. " +
      "Covers: retention policies, retention labels, archive mailboxes, inactive mailboxes, " +
      "eDiscovery, audit log, communication compliance, information barriers, " +
      "insider risk management, records management, and adaptive scopes.",
    { question: z.string().describe("The user's how-to or conceptual question about a Purview feature.") },
    async ({ question }) => {
      const matches = lookup(question);
      return {
        content: [{ type: "text" as const, text: formatResponse(matches) }],
      };
    },
  );

  // ─── Prompt: diagnose ───

  server.prompt(
    "diagnose",
    "Start a DLM diagnostic investigation.",
    { symptom: z.string().describe("The reported symptom or question.") },
    async ({ symptom }) => ({
      messages: [
        {
          role: "user" as const,
          content: {
            type: "text" as const,
            text: `Investigate this DLM issue: ${symptom}\n\nUse run_powershell for diagnostic commands. Use get_execution_log at the end for the audit trail.`,
          },
        },
      ],
    }),
  );

  // Connect stdio transport BEFORE background PS init
  const transport = new StdioServerTransport();
  await server.connect(transport);

  process.stderr.write("[DLM Diagnostics MCP] Server running \u2713\n");

  // Initialize PowerShell sessions in the background
  executor.init().catch((ex) => {
    process.stderr.write(`[DLM Diagnostics MCP] Failed to initialize PowerShell sessions: ${ex}\n`);
    process.stderr.write("[DLM Diagnostics MCP] Commands will fail until sessions connect.\n");
  });
}

main().catch((err) => {
  process.stderr.write(`[DLM Diagnostics MCP] Fatal error: ${err}\n`);
  process.exit(1);
});
