import "./types.js";
import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import bcrypt from "bcryptjs";
import multer from "multer";
import { z } from "zod";
import {
  InterestStatus,
  LicenseStatus,
  MeetingStatus,
  Prisma,
  StudyStatus,
  UserRole,
} from "@prisma/client";
import { config } from "./config.js";
import { prisma } from "./prisma.js";
import {
  ApiError,
  asyncRoute,
  audit,
  authenticate,
  hashToken,
  newRefreshToken,
  notify,
  requireRole,
  signAccessToken,
} from "./lib.js";
import { registerAiRoutes } from "./routes/ai.routes.js";

const app = express();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 25 * 1024 * 1024 } });
const api = express.Router();

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || config.isAllowedOrigin(origin)) return callback(null, true);
    callback(new ApiError(403, "CORS_FORBIDDEN", "Origin is not allowed"));
  },
  credentials: true,
}));
app.use(cookieParser());
app.use(express.json({ limit: "2mb" }));

const roleMap = { researcher: UserRole.RESEARCHER, industry: UserRole.INDUSTRY } as const;
const publicUser = (user: any) => ({
  id: user.id,
  email: user.email,
  name: user.name,
  role: user.role.toLowerCase(),
  organization: user.organization,
  companyId: user.companyId,
  phone: user.phone,
  avatar: user.avatar,
  createdAt: user.createdAt,
});
const publicInterest = (interest: any) => ({
  ...interest,
  industryUserId: interest.createdById,
  industryName: interest.company?.name || interest.industryName,
});
const publicMeeting = (meeting: any) => {
  const industryParticipant = meeting.participants?.find((participant: any) => participant.role === "industry");
  const researcherParticipant = meeting.participants?.find((participant: any) => participant.role === "researcher");
  const companyUser = meeting.company?.users?.find((user: any) => user.role === UserRole.INDUSTRY);
  return {
    ...meeting,
    researcherId: meeting.study?.researcherId || researcherParticipant?.userId,
    industryUserId: industryParticipant?.userId || meeting.interest?.createdById || companyUser?.id,
  };
};
const publicLicense = (license: any) => {
  const signedFile = license.agreements
    ?.flatMap((agreement: any) => agreement.files || [])
    .find((agreementFile: any) => agreementFile.kind === "SIGNED");
  return {
    ...license,
    industryUserId: license.requestedById,
    signedAgreementFileName: signedFile?.file?.originalName,
    signedAgreementContent: signedFile
      ? `Signed agreement uploaded: ${signedFile.file.originalName}\nStored object: ${signedFile.file.storageKey}\nSize: ${signedFile.file.size} bytes\nChecksum: ${signedFile.file.checksum}`
      : undefined,
  };
};
const parse = <T>(schema: z.ZodType<T>, input: unknown) => {
  const result = schema.safeParse(input);
  if (!result.success) throw new ApiError(400, "VALIDATION_ERROR", result.error.issues[0]?.message || "Invalid request");
  return result.data;
};
const requireCompany = (companyId?: string | null) => {
  if (!companyId) throw new ApiError(403, "COMPANY_REQUIRED", "Industry user is not linked to a company");
  return companyId;
};
const parseJsonArray = (value: unknown) => {
  if (Array.isArray(value)) return value;
  if (typeof value !== "string") return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : value.split(",").map((item) => item.trim()).filter(Boolean);
  } catch {
    return value.split(",").map((item) => item.trim()).filter(Boolean);
  }
};
const searchText = (value: unknown) => typeof value === "string" && value.trim() ? value.trim() : undefined;
const searchContains = (value: string) => ({ contains: value, mode: "insensitive" as const });
const storagePath = (storageKey: string) => path.resolve(config.storageRoot, storageKey);
async function persistFile(buffer: Buffer, storageKey: string) {
  const target = storagePath(storageKey);
  await fs.mkdir(path.dirname(target), { recursive: true });
  await fs.writeFile(target, buffer);
}
async function streamFile(res: express.Response, file: { storageKey: string; originalName: string; mimeType: string }) {
  res.setHeader("Content-Type", file.mimeType || "application/octet-stream");
  res.setHeader("Content-Disposition", `attachment; filename="${encodeURIComponent(file.originalName)}"`);
  res.sendFile(storagePath(file.storageKey));
}
const fileRecord = (file: Express.Multer.File, uploaderId: string, storageKey: string, id = crypto.randomUUID()) => ({
  id,
  uploaderId,
  storageKey,
  originalName: file.originalname,
  mimeType: file.mimetype || "application/octet-stream",
  size: file.size,
  checksum: crypto.createHash("sha256").update(file.buffer).digest("hex"),
});
// In production the frontend (static site) and API live on different origins,
// so the refresh cookie must be SameSite=None + Secure to be sent on the
// cross-site /auth/refresh fetch. Locally we stay on SameSite=Lax over http.
const crossSiteCookies = process.env.NODE_ENV === "production";
const refreshCookie = (res: express.Response, token: string) =>
  res.cookie("refreshToken", token, {
    httpOnly: true,
    sameSite: crossSiteCookies ? "none" : "lax",
    secure: crossSiteCookies,
    maxAge: config.refreshDays * 86400000,
  });

async function createSession(user: any, req: express.Request, res: express.Response) {
  const refreshToken = newRefreshToken();
  await prisma.session.create({
    data: {
      userId: user.id,
      refreshTokenHash: hashToken(refreshToken),
      device: req.headers["user-agent"],
      ipAddress: req.ip,
      expiresAt: new Date(Date.now() + config.refreshDays * 86400000),
    },
  });
  refreshCookie(res, refreshToken);
  return { accessToken: signAccessToken(user), user: publicUser(user) };
}

api.get("/health", (_req, res) => res.json({ success: true, data: { status: "ok" } }));

// Lightweight keep-alive endpoint (no DB) hit by the self-pinger below to stop the
// host (e.g. Render free tier) from spinning the service down between requests.
api.get("/ping", (_req, res) => res.json({ success: true, data: { pong: true, at: new Date().toISOString() } }));

// Public, unauthenticated landing-page statistics — all derived from real data.
api.get("/public/stats", asyncRoute(async (_req, res) => {
  const [publishedStudies, industryPartners, activeCollaborations, technologiesLicensed, researchers] = await Promise.all([
    prisma.study.count({ where: { status: StudyStatus.PUBLISHED } }),
    prisma.company.count(),
    prisma.interest.count(),
    prisma.licenseRequest.count({ where: { status: { in: [LicenseStatus.AGREEMENT_EXECUTED, LicenseStatus.COMMERCIALIZED] } } }),
    prisma.user.count({ where: { role: UserRole.RESEARCHER, status: "ACTIVE" } }),
  ]);
  res.json({ success: true, data: { publishedStudies, industryPartners, activeCollaborations, technologiesLicensed, researchers } });
}));

api.post("/auth/login", asyncRoute(async (req, res) => {
  const body = parse(z.object({ email: z.string().email(), password: z.string().min(1) }), req.body);
  const user = await prisma.user.findUnique({ where: { email: body.email.toLowerCase() } });
  if (!user || user.status !== "ACTIVE" || !(await bcrypt.compare(body.password, user.passwordHash))) {
    throw new ApiError(401, "INVALID_CREDENTIALS", "Invalid email or password");
  }
  await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
  const session = await createSession(user, req, res);
  res.json({ success: true, data: session });
}));

