import { normalizeRelayUrl } from "@/lib/relay";

const pairingStorageKey = "agentpal.pairing.v1";
let inMemoryPairing: string | null = null;

export type PairingPayload = {
  version: number;
  relayUrl: string;
  hostId: string;
  hostName: string;
  pairToken: string;
  expiresAt?: string | null;
};

export async function loadStoredPairing() {
  const raw = await getPairingStoreItem();
  if (!raw) {
    return null;
  }
  return parsePairingInput(raw);
}

export async function saveStoredPairing(pairing: PairingPayload) {
  await setPairingStoreItem(JSON.stringify(pairing));
}

export async function clearStoredPairing() {
  await removePairingStoreItem();
}

export function parsePairingInput(input: string): PairingPayload {
  const raw = input.trim();
  if (!raw) {
    throw new Error("请输入配对地址");
  }

  if (raw.startsWith("{")) {
    return normalizePairingPayload(JSON.parse(raw) as Partial<PairingPayload>);
  }

  if (raw.toLowerCase().startsWith("agentpal://pair")) {
    return parsePairUrl(raw);
  }

  return normalizePairingPayload({
    version: 1,
    relayUrl: raw,
    hostId: "agentpal-local-host",
    hostName: "AgentPal Host",
    pairToken: "manual"
  });
}

function parsePairUrl(value: string): PairingPayload {
  const parsed = new URL(value);
  const params = parsed.searchParams;
  return normalizePairingPayload({
    version: Number(params.get("v") ?? params.get("version") ?? 1),
    relayUrl: params.get("relayUrl") ?? params.get("relay_url") ?? "",
    hostId: params.get("hostId") ?? params.get("host_id") ?? "",
    hostName: params.get("hostName") ?? params.get("host_name") ?? "AgentPal Host",
    pairToken: params.get("pairToken") ?? params.get("pair_token") ?? "manual",
    expiresAt: params.get("expiresAt") ?? params.get("expires_at")
  });
}

function normalizePairingPayload(payload: Partial<PairingPayload>): PairingPayload {
  const relayUrl = normalizeRelayUrl(String(payload.relayUrl ?? ""));
  const hostId = String(payload.hostId ?? "").trim();
  if (!hostId) {
    throw new Error("配对地址缺少 hostId");
  }

  return {
    version: Number(payload.version ?? 1),
    relayUrl,
    hostId,
    hostName: String(payload.hostName ?? "AgentPal Host").trim() || "AgentPal Host",
    pairToken: String(payload.pairToken ?? "manual").trim() || "manual",
    expiresAt: payload.expiresAt ?? null
  };
}

async function getPairingStoreItem() {
  return inMemoryPairing;
}

async function setPairingStoreItem(value: string) {
  inMemoryPairing = value;
}

async function removePairingStoreItem() {
  inMemoryPairing = null;
}
