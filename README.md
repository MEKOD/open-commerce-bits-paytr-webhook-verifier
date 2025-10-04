# PayTR Webhook Verifier

Bu paket, **PayTR** ödeme altyapısından gelen callback/webhook isteklerini **HMAC imzası** ve **idempotency kontrolü** ile güvenle doğrulamak için geliştirilmiş bir **Express.js middleware**’idir.

## ✨ Özellikler

* 🔒 **HMAC-SHA256 imza doğrulama** (PayTR `merchant_key` + `merchant_salt` ile)
* 🛑 **Replay attack koruması** (raw body hash + 5 dk pencere)
* ♻️ **Idempotent işlem desteği** (aynı `merchant_oid` tekrar işlenmez)
* 📦 **TypeScript desteği** (tip tanımları dahil)
* ⚡ Minimal bağımlılıklar: sadece `express`, `dotenv`

## 🚀 Kurulum

```bash
npm install paytr-webhook-verifier
```

veya kendi projenizde:

```bash
npm install
```

## 🔧 Kullanım

```ts
import express from "express";
import bodyParser from "body-parser";
import dotenv from "dotenv";
dotenv.config();

import { verifyPaytr } from "./paytr";

const app = express();

// rawBody yakala
app.use(bodyParser.json({ verify: (req: any, _res, buf) => {
  (req as any).rawBody = buf;
}}));

app.post("/webhooks/paytr", verifyPaytr, (req, res) => {
  console.log("Doğrulandı:", req.paytr);
  res.status(200).send("ok");
});

app.listen(3000, () => console.log("PayTR webhook verifier up on 3000"));
```

## ⚙️ Ortam Değişkenleri

`.env` dosyası:

```env
PORT=3000
PAYTR_MERCHANT_KEY=changeme
PAYTR_MERCHANT_SALT=changeme
```

Örnek için `.env.example` repoda mevcut.

## 🧪 Test

Webhook doğrulamasını test etmek için:

```bash
curl -X POST http://localhost:3000/webhooks/paytr \
  -H "Content-Type: application/x-www-form-urlencoded" \
  --data "merchant_oid=ORD-12345&status=success&total_amount=100.00&hash=<geçerli-imza>"
```

## 📄 Lisans

MIT

---

> 🔗 Proje: [MEKOD / open-commerce-bits-paytr-webhook-verifier](https://github.com/MEKOD/open-commerce-bits-paytr-webhook-verifier)
