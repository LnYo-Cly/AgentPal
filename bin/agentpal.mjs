#!/usr/bin/env node
import {
  closeSync,
  existsSync,
  mkdirSync,
  openSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync
} from "node:fs";
import http from "node:http";
import https from "node:https";
import { spawn, spawnSync } from "node:child_process";
import process from "node:process";
import { homedir } from "node:os";
import { fileURLToPath } from "node:url";
import { basename, dirname, isAbsolute, join, resolve } from "node:path";
import { createHash, randomUUID } from "node:crypto";

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
  runPairCommand(args.slice(1));
} else if (command === "daemon") {
  await maybeShowUpdateNotice();
  await runDaemonCommand(args.slice(1));
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

function runPairCommand(passThrough) {
  const runtime = loadOrCreateWorkspaceRuntime(passThrough);
  assertWorkspaceDirectory(runtime.workspacePath);

  const existingState = readDaemonState(runtime.paths);
  if (existingState && isStateRunning(existingState)) {
    console.error(`AgentPal host is already running for this workspace (${existingState.mode}, pid ${existingState.pid}).`);
    console.error("Run `agentpal daemon status` or stop it before creating a new foreground pairing session.");
    process.exit(1);
  }
  if (existingState) {
    clearDaemonState(runtime.paths);
  }

  const hostArgs = managedConnectArgs(passThrough, runtime.profile, ["--force"]);
  const cargoArgs = [
    "run",
    "-p",
    "agentpal-host",
    "--",
    "codex",
    "connect",
    "--create-pair",
    ...hostArgs
  ];

  let pairPid = null;
  runCargo(cargoArgs, {
    onSpawn(child) {
      pairPid = child.pid;
      writeDaemonState(runtime.paths, {
        mode: "foreground",
        pid: child.pid,
        workspacePath: runtime.workspacePath,
        profilePath: runtime.paths.profilePath,
        logPath: null,
        startedAt: new Date().toISOString(),
        commandLine: commandLine(["cargo", ...cargoArgs])
      });
    },
    onExit() {
      clearDaemonStateIfPid(runtime.paths, pairPid);
    }
  });
}

async function runDaemonCommand(passThrough) {
  const subcommand = passThrough[0] ?? "help";
  if (subcommand === "help" || subcommand === "--help" || subcommand === "-h") {
    printDaemonHelp();
    return;
  }

  const subArgs = passThrough.slice(1);
  if (subcommand === "start") {
    await runDaemonStart(subArgs);
    return;
  }
  if (subcommand === "stop") {
    await runDaemonStop(subArgs);
    return;
  }
  if (subcommand === "status") {
    runDaemonStatus(subArgs);
    return;
  }
  if (subcommand === "logs") {
    runDaemonLogs(subArgs);
    return;
  }

  console.error(`Unknown agentpal daemon command: ${subcommand}`);
  console.error("");
  printDaemonHelp();
  process.exit(2);
}

async function runDaemonStart(passThrough) {
  const runtime = loadOrCreateWorkspaceRuntime(passThrough);
  assertWorkspaceDirectory(runtime.workspacePath);

  const existingState = readDaemonState(runtime.paths);
  if (existingState && isStateRunning(existingState)) {
    if (!hasBooleanFlag(passThrough, "--force")) {
      console.error(`AgentPal daemon is already running for this workspace (pid ${existingState.pid}).`);
      console.error("Use `agentpal daemon status`, or pass `--force` to restart it.");
      process.exit(1);
    }
    await stopStateProcess(existingState);
    clearDaemonState(runtime.paths);
  } else if (existingState) {
    clearDaemonState(runtime.paths);
  }

  checkCommandAvailable(runtime.profile.codexBin);
  const env = cargoEnv();
  const binaryPath = buildHostBinary(env);
  const logPath = newLogPath(runtime.paths.logsDir);
  mkdirSync(runtime.paths.logsDir, { recursive: true });
  writeFileSync(
    logPath,
    [
      `# AgentPal daemon log`,
      `startedAt=${new Date().toISOString()}`,
      `workspace=${runtime.workspacePath}`,
      `hostId=${runtime.profile.hostId}`,
      ""
    ].join("\n"),
    { flag: "a" }
  );

  const hostArgs = ["codex", "connect", ...managedConnectArgs(passThrough, runtime.profile, ["--force"])];
  const logFd = openSync(logPath, "a");
  let child;
  try {
    child = spawn(binaryPath, hostArgs, {
      cwd: packageRoot,
      env,
      detached: true,
      stdio: ["ignore", logFd, logFd],
      windowsHide: true
    });
    child.unref();
  } finally {
    closeSync(logFd);
  }

  writeDaemonState(runtime.paths, {
    mode: "daemon",
    pid: child.pid,
    workspacePath: runtime.workspacePath,
    profilePath: runtime.paths.profilePath,
    logPath,
    startedAt: new Date().toISOString(),
    commandLine: commandLine([binaryPath, ...hostArgs])
  });

  await sleep(1200);
  if (!isPidRunning(child.pid)) {
    const logHint = readLogTail(logPath, 80);
    clearDaemonState(runtime.paths);
    console.error("AgentPal daemon exited during startup.");
    if (logHint.trim()) {
      console.error("");
      console.error(logHint);
    }
    process.exit(1);
  }

  console.log("AgentPal daemon started.");
  console.log(`  workspace: ${runtime.workspacePath}`);
  console.log(`  pid: ${child.pid}`);
  console.log(`  host_id: ${runtime.profile.hostId}`);
  console.log(`  session_id: ${runtime.profile.sessionId}`);
  console.log(`  relay_url: ${runtime.profile.relayUrl}`);
  console.log(`  log: ${logPath}`);
  console.log("");
  console.log("Use `agentpal daemon status`, `agentpal daemon logs`, or `agentpal daemon stop` from this workspace.");
}

async function runDaemonStop(passThrough) {
  const runtime = loadWorkspaceRuntime(passThrough);
  const state = readDaemonState(runtime.paths);
  if (!state) {
    console.log("AgentPal daemon is stopped.");
    return;
  }

  if (isStateRunning(state)) {
    await stopStateProcess(state);
    console.log(`Stopped AgentPal ${state.mode ?? "daemon"} process ${state.pid}.`);
  } else {
    console.log(`Cleared stale AgentPal daemon state for pid ${state.pid}.`);
  }
  clearDaemonState(runtime.paths);
}

function runDaemonStatus(passThrough) {
  const runtime = loadWorkspaceRuntime(passThrough);
  const state = readDaemonState(runtime.paths);
  const running = state ? isStateRunning(state) : false;
  const status = state ? (running ? "running" : "stale") : "stopped";
  const payload = {
    status,
    workspacePath: runtime.workspacePath,
    profilePath: runtime.paths.profilePath,
    statePath: runtime.paths.statePath,
    profile: runtime.profile,
    state
  };

  if (hasBooleanFlag(passThrough, "--json")) {
    console.log(JSON.stringify(payload, null, 2));
    return;
  }

  console.log(`AgentPal daemon: ${status}`);
  console.log(`  workspace: ${runtime.workspacePath}`);
  if (runtime.profile) {
    console.log(`  host_id: ${runtime.profile.hostId}`);
    console.log(`  session_id: ${runtime.profile.sessionId}`);
    console.log(`  relay_url: ${runtime.profile.relayUrl}`);
  } else {
    console.log("  profile: not created yet");
  }
  if (state) {
    console.log(`  mode: ${state.mode ?? "unknown"}`);
    console.log(`  pid: ${state.pid}`);
    if (state.logPath) {
      console.log(`  log: ${state.logPath}`);
    }
    console.log(`  started_at: ${state.startedAt ?? "unknown"}`);
  }
}

function runDaemonLogs(passThrough) {
  const runtime = loadWorkspaceRuntime(passThrough);
  const state = readDaemonState(runtime.paths);
  const logPath = state?.logPath ?? latestLogPath(runtime.paths.logsDir);
  if (!logPath || !existsSync(logPath)) {
    console.error("No AgentPal daemon log found for this workspace.");
    process.exit(1);
  }

  const tailValue = getFlagValue(passThrough, "--tail");
  const tail = tailValue === "all" ? "all" : Number(tailValue ?? 120);
  const output = tail === "all" || !Number.isFinite(tail) || tail <= 0
    ? readFileSync(logPath, "utf8")
    : readLogTail(logPath, tail);
  process.stdout.write(output.endsWith("\n") ? output : `${output}\n`);
}

function loadWorkspaceRuntime(passThrough) {
  const workspacePath = workspacePathFromArgs(passThrough);
  const workspaceKey = workspaceKeyFor(workspacePath);
  const paths = workspacePaths(workspaceKey);
  return {
    workspacePath,
    workspaceKey,
    paths,
    profile: readJson(paths.profilePath)
  };
}

function loadOrCreateWorkspaceRuntime(passThrough) {
  const runtime = loadWorkspaceRuntime(passThrough);
  const previous = runtime.profile ?? {};
  const profile = {
    version: 1,
    workspacePath: runtime.workspacePath,
    workspaceKey: runtime.workspaceKey,
    hostId: getFlagValue(passThrough, "--host-id") ?? previous.hostId ?? newHostId(),
    hostName: getFlagValue(passThrough, "--host-name") ?? previous.hostName ?? defaultHostName(),
    relayUrl: normalizeWsUrl(
      getFlagValue(passThrough, "--relay-url")
        ?? process.env.AGENTPAL_RELAY_URL
        ?? previous.relayUrl
        ?? DEFAULT_PUBLIC_RELAY_URL
    ),
    sessionId: getFlagValue(passThrough, "--session-id") ?? previous.sessionId ?? defaultSessionId(runtime.workspaceKey),
    codexBin: getFlagValue(passThrough, "--codex-bin") ?? previous.codexBin ?? "codex",
    codexPort: resolveCodexPort(getFlagValue(passThrough, "--codex-port") ?? previous.codexPort, defaultCodexPort(runtime.workspaceKey)),
    updatedAt: new Date().toISOString()
  };

  mkdirSync(runtime.paths.root, { recursive: true });
  writeJson(runtime.paths.profilePath, profile);
  return { ...runtime, profile };
}

function workspacePaths(workspaceKey) {
  const root = join(agentPalHome(), "workspaces", workspaceKey);
  return {
    root,
    profilePath: join(root, "profile.json"),
    statePath: join(root, "daemon.json"),
    logsDir: join(root, "logs")
  };
}

function agentPalHome() {
  return process.env.AGENTPAL_HOME ? resolve(callerCwd, process.env.AGENTPAL_HOME) : join(homedir(), ".agentpal");
}

function workspacePathFromArgs(items) {
  const workspace = getFlagValue(items, "--workspace") ?? callerCwd;
  return resolveWorkspaceValue(workspace);
}

function workspaceKeyFor(workspacePath) {
  const digest = createHash("sha256").update(workspacePath.toLowerCase()).digest("hex").slice(0, 16);
  const name = fileSafeToken(basename(workspacePath) || "workspace").slice(0, 32) || "workspace";
  return `${name}-${digest}`;
}

function newHostId() {
  return `h_${randomUUID().replaceAll("-", "").slice(0, 12)}`;
}

function defaultHostName() {
  return process.env.COMPUTERNAME || process.env.HOSTNAME || "AgentPal Host";
}

function defaultCodexPort(workspaceKey) {
  const digest = workspaceKey.split("-").at(-1) ?? "";
  const value = Number.parseInt(digest.slice(0, 8) || "0", 16);
  return 38000 + (value % 20000);
}

function resolveCodexPort(value, fallback) {
  if (value === undefined || value === null || value === "") {
    return fallback;
  }
  const port = Number(value);
  if (Number.isInteger(port) && port > 0 && port < 65536) {
    return port;
  }
  console.error(`Invalid --codex-port value: ${value}`);
  process.exit(1);
}

function defaultSessionId(workspaceKey) {
  const digest = workspaceKey.split("-").at(-1) ?? workspaceKey;
  return `agentpal-codex-${digest.slice(0, 12)}`;
}

function managedConnectArgs(passThrough, profile, stripBooleanFlags = []) {
  const stripped = stripBooleanFlagsFromArgs(passThrough, stripBooleanFlags);
  const normalized = withDefaultWorkspaceArgs(stripped);
  const next = [...normalized];
  appendFlagIfMissing(next, "--relay-url", profile.relayUrl);
  appendFlagIfMissing(next, "--host-id", profile.hostId);
  appendFlagIfMissing(next, "--host-name", profile.hostName);
  appendFlagIfMissing(next, "--session-id", profile.sessionId);
  appendFlagIfMissing(next, "--codex-bin", profile.codexBin);
  appendFlagIfMissing(next, "--codex-port", String(profile.codexPort));
  return next;
}

function appendFlagIfMissing(items, flag, value) {
  if (!hasFlagValue(items, flag)) {
    items.push(flag, value);
  }
}

function stripBooleanFlagsFromArgs(items, flags) {
  if (flags.length === 0) {
    return items;
  }
  const remove = new Set(flags);
  return items.filter((item) => !remove.has(item));
}

function readDaemonState(paths) {
  return readJson(paths.statePath);
}

function writeDaemonState(paths, state) {
  mkdirSync(paths.root, { recursive: true });
  writeJson(paths.statePath, state);
}

function clearDaemonState(paths) {
  rmSync(paths.statePath, { force: true });
}

function clearDaemonStateIfPid(paths, pid) {
  const state = readDaemonState(paths);
  if (state?.pid === pid) {
    clearDaemonState(paths);
  }
}

function isStateRunning(state) {
  return isPidRunning(Number(state?.pid));
}

function isPidRunning(pid) {
  if (!Number.isInteger(pid) || pid <= 0) {
    return false;
  }
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return error?.code === "EPERM";
  }
}