api.post("/auth/signup", asyncRoute(async (req, res) => {
  const body = parse(z.object({
    email: z.string().email(),
    password: z.string().min(8),
    name: z.string().min(2),
    role: z.enum(["researcher", "industry"]),
    organization: z.string().min(2),
    tier: z.string().optional(),
    tierData: z.record(z.string(), z.unknown()).optional(),
  }), req.body);
  if (body.role === "industry" && (body.tier || body.tierData)) {
    throw new ApiError(409, "TIER_SPEC_REQUIRED", "Tier onboarding is disabled until the required tier specification is supplied");
  }
  const passwordHash = await bcrypt.hash(body.password, 12);
  const user = await prisma.$transaction(async (tx) => {
    const company = body.role === "industry"
      ? await tx.company.create({ data: { name: body.organization } })
      : null;
    return tx.user.create({
      data: {
        email: body.email.toLowerCase(),
        passwordHash,
        name: body.name,
        role: roleMap[body.role],
        organization: body.organization,
        companyId: company?.id,
      },
    });
  }).catch((error: any) => {
    if (error.code === "P2002") throw new ApiError(409, "ALREADY_EXISTS", "Email or company already exists");
    throw error;
  });
  res.status(201).json({ success: true, data: await createSession(user, req, res) });
}));

api.post("/auth/refresh", asyncRoute(async (req, res) => {
  const token = req.cookies.refreshToken;
  if (!token) throw new ApiError(401, "REFRESH_REQUIRED", "Refresh token required");
  const session = await prisma.session.findUnique({ where: { refreshTokenHash: hashToken(token) }, include: { user: true } });
  if (!session || session.revokedAt || session.expiresAt <= new Date()) throw new ApiError(401, "INVALID_REFRESH", "Refresh token invalid");
  const replacement = newRefreshToken();
  await prisma.session.update({
    where: { id: session.id },
    data: { refreshTokenHash: hashToken(replacement), expiresAt: new Date(Date.now() + config.refreshDays * 86400000) },
  });
  refreshCookie(res, replacement);
  res.json({ success: true, data: { accessToken: signAccessToken(session.user), user: publicUser(session.user) } });
}));

api.post("/auth/logout", asyncRoute(async (req, res) => {
  const token = req.cookies.refreshToken;
  if (token) await prisma.session.updateMany({ where: { refreshTokenHash: hashToken(token) }, data: { revokedAt: new Date() } });
  res
    .clearCookie("refreshToken", {
      httpOnly: true,
      sameSite: crossSiteCookies ? "none" : "lax",
      secure: crossSiteCookies,
    })
    .json({ success: true, data: null });
}));

api.post("/auth/forgot-password", asyncRoute(async (req, res) => {
  parse(z.object({ email: z.string().email() }), req.body);
  res.json({ success: true, data: { message: "If the account exists, reset instructions will be sent." } });
}));

api.get("/auth/me", authenticate, asyncRoute(async (req, res) => {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: req.auth!.userId } });
  res.json({ success: true, data: publicUser(user) });
}));

api.use(authenticate);

api.get("/studies", asyncRoute(async (req, res) => {
  const where: Prisma.StudyWhereInput = {};
  const q = searchText(req.query.q);
  if (req.auth!.role === UserRole.RESEARCHER) where.researcherId = req.auth!.userId;
  if (req.auth!.role === UserRole.INDUSTRY) where.status = StudyStatus.PUBLISHED;
  if (typeof req.query.status === "string") where.status = req.query.status.toUpperCase() as StudyStatus;
  if (typeof req.query.domain === "string" && req.query.domain !== "all") where.domain = req.query.domain;
  if (q) where.OR = [
    { title: searchContains(q) },
    { abstract: searchContains(q) },
    { domain: searchContains(q) },
    { keywords: { has: q } },
  ];
  const items = await prisma.study.findMany({ where, orderBy: { updatedAt: "desc" } });
  res.json({ success: true, data: items });
}));

api.get("/marketplace/technologies", requireRole(UserRole.INDUSTRY, UserRole.ADMIN), asyncRoute(async (req, res) => {
  const q = searchText(req.query.q);
  const domain = typeof req.query.domain === "string" && req.query.domain !== "all" ? req.query.domain : undefined;
  const items = await prisma.study.findMany({
    where: {
      status: StudyStatus.PUBLISHED,
      listing: { active: true },
      ...(domain ? { domain } : {}),
      ...(q ? { OR: [{ title: searchContains(q) }, { abstract: searchContains(q) }, { domain: searchContains(q) }, { keywords: { has: q } }] } : {}),
    },
    orderBy: { publishedAt: "desc" },
  });
  res.json({ success: true, data: items });
}));

api.get("/marketplace/domains", requireRole(UserRole.INDUSTRY, UserRole.ADMIN), asyncRoute(async (_req, res) => {
  const domains = await prisma.study.findMany({
    where: { status: StudyStatus.PUBLISHED, listing: { active: true } },
    distinct: ["domain"],
    select: { domain: true },
    orderBy: { domain: "asc" },
  });
  res.json({ success: true, data: domains.map((item) => item.domain) });
}));

api.get("/studies/:id", asyncRoute(async (req, res) => {
  const study = await prisma.study.findUnique({ where: { id: String(req.params.id) }, include: { documents: { include: { file: true } } } });
  if (!study) throw new ApiError(404, "NOT_FOUND", "Study not found");
  if (req.auth!.role === UserRole.RESEARCHER && study.researcherId !== req.auth!.userId) throw new ApiError(403, "FORBIDDEN", "Not your study");
  if (req.auth!.role === UserRole.INDUSTRY && study.status !== StudyStatus.PUBLISHED) throw new ApiError(403, "FORBIDDEN", "Technology is not published");
  res.json({ success: true, data: study });
}));

api.post("/studies", requireRole(UserRole.RESEARCHER), upload.single("file"), asyncRoute(async (req, res) => {
  const body = parse(z.object({
    id: z.string().optional(),
    title: z.string().min(3), abstract: z.string().min(10), domain: z.string().min(2),
    trl: z.coerce.number().int().min(1).max(9), keywords: z.preprocess(parseJsonArray, z.array(z.string())).default([]),
    commercialPotential: z.string().optional(), marketSize: z.string().optional(),
    competitors: z.string().optional(), ipStatus: z.string().optional(),
    status: z.enum(["draft", "submitted"]).default("draft"),
  }), req.body);
  const actor = await prisma.user.findUniqueOrThrow({ where: { id: req.auth!.userId } });
  const study = await prisma.$transaction(async (tx) => {
    const { id, status, ...studyData } = body;
    const created = await tx.study.create({ data: { id, ...studyData, status: status.toUpperCase() as StudyStatus, researcherId: actor.id, researcherName: actor.name } });
    if (req.file) {
      const fileId = crypto.randomUUID();
      const storageKey = `studies/${created.id}/${fileId}`;
      await persistFile(req.file.buffer, storageKey);
      const file = await tx.fileObject.create({ data: fileRecord(req.file, actor.id, storageKey, fileId) });
      await tx.studyDocument.create({ data: { studyId: created.id, fileId: file.id, purpose: "research_document" } });
    }
    if (created.status === StudyStatus.SUBMITTED) {
      await tx.studyReview.create({ data: { studyId: created.id } });
      const admins = await tx.user.findMany({ where: { role: UserRole.ADMIN, status: "ACTIVE" } });
      await Promise.all(admins.map((admin) => notify(tx, admin.id, "study_submitted", "Study submitted", created.title, "study", created.id)));
    }
    await audit(tx, actor.id, `study.${body.status}`, "Study", created.id, created);
    return created;
  });
  res.status(201).json({ success: true, data: study });
}));

