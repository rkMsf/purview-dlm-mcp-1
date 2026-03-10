// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import { describe, test, expect, vi, beforeEach, afterEach } from "vitest";
import { GitHubAuth } from "../../src/github/auth.js";
import * as childProcess from "child_process";

// Mock child_process.execFile for gh CLI tests
vi.mock("child_process", async () => {
  const actual = await vi.importActual<typeof childProcess>("child_process");
  return { ...actual, execFile: vi.fn() };
});

const execFileMock = vi.mocked(childProcess.execFile);

/** Make execFileMock behave like `gh` is not installed (ENOENT). */
function mockGhNotInstalled() {
  execFileMock.mockImplementation((_cmd, _args, _opts, _cb?) => {
    const cb = typeof _opts === "function" ? _opts : _cb;
    const err = new Error("spawn gh ENOENT") as NodeJS.ErrnoException;
    err.code = "ENOENT";
    if (cb) cb(err, "", "");
    return undefined as never;
  });
}

/** Make execFileMock return a token from `gh auth token`. */
function mockGhReturnsToken(token: string) {
  execFileMock.mockImplementation((_cmd, _args, _opts, _cb?) => {
    const cb = typeof _opts === "function" ? _opts : _cb;
    if (cb) cb(null, token + "\n", "");
    return undefined as never;
  });
}

/** Make execFileMock simulate `gh auth token` failing (non-zero exit). */
function mockGhAuthFails() {
  execFileMock.mockImplementation((_cmd, _args, _opts, _cb?) => {
    const cb = typeof _opts === "function" ? _opts : _cb;
    const err = new Error("gh: not logged in") as NodeJS.ErrnoException;
    err.code = "1";
    if (cb) cb(err, "", "");
    return undefined as never;
  });
}

describe("GitHubAuth", () => {
  const originalEnv = process.env["DLM_GITHUB_TOKEN"];

  beforeEach(() => {
    execFileMock.mockReset();
    delete process.env["DLM_GITHUB_TOKEN"];
    mockGhNotInstalled(); // Default: gh not available
  });

  afterEach(() => {
    if (originalEnv !== undefined) {
      process.env["DLM_GITHUB_TOKEN"] = originalEnv;
    } else {
      delete process.env["DLM_GITHUB_TOKEN"];
    }
  });

  // --- Priority chain tests ---

  describe("env var (DLM_GITHUB_TOKEN)", () => {
    test("returns token from env var without calling gh CLI", async () => {
      process.env["DLM_GITHUB_TOKEN"] = "ghp_envtoken123";

      const auth = new GitHubAuth();
      const token = await auth.getToken();

      expect(token).toBe("ghp_envtoken123");
      expect(auth.isAuthenticated).toBe(true);
      expect(execFileMock).not.toHaveBeenCalled();
    });

    test("trims whitespace from env var", async () => {
      process.env["DLM_GITHUB_TOKEN"] = "  ghp_trimmed  \n";

      const auth = new GitHubAuth();
      const token = await auth.getToken();

      expect(token).toBe("ghp_trimmed");
    });

    test("skips empty env var and falls through", async () => {
      process.env["DLM_GITHUB_TOKEN"] = "   ";
      mockGhReturnsToken("gho_fromcli");

      const auth = new GitHubAuth();
      const token = await auth.getToken();

      expect(token).toBe("gho_fromcli");
    });
  });

  describe("gh CLI (gh auth token)", () => {
    test("returns token from gh CLI", async () => {
      mockGhReturnsToken("gho_clitoken456");

      const auth = new GitHubAuth();
      const token = await auth.getToken();

      expect(token).toBe("gho_clitoken456");
      expect(auth.isAuthenticated).toBe(true);
    });

    test("throws when gh is not installed", async () => {
      mockGhNotInstalled();

      const auth = new GitHubAuth();
      await expect(auth.getToken()).rejects.toThrow(/DLM_GITHUB_TOKEN|gh auth login/);
    });

    test("throws when gh auth fails", async () => {
      mockGhAuthFails();

      const auth = new GitHubAuth();
      await expect(auth.getToken()).rejects.toThrow(/DLM_GITHUB_TOKEN|gh auth login/);
    });
  });

  describe("priority ordering", () => {
    test("env var beats gh CLI", async () => {
      process.env["DLM_GITHUB_TOKEN"] = "ghp_envwins";
      mockGhReturnsToken("gho_cliloses");

      const auth = new GitHubAuth();
      const token = await auth.getToken();

      expect(token).toBe("ghp_envwins");
      expect(execFileMock).not.toHaveBeenCalled();
    });
  });

  describe("token caching", () => {
    test("token is cached on second call", async () => {
      process.env["DLM_GITHUB_TOKEN"] = "ghp_cached";

      const auth = new GitHubAuth();
      const token1 = await auth.getToken();
      const token2 = await auth.getToken();

      expect(token1).toBe("ghp_cached");
      expect(token2).toBe("ghp_cached");
    });
  });
});
