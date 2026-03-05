// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { resolve, join } from "path";

const SERVER_ENTRY = resolve(join(import.meta.dirname!, "..", "..", "..", "dist", "index.js"));

let client: Client | null = null;
let transport: StdioClientTransport | null = null;

export async function startServer(): Promise<Client> {
  if (client) return client;

  const envVars: Record<string, string> = {};
  for (const key of ["DLM_UPN", "DLM_ORGANIZATION", "DLM_COMMAND_TIMEOUT_MS", "PATH", "USERPROFILE", "HOME", "APPDATA", "LOCALAPPDATA", "PSModulePath"]) {
    const val = process.env[key];
    if (val) envVars[key] = val;
  }

  transport = new StdioClientTransport({
    command: "node",
    args: [SERVER_ENTRY],
    env: envVars,
  });

  client = new Client({ name: "test-client", version: "1.0.0" });
  await client.connect(transport);

  // Wait for PowerShell session to be initialized
  const maxWait = 4.5 * 60 * 1000;
  const pollInterval = 3000;
  const start = Date.now();

  while (Date.now() - start < maxWait) {
    try {
      const probe = await client.callTool({
        name: "run_powershell",
        arguments: { command: "Write-Host 'ready'" },
      });

      const text = (probe.content as Array<{ type: string; text: string }>).find((c) => c.type === "text")?.text;
      if (text) {
        const parsed = JSON.parse(text);
        if (parsed.success) return client;
        if (parsed.error && !parsed.error.includes("not initialized")) break;
      }
    } catch {
      // Server not ready yet
    }

    await new Promise((resolve) => setTimeout(resolve, pollInterval));
  }

  return client;
}

export async function stopServer(): Promise<void> {
  if (transport) {
    await transport.close();
    transport = null;
  }
  client = null;
}

export function getClient(): Client {
  if (!client) throw new Error("MCP client not initialized");
  return client;
}