async function stopStateProcess(state) {
  const pid = Number(state?.pid);
  if (!isPidRunning(pid)) {
    return;
  }
  if (process.platform === "win32") {
    const result = spawnSync("taskkill", ["/PID", String(pid), "/T", "/F"], {
      encoding: "utf8",
      stdio: "pipe"
    });
    if (result.status !== 0 && isPidRunning(pid)) {
      throw new Error((result.stderr || result.stdout || `taskkill failed for pid ${pid}`).trim());
    }
    return;
  }

  process.kill(pid, "SIGTERM");
  for (let attempt = 0; attempt < 20; attempt += 1) {
    await sleep(100);
    if (!isPidRunning(pid)) {
      return;
    }
  }
  process.kill(pid, "SIGKILL");
}

function checkCommandAvailable(command) {
  const result = process.platform === "win32"
    ? spawnSync(`${quoteWindowsShellArg(command)} --version`, {
      cwd: callerCwd,
      encoding: "utf8",
      shell: true,
      stdio: "pipe",
      windowsHide: true
    })
    : spawnSync(command, ["--version"], {
      cwd: callerCwd,
      encoding: "utf8",
      stdio: "pipe"
    });
  if (result.error || result.status !== 0) {
    console.error(`Codex command is not available: ${command}`);
    const detail = result.error?.message ?? result.stderr?.trim() ?? result.stdout?.trim();
    if (detail) {
      console.error(detail);
    }
    process.exit(1);
  }
}

