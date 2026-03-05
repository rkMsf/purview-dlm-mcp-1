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
  const server = new McpServer({
    name: "dlm-diagnostics",
    version: "2.0.0",
  });

  // ─── Tool: run_powershell ───

  server.tool(
    "run_powershell",
    "Execute a read-only PowerShell command against Exchange Online and Security & Compliance sessions. " +
      "Only allowlisted cmdlets are permitted (Get-*, Test-*, Export-*). " +
      "Pipeline/formatting cmdlets (Select-Object, Where-Object, ForEach-Object, ConvertTo-Json, etc.) are also allowed. " +
      "All Set-*, New-*, Remove-*, Enable-*, Start-*, Invoke-* cmdlets are BLOCKED. " +
      "Every command and its result are logged for the session. " +
      "Returns JSON with { success, output, error, durationMs, logIndex }.",
    { command: z.string().describe("The PowerShell command to execute.") },
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
    "Retrieve the full execution log of all PowerShell commands run during this session. " +
      "Returns a Markdown-formatted log with timestamps, commands, outputs, errors, and durations. " +
      "Useful for reviewing the diagnostic trail, auditing, or summarizing an investigation.",
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
    "Look up Microsoft Purview documentation on Microsoft Learn. " +
      "Use this tool when the user's question is about 'how to' configure, set up, or understand a Purview feature " +
      "and does NOT match a diagnostic symptom handled by run_powershell. " +
      "Covers: retention policies, retention labels, archive mailboxes, inactive mailboxes, eDiscovery, " +
      "audit log, communication compliance, information barriers, insider risk management, records management, " +
      "and adaptive scopes. Returns relevant Microsoft Learn links and step-by-step guidance.",
    { question: z.string().describe("The user's question or topic to look up.") },
    async ({ question }) => {
      const matches = lookup(question);
      return {
        content: [{ type: "text" as const, text: formatResponse(matches) }],
      };
    },
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