api.post("/studies/:id/documents", requireRole(UserRole.RESEARCHER), upload.single("file"), asyncRoute(async (req, res) => {
  if (!req.file) throw new ApiError(400, "FILE_REQUIRED", "Research document file required");
  const study = await prisma.study.findUnique({ where: { id: String(req.params.id) }, include: { documents: true } });
  if (!study || study.researcherId !== req.auth!.userId) throw new ApiError(404, "NOT_FOUND", "Study not found");
  const fileId = crypto.randomUUID();
  const storageKey = `studies/${study.id}/${fileId}`;
  await persistFile(req.file.buffer, storageKey);
  const document = await prisma.$transaction(async (tx) => {
    const file = await tx.fileObject.create({ data: fileRecord(req.file!, req.auth!.userId, storageKey, fileId) });
    const version = study.documents.filter((item) => item.purpose === "research_document").length + 1;
    const created = await tx.studyDocument.create({ data: { studyId: study.id, fileId: file.id, purpose: "research_document", version } });
    await audit(tx, req.auth!.userId, "study.document.upload", "StudyDocument", created.id, { fileId: file.id, studyId: study.id });
    return { ...created, file };
  });
  res.status(201).json({ success: true, data: document });
}));

api.get("/files/:id/download", asyncRoute(async (req, res) => {
  const file: any = await prisma.fileObject.findUnique({
    where: { id: String(req.params.id) },
    include: {
      studyDocuments: { include: { study: true } },
      agreementFiles: { include: { agreement: { include: { license: { include: { study: true } } } } } },
    },
  });
  if (!file) throw new ApiError(404, "NOT_FOUND", "File not found");
  const canReadStudy = file.studyDocuments.some((doc: any) =>
    req.auth!.role === UserRole.ADMIN ||
    doc.study.researcherId === req.auth!.userId ||
    doc.study.status === StudyStatus.PUBLISHED
  );
  const canReadAgreement = file.agreementFiles.some((agreementFile: any) =>
    req.auth!.role === UserRole.ADMIN ||
    agreementFile.agreement.license.companyId === req.auth!.companyId ||
    agreementFile.agreement.license.study.researcherId === req.auth!.userId
  );
  if (file.uploaderId !== req.auth!.userId && !canReadStudy && !canReadAgreement) throw new ApiError(403, "FORBIDDEN", "File access denied");
  await audit(prisma, req.auth!.userId, "file.download", "FileObject", file.id);
  await streamFile(res, file);
}));

api.patch("/studies/:id/submit", requireRole(UserRole.RESEARCHER), asyncRoute(async (req, res) => {
  const current = await prisma.study.findUnique({ where: { id: String(req.params.id) } });
  if (!current || current.researcherId !== req.auth!.userId) throw new ApiError(404, "NOT_FOUND", "Study not found");
  if (current.status !== StudyStatus.DRAFT && current.status !== StudyStatus.SUBMITTED) throw new ApiError(409, "INVALID_TRANSITION", "Study cannot be submitted");
  const study = await prisma.$transaction(async (tx) => {
    const updated = await tx.study.update({ where: { id: current.id }, data: { status: StudyStatus.SUBMITTED } });
    await tx.studyReview.upsert({ where: { id: current.id }, update: { status: "PENDING" }, create: { studyId: current.id } }).catch(() => tx.studyReview.create({ data: { studyId: current.id } }));
    const admins = await tx.user.findMany({ where: { role: UserRole.ADMIN, status: "ACTIVE" } });
    await Promise.all(admins.map((admin) => notify(tx, admin.id, "study_submitted", "Study submitted", updated.title, "study", updated.id)));
    await audit(tx, req.auth!.userId, "study.submit", "Study", updated.id, updated);
    return updated;
  });
  res.json({ success: true, data: study });
}));

api.post("/studies/:id/:decision", requireRole(UserRole.ADMIN), asyncRoute(async (req, res) => {
  const decision = String(req.params.decision);
  if (!["approve", "publish", "reject", "request-changes"].includes(decision)) throw new ApiError(404, "NOT_FOUND", "Study action not found");
  const current = await prisma.study.findUnique({ where: { id: String(req.params.id) } });
  if (!current) throw new ApiError(404, "NOT_FOUND", "Study not found");
  const status = ({ approve: StudyStatus.APPROVED, publish: StudyStatus.PUBLISHED, reject: StudyStatus.REJECTED, "request-changes": StudyStatus.SUBMITTED } as const)[decision];
  const publishableStatuses: StudyStatus[] = [StudyStatus.SUBMITTED, StudyStatus.UNDER_REVIEW, StudyStatus.APPROVED, StudyStatus.PUBLISHED];
  if (decision === "publish" && !publishableStatuses.includes(current.status)) throw new ApiError(409, "INVALID_TRANSITION", "Only reviewable studies can be published");
  const updated = await prisma.$transaction(async (tx) => {
    const study = await tx.study.update({
      where: { id: current.id },
      data: {
        status,
        approvedBy: decision === "approve" || decision === "publish" ? req.auth!.userId : current.approvedBy,
        approvedAt: decision === "approve" || decision === "publish" ? new Date() : current.approvedAt,
        publishedAt: decision === "publish" ? new Date() : current.publishedAt,
        rejectionReason: decision === "reject" ? String(req.body?.reason || "Rejected during review") : current.rejectionReason,
      },
    });
    if (decision === "publish") await tx.marketplaceListing.upsert({ where: { studyId: current.id }, update: { active: true, publishedBy: req.auth!.userId, publishedAt: new Date() }, create: { studyId: current.id, publishedBy: req.auth!.userId } });
    await notify(tx, current.researcherId, `study_${decision}`, `Study ${decision}`, current.title, "study", current.id);
    await audit(tx, req.auth!.userId, `study.${decision}`, "Study", current.id, study);
    return study;
  });
  res.json({ success: true, data: updated });
}));

api.post("/technologies/:id/interests", requireRole(UserRole.INDUSTRY), asyncRoute(async (req, res) => {
  const companyId = requireCompany(req.auth!.companyId);
  const body = parse(z.object({ id: z.string().optional() }).passthrough(), req.body || {});
  const study = await prisma.study.findUnique({ where: { id: String(req.params.id) } });
  const company = await prisma.company.findUnique({ where: { id: companyId } });
  if (!study || study.status !== StudyStatus.PUBLISHED || !company) throw new ApiError(404, "NOT_FOUND", "Published technology not found");
  const interest = await prisma.$transaction(async (tx) => {
    const created = await tx.interest.upsert({
      where: { studyId_companyId: { studyId: study.id, companyId } },
      update: {},
      create: { id: body.id, studyId: study.id, companyId, createdById: req.auth!.userId, industryName: company.name },
    });
    const admins = await tx.user.findMany({ where: { role: UserRole.ADMIN, status: "ACTIVE" } });
    await Promise.all([
      notify(tx, study.researcherId, "interest_received", "Industry interest received", `${company.name} expressed interest in ${study.title}`, "interest", created.id),
      ...admins.map((admin) => notify(tx, admin.id, "interest_received", "Industry interest received", `${company.name}: ${study.title}`, "interest", created.id)),
    ]);
    await audit(tx, req.auth!.userId, "interest.create", "Interest", created.id, created);
    return created;
  });
  res.status(201).json({ success: true, data: publicInterest({ ...interest, company }) });
}));