function quoteWindowsShellArg(value) {
  const text = String(value);
  if (/^[a-zA-Z0-9._:/\\-]+$/.test(text)) {
    return text;
  }
  return `"${text.replace(/"/g, '\\"')}"`;
}

function buildHostBinary(env) {
  const result = spawnSync("cargo", ["build", "-p", "agentpal-host"], {
    cwd: packageRoot,
    env,
    stdio: "inherit"
  });
  if (result.error) {
    console.error(`Failed to start cargo: ${result.error.message}`);
    process.exit(1);
  }
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }

  const binaryPath = hostBinaryPath(env);
  if (!existsSync(binaryPath)) {
    console.error(`Built host binary not found: ${binaryPath}`);
    process.exit(1);
  }
  return binaryPath;
}

function hostBinaryPath(env) {
  const targetDir = resolveCargoTargetDir(env.CARGO_TARGET_DIR ?? defaultCargoTargetDir);
  return join(targetDir, "debug", process.platform === "win32" ? "agentpal-host.exe" : "agentpal-host");
}

function resolveCargoTargetDir(targetDir) {
  return isAbsolute(targetDir) ? targetDir : resolve(packageRoot, targetDir);
}

function cargoEnv() {
  const env = { ...process.env };
  env.CARGO_TARGET_DIR ??= defaultCargoTargetDir;
  return env;
}

