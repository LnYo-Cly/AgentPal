#!/usr/bin/env node
import { spawn } from "node:child_process";
import process from "node:process";

const args = process.argv.slice(2);
const command = args[0] ?? "help";

if (command === "help" || command === "--help" || command === "-h") {
  printHelp();
  process.exit(0);
}

if (command === "pair") {
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
  runCargo(["run", "-p", "agentpal-relay", "--", ...args.slice(1)]);
} else if (command === "host") {
  runCargo(["run", "-p", "agentpal-host", "--", ...args.slice(1)]);
} else {
  console.error(`Unknown oap command: ${command}`);
  console.error("");
  printHelp();
  process.exit(2);
}

function defaultRelayArgs(passThrough) {
  if (hasFlagValue(passThrough, "--relay-url")) {
    return [];
  }
  const relayUrl = process.env.OAP_RELAY_URL ?? "ws://127.0.0.1:8790/ws";
  return ["--relay-url", relayUrl];
}

function hasFlagValue(items, flag) {
  return items.some((item) => item === flag || item.startsWith(`${flag}=`));
}

function runCargo(cargoArgs) {
  const child = spawn("cargo", cargoArgs, {
    stdio: "inherit",
    shell: process.platform === "win32"
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
  console.log(`OpenAgentPal CLI

Usage:
  oap pair [options]
  oap relay [agentpal-relay options]
  oap host [agentpal-host options]

Commands:
  pair   Start the Codex Host, create a Cloud Relay pairing, and print URL + QR.
  relay  Run the local relay service.
  host   Pass through to the Rust host CLI.

Defaults:
  oap pair uses OAP_RELAY_URL when set, otherwise ws://127.0.0.1:8790/ws.

Examples:
  oap relay --host 0.0.0.0 --port 8790
  oap pair --workspace . --relay-url wss://relay.example.com/ws
  oap host codex pair --relay-url 192.168.1.10:8790
`);
}