api.get("/interests", asyncRoute(async (req, res) => {
  const where: Prisma.InterestWhereInput = {};
  const q = searchText(req.query.q);
  if (req.auth!.role === UserRole.INDUSTRY) where.companyId = requireCompany(req.auth!.companyId);
  if (req.auth!.role === UserRole.RESEARCHER) where.study = { researcherId: req.auth!.userId };
  if (typeof req.query.status === "string" && req.query.status !== "all") where.status = req.query.status.toUpperCase() as InterestStatus;
  if (q) where.OR = [
    { industryName: searchContains(q) },
    { company: { name: searchContains(q) } },
    { study: { title: searchContains(q) } },
  ];
  const items = await prisma.interest.findMany({ where, include: { study: true, company: true }, orderBy: { updatedAt: "desc" } });
  res.json({ success: true, data: items.map(publicInterest) });
}));

api.patch("/interests/:id/status", requireRole(UserRole.ADMIN), asyncRoute(async (req, res) => {
  const body = parse(z.object({ status: z.enum(["interested", "meeting_scheduled", "discussion_approved", "license_requested", "licensed"]) }), req.body);
  const updated = await prisma.interest.update({ where: { id: String(req.params.id) }, data: { status: body.status.toUpperCase() as InterestStatus } });
  res.json({ success: true, data: updated });
}));

api.get("/problem-statements", asyncRoute(async (req, res) => {
  const where: Prisma.ProblemStatementWhereInput = {};
  const q = searchText(req.query.q);
  if (req.auth!.role === UserRole.INDUSTRY) where.companyId = requireCompany(req.auth!.companyId);
  if (typeof req.query.urgency === "string" && req.query.urgency !== "all") where.urgency = req.query.urgency;
  if (q) where.OR = [
    { title: searchContains(q) },
    { industrySector: searchContains(q) },
    { problemDescription: searchContains(q) },
    { keywords: { has: q } },
  ];
  const items = await prisma.problemStatement.findMany({ where, orderBy: { updatedAt: "desc" } });
  res.json({ success: true, data: items });
}));

api.post("/problem-statements", requireRole(UserRole.INDUSTRY), asyncRoute(async (req, res) => {
  const companyId = requireCompany(req.auth!.companyId);
  const company = await prisma.company.findUniqueOrThrow({ where: { id: companyId } });
  const body = parse(z.object({
    title: z.string().min(3), industrySector: z.string().min(2), problemDescription: z.string().min(5),
    currentChallenges: z.string().default(""), expectedSolution: z.string().default(""),
    budgetRange: z.string().default(""), urgency: z.string().default("medium"),
    contactPerson: z.string().default(""), keywords: z.array(z.string()).default([]),
  }), req.body);
  const created = await prisma.problemStatement.create({ data: { ...body, companyId, industryUserId: req.auth!.userId, industryName: company.name } });
  res.status(201).json({ success: true, data: created });
}));

api.patch("/problem-statements/:id", requireRole(UserRole.INDUSTRY), asyncRoute(async (req, res) => {
  const companyId = requireCompany(req.auth!.companyId);
  const current = await prisma.problemStatement.findFirst({ where: { id: String(req.params.id), companyId } });
  if (!current) throw new ApiError(404, "NOT_FOUND", "Problem statement not found");
  const body = parse(z.object({
    title: z.string().min(3), industrySector: z.string().min(2), problemDescription: z.string().min(5),
    currentChallenges: z.string(), expectedSolution: z.string(), budgetRange: z.string(),
    urgency: z.string(), contactPerson: z.string(), keywords: z.array(z.string()),
  }), req.body);
  res.json({ success: true, data: await prisma.problemStatement.update({ where: { id: current.id }, data: body }) });
}));

api.delete("/problem-statements/:id", requireRole(UserRole.INDUSTRY, UserRole.ADMIN), asyncRoute(async (req, res) => {
  const where: Prisma.ProblemStatementWhereInput = { id: String(req.params.id) };
  if (req.auth!.role === UserRole.INDUSTRY) where.companyId = requireCompany(req.auth!.companyId);
  const current = await prisma.problemStatement.findFirst({ where });
  if (!current) throw new ApiError(404, "NOT_FOUND", "Problem statement not found");
  await prisma.problemStatement.delete({ where: { id: current.id } });
  res.json({ success: true, data: null });
}));

api.post("/meetings", requireRole(UserRole.INDUSTRY, UserRole.ADMIN), asyncRoute(async (req, res) => {
  const body = parse(z.object({ id: z.string().optional(), studyId: z.string(), interestId: z.string().nullish(), proposedDate: z.coerce.date().nullish(), scheduledDate: z.coerce.date().nullish(), meetingLink: z.string().nullish(), notes: z.string().nullish() }), req.body);
  let companyId = req.auth!.role === UserRole.INDUSTRY ? requireCompany(req.auth!.companyId) : (req.body?.companyId as string | undefined);
  if (!companyId && body.interestId) {
    const interest = await prisma.interest.findUnique({ where: { id: body.interestId } });
    companyId = interest?.companyId;
  }
  if (!companyId) throw new ApiError(400, "COMPANY_REQUIRED", "Company is required to create a meeting");
  const study = await prisma.study.findUnique({ where: { id: body.studyId } });
  if (!study) throw new ApiError(404, "NOT_FOUND", "Study not found");
  const meeting = await prisma.$transaction(async (tx) => {
    const companyUsers = await tx.user.findMany({ where: { companyId, role: UserRole.INDUSTRY, status: "ACTIVE" }, take: 1 });
    const created = await tx.meeting.create({ data: { ...body, status: body.scheduledDate ? MeetingStatus.SCHEDULED : MeetingStatus.PENDING, companyId } });
    await tx.meetingParticipant.createMany({ data: [
      { meetingId: created.id, userId: study.researcherId, role: "researcher" },
      { meetingId: created.id, userId: req.auth!.role === UserRole.INDUSTRY ? req.auth!.userId : companyUsers[0]?.id || req.auth!.userId, role: "industry" },
    ], skipDuplicates: true });
    const admins = await tx.user.findMany({ where: { role: UserRole.ADMIN, status: "ACTIVE" } });
    await Promise.all(admins.map((admin) => notify(tx, admin.id, "meeting_requested", "Meeting requested", study.title, "meeting", created.id)));
    await audit(tx, req.auth!.userId, "meeting.create", "Meeting", created.id, created);
    return created;
  });
  const created = await prisma.meeting.findUnique({ where: { id: meeting.id }, include: { study: true, company: { include: { users: true } }, participants: true, interest: true } });
  res.status(201).json({ success: true, data: publicMeeting(created) });
}));

api.get("/meetings", asyncRoute(async (req, res) => {
  const where: Prisma.MeetingWhereInput = {};
  const q = searchText(req.query.q);
  if (req.auth!.role === UserRole.INDUSTRY) where.companyId = requireCompany(req.auth!.companyId);
  if (req.auth!.role === UserRole.RESEARCHER) where.study = { researcherId: req.auth!.userId };
  if (typeof req.query.status === "string" && req.query.status !== "all") where.status = req.query.status.toUpperCase() as MeetingStatus;
  if (q) where.OR = [
    { notes: searchContains(q) },
    { meetingLink: searchContains(q) },
    { company: { name: searchContains(q) } },
    { study: { title: searchContains(q) } },
    { study: { researcherName: searchContains(q) } },
  ];
  const items = await prisma.meeting.findMany({ where, include: { study: true, company: { include: { users: true } }, participants: true, interest: true }, orderBy: { updatedAt: "desc" } });
  res.json({ success: true, data: items.map(publicMeeting) });
}));

