// src/paytr.ts
import crypto from "node:crypto";

const REPLAY_WINDOW_MS = 5 * 60 * 1000; // 5 dk
const seenFingerprint = new Map<string, number>(); // kısa süreli raw replay guard
const seenOid = new Map<string, number>(); // idempotency (merchant_oid)

function timingSafeCompare(a: string, b: string) {
  try {
    const ab = Buffer.from(a, "utf8");
    const bb = Buffer.from(b, "utf8");
    if (ab.length !== bb.length) return false;
    return crypto.timingSafeEqual(ab, bb);
  } catch {
    return false;
  }
}

function hmacBase64(data: string, key: string) {
  return crypto.createHmac("sha256", key).update(data, "utf8").digest("base64");
}

/**
 * PayTR hash baz metni.
 * Varsayılan sıra örnektir; PAYTR_HASH_FIELDS ile **dokümandaki kesin sırayı** ver:
 *   PAYTR_HASH_FIELDS="merchant_oid,status,total_amount"
 */
function buildHashBaseFromBody(body: Record<string, any>, salt: string) {
  const DEFAULT_ORDER = ["merchant_oid", "status", "total_amount"]; // örnek
  const orderEnv = process.env.PAYTR_HASH_FIELDS;
  const order = orderEnv
    ? orderEnv.split(",").map((s) => s.trim()).filter(Boolean)
    : DEFAULT_ORDER;

  const parts = order.map((k) => String(body?.[k] ?? "").trim());
  parts.push(salt);
  return parts.join("");
}

export function verifyPaytr(req: any, res: any, next: any) {
  const key = process.env.PAYTR_MERCHANT_KEY || "";
  const salt = process.env.PAYTR_MERCHANT_SALT || "";
  if (!key || !salt) return res.status(500).send("misconfig");

  // Hash genelde body.hash ile gelir; bazı kurulumlarda header kullanılabilir
  const provided: string | undefined = req.body?.hash || req.get("X-Paytr-Hash");
  if (!provided) return res.status(400).send("missing hash");

  // HMAC doğrulama (doküman sırasına göre base oluştur)
  const base = buildHashBaseFromBody(req.body ?? {}, salt);
  const calc = hmacBase64(base, key);
  if (!timingSafeCompare(calc, provided)) return res.status(400).send("bad signature");

  // Idempotency: merchant_oid ile tek seferlik işleme
  const oid = String(req.body?.merchant_oid ?? "");
  const now = Date.now();
  if (oid) {
    if (seenOid.has(oid)) return res.status(200).send("duplicate-oid");
    seenOid.set(oid, now);
  }

  // Replay guard: raw body fingerprint
  const fp = crypto.createHash("sha256").update(req.rawBody || Buffer.from("")).digest("hex");
  const last = seenFingerprint.get(fp);
  if (last && now - last < REPLAY_WINDOW_MS) return res.status(200).send("duplicate");
  seenFingerprint.set(fp, now);

  // Route'a doğrulanmış bilgi bırak
  req.paytr = { valid: true, payload: req.body, fingerprint: fp, merchant_oid: oid };
  return next();
}
