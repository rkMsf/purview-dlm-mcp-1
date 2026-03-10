// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import { execFile } from "child_process";

/** Timeout (ms) for the `gh auth token` subprocess. */
const GH_CLI_TIMEOUT_MS = 10_000;

/**
 * GitHub authentication with a priority chain:
 * 1. `DLM_GITHUB_TOKEN` environment variable (direct PAT)
 * 2. `gh auth token` from GitHub CLI (cached credential)
 *
 * Token is cached in-memory for the session.
 */
export class GitHubAuth {
  private token: string | null = null;

  get isAuthenticated(): boolean {
    return this.token !== null;
  }

  /** Returns a cached token, or tries env var → gh CLI to obtain one. */
  async getToken(): Promise<string> {
    if (this.token) return this.token;

    const envToken = this.tryEnvToken();
    if (envToken) {
      this.token = envToken;
      return this.token;
    }

    const cliToken = await this.tryGhCliToken();
    if (cliToken) {
      this.token = cliToken;
      return this.token;
    }

    throw new Error("GitHub authentication failed. Set DLM_GITHUB_TOKEN or run 'gh auth login'.");
  }

  /** Reads `DLM_GITHUB_TOKEN` from the environment. */
  private tryEnvToken(): string | null {
    const value = process.env["DLM_GITHUB_TOKEN"]?.trim();
    return value || null;
  }

  /** Spawns `gh auth token` and returns the token, or null on any error. */
  private async tryGhCliToken(): Promise<string | null> {
    try {
      const stdout = await new Promise<string>((resolve, reject) => {
        execFile("gh", ["auth", "token"], { timeout: GH_CLI_TIMEOUT_MS }, (err, out) => {
          if (err) reject(err);
          else resolve(out);
        });
      });
      const token = stdout.trim();
      return token || null;
    } catch {
      return null;
    }
  }
}