api.patch(["/meetings/:id/schedule", "/meetings/:id/complete", "/meetings/:id/cancel"], requireRole(UserRole.ADMIN), asyncRoute(async (req, res) => {
  const action = req.path.split("/").at(-1) || "";
  if (!["schedule", "complete", "cancel"].includes(action)) throw new ApiError(404, "NOT_FOUND", "Meeting action not found");
  const current: any = await prisma.meeting.findUnique({ where: { id: String(req.params.id) }, include: { study: true, company: { include: { users: true } } } });
  if (!current) throw new ApiError(404, "NOT_FOUND", "Meeting not found");
  const status = action === "schedule" ? MeetingStatus.SCHEDULED : action === "complete" ? MeetingStatus.COMPLETED : MeetingStatus.CANCELLED;
  const meeting = await prisma.$transaction(async (tx) => {
    const updated = await tx.meeting.update({ where: { id: current.id }, data: { status, scheduledDate: action === "schedule" ? new Date(req.body.scheduledDate || Date.now()) : current.scheduledDate, meetingLink: req.body.meetingLink || current.meetingLink } });
    if (current.interestId && action === "schedule") await tx.interest.update({ where: { id: current.interestId }, data: { status: InterestStatus.MEETING_SCHEDULED } });
    const recipients = [current.study.researcherId, ...current.company.users.map((user: any) => user.id)];
    await Promise.all(recipients.map((id) => notify(tx, id, `meeting_${action}`, `Meeting ${action}d`, current.study.title, "meeting", current.id)));
    await audit(tx, req.auth!.userId, `meeting.${action}`, "Meeting", current.id, updated);
    return updated;
  });
  res.json({ success: true, data: meeting });
}));

api.patch("/meetings/:id/status", asyncRoute(async (req, res) => {
  const body = parse(z.object({ status: z.enum(["pending", "approved", "scheduled", "completed", "cancelled"]), scheduledDate: z.coerce.date().nullish(), meetingLink: z.string().nullish() }), req.body);
  const current = await prisma.meeting.findUnique({ where: { id: String(req.params.id) }, include: { study: true } });
  if (!current) throw new ApiError(404, "NOT_FOUND", "Meeting not found");
  const participant = await prisma.meetingParticipant.findFirst({ where: { meetingId: current.id, userId: req.auth!.userId } });
  if (req.auth!.role !== UserRole.ADMIN && !participant) throw new ApiError(403, "FORBIDDEN", "Not a meeting participant");
  const updated = await prisma.meeting.update({ where: { id: current.id }, data: { status: body.status.toUpperCase() as MeetingStatus, scheduledDate: body.scheduledDate, meetingLink: body.meetingLink } });
  res.json({ success: true, data: updated });
}));

const licenseOrder: LicenseStatus[] = [
  "PENDING", "ADMIN_APPROVED", "RESEARCHER_APPROVAL", "RESEARCHER_APPROVED",
  "AGREEMENT_GENERATED", "SIGNED_SUBMITTED", "AGREEMENT_EXECUTED", "COMMERCIALIZED",
];
const nextLicense = (current: LicenseStatus) => licenseOrder[licenseOrder.indexOf(current) + 1];

api.post("/licenses", requireRole(UserRole.INDUSTRY), asyncRoute(async (req, res) => {
  const body = parse(z.object({ id: z.string().optional(), studyId: z.string(), licenseFee: z.number().nonnegative().optional() }), req.body);
  const companyId = requireCompany(req.auth!.companyId);
  const study = await prisma.study.findUnique({ where: { id: body.studyId } });
  if (!study || study.status !== StudyStatus.PUBLISHED) throw new ApiError(404, "NOT_FOUND", "Published technology not found");
  const license = await prisma.$transaction(async (tx) => {
    const created = await tx.licenseRequest.create({ data: { id: body.id, studyId: study.id, companyId, requestedById: req.auth!.userId, licenseFee: body.licenseFee, workflowType: body.licenseFee && body.licenseFee > 300000 ? "full" : "simplified" } });
    await tx.interest.updateMany({ where: { studyId: study.id, companyId }, data: { status: InterestStatus.LICENSE_REQUESTED } });
    const admins = await tx.user.findMany({ where: { role: UserRole.ADMIN, status: "ACTIVE" } });
    await Promise.all(admins.map((admin) => notify(tx, admin.id, "license_requested", "License requested", study.title, "license", created.id)));
    await audit(tx, req.auth!.userId, "license.create", "LicenseRequest", created.id, created);
    return created;
  });
  res.status(201).json({ success: true, data: publicLicense(license) });
}));

api.get("/licenses", asyncRoute(async (req, res) => {
  const where: Prisma.LicenseRequestWhereInput = {};
  const q = searchText(req.query.q);
  if (req.auth!.role === UserRole.INDUSTRY) where.companyId = requireCompany(req.auth!.companyId);
  if (req.auth!.role === UserRole.RESEARCHER) where.study = { researcherId: req.auth!.userId };
  if (typeof req.query.status === "string" && req.query.status !== "all") where.status = req.query.status.toUpperCase() as LicenseStatus;
  if (q) where.OR = [
    { id: searchContains(q) },
    { workflowType: searchContains(q) },
    { study: { title: searchContains(q) } },
    { study: { researcherName: searchContains(q) } },
    { company: { name: searchContains(q) } },
  ];
  const items = await prisma.licenseRequest.findMany({ where, include: { study: true, company: true, agreements: { include: { files: { include: { file: true } } } } }, orderBy: { updatedAt: "desc" } });
  res.json({ success: true, data: items.map(publicLicense) });
}));

