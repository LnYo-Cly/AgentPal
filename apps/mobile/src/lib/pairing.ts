import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

import { normalizeRelayUrl } from "@/lib/relay";

const pairingStorageKey = "agentpal.pairing.v1";
let inMemoryPairing: string | null = null;

type RawPairingPayload = Partial<PairingPayload> & Record<string, unknown>;

export type PairingPayload = {
  version: number;
  relayUrl: string;
  hostId: string;
  hostName: string;
  pairToken: string;
  pairId?: string | null;
  deviceId?: string | null;
  deviceToken?: string | null;
  expiresAt?: string | null;
};

export async function loadStoredPairing() {
  const raw = await getPairingStoreItem();
  if (!raw) {
    return null;
  }
  const pairing = parsePairingInput(raw);
  setCurrentPairing(pairing);
  return pairing;
}

export async function saveStoredPairing(pairing: PairingPayload) {
  setCurrentPairing(pairing);
  await setPairingStoreItem(JSON.stringify(pairing));
}

export async function clearStoredPairing() {
  setCurrentPairing(null);
  await removePairingStoreItem();
}

export function parsePairingInput(input: string): PairingPayload {
  const raw = input.trim();
  if (!raw) {
    throw new Error("请输入配对地址");
  }

  if (raw.startsWith("{")) {
    const pairing = normalizePairingPayload(JSON.parse(raw) as RawPairingPayload);
    setCurrentPairing(pairing);
    return pairing;
  }

  if (isPairUrl(raw)) {
    const pairing = parsePairUrl(raw);
    setCurrentPairing(pairing);
    return pairing;
  }

  const pairing = normalizePairingPayload({
    version: 1,
    relayUrl: raw,
    hostId: "agentpal-local-host",
    hostName: "AgentPal Host",
    pairToken: "manual"
  });
  setCurrentPairing(pairing);
  return pairing;
}

export function currentPairingPayload() {
  return currentPairing;
}

export async function updateStoredPairing(updater: (pairing: PairingPayload) => PairingPayload | null) {
  const current = currentPairing ?? await loadStoredPairing();
  if (!current) {
    return null;
  }
  const next = updater(current);
  if (!next) {
    return null;
  }
  await saveStoredPairing(next);
  return next;
}

function parsePairUrl(value: string): PairingPayload {
  const parsed = new URL(value);
  const params = parsed.searchParams;
  return normalizePairingPayload({
    version: Number(params.get("v") ?? params.get("version") ?? 1),
    relayUrl: params.get("r") ?? params.get("relayUrl") ?? params.get("relay_url") ?? "",
    hostId: params.get("h") ?? params.get("hostId") ?? params.get("host_id") ?? "",
    hostName: params.get("n") ?? params.get("hostName") ?? params.get("host_name") ?? "AgentPal Host",
    pairToken: params.get("t") ?? params.get("pairToken") ?? params.get("pair_token") ?? "manual",
    pairId: params.get("p") ?? params.get("pairId") ?? params.get("pair_id"),
    deviceId: params.get("d") ?? params.get("deviceId") ?? params.get("device_id"),
    deviceToken: params.get("k") ?? params.get("deviceToken") ?? params.get("device_token"),
    expiresAt: params.get("x") ?? params.get("expiresAt") ?? params.get("expires_at")
  });
}

function normalizePairingPayload(payload: RawPairingPayload): PairingPayload {
  const relayUrl = normalizeRelayUrl(readPayloadString(payload, "relayUrl", "relay_url"));
  const hostId = readPayloadString(payload, "hostId", "host_id").trim();
  if (!hostId) {
    throw new Error("配对地址缺少 hostId");
  }

  return {
    version: Number(readPayloadString(payload, "version", "v") || 1),
    relayUrl,
    hostId,
    hostName: readPayloadString(payload, "hostName", "host_name").trim() || "AgentPal Host",
    pairToken: readPayloadString(payload, "pairToken", "pair_token").trim() || "manual",
    pairId: normalizeOptionalString(readPayloadString(payload, "pairId", "pair_id")),
    deviceId: normalizeOptionalString(readPayloadString(payload, "deviceId", "device_id")),
    deviceToken: normalizeOptionalString(readPayloadString(payload, "deviceToken", "device_token")),
    expiresAt: normalizeOptionalString(readPayloadString(payload, "expiresAt", "expires_at"))
  };
}

function isPairUrl(value: string) {
  const lower = value.toLowerCase();
  return lower.startsWith("agentpal://pair");
}

function normalizeOptionalString(value: unknown) {
  const next = String(value ?? "").trim();
  return next || null;
}

function readPayloadString(payload: RawPairingPayload, camelKey: string, snakeKey: string) {
  return String(payload[camelKey] ?? payload[snakeKey] ?? "");
}

function setCurrentPairing(pairing: PairingPayload | null) {
  currentPairing = pairing;
}

async function getPairingStoreItem() {
  if (Platform.OS === "web") {
    return webStorage()?.getItem(pairingStorageKey) ?? inMemoryPairing;
  }
  return SecureStore.getItemAsync(pairingStorageKey).catch(() => inMemoryPairing);
}

async function setPairingStoreItem(value: string) {
  inMemoryPairing = value;
  if (Platform.OS === "web") {
    webStorage()?.setItem(pairingStorageKey, value);
    return;
  }
  await SecureStore.setItemAsync(pairingStorageKey, value).catch(() => undefined);
}

async function removePairingStoreItem() {
  inMemoryPairing = null;
  if (Platform.OS === "web") {
    webStorage()?.removeItem(pairingStorageKey);
    return;
  }
  await SecureStore.deleteItemAsync(pairingStorageKey).catch(() => undefined);
}

let currentPairing: PairingPayload | null = null;

function webStorage() {
  if (typeof window === "undefined") {
    return null;
  }
  return window.localStorage;
}
