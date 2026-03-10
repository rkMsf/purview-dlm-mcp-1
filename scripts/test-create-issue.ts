// Standalone script to test create_issue end-to-end through the full MCP server.
// Usage: DLM_UPN=<upn> DLM_ORGANIZATION=<org> npx tsx scripts/test-create-issue.ts

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { resolve, join } from "path";
import { fileURLToPath } from "url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const SERVER_ENTRY = resolve(join(__dirname, "..", "dist", "index.js"));

async function main() {
  console.log("Starting MCP server...");

  const envVars: Record<string, string> = {};
  for (const key of [
    "DLM_UPN", "DLM_ORGANIZATION", "DLM_COMMAND_TIMEOUT_MS",
    "DLM_GITHUB_OWNER", "DLM_GITHUB_REPO",
    "PATH", "USERPROFILE", "HOME", "APPDATA", "LOCALAPPDATA", "PSModulePath",
  ]) {
    const val = process.env[key];
    if (val) envVars[key] = val;
  }

  const transport = new StdioClientTransport({
    command: "node",
    args: [SERVER_ENTRY],
    env: envVars,
  });

  const client = new Client({ name: "test-create-issue", version: "1.0.0" });
  await client.connect(transport);
  console.log("MCP server connected.\n");

  // Wait for PS readiness
  console.log("Waiting for PowerShell sessions...");
  const maxWait = 4.5 * 60 * 1000;
  const start = Date.now();
  while (Date.now() - start < maxWait) {
    try {
      const probe = await client.callTool({ name: "run_powershell", arguments: { command: "Write-Host 'ready'" } });
      const text = (probe.content as Array<{ type: string; text: string }>).find((c) => c.type === "text")?.text;
      if (text) {
        const parsed = JSON.parse(text);
        if (parsed.success) { console.log("PowerShell ready.\n"); break; }
        if (parsed.error && !parsed.error.includes("not initialized")) break;
      }
    } catch { /* not ready */ }
    await new Promise((r) => setTimeout(r, 3000));
  }

  // Verify tool discovery
  const tools = await client.listTools();
  const createIssueTool = tools.tools.find((t) => t.name === "create_issue");
  if (!createIssueTool) {
    console.error("ERROR: create_issue tool not found in server!");
    process.exit(1);
  }
  console.log("Tool discovered: create_issue ✓\n");

  // Call create_issue — this will trigger Device Flow auth in your browser
  console.log("Calling create_issue (browser will open for GitHub auth)...\n");
  const result = await client.callTool({
    name: "create_issue",
    arguments: {
      title: "[Test] create_issue MCP server E2E validation",
      description: "Automated test issue created through the full MCP server to verify create_issue works end-to-end. Safe to close.",
      category: "other",
      environment: "E2E test via scripts/test-create-issue.ts",
      stepsToReproduce: "Ran `npx tsx scripts/test-create-issue.ts`",
    },
  });

  const text = (result.content as Array<{ type: string; text: string }>).find((c) => c.type === "text")?.text ?? "";
  console.log("Response:", text);

  if (result.isError) {
    console.error("\nIssue creation failed.");
  } else {
    const parsed = JSON.parse(text);
    console.log(`\nIssue created successfully!`);
    console.log(`  URL:    ${parsed.issueUrl}`);
    console.log(`  Number: #${parsed.issueNumber}`);
  }

  await transport.close();
}

main().catch((err) => {
  console.error("Fatal:", err.message);
  process.exit(1);
});