api.patch("/licenses/:id/status", asyncRoute(async (req, res) => {
  const body = parse(z.object({
    status: z.enum(["pending", "admin_approved", "researcher_approval", "researcher_approved", "agreement_generated", "signed_submitted", "agreement_executed", "commercialized", "rejected"]),
    // nullish (not optional): the client sends the whole license record, whose
    // optional string fields are `null` rather than absent — `.optional()` rejects null.
    agreementTerms: z.string().nullish(), signedAgreementFileName: z.string().nullish(), signedAgreementContent: z.string().nullish(),
  }).passthrough(), req.body);
  const current: any = await prisma.licenseRequest.findUnique({ where: { id: String(req.params.id) }, include: { study: true } });
  if (!current) throw new ApiError(404, "NOT_FOUND", "License not found");
  const target = body.status.toUpperCase() as LicenseStatus;
  const roleTargets: Record<UserRole, LicenseStatus[]> = {
    ADMIN: [LicenseStatus.ADMIN_APPROVED, LicenseStatus.AGREEMENT_GENERATED, LicenseStatus.AGREEMENT_EXECUTED, LicenseStatus.COMMERCIALIZED, LicenseStatus.REJECTED],
    RESEARCHER: [LicenseStatus.RESEARCHER_APPROVAL, LicenseStatus.RESEARCHER_APPROVED, LicenseStatus.REJECTED],
    INDUSTRY: [LicenseStatus.SIGNED_SUBMITTED],
  };
  if (!roleTargets[req.auth!.role].includes(target)) throw new ApiError(403, "FORBIDDEN", "Role cannot set requested license status");
  if (req.auth!.role === UserRole.RESEARCHER && current.study.researcherId !== req.auth!.userId) throw new ApiError(403, "FORBIDDEN", "Not your study");
  if (req.auth!.role === UserRole.INDUSTRY && current.companyId !== req.auth!.companyId) throw new ApiError(403, "FORBIDDEN", "Not your company license");
  const updated = await prisma.$transaction(async (tx) => {
    const license = await tx.licenseRequest.update({ where: { id: current.id }, data: { status: target, agreementTerms: body.agreementTerms || current.agreementTerms } });
    const recipients = target === LicenseStatus.ADMIN_APPROVED || target === LicenseStatus.RESEARCHER_APPROVAL
      ? [current.study.researcherId]
      : target === LicenseStatus.RESEARCHER_APPROVED || target === LicenseStatus.REJECTED
        ? (await tx.user.findMany({ where: { role: UserRole.ADMIN, status: "ACTIVE" } })).map((user) => user.id)
        : [];
    await Promise.all(recipients.map((id) => notify(tx, id, target === LicenseStatus.REJECTED ? "license_rejected" : "license_approved", "License workflow updated", current.study.title, "license", current.id)));
    await audit(tx, req.auth!.userId, "license.status", "LicenseRequest", current.id, license);
    return license;
  });
  res.json({ success: true, data: updated });
}));

api.patch("/licenses/:id/advance", requireRole(UserRole.ADMIN, UserRole.RESEARCHER), asyncRoute(async (req, res) => {
  const current: any = await prisma.licenseRequest.findUnique({ where: { id: String(req.params.id) }, include: { study: true, company: { include: { users: true } } } });
  if (!current) throw new ApiError(404, "NOT_FOUND", "License not found");
  if (req.auth!.role === UserRole.RESEARCHER && current.study.researcherId !== req.auth!.userId) throw new ApiError(403, "FORBIDDEN", "Not your study");
  let target = nextLicense(current.status);
  if (req.auth!.role === UserRole.ADMIN && current.status === LicenseStatus.ADMIN_APPROVED) target = LicenseStatus.RESEARCHER_APPROVAL;
  if (req.auth!.role === UserRole.RESEARCHER && current.status === LicenseStatus.ADMIN_APPROVED) target = LicenseStatus.RESEARCHER_APPROVAL;
  if (!target || (req.auth!.role === UserRole.RESEARCHER && target !== LicenseStatus.RESEARCHER_APPROVAL && target !== LicenseStatus.RESEARCHER_APPROVED)) throw new ApiError(409, "INVALID_TRANSITION", "This role cannot advance the current stage");
  const license = await prisma.$transaction(async (tx) => {
    let updated = await tx.licenseRequest.update({ where: { id: current.id }, data: { status: target } });
    await tx.licenseApproval.create({ data: { licenseId: current.id, actorId: req.auth!.userId, role: req.auth!.role, decision: "approved" } });
    if (req.auth!.role === UserRole.RESEARCHER && target === LicenseStatus.RESEARCHER_APPROVAL) updated = await tx.licenseRequest.update({ where: { id: current.id }, data: { status: LicenseStatus.RESEARCHER_APPROVED, researcherApprovedAt: new Date(), approvedAt: new Date() } });
    const recipients = req.auth!.role === UserRole.ADMIN ? [current.study.researcherId] : (await tx.user.findMany({ where: { role: UserRole.ADMIN, status: "ACTIVE" } })).map((u) => u.id);
    await Promise.all(recipients.map((id) => notify(tx, id, "license_approved", "License workflow advanced", current.study.title, "license", current.id)));
    await audit(tx, req.auth!.userId, "license.advance", "LicenseRequest", current.id, updated);
    return updated;
  });
  res.json({ success: true, data: license });
}));

api.patch("/licenses/:id/reject", requireRole(UserRole.ADMIN, UserRole.RESEARCHER), asyncRoute(async (req, res) => {
  const body = parse(z.object({ reason: z.string().min(3) }), req.body);
  const current: any = await prisma.licenseRequest.findUnique({ where: { id: String(req.params.id) }, include: { study: true } });
  if (!current) throw new ApiError(404, "NOT_FOUND", "License not found");
  if (req.auth!.role === UserRole.RESEARCHER && current.study.researcherId !== req.auth!.userId) throw new ApiError(403, "FORBIDDEN", "Not your study");
  const updated = await prisma.licenseRequest.update({ where: { id: current.id }, data: { status: LicenseStatus.REJECTED, rejectionReason: body.reason } });
  res.json({ success: true, data: updated });
}));

api.post("/licenses/:id/agreement", requireRole(UserRole.ADMIN), asyncRoute(async (req, res) => {
  const current: any = await prisma.licenseRequest.findUnique({ where: { id: String(req.params.id) }, include: { study: true, company: { include: { users: true } }, agreements: true } });
  if (!current || current.status !== LicenseStatus.RESEARCHER_APPROVED) throw new ApiError(409, "INVALID_TRANSITION", "Researcher approval is required");
  const terms = String(req.body.terms || `TRIPARTITE TECHNOLOGY LICENSING AGREEMENT\n\nTechnology: ${current.study.title}\nLicensee: ${current.company.name}\n\nTerms to be finalized by NRDC.`);
  const buffer = Buffer.from(terms, "utf8");
  const fileId = crypto.randomUUID();
  const storageKey = `agreements/${current.id}/generated/${fileId}.txt`;
  await persistFile(buffer, storageKey);
  const updated = await prisma.$transaction(async (tx) => {
    const agreement = await tx.agreement.create({ data: { licenseId: current.id, version: current.agreements.length + 1, terms } });
    const file = await tx.fileObject.create({
      data: {
        id: fileId,
        uploaderId: req.auth!.userId,
        storageKey,
        originalName: `${current.id}-tripartite-license-agreement.txt`,
        mimeType: "text/plain; charset=utf-8",
        size: buffer.length,
        checksum: crypto.createHash("sha256").update(buffer).digest("hex"),
      },
    });
    await tx.agreementFile.create({ data: { agreementId: agreement.id, fileId: file.id, kind: "GENERATED" } });
    const license = await tx.licenseRequest.update({ where: { id: current.id }, data: { status: LicenseStatus.AGREEMENT_GENERATED, agreementTerms: terms, agreementGeneratedAt: new Date() } });
    await Promise.all(current.company.users.map((user: any) => notify(tx, user.id, "agreement_generated", "Agreement generated", current.study.title, "license", current.id)));
    await audit(tx, req.auth!.userId, "agreement.generate", "LicenseRequest", current.id, license);
    return license;
  });
  res.json({ success: true, data: updated });
}));

