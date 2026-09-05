import { spawnSync } from "child_process";
import os from "os";

const DEFAULT_DISTRO = "OpenTerminal-AI";
const DEFAULT_WINDOWS_WORKSPACE = "B:\\Artificial Intelligence Workspace";
const DEFAULT_RUNNER = "/usr/local/bin/hackerai-command-isolated";

export interface IsolatedCommandPayload {
  command: string;
  cwd: string;
  env?: Record<string, string>;
  timeoutMs: number;
  background: boolean;
  commandId?: string;
}

export function isWslIsolationEnabled(): boolean {
  if (process.platform !== "win32") return false;
  // This fork is fail-closed on Windows. An explicit environment override is
  // intentionally required to restore upstream direct-host execution.
  return process.env.HACKERAI_ALLOW_UNISOLATED_LOCAL !== "1";
}

export function getWslDistro(): string {
  return process.env.HACKERAI_WSL_DISTRO?.trim() || DEFAULT_DISTRO;
}

export function getWindowsWorkspace(): string {
  return (
    process.env.HACKERAI_WINDOWS_WORKSPACE?.trim() ||
    DEFAULT_WINDOWS_WORKSPACE
  );
}

export function getIsolatedRunner(): string {
  return process.env.HACKERAI_WSL_RUNNER?.trim() || DEFAULT_RUNNER;
}

function slash(value: string): string {
  return value.replace(/\\/g, "/").replace(/\/+$/, "");
}

export function mapCwdToWorkspace(cwd?: string): string {
  if (!cwd || !cwd.trim()) return "/workspace";

  const requested = slash(cwd.trim());
  const windowsWorkspace = slash(getWindowsWorkspace());

  if (/^[A-Za-z]:\//.test(requested)) {
    const requestedLower = requested.toLowerCase();
    const workspaceLower = windowsWorkspace.toLowerCase();
    if (requestedLower === workspaceLower) return "/workspace";
    if (requestedLower.startsWith(`${workspaceLower}/`)) {
      return `/workspace${requested.slice(windowsWorkspace.length)}`;
    }
    throw new Error(
      `Blocked cwd outside isolated workspace: ${cwd}. Only ${getWindowsWorkspace()} is exposed to HackerAI.`,
    );
  }

  if (requested === "/workspace" || requested.startsWith("/workspace/")) {
    return requested;
  }

  throw new Error(
    `Blocked cwd outside isolated workspace: ${cwd}. Use /workspace or a path beneath it.`,
  );
}

export function makeIsolatedPayload(args: {
  command: string;
  cwd?: string;
  env?: Record<string, string>;
  timeoutMs?: number;
  background?: boolean;
  commandId?: string;
}): IsolatedCommandPayload {
  const requestedTimeout = args.timeoutMs ?? 30_000;
  // Old OpenTerminal isolation allowed at most 30 minutes. Keep the same hard
  // ceiling so an abandoned WSL command cannot live forever after cancellation.
  const timeoutMs =
    requestedTimeout <= 0
      ? 30 * 60 * 1000
      : Math.min(requestedTimeout, 30 * 60 * 1000);

  return {
    command: args.command,
    cwd: mapCwdToWorkspace(args.cwd),
    env: args.env,
    timeoutMs,
    background: args.background ?? false,
    commandId: args.commandId,
  };
}

export function getIsolatedSpawnSpec(): { command: string; args: string[] } {
  return {
    command: "wsl.exe",
    args: [
      "-d",
      getWslDistro(),
      "-u",
      "aiuser",
      "--",
      getIsolatedRunner(),
    ],
  };
}

export function verifyWslIsolation(): void {
  const result = spawnSync(
    "wsl.exe",
    [
      "-d",
      getWslDistro(),
      "-u",
      "aiuser",
      "--",
      getIsolatedRunner(),
      "--self-test",
    ],
    {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
      windowsHide: true,
      timeout: 20_000,
    },
  );

  const output = `${result.stdout ?? ""}\n${result.stderr ?? ""}`;
  if (
    result.error ||
    result.status !== 0 ||
    !output.includes("HACKERAI_ISOLATION_TEST_OK")
  ) {
    const detail = result.error?.message || output.trim() || `exit ${result.status}`;
    throw new Error(
      `WSL/Bubblewrap isolation is not ready (${detail}). Run Setup-HackerAI-WSL-Isolation.ps1 from the HackerAI folder.`,
    );
  }
}

export function getIsolatedOsInfo(): {
  platform: string;
  arch: string;
  release: string;
  hostname: string;
} {
  return {
    platform: "linux",
    arch: os.arch(),
    release: "WSL2 Bubblewrap isolated",
    hostname: `${os.hostname()}-isolated`,
  };
}
