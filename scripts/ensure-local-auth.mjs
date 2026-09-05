#!/usr/bin/env node

import { generateKeyPairSync } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

const target = resolve(
  process.env.HACKERAI_LOCAL_AUTH_CONFIG_PATH ||
    ".hackerai-local/local-auth.json",
);

try {
  const existing = JSON.parse(readFileSync(target, "utf8"));
  if (existing?.privateKeyPem && existing?.publicJwk?.n && existing?.publicJwk?.e) {
    console.log("[local-auth] Existing local identity key reused.");
    process.exit(0);
  }
} catch {
  // Create a fresh local-only identity below.
}

mkdirSync(dirname(target), { recursive: true });
const { privateKey, publicKey } = generateKeyPairSync("rsa", {
  modulusLength: 2048,
});
const privateKeyPem = privateKey.export({ type: "pkcs8", format: "pem" });
const publicJwk = publicKey.export({ format: "jwk" });
publicJwk.alg = "RS256";
publicJwk.use = "sig";
publicJwk.kid = "hackerai-local-1";

writeFileSync(
  target,
  `${JSON.stringify(
    {
      version: 1,
      userId: "local-user",
      email: "local@hackerai.invalid",
      firstName: "Local",
      lastName: "User",
      privateKeyPem,
      publicJwk,
    },
    null,
    2,
  )}\n`,
  { mode: 0o600 },
);
console.log(`[local-auth] Created local identity key at ${target}`);