api.get("/licenses/:id/agreement/download", asyncRoute(async (req, res) => {
  const current: any = await prisma.licenseRequest.findUnique({
    where: { id: String(req.params.id) },
    include: { study: true, agreements: { orderBy: { version: "desc" }, take: 1, include: { files: { include: { file: true } } } } },
  });
  if (!current) throw new ApiError(404, "NOT_FOUND", "License not found");
  if (req.auth!.role !== UserRole.ADMIN && current.companyId !== req.auth!.companyId && current.study.researcherId !== req.auth!.userId) throw new ApiError(403, "FORBIDDEN", "License access denied");
  const generated = current.agreements[0]?.files.find((agreementFile: any) => agreementFile.kind === "GENERATED")?.file;
  if (generated) {
    await audit(prisma, req.auth!.userId, "agreement.download", "LicenseRequest", current.id);
    return streamFile(res, generated);
  }
  if (!current.agreementTerms) throw new ApiError(404, "NOT_FOUND", "Generated agreement not found");
  await audit(prisma, req.auth!.userId, "agreement.download", "LicenseRequest", current.id);
  res.setHeader("Content-Type", "text/plain; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename="${current.id}-tripartite-license-agreement.txt"`);
  res.send(current.agreementTerms);
}));

api.post("/licenses/:id/signed-agreement", requireRole(UserRole.INDUSTRY), upload.single("file"), asyncRoute(async (req, res) => {
  if (!req.file) throw new ApiError(400, "FILE_REQUIRED", "Signed agreement file required");
  const companyId = requireCompany(req.auth!.companyId);
  const current: any = await prisma.licenseRequest.findFirst({ where: { id: String(req.params.id), companyId }, include: { agreements: { orderBy: { version: "desc" }, take: 1 }, study: true } });
  if (!current || current.status !== LicenseStatus.AGREEMENT_GENERATED || !current.agreements[0]) throw new ApiError(409, "INVALID_TRANSITION", "Generated agreement required");
  const fileId = crypto.randomUUID();
  const storageKey = `agreements/${current.id}/signed/${fileId}`;
  await persistFile(req.file.buffer, storageKey);
  const updated = await prisma.$transaction(async (tx) => {
    const file = await tx.fileObject.create({ data: fileRecord(req.file!, req.auth!.userId, storageKey, fileId) });
    await tx.agreementFile.create({ data: { agreementId: current.agreements[0].id, fileId: file.id, kind: "SIGNED" } });
    const license = await tx.licenseRequest.update({ where: { id: current.id }, data: { status: LicenseStatus.SIGNED_SUBMITTED, signedAgreementSubmittedAt: new Date() } });
    const admins = await tx.user.findMany({ where: { role: UserRole.ADMIN, status: "ACTIVE" } });
    await Promise.all(admins.map((admin) => notify(tx, admin.id, "signed_agreement_uploaded", "Signed agreement uploaded", current.study.title, "license", current.id)));
    await audit(tx, req.auth!.userId, "agreement.upload_signed", "LicenseRequest", current.id, license);
    return license;
  });
  const full = await prisma.licenseRequest.findUnique({ where: { id: updated.id }, include: { study: true, company: true, agreements: { include: { files: { include: { file: true } } } } } });
  res.status(201).json({ success: true, data: publicLicense(full) });
}));

api.get("/licenses/:id/signed-agreement/download", asyncRoute(async (req, res) => {
  const current: any = await prisma.licenseRequest.findUnique({
    where: { id: String(req.params.id) },
    include: { study: true, agreements: { orderBy: { version: "desc" }, include: { files: { include: { file: true } } } } },
  });
  if (!current) throw new ApiError(404, "NOT_FOUND", "License not found");
  if (req.auth!.role !== UserRole.ADMIN && current.companyId !== req.auth!.companyId && current.study.researcherId !== req.auth!.userId) throw new ApiError(403, "FORBIDDEN", "License access denied");
  const signed = current.agreements.flatMap((agreement: any) => agreement.files).find((agreementFile: any) => agreementFile.kind === "SIGNED")?.file;
  if (!signed) throw new ApiError(404, "NOT_FOUND", "Signed agreement not found");
  await audit(prisma, req.auth!.userId, "agreement.download_signed", "LicenseRequest", current.id);
  await streamFile(res, signed);
}));

api.patch("/licenses/:id/execute", requireRole(UserRole.ADMIN), asyncRoute(async (req, res) => {
  const current: any = await prisma.licenseRequest.findUnique({ where: { id: String(req.params.id) }, include: { company: { include: { users: true } }, study: true } });
  if (!current || current.status !== LicenseStatus.SIGNED_SUBMITTED) throw new ApiError(409, "INVALID_TRANSITION", "Signed agreement review is required");
  const updated = await prisma.$transaction(async (tx) => {
    const license = await tx.licenseRequest.update({ where: { id: current.id }, data: { status: LicenseStatus.AGREEMENT_EXECUTED, agreementExecutedAt: new Date() } });
    await Promise.all(current.company.users.map((user: any) => notify(tx, user.id, "agreement_approved", "Agreement executed", current.study.title, "license", current.id)));
    await audit(tx, req.auth!.userId, "agreement.execute", "LicenseRequest", current.id, license);
    return license;
  });
  res.json({ success: true, data: updated });
}));

api.patch("/licenses/:id/commercialize", requireRole(UserRole.ADMIN), asyncRoute(async (req, res) => {
  const current: any = await prisma.licenseRequest.findUnique({ where: { id: String(req.params.id) }, include: { company: { include: { users: true } }, study: true } });
  if (!current || current.status !== LicenseStatus.AGREEMENT_EXECUTED) throw new ApiError(409, "INVALID_TRANSITION", "Executed agreement required");
  const updated = await prisma.$transaction(async (tx) => {
    const license = await tx.licenseRequest.update({ where: { id: current.id }, data: { status: LicenseStatus.COMMERCIALIZED, commercializedAt: new Date() } });
    await tx.commercializationRecord.create({ data: { studyId: current.studyId, licenseId: current.id, status: "completed", completedAt: new Date(), milestones: req.body.milestones || undefined } });
    await tx.study.update({ where: { id: current.studyId }, data: { status: StudyStatus.COMMERCIALIZED } });
    await tx.interest.updateMany({ where: { studyId: current.studyId, companyId: current.companyId }, data: { status: InterestStatus.LICENSED } });
    await Promise.all([current.study.researcherId, ...current.company.users.map((u: any) => u.id)].map((id) => notify(tx, id, "commercialization_completed", "Commercialization completed", current.study.title, "license", current.id)));
    await audit(tx, req.auth!.userId, "license.commercialize", "LicenseRequest", current.id, license);
    return license;
  });
  res.json({ success: true, data: updated });
}));

api.get("/notifications", asyncRoute(async (req, res) => {
  const items = await prisma.notification.findMany({ where: { userId: req.auth!.userId }, orderBy: { createdAt: "desc" } });
  res.json({ success: true, data: items.map((n) => ({ ...n, read: Boolean(n.readAt) })) });
}));
api.patch("/notifications/:id/read", asyncRoute(async (req, res) => {
  const result = await prisma.notification.updateMany({ where: { id: String(req.params.id), userId: req.auth!.userId }, data: { readAt: new Date() } });
  if (!result.count) throw new ApiError(404, "NOT_FOUND", "Notification not found");
  res.json({ success: true, data: null });
}));
api.post("/notifications/read-all", asyncRoute(async (req, res) => {
  await prisma.notification.updateMany({ where: { userId: req.auth!.userId, readAt: null }, data: { readAt: new Date() } });
  res.json({ success: true, data: null });
}));

api.get("/audit-logs", requireRole(UserRole.ADMIN), asyncRoute(async (_req, res) => {
  res.json({ success: true, data: await prisma.auditLog.findMany({ orderBy: { createdAt: "desc" }, take: 200, include: { actor: { select: { name: true, email: true } } } }) });
}));

api.get("/analytics/metrics", requireRole(UserRole.ADMIN), asyncRoute(async (_req, res) => {
  const [totalStudies, publishedStudies, industryInterests, meetingsScheduled, licensesRequested, licensesSigned] = await Promise.all([
    prisma.study.count(), prisma.study.count({ where: { status: StudyStatus.PUBLISHED } }), prisma.interest.count(),
    prisma.meeting.count({ where: { status: MeetingStatus.SCHEDULED } }), prisma.licenseRequest.count(),
    prisma.licenseRequest.count({ where: { status: { in: [LicenseStatus.SIGNED_SUBMITTED, LicenseStatus.AGREEMENT_EXECUTED, LicenseStatus.COMMERCIALIZED] } } }),
  ]);
  res.json({ success: true, data: { totalStudies, publishedStudies, industryInterests, meetingsScheduled, licensesRequested, licensesSigned } });
}));

// Rich admin dashboard + analytics — every figure computed from live data.
api.get("/analytics/dashboard", requireRole(UserRole.ADMIN), asyncRoute(async (_req, res) => {
  const [
    totalUsers, researchers, industryUsers, admins,
    studiesByStatus,
    totalInterests,
    meetingsByStatus,
    licensesByStatus,
    domainGroups,
    interestByStudy,
    meetingByStudy,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { role: UserRole.RESEARCHER } }),
    prisma.user.count({ where: { role: UserRole.INDUSTRY } }),
    prisma.user.count({ where: { role: UserRole.ADMIN } }),
    prisma.study.groupBy({ by: ["status"], _count: { _all: true } }),
    prisma.interest.count(),
    prisma.meeting.groupBy({ by: ["status"], _count: { _all: true } }),
    prisma.licenseRequest.groupBy({ by: ["status"], _count: { _all: true } }),
    prisma.study.groupBy({ by: ["domain"], where: { status: StudyStatus.PUBLISHED }, _count: { _all: true } }),
    prisma.interest.groupBy({ by: ["studyId"], _count: { _all: true }, orderBy: { _count: { studyId: "desc" } }, take: 5 }),
    prisma.meeting.groupBy({ by: ["studyId"], _count: { _all: true } }),
  ]);

  const studyCount = (status: StudyStatus) => studiesByStatus.find((row) => row.status === status)?._count._all || 0;
  const meetingCount = (status: MeetingStatus) => meetingsByStatus.find((row) => row.status === status)?._count._all || 0;
  const licenseCount = (status: LicenseStatus) => licensesByStatus.find((row) => row.status === status)?._count._all || 0;

  const publishedStudies = studyCount(StudyStatus.PUBLISHED);
  const totalStudies = studiesByStatus.reduce((sum, row) => sum + row._count._all, 0);
  const totalMeetings = meetingsByStatus.reduce((sum, row) => sum + row._count._all, 0);
  const totalLicenses = licensesByStatus.reduce((sum, row) => sum + row._count._all, 0);
  const commercialized = licenseCount(LicenseStatus.COMMERCIALIZED);
  const activeLicenses = totalLicenses - licenseCount(LicenseStatus.REJECTED) - commercialized;
  const meetingsByStudyMap = new Map(meetingByStudy.map((row) => [row.studyId, row._count._all]));

  const topStudyIds = interestByStudy.map((row) => row.studyId);
  const topStudies = topStudyIds.length
    ? await prisma.study.findMany({ where: { id: { in: topStudyIds } }, select: { id: true, title: true, domain: true } })
    : [];
  const topTechnologies = interestByStudy.map((row) => {
    const study = topStudies.find((item) => item.id === row.studyId);
    return {
      id: row.studyId,
      title: study?.title || "Unknown",
      domain: study?.domain || "",
      interests: row._count._all,
      meetings: meetingsByStudyMap.get(row.studyId) || 0,
    };
  });

  res.json({
    success: true,
    data: {
      users: { total: totalUsers, researchers, industry: industryUsers, admins },
      studies: {
        total: totalStudies,
        draft: studyCount(StudyStatus.DRAFT),
        submitted: studyCount(StudyStatus.SUBMITTED),
        underReview: studyCount(StudyStatus.UNDER_REVIEW),
        approved: studyCount(StudyStatus.APPROVED),
        published: publishedStudies,
      },
      pendingReviews: studyCount(StudyStatus.SUBMITTED) + studyCount(StudyStatus.UNDER_REVIEW),
      interests: totalInterests,
      meetings: {
        total: totalMeetings,
        pending: meetingCount(MeetingStatus.PENDING),
        scheduled: meetingCount(MeetingStatus.SCHEDULED),
        completed: meetingCount(MeetingStatus.COMPLETED),
        cancelled: meetingCount(MeetingStatus.CANCELLED),
      },
      licenses: {
        total: totalLicenses,
        requested: licenseCount(LicenseStatus.PENDING),
        executed: licenseCount(LicenseStatus.AGREEMENT_EXECUTED),
        commercialized,
        active: Math.max(0, activeLicenses),
      },
      commercializationRate: publishedStudies ? Math.round((commercialized / publishedStudies) * 1000) / 10 : 0,
      domains: domainGroups
        .map((row) => ({ domain: row.domain, count: row._count._all }))
        .sort((a, b) => b.count - a.count),
      funnel: {
        published: publishedStudies,
        interests: totalInterests,
        meetings: totalMeetings,
        licenses: totalLicenses,
        commercialized,
      },
      topTechnologies,
    },
  });
}));

