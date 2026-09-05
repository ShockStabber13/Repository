#!/usr/bin/env node

import { spawn, spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";

const localAuthUrl =
  process.env.HACKERAI_LOCAL_AUTH_ISSUER || "http://127.0.0.1:3211";

const buildPnpmInvocation = (args) => {
  if (process.platform !== "win32") {
    return { command: "pnpm", args };
  }

  const comspec =
    process.env.ComSpec?.trim() || process.env.COMSPEC?.trim() || "cmd.exe";

  return {
    command: comspec,
    args: [
      "/d",
      "/s",
      "/c",
      ["corepack.cmd", "pnpm", ...args].join(" "),
    ],
  };
};

const runPnpm = (args, options = {}) => {
  const invocation = buildPnpmInvocation(args);
  return spawnSync(invocation.command, invocation.args, {
    ...options,
    env: {
      ...process.env,
      CONVEX_AGENT_MODE: "anonymous",
      HACKERAI_LOCAL_AUTH: "1",
      HACKERAI_LOCAL_AUTH_ISSUER: localAuthUrl,
      // Convex statically validates all environment variables referenced by
      // auth.config.ts, including the inactive WorkOS branch.
      WORKOS_CLIENT_ID:
        process.env.WORKOS_CLIENT_ID || "local_hackerai_not_used",
      WORKOS_AUTH_DOMAIN: process.env.WORKOS_AUTH_DOMAIN || "api.workos.com",
    },
  });
};

async function waitForLocalAuth() {
  for (let attempt = 0; attempt < 50; attempt += 1) {
    try {
      const response = await fetch(`${localAuthUrl}/health`);
      if (response.ok) return true;
    } catch {
      // Keep waiting while the helper starts.
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  return false;
}

async function stopChild(child) {
  if (!child || child.exitCode !== null) return;
  child.kill();
  await Promise.race([
    new Promise((resolve) => child.once("exit", resolve)),
    new Promise((resolve) => setTimeout(resolve, 1500)),
  ]);
}

const envPath = ".env.local";
let envText = "";
try {
  envText = readFileSync(envPath, "utf8");
} catch {
  // First launch normally has no .env.local yet.
}

if (/^\s*CONVEX_DEPLOYMENT\s*=\s*\S+/m.test(envText)) {
  console.log("[convex-local] Local Convex configuration is already initialized.");
  process.exit(0);
}

console.log(
  "[convex-local] Initializing anonymous local Convex (no Convex account required).",
);

let authServer = null;
try {
  let authReady = await waitForLocalAuth();
  if (!authReady) {
    authServer = spawn(process.execPath, ["scripts/local-auth-server.mjs"], {
      stdio: "inherit",
      env: {
        ...process.env,
        HACKERAI_LOCAL_AUTH_ISSUER: localAuthUrl,
      },
    });
    authReady = await waitForLocalAuth();
  }

  if (!authReady) {
    console.error("[convex-local] Local authentication helper failed to start.");
    process.exitCode = 1;
  } else {
    const bootstrap = runPnpm(["exec", "convex", "dev", "--once"], {
      stdio: ["ignore", "inherit", "inherit"],
    });

    if (bootstrap.error) {
      console.error(
        `[convex-local] failed to initialize anonymous local Convex: ${bootstrap.error.message}`,
      );
      process.exitCode = 1;
    } else if (bootstrap.status !== 0) {
      process.exitCode = bootstrap.status ?? 1;
    } else {
      console.log("[convex-local] Anonymous local Convex initialized.");
    }
  }
} finally {
  await stopChild(authServer);
}
