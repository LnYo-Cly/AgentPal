#!/usr/bin/env node
import { readFileSync } from "node:fs";
import http from "node:http";
import https from "node:https";
import { spawn } from "node:child_process";
import process from "node:process";

const DEFAULT_PUBLIC_RELAY_URL = "wss://openagentpal-production.up.railway.app/ws";
const UPDATE_CHECK_URL = "https://registry.npmjs.org/agentpal/latest";
const UPDATE_CHECK_TIMEOUT_MS = 900;
const packageMetadata = readPackageMetadata();

const args = process.argv.slice(2);
const command = args[0] ?? "help";

if (command === "help" || command === "--help" || command === "-h") {
  printHelp();
  process.exit(0);
}

if (command === "pair") {
  await maybeShowUpdateNotice();
  runCargo([
    "run",
    "-p",
    "agentpal-host",
    "--",
    "codex",
    "connect",
    "--create-pair",
    ...defaultRelayArgs(args.slice(1)),
    ...args.slice(1)
  ]);
} else if (command === "relay") {
  await maybeShowUpdateNotice();
  runCargo(["run", "-p", "agentpal-relay", "--", ...args.slice(1)]);
} else if (command === "host") {
  await maybeShowUpdateNotice();
  runCargo(["run", "-p", "agentpal-host", "--", ...args.slice(1)]);
} else {
  console.error(`Unknown agentpal command: ${command}`);
  console.error("");
  printHelp();
  process.exit(2);
}

function defaultRelayArgs(passThrough) {
  if (hasFlagValue(passThrough, "--relay-url")) {
    return [];
  }
  const relayUrl = process.env.AGENTPAL_RELAY_URL ?? DEFAULT_PUBLIC_RELAY_URL;
  return ["--relay-url", relayUrl];
}

function hasFlagValue(items, flag) {
  return items.some((item) => item === flag || item.startsWith(`${flag}=`));
}

async function maybeShowUpdateNotice() {
  if (process.env.AGENTPAL_NO_UPDATE_CHECK === "1") {
    return;
  }

  const latest = await fetchLatestVersion().catch(() => null);
  const current = packageMetadata.version;
  if (!latest || !current || !isVersionGreater(latest, current)) {
    return;
  }

  console.error(`AgentPal ${latest} is available. Update with: npm install -g agentpal@latest`);
}

async function fetchLatestVersion() {
  const url = process.env.AGENTPAL_UPDATE_CHECK_URL ?? UPDATE_CHECK_URL;
  const response = await fetchJson(url, UPDATE_CHECK_TIMEOUT_MS);
  const version = typeof response.version === "string" ? response.version.trim() : "";
  return version || null;
}

function fetchJson(url, timeoutMs) {
  return new Promise((resolve, reject) => {
    let parsed;
    try {
      parsed = new URL(url);
    } catch (error) {
      reject(error);
      return;
    }

    const transport = parsed.protocol === "http:" ? http : https;
    const request = transport.get(parsed, { headers: { accept: "application/json" } }, (response) => {
      if (response.statusCode !== 200) {
        response.resume();
        reject(new Error(`unexpected status ${response.statusCode}`));
        return;
      }

      let body = "";
      response.setEncoding("utf8");
      response.on("data", (chunk) => {
        body += chunk;
        if (body.length > 64 * 1024) {
          request.destroy(new Error("response too large"));
        }
      });
      response.on("end", () => {
        try {
          resolve(JSON.parse(body));
        } catch (error) {
          reject(error);
        }
      });
    });

    request.setTimeout(timeoutMs, () => {
      request.destroy(new Error("update check timed out"));
    });
    request.on("error", reject);
  });
}

function readPackageMetadata() {
  try {
    return JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"));
  } catch {
    return {};
  }
}

function isVersionGreater(candidate, current) {
  const candidateParts = parseVersion(candidate);
  const currentParts = parseVersion(current);
  if (!candidateParts || !currentParts) {
    return false;
  }

  for (let index = 0; index < 3; index += 1) {
    if (candidateParts[index] > currentParts[index]) {
      return true;
    }
    if (candidateParts[index] < currentParts[index]) {
      return false;
    }
  }
  return false;
}

function parseVersion(version) {
  const match = String(version).trim().match(/^v?(\d+)\.(\d+)\.(\d+)/);
  if (!match) {
    return null;
  }
  return [Number(match[1]), Number(match[2]), Number(match[3])];
}

function runCargo(cargoArgs) {
  const child = spawn("cargo", cargoArgs, {
    stdio: "inherit"
  });

  child.on("exit", (code, signal) => {
    if (signal) {
      process.kill(process.pid, signal);
      return;
    }
    process.exit(code ?? 1);
  });

  child.on("error", (error) => {
    console.error(`Failed to start cargo: ${error.message}`);
    process.exit(1);
  });
}

function printHelp() {
  console.log(`AgentPal CLI

Usage:
  agentpal pair [options]
  agentpal relay [agentpal-relay options]
  agentpal host [agentpal-host options]

Commands:
  pair   Start the Codex Host, create a Cloud Relay pairing, and print URL + QR.
  relay  Run the local relay service.
  host   Pass through to the Rust host CLI.

Defaults:
  agentpal pair uses AGENTPAL_RELAY_URL when set, otherwise ${DEFAULT_PUBLIC_RELAY_URL}.
  Local development can pass --relay-url ws://127.0.0.1:8790/ws.

Examples:
  agentpal relay --host 0.0.0.0 --port 8790
  agentpal pair --workspace .
  agentpal pair --workspace . --relay-url ws://127.0.0.1:8790/ws
  agentpal host codex pair --relay-url 192.168.1.10:8790
`);
}
