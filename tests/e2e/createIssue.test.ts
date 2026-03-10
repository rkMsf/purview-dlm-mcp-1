// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import { execFileSync } from "child_process";
import { test, expect, beforeAll, afterAll } from "vitest";
import { startServer, stopServer, getClient } from "./fixtures/mcpServerFixture.js";

beforeAll(async () => {
  await startServer();
}, 300_000);

afterAll(async () => {
  await stopServer();
});

// --- Schema Discovery ---

test("create_issue has correct schema", async () => {
  const result = await getClient().listTools();
  const tool = result.tools.find((t) => t.name === "create_issue");
  expect(tool).toBeDefined();

  const props = tool!.inputSchema.properties as Record<string, { type?: string }>;
  expect(props["title"]).toBeDefined();
  expect(props["description"]).toBeDefined();
  expect(props["category"]).toBeDefined();
  expect(props["environment"]).toBeDefined();
  expect(props["stepsToReproduce"]).toBeDefined();

  const required = tool!.inputSchema.required as string[];
  expect(required).toContain("title");
  expect(required).toContain("description");
  expect(required).toContain("category");
  expect(required).not.toContain("environment");
  expect(required).not.toContain("stepsToReproduce");
});

// --- Validation ---

test("create_issue rejects missing required params", async () => {
  const result = await getClient().callTool({
    name: "create_issue",
    arguments: {},
  });
  expect(result.isError).toBe(true);
  const text = (result.content as Array<{ type: string; text: string }>).find((c) => c.type === "text")?.text ?? "";
  expect(text.toLowerCase()).toContain("required");
});

// --- Real GitHub API ---

test("create_issue creates a real issue and returns URL + number", async () => {
  // Skip if gh CLI is not authenticated
  let ghToken: string;
  try {
    ghToken = execFileSync("gh", ["auth", "token"], { timeout: 10_000 }).toString().trim();
  } catch {
    console.warn("Skipping create_issue e2e: gh CLI not authenticated (run 'gh auth login')");
    return;
  }
  if (!ghToken) {
    console.warn("Skipping create_issue e2e: gh auth token returned empty");
    return;
  }

  const owner = process.env["DLM_GITHUB_OWNER"] ?? "microsoft";
  const repo = process.env["DLM_GITHUB_REPO"] ?? "purview-dlm-mcp";

  const result = await getClient().callTool({
    name: "create_issue",
    arguments: {
      title: "[E2E Test] Automated test issue — safe to close",
      description: "This issue was created by an automated e2e test. It will be closed immediately.",
      category: "other",
    },
  });

  expect(result.isError).toBeFalsy();

  const text = (result.content as Array<{ type: string; text: string }>)
    .find((c) => c.type === "text")?.text ?? "";
  const parsed = JSON.parse(text);

  expect(parsed.issueUrl).toMatch(/github\.com/);
  expect(typeof parsed.issueNumber).toBe("number");

  // Cleanup: close the issue via gh CLI
  execFileSync("gh", ["issue", "close", String(parsed.issueNumber),
    "--repo", `${owner}/${repo}`], { timeout: 10_000 });
}, 30_000);

// --- Validation ---

test("create_issue rejects invalid category", async () => {
  const result = await getClient().callTool({
    name: "create_issue",
    arguments: {
      title: "Test issue",
      description: "Test description",
      category: "invalid-value",
    },
  });
  expect(result.isError).toBe(true);
  const text = (result.content as Array<{ type: string; text: string }>).find((c) => c.type === "text")?.text ?? "";
  // Zod enum validation error mentions the invalid value or expected values
  expect(text).toMatch(/invalid|expected|enum/i);
});
