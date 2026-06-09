import "dotenv/config";

const clientOrigins = (process.env.CLIENT_ORIGIN || "http://localhost:5173,http://127.0.0.1:5173")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

// Allow localhost plus any private-LAN address (any port), so the app is
// reachable from other devices on the network without listing every IP.
const lanOrigin = /^https?:\/\/(localhost|127\.\d+\.\d+\.\d+|10\.\d+\.\d+\.\d+|192\.168\.\d+\.\d+|172\.(1[6-9]|2\d|3[01])\.\d+\.\d+)(:\d+)?$/;

export const config = {
  port: Number(process.env.PORT || 4000),
  clientOrigins,
  isAllowedOrigin: (origin: string) => clientOrigins.includes(origin) || lanOrigin.test(origin),
  accessSecret: process.env.JWT_ACCESS_SECRET || "development-only-secret-change-me",
  accessTtl: process.env.ACCESS_TOKEN_TTL || "15m",
  refreshDays: Number(process.env.REFRESH_TOKEN_DAYS || 30),
  storageRoot: process.env.STORAGE_ROOT || "./storage",
};