// AI integration routes (Matchmaking, SUTRA agents, pipeline, Copilot) — all authenticated.
registerAiRoutes(api);

app.use("/api/v1", api);
app.use((_req, _res, next) => next(new ApiError(404, "NOT_FOUND", "Endpoint not found")));
app.use((error: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  const status = error instanceof ApiError ? error.status : 500;
  const code = error instanceof ApiError ? error.code : "INTERNAL_ERROR";
  if (status === 500) console.error(error);
  res.status(status).json({ success: false, error: { code, message: status === 500 ? "Internal server error" : error.message } });
});

app.listen(config.port, () => console.log(`R2C.AI API listening on http://localhost:${config.port}/api/v1`));

// ── Keep-alive self-ping ───────────────────────────────────────────────────
// On hosts that sleep idle services (Render free tier spins down after ~15 min),
// hit our OWN PUBLIC URL on an interval so the host's router keeps resetting the
// idle timer. A localhost ping would NOT count — only requests through the public
// edge do — so we must use the external URL. Render injects RENDER_EXTERNAL_URL
// automatically; set KEEP_ALIVE_URL manually on other hosts. No-op when unset
// (e.g. local dev), so it never self-pings in development.
const keepAliveBase = process.env.KEEP_ALIVE_URL || process.env.RENDER_EXTERNAL_URL;
const keepAliveMinutes = Number(process.env.KEEP_ALIVE_MINUTES || 10);
if (keepAliveBase) {
  const target = `${keepAliveBase.replace(/\/$/, "")}/api/v1/ping`;
  const intervalMs = keepAliveMinutes * 60 * 1000;
  console.log(`Keep-alive: self-pinging ${target} every ${keepAliveMinutes} min`);
  setInterval(() => {
    fetch(target)
      .then((r) => { if (!r.ok) console.warn(`Keep-alive ping non-OK: ${r.status}`); })
      .catch((err) => console.warn(`Keep-alive ping failed: ${err?.message || err}`));
  }, intervalMs).unref(); // unref so the timer never blocks a graceful shutdown
}
