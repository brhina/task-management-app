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

function getMode(): TelebirrMode {
  const mode = (process.env.TELEBIRR_MODE || "sandbox").toLowerCase();
  if (mode === "live") {
    const hasCreds =
      process.env.TELEBIRR_APP_ID &&
      process.env.TELEBIRR_APP_KEY &&
      process.env.TELEBIRR_SHORT_CODE;
    if (!hasCreds) {
      console.warn(
        "[telebirr] TELEBIRR_MODE=live but credentials missing; falling back to sandbox"
      );
      return "sandbox";
    }
    return "live";
  }
  return "sandbox";
}

export function isSandboxMode(): boolean {
  return getMode() === "sandbox";
}

export function getNotifySecret(): string {
  return (
    process.env.TELEBIRR_NOTIFY_SECRET ||
    (process.env.NODE_ENV === "production"
      ? ""
      : process.env.JWT_SECRET || "dev_telebirr_notify_secret")
  );
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
  const secret = getNotifySecret();
  if (!secret) {
    throw new Error("TELEBIRR_NOTIFY_SECRET is required to sign notify payloads");
  }
  const message = `${payload.merchantOrderId}|${payload.amount}|${payload.status}`;
  return crypto.createHmac("sha256", secret).update(message).digest("hex");
}

export function verifyNotifySignature(
  payload: TelebirrNotifyPayload,
  signature: string | undefined
): boolean {
  if (!signature || typeof signature !== "string") return false;
  const secret = getNotifySecret();
  if (!secret) return false;
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

function sandboxCreateOrder(
  input: TelebirrCreateOrderInput
): TelebirrCreateOrderResult {
  const phoneDigits = input.phone.replace(/\+/g, "");
  const providerRef = `TB-SBX-${Date.now().toString(36).toUpperCase()}-${crypto
    .randomBytes(3)
    .toString("hex")
    .toUpperCase()}`;
  const ussdCode = `*806*1*${phoneDigits}*${input.amount}#`;
  const qrData = `telebirr://pay?merchant=${encodeURIComponent(
    process.env.TELEBIRR_SHORT_CODE || "TASKMGMT_SANDBOX"
  )}&ref=${providerRef}&order=${input.merchantOrderId}&amount=${input.amount}&currency=${input.currency}`;

  return {
    providerRef,
    ussdCode,
    qrData,
    mode: "sandbox",
    raw: { sandbox: true, merchantOrderId: input.merchantOrderId },
  };
}

async function liveCreateOrder(
  input: TelebirrCreateOrderInput
): Promise<TelebirrCreateOrderResult> {
  const apiBase = (
    process.env.TELEBIRR_API_BASE ||
    "https://app.ethiomobilemoney.et:38443/apiaccess/payment/v1"
  ).replace(/\/$/, "");

  const appId = process.env.TELEBIRR_APP_ID!;
  const appKey = process.env.TELEBIRR_APP_KEY!;
  const shortCode = process.env.TELEBIRR_SHORT_CODE!;
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
    mode: "live",
    raw: data,
  };
}

export async function createTelebirrOrder(
  input: TelebirrCreateOrderInput
): Promise<TelebirrCreateOrderResult> {
  if (getMode() === "live") {
    return liveCreateOrder(input);
  }
  return sandboxCreateOrder(input);
}

export function getTelebirrMode(): TelebirrMode {
  return getMode();
}