function newLogPath(logsDir) {
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  return join(logsDir, `${stamp}.log`);
}

function latestLogPath(logsDir) {
  if (!existsSync(logsDir)) {
    return null;
  }
  const candidates = readdirSync(logsDir)
    .filter((name) => name.endsWith(".log"))
    .map((name) => join(logsDir, name))
    .map((path) => ({ path, mtimeMs: statSync(path).mtimeMs }))
    .sort((left, right) => right.mtimeMs - left.mtimeMs);
  return candidates[0]?.path ?? null;
}

function readLogTail(logPath, lines) {
  const text = readFileSync(logPath, "utf8");
  const allLines = text.split(/\r?\n/);
  return allLines.slice(Math.max(0, allLines.length - lines)).join("\n");
}

function readJson(path) {
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch {
    return null;
  }
}

function writeJson(path, value) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function getFlagValue(items, flag) {
  for (let index = 0; index < items.length; index += 1) {
    const item = items[index];
    if (item === flag) {
      const value = items[index + 1];
      return value && !value.startsWith("--") ? value : null;
    }
    if (item.startsWith(`${flag}=`)) {
      return item.slice(flag.length + 1);
    }
  }
  return null;
}

function hasBooleanFlag(items, flag) {
  return items.includes(flag);
}

function normalizeWsUrl(input) {
  let value = String(input ?? "").trim();
  if (!value.startsWith("ws://") && !value.startsWith("wss://")) {
    value = `ws://${value}`;
  }
  if (!value.endsWith("/ws") && !value.endsWith("/ws/")) {
    value = `${value.replace(/\/+$/, "")}/ws`;
  }
  return value;
}

