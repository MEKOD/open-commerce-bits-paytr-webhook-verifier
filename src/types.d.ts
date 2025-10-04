// src/types.d.ts
declare global {
  namespace Express {
    interface Request {
      rawBody?: Buffer;
      paytr?: unknown;
    }
  }
}
export {};
