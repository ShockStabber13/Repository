#!/usr/bin/env node

import { spawn } from "node:child_process";

const localAuthUrl =
  process.env.HACKERAI_LOCAL_AUTH_ISSUER || "http://127.0.0.1:3211";

async function waitForLocalAuth() {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    try {
      const response = await fetch(`${localAuthUrl}/health`);
      if (response.ok) return;
    } catch {
      // Retry while local-auth-server starts.
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(`Local authentication service did not start at ${localAuthUrl}`);
}

await waitForLocalAuth();
console.log("[convex-local] Local authentication is ready; starting Convex.");

const env = {
  ...process.env,
  CONVEX_AGENT_MODE: "anonymous",
  HACKERAI_LOCAL_AUTH: "1",
  HACKERAI_LOCAL_AUTH_ISSUER: localAuthUrl,
  WORKOS_CLIENT_ID:
    process.env.WORKOS_CLIENT_ID || "local_hackerai_not_used",
  WORKOS_AUTH_DOMAIN: process.env.WORKOS_AUTH_DOMAIN || "api.workos.com",
};

let command;
let args;
if (process.platform === "win32") {
  command = process.env.ComSpec?.trim() || process.env.COMSPEC?.trim() || "cmd.exe";
  args = ["/d", "/s", "/c", "corepack.cmd pnpm exec convex dev"];
} else {
  command = "corepack";
  args = ["pnpm", "exec", "convex", "dev"];
}

const child = spawn(command, args, { stdio: "inherit", env });
child.on("error", (error) => {
  console.error(`[convex-local] Failed to start Convex: ${error.message}`);
  process.exit(1);
});
child.on("exit", (code, signal) => {
  if (signal) process.exit(1);
  process.exit(code ?? 0);
});

const forward = (signal) => {
  if (child.exitCode === null) child.kill(signal);
};
process.on("SIGINT", () => forward("SIGINT"));
process.on("SIGTERM", () => forward("SIGTERM"));
