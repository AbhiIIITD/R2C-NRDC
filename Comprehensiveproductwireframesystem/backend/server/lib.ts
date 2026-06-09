import crypto from "node:crypto";
import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { UserRole } from "@prisma/client";
import { config } from "./config.js";
import { prisma } from "./prisma.js";

export class ApiError extends Error {
  constructor(public status: number, public code: string, message: string) {
    super(message);
  }
}

export const asyncRoute =
  (handler: (req: Request, res: Response, next: NextFunction) => Promise<unknown>) =>
  (req: Request, res: Response, next: NextFunction) =>
    Promise.resolve(handler(req, res, next)).catch(next);

export function signAccessToken(user: { id: string; role: UserRole; companyId?: string | null }) {
  return jwt.sign(
    { role: user.role, companyId: user.companyId || null },
    config.accessSecret,
    { subject: user.id, expiresIn: config.accessTtl as jwt.SignOptions["expiresIn"] },
  );
}

export function newRefreshToken() {
  return crypto.randomBytes(48).toString("base64url");
}

export function hashToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export function authenticate(req: Request, _res: Response, next: NextFunction) {
  const token = req.headers.authorization?.replace(/^Bearer\s+/i, "");
  if (!token) return next(new ApiError(401, "UNAUTHENTICATED", "Authentication required"));
  try {
    const payload = jwt.verify(token, config.accessSecret) as jwt.JwtPayload & {
      role: UserRole;
      companyId?: string | null;
    };
    req.auth = { userId: payload.sub!, role: payload.role, companyId: payload.companyId };
    next();
  } catch {
    next(new ApiError(401, "INVALID_TOKEN", "Access token is invalid or expired"));
  }
}

export const requireRole =
  (...roles: UserRole[]) =>
  (req: Request, _res: Response, next: NextFunction) =>
    req.auth && roles.includes(req.auth.role)
      ? next()
      : next(new ApiError(403, "FORBIDDEN", "Insufficient permission"));

export async function notify(
  tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0],
  userId: string,
  type: string,
  title: string,
  message: string,
  relatedType?: string,
  relatedId?: string,
) {
  return tx.notification.create({ data: { userId, type, title, message, relatedType, relatedId } });
}

export async function audit(
  tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0],
  actorId: string | undefined,
  action: string,
  entityType: string,
  entityId?: string,
  after?: object,
) {
  return tx.auditLog.create({ data: { actorId, action, entityType, entityId, after } });
}

