// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import { describe, test, expect } from "vitest";
import { ExecutionLog } from "../../src/logger.js";

describe("ExecutionLog", () => {
  test("starts empty", () => {
    const log = new ExecutionLog();
    expect(log.count()).toBe(0);
    expect(log.getAll()).toHaveLength(0);
  });

  test("append increments count", () => {
    const log = new ExecutionLog();
    log.append({
      timestamp: new Date().toISOString(),
      command: "Get-Mailbox",
      success: true,
      output: "test output",
      durationMs: 100,
    });
    expect(log.count()).toBe(1);
  });

  test("toMarkdown returns empty message when no entries", () => {
    const log = new ExecutionLog();
    const md = log.toMarkdown();
    expect(md).toContain("No commands have been executed yet");
  });

  test("toMarkdown includes command details", () => {
    const log = new ExecutionLog();
    log.append({
      timestamp: "2024-01-01T00:00:00Z",
      command: "Get-Mailbox -ResultSize 1",
      success: true,
      output: "some output",
      durationMs: 250,
    });
    const md = log.toMarkdown();
    expect(md).toContain("# Execution Log");
    expect(md).toContain("Total commands:** 1");
    expect(md).toContain("Get-Mailbox -ResultSize 1");
    expect(md).toContain("250 ms");
    expect(md).toContain("some output");
  });

  test("toMarkdown shows failures", () => {
    const log = new ExecutionLog();
    log.append({
      timestamp: "2024-01-01T00:00:00Z",
      command: "Set-Mailbox",
      success: false,
      output: "",
      error: "Blocked cmdlet",
      durationMs: 5,
    });
    const md = log.toMarkdown();
    expect(md).toContain("\u274C");
    expect(md).toContain("Blocked cmdlet");
    expect(md).toContain("Failures:** 1");
  });
});