function assertWorkspaceDirectory(workspacePath) {
  try {
    if (statSync(workspacePath).isDirectory()) {
      return;
    }
  } catch {
    // handled below
  }
  console.error(`Workspace does not exist or is not a directory: ${workspacePath}`);
  process.exit(1);
}

function fileSafeToken(value) {
  const safe = String(value)
    .split("")
    .map((character) => {
      if (/^[a-zA-Z0-9_-]$/.test(character)) {
        return character;
      }
      return "-";
    })
    .join("");
  return safe.replace(/^-+|-+$/g, "");
}

function commandLine(parts) {
  return parts.map((part) => {
    const value = String(part);
    return /\s/.test(value) ? JSON.stringify(value) : value;
  }).join(" ");
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
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

function runCargo(cargoArgs, hooks = {}) {
  const env = cargoEnv();

  const child = spawn("cargo", cargoArgs, {
    cwd: packageRoot,
    env,
    stdio: "inherit"
  });
  hooks.onSpawn?.(child);

  child.on("exit", (code, signal) => {
    hooks.onExit?.(code, signal);
    if (signal) {
      process.kill(process.pid, signal);
      return;
    }
    process.exit(code ?? 1);
  });

  child.on("error", (error) => {
    hooks.onExit?.(1, null);
    console.error(`Failed to start cargo: ${error.message}`);
    process.exit(1);
  });
}

function printHelp() {
  console.log(`AgentPal CLI

Usage:
  agentpal pair [options]
  agentpal daemon <start|stop|status|logs> [options]
  agentpal relay [agentpal-relay options]
  agentpal host [agentpal-host options]

Commands:
  pair   Start the Codex Host, create a Cloud Relay pairing, and print a terminal QR code.
  daemon Manage the workspace background Host process.
  relay  Run the local relay service.
  host   Pass through to the Rust host CLI.

Defaults:
  agentpal pair uses AGENTPAL_RELAY_URL when set, otherwise ${DEFAULT_PUBLIC_RELAY_URL}.
  agentpal pair uses the current directory as --workspace unless one is supplied.
  agentpal daemon uses the same workspace profile as pair.
  Local development can pass --relay-url ws://127.0.0.1:8790/ws.

Examples:
  agentpal pair
  agentpal daemon start
  agentpal daemon status
  agentpal daemon logs
  agentpal daemon stop
  agentpal relay --host 0.0.0.0 --port 8790
  agentpal pair --workspace .
  agentpal pair --workspace . --qr-file
  agentpal pair --workspace . --relay-url ws://127.0.0.1:8790/ws
  agentpal host codex connect --workspace .
`);
}

function printDaemonHelp() {
  console.log(`AgentPal daemon

Usage:
  agentpal daemon start [options]
  agentpal daemon stop [options]
  agentpal daemon status [options]
  agentpal daemon logs [options]

Commands:
  start   Build and launch the workspace Host in the background.
  stop    Stop the background Host for this workspace.
  status  Show workspace Host state.
  logs    Print the daemon log tail.

Options:
  --workspace <path>     Workspace to manage. Defaults to the current directory.
  --relay-url <url>      Relay URL. Defaults to AGENTPAL_RELAY_URL or the public relay.
  --host-id <id>         Override the persisted Host ID.
  --host-name <name>     Override the persisted Host name.
  --session-id <id>      Override the workspace session ID.
  --codex-bin <command>  Codex command. Defaults to codex.
  --codex-port <port>    Local Codex app-server port. Defaults to a stable workspace port.
  --force                Restart an already running daemon. start only.
  --json                 Print machine-readable status. status only.
  --tail <n|all>         Number of log lines to print. logs only; default 120.

Examples:
  agentpal pair
  agentpal daemon start
  agentpal daemon status
  agentpal daemon logs --tail 200
  agentpal daemon stop
`);
}
