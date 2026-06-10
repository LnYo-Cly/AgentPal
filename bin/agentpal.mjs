#!/usr/bin/env node
import { readFileSync } from "node:fs";
import http from "node:http";
import https from "node:https";
import { spawn } from "node:child_process";
import process from "node:process";
import { homedir } from "node:os";
import { fileURLToPath } from "node:url";
import { dirname, join, resolve } from "node:path";

const DEFAULT_PUBLIC_RELAY_URL = "wss://openagentpal-production.up.railway.app/ws";
const UPDATE_CHECK_URL = "https://registry.npmjs.org/agentpal/latest";
const UPDATE_CHECK_TIMEOUT_MS = 900;
const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const callerCwd = process.cwd();
const defaultCargoTargetDir = join(homedir(), ".agentpal", "cargo-target");
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
    ...withDefaultWorkspaceArgs(args.slice(1))
  ]);
} else if (command === "relay") {
  await maybeShowUpdateNotice();
  runCargo(["run", "-p", "agentpal-relay", "--", ...args.slice(1)]);
} else if (command === "host") {
  await maybeShowUpdateNotice();
  runCargo(["run", "-p", "agentpal-host", "--", ...normalizeHostArgs(args.slice(1))]);
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

function normalizeWorkspaceArgs(items) {
  const normalized = [];
  for (let index = 0; index < items.length; index += 1) {
    const item = items[index];
    if (item === "--workspace" && index + 1 < items.length) {
      normalized.push(item, resolveWorkspaceValue(items[index + 1]));
      index += 1;
      continue;
    }
    if (item.startsWith("--workspace=")) {
      normalized.push(`--workspace=${resolveWorkspaceValue(item.slice("--workspace=".length))}`);
      continue;
    }
    normalized.push(item);
  }
  return normalized;
}

function withDefaultWorkspaceArgs(items) {
  const normalized = normalizeWorkspaceArgs(items);
  if (hasFlagValue(normalized, "--workspace")) {
    return normalized;
  }
  return [...normalized, "--workspace", callerCwd];
}

function normalizeHostArgs(items) {
  const normalized = normalizeWorkspaceArgs(items);
  if (hostCommandNeedsDefaultWorkspace(normalized) && !hasFlagValue(normalized, "--workspace")) {
    return [...normalized, "--workspace", callerCwd];
  }
  return normalized;
}

function hostCommandNeedsDefaultWorkspace(items) {
  return items[0] === "codex" && (items[1] === "probe" || items[1] === "connect");
}

function resolveWorkspaceValue(value) {
  if (!value) {
    return value;
  }
  return resolve(callerCwd, value);
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
    return JSON.parse(readFileSync(resolve(packageRoot, "package.json"), "utf8"));
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
  const env = { ...process.env };
  env.CARGO_TARGET_DIR ??= defaultCargoTargetDir;

  const child = spawn("cargo", cargoArgs, {
    cwd: packageRoot,
    env,
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
  agentpal pair uses the current directory as --workspace unless one is supplied.
  Local development can pass --relay-url ws://127.0.0.1:8790/ws.

Examples:
  agentpal relay --host 0.0.0.0 --port 8790
  agentpal pair
  agentpal pair --workspace .
  agentpal pair --workspace . --relay-url ws://127.0.0.1:8790/ws
  agentpal host codex connect --workspace .
`);
}
