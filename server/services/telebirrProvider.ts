import crypto from "crypto";

export type TelebirrMode = "sandbox" | "live";

export interface TelebirrCreateOrderInput {
  merchantOrderId: string;
  amount: number;
  currency: string;
  phone: string;
  plan: string;
  billingCycle: string;
  notifyUrl: string;
  title: string;
}

export interface TelebirrCreateOrderResult {
  providerRef: string;
  ussdCode: string;
  qrData: string;
  paymentUrl?: string;
  mode: TelebirrMode;
  raw?: Record<string, unknown>;
}

export interface TelebirrNotifyPayload {
  merchantOrderId: string;
  amount: number;
  status: "Paid" | "Failed";
  providerRef?: string;
  phone?: string;
}

const REQUIRED_TELEBIRR_VARS = [
  "TELEBIRR_APP_ID",
  "TELEBIRR_APP_KEY",
  "TELEBIRR_SHORT_CODE",
  "TELEBIRR_NOTIFY_SECRET",
] as const;

/** True only when merchant API credentials + notify secret are set in env. */
export function isTelebirrConfigured(): boolean {
  return REQUIRED_TELEBIRR_VARS.every((key) => {
    const value = process.env[key];
    return typeof value === "string" && value.trim().length > 0;
  });
}

export function getMissingTelebirrEnvVars(): string[] {
  return REQUIRED_TELEBIRR_VARS.filter((key) => {
    const value = process.env[key];
    return !(typeof value === "string" && value.trim().length > 0);
  });
}

/**
 * Paid billing requires a real Telebirr merchant configuration.
 * Do not fall back to JWT or invent payments when credentials are missing.
 */
export function assertTelebirrConfigured(): void {
  if (isTelebirrConfigured()) return;
  const missing = getMissingTelebirrEnvVars();
  const err = new Error(
    `Telebirr is not configured. Set ${missing.join(", ")} in server environment before accepting payments.`
  );
  (err as any).statusCode = 503;
  throw err;
}

function getMode(): TelebirrMode {
  const mode = (process.env.TELEBIRR_MODE || "live").toLowerCase();
  return mode === "sandbox" ? "sandbox" : "live";
}

export function isSandboxMode(): boolean {
  return getMode() === "sandbox";
}

/**
 * Explicit allow-list for local simulation. Still requires full Telebirr env
 * (notify secret) — never invents payment without configuration.
 */
export function isSandboxSimulationAllowed(): boolean {
  return (
    isSandboxMode() &&
    isTelebirrConfigured() &&
    process.env.TELEBIRR_ALLOW_SANDBOX_SIMULATION === "true"
  );
}

export function getNotifySecret(): string {
  return (process.env.TELEBIRR_NOTIFY_SECRET || "").trim();
}

/** Normalize Ethiopian mobiles to +2519XXXXXXXX */
export function normalizeEthiopianPhone(input: string): string {
  const digits = input.replace(/[^\d+]/g, "").replace(/^\+/, "");
  let local = digits;
  if (local.startsWith("251")) {
    local = local.slice(3);
  }
  if (local.startsWith("0")) {
    local = local.slice(1);
  }
  if (!/^9\d{8}$/.test(local)) {
    throw new Error(
      "Invalid Ethiopian Telebirr number. Use +2519XXXXXXXX or 09XXXXXXXX"
    );
  }
  return `+251${local}`;
}

export function buildNotifyUrl(): string {
  const base =
    process.env.SERVER_PUBLIC_URL ||
    process.env.API_URL ||
    `http://localhost:${process.env.PORT || "3001"}`;
  return `${base.replace(/\/$/, "")}/api/billing/telebirr/notify`;
}

/** HMAC-SHA256 of merchantOrderId|amount|status */
export function signNotify(payload: TelebirrNotifyPayload): string {
  assertTelebirrConfigured();
  const secret = getNotifySecret();
  const message = `${payload.merchantOrderId}|${payload.amount}|${payload.status}`;
  return crypto.createHmac("sha256", secret).update(message).digest("hex");
}

