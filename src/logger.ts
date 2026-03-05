// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

/** A single entry in the execution log. */
export interface LogEntry {
  timestamp: string;
  command: string;
  success: boolean;
  output: string;
  error?: string;
  durationMs: number;
}

/** In-memory log of every PowerShell command executed during this MCP session. */
export class ExecutionLog {
  private entries: LogEntry[] = [];

  append(entry: LogEntry): void {
    this.entries.push(entry);
  }

  getAll(): readonly LogEntry[] {
    return this.entries;
  }

  count(): number {
    return this.entries.length;
  }

  /** Render the full session log as Markdown. */
  toMarkdown(): string {
    if (this.entries.length === 0) {
      return "# Execution Log\n\nNo commands have been executed yet.";
    }

    const lines: string[] = [];
    lines.push("# Execution Log\n");
    lines.push(`**Total commands:** ${this.entries.length}`);
    lines.push(`**Failures:** ${this.entries.filter((e) => !e.success).length}\n`);

    for (let i = 0; i < this.entries.length; i++) {
      const e = this.entries[i];
      const icon = e.success ? "\u2705" : "\u274C";
      lines.push(`## ${icon} Command ${i + 1} \u2014 ${e.timestamp}`);
      lines.push("");
      lines.push("```powershell");
      lines.push(e.command);
      lines.push("```");
      lines.push("");
      lines.push(`**Duration:** ${e.durationMs} ms`);
      lines.push("");

      if (e.success) {
        lines.push("**Output:**");
        lines.push("```");
        lines.push(!e.output ? "(no output)" : e.output);
        lines.push("```");
      } else {
        lines.push(`**Error:** ${e.error ?? "unknown error"}`);
        if (e.output) {
          lines.push("```");
          lines.push(e.output);
          lines.push("```");
        }
      }

      lines.push("");
      lines.push("---");
      lines.push("");
    }

    return lines.join("\n");
  }
}
