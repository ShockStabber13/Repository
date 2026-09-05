#!/usr/bin/env node

import http from "node:http";
import { createSign } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const host = process.env.HACKERAI_LOCAL_AUTH_HOST || "127.0.0.1";
const port = Number(process.env.HACKERAI_LOCAL_AUTH_PORT || 3211);
const issuer =
  process.env.HACKERAI_LOCAL_AUTH_ISSUER || `http://${host}:${port}`;
const configPath = resolve(
  process.env.HACKERAI_LOCAL_AUTH_CONFIG_PATH ||
    ".hackerai-local/local-auth.json",
);

function loadConfig() {
  const config = JSON.parse(readFileSync(configPath, "utf8"));
  if (!config?.privateKeyPem || !config?.publicJwk?.kid || !config?.userId) {
    throw new Error(`Invalid local auth config: ${configPath}`);
  }
  return config;
}

function base64urlJson(value) {
  return Buffer.from(JSON.stringify(value)).toString("base64url");
}

function signJwt(config) {
  const now = Math.floor(Date.now() / 1000);
  const header = base64urlJson({
    alg: "RS256",
    kid: config.publicJwk.kid,
    typ: "JWT",
  });
  const payload = base64urlJson({
    iss: issuer,
    sub: config.userId,
    iat: now,
    exp: now + 60 * 60,
    name: `${config.firstName ?? "Local"} ${config.lastName ?? "User"}`.trim(),
    email: config.email,
  });
  const signingInput = `${header}.${payload}`;
  const signer = createSign("RSA-SHA256");
  signer.update(signingInput);
  signer.end();
  const signature = signer.sign(config.privateKeyPem).toString("base64url");
  return `${signingInput}.${signature}`;
}

function corsHeaders(origin) {
  const allowOrigin =
    origin && /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)
      ? origin
      : "http://localhost:3000";
  return {
    "access-control-allow-origin": allowOrigin,
    "access-control-allow-methods": "GET, OPTIONS",
    "access-control-allow-headers": "content-type",
    vary: "Origin",
  };
}

function sendJson(res, status, body, extraHeaders = {}) {
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
    ...extraHeaders,
  });
  res.end(`${JSON.stringify(body)}\n`);
}

const server = http.createServer((req, res) => {
  const origin = req.headers.origin;
  const cors = corsHeaders(origin);

  if (req.method === "OPTIONS") {
    res.writeHead(204, cors);
    res.end();
    return;
  }

  try {
    if (req.url === "/health") {
      sendJson(res, 200, { ok: true }, cors);
      return;
    }

    const config = loadConfig();

    if (req.url === "/jwks" || req.url === "/.well-known/jwks.json") {
      sendJson(res, 200, { keys: [config.publicJwk] }, cors);
      return;
    }

    if (req.url === "/token") {
      sendJson(res, 200, { token: signJwt(config) }, cors);
      return;
    }

    sendJson(res, 404, { error: "not_found" }, cors);
  } catch (error) {
    sendJson(
      res,
      500,
      { error: error instanceof Error ? error.message : String(error) },
      cors,
    );
  }
});

server.listen(port, host, () => {
  console.log(`[local-auth] Listening on ${issuer}`);
});

const shutdown = () => server.close(() => process.exit(0));
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