export function verifyNotifySignature(
  payload: TelebirrNotifyPayload,
  signature: string | undefined
): boolean {
  if (!signature || typeof signature !== "string") return false;
  if (!isTelebirrConfigured()) return false;
  const expected = signNotify(payload);
  try {
    const a = Buffer.from(expected, "hex");
    const b = Buffer.from(signature.trim(), "hex");
    if (a.length !== b.length) return false;
    return crypto.timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

async function liveCreateOrder(
  input: TelebirrCreateOrderInput
): Promise<TelebirrCreateOrderResult> {
  assertTelebirrConfigured();

  const apiBase = (
    process.env.TELEBIRR_API_BASE ||
    "https://app.ethiomobilemoney.et:38443/apiaccess/payment/v1"
  ).replace(/\/$/, "");

  const appId = process.env.TELEBIRR_APP_ID!.trim();
  const appKey = process.env.TELEBIRR_APP_KEY!.trim();
  const shortCode = process.env.TELEBIRR_SHORT_CODE!.trim();
  const timestamp = Date.now().toString();
  const nonce = crypto.randomBytes(8).toString("hex");

  const body = {
    appId,
    shortCode,
    nonce,
    notifyUrl: input.notifyUrl,
    outTradeNo: input.merchantOrderId,
    subject: input.title,
    totalAmount: String(input.amount),
    receiveName: shortCode,
    timeoutExpress: "10",
    timestamp,
    msisdn: input.phone.replace("+", ""),
  };

  const canonical = Object.keys(body)
    .sort()
    .map((k) => `${k}=${(body as Record<string, string>)[k]}`)
    .join("&");
  const sign = crypto
    .createHmac("sha256", appKey)
    .update(canonical)
    .digest("hex");

  const response = await fetch(`${apiBase}/createOrder`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-APP-Key": appKey,
      Authorization: sign,
    },
    body: JSON.stringify({ ...body, sign }),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(
      `Telebirr createOrder failed (${response.status}): ${text || response.statusText}`
    );
  }

  const data = (await response.json()) as Record<string, any>;
  const providerRef =
    data.tradeNo ||
    data.transactionId ||
    data.providerRef ||
    `TB-LIVE-${input.merchantOrderId}`;
  const phoneDigits = input.phone.replace(/\+/g, "");
  const ussdCode =
    data.ussdCode || `*806*1*${phoneDigits}*${input.amount}#`;
  const qrData =
    data.qrCode ||
    data.toPayUrl ||
    `telebirr://pay?merchant=${encodeURIComponent(shortCode)}&ref=${providerRef}&order=${input.merchantOrderId}&amount=${input.amount}&currency=${input.currency}`;

  return {
    providerRef: String(providerRef),
    ussdCode: String(ussdCode),
    qrData: String(qrData),
    paymentUrl: data.toPayUrl ? String(data.toPayUrl) : undefined,
    mode: getMode(),
    raw: data,
  };
}

/**
 * Always hits Telebirr createOrder when configured.
 * Refuses to invent local fake orders — unpaid upgrades are impossible without API.
 */
export async function createTelebirrOrder(
  input: TelebirrCreateOrderInput
): Promise<TelebirrCreateOrderResult> {
  assertTelebirrConfigured();
  return liveCreateOrder(input);
}

export type ProviderOrderStatus = "Pending" | "Paid" | "Failed" | "Unknown";

/**
 * Query provider for order settlement. Requires configured Telebirr API.
 */
export async function queryTelebirrOrderStatus(opts: {
  merchantOrderId: string;
  providerRef?: string;
}): Promise<{ status: ProviderOrderStatus; amount?: number; raw?: Record<string, unknown> }> {
  assertTelebirrConfigured();

  const apiBase = (
    process.env.TELEBIRR_API_BASE ||
    "https://app.ethiomobilemoney.et:38443/apiaccess/payment/v1"
  ).replace(/\/$/, "");
  const appKey = process.env.TELEBIRR_APP_KEY!.trim();
  const appId = process.env.TELEBIRR_APP_ID!.trim();

  const response = await fetch(`${apiBase}/queryOrder`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-APP-Key": appKey,
    },
    body: JSON.stringify({
      appId,
      outTradeNo: opts.merchantOrderId,
      tradeNo: opts.providerRef,
    }),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(
      `Telebirr queryOrder failed (${response.status}): ${text || response.statusText}`
    );
  }

  const data = (await response.json()) as Record<string, any>;
  const rawStatus = String(
    data.tradeStatus || data.status || data.paymentStatus || ""
  ).toUpperCase();

  let status: ProviderOrderStatus = "Unknown";
  if (
    ["SUCCESS", "PAID", "COMPLETED", "TRADE_SUCCESS"].includes(rawStatus) ||
    data.status === "Paid"
  ) {
    status = "Paid";
  } else if (["FAILED", "CANCELLED", "CANCELED", "CLOSED"].includes(rawStatus)) {
    status = "Failed";
  } else if (["PENDING", "WAIT_BUYER_PAY", "PROCESSING", "INIT"].includes(rawStatus)) {
    status = "Pending";
  }

  const amount = data.totalAmount != null ? Number(data.totalAmount) : undefined;
  return { status, amount, raw: data };
}

export function getTelebirrMode(): TelebirrMode {
  return getMode();
}

export function getTelebirrConfigStatus() {
  return {
    configured: isTelebirrConfigured(),
    mode: getMode(),
    missingEnv: getMissingTelebirrEnvVars(),
    sandboxSimulationAllowed: isSandboxSimulationAllowed(),
  };
}
