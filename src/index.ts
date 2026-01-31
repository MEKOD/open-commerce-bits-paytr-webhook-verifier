// src/index.ts
import express from "express";
import bodyParser from "body-parser";
import dotenv from "dotenv";
dotenv.config();
import { verifyPaytr } from "./paytr.ts";

const app = express();


app.use(bodyParser.urlencoded({
  extended: false,
  verify: (_req: any, _res, buf: Buffer) => { (_req as any).rawBody = buf; }
}));

// Basit kontrol
app.get("/health", (_req, res) => res.status(200).send("ok"));

// Webhook endpoint (yalnızca doğrulanan çağrılar geçer)
app.post("/webhooks/paytr", verifyPaytr, (req: any, res) => {
  // Ağır işleri kuyruk/async servise devretmen önerilir.
  console.log("[paytr] verified:", req.paytr);
  res.status(200).send("ok");
});

// 404
app.use((_req, res) => res.status(404).send("not found"));

// Hata yakalayıcı
app.use((err: any, _req: any, res: any, _next: any) => {
  console.error("[error]", err);
  // Webhooklarda 200 dönmek isteyebilirsin; burada 500 bırakıldı.
  res.status(500).send("internal");
});

const port = Number(process.env.PORT ?? 3000);
const server = app.listen(port, () => console.log("server up on", port));

// shutdowmn
const shut = (sig: string) => () => {
  console.log(`\n${sig} received, closing...`);
  server.close(() => {
    console.log("closed.");
    process.exit(0);
  });
};
process.on("SIGINT", shut("SIGINT"));
process.on("SIGTERM", shut("SIGTERM"));
