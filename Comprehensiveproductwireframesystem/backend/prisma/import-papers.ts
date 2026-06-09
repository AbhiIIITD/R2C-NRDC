/**
 * Import the research-paper corpus from Supabase into the platform as PUBLISHED
 * Studies (+ active marketplace listings) so they appear in Researcher "My Studies"
 * and the Industry Marketplace. Idempotent: re-running upserts by `paper_<seed_ref>`.
 *
 * Reads SUPABASE_URL / SUPABASE_KEY and DATABASE_URL from the environment.
 * Run:  npm run import:papers   (or: tsx prisma/import-papers.ts)
 */
import { PrismaClient, StudyStatus } from "@prisma/client";

const prisma = new PrismaClient();
const SUPABASE_URL = (process.env.SUPABASE_URL || "").replace(/\/$/, "");
const SUPABASE_KEY = process.env.SUPABASE_KEY || "";

interface SupaPaper {
  seed_ref: string;
  title: string | null;
  abstract: string | null;
  authors: string[] | null;
  author_affiliations: (string | null)[] | null;
  published_year: number | null;
  venue: string | null;
  research_domain: { primary_domain?: string; sub_domain?: string; problem_statement?: string } | null;
  technical: Record<string, unknown> | null;
  commercialization: { trl_level?: number | string | null; maps_to_companies?: string[] } | null;
  legal: { ip_status?: string; patent_status?: string } | null;
}

const clampTrl = (v: unknown): number => {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? Math.min(9, Math.max(1, Math.round(n))) : 5;
};

// "buildings_infrastructure" -> "Buildings Infrastructure"; "Research" stays "Research".
const humanize = (value: string): string =>
  value
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase());

const keywordsFor = (domain: string, subDomain: string, title: string, companies: string[]): string[] =>
  Array.from(
    new Set(
      [
        domain,
        subDomain,
        ...companies,
        ...title.toLowerCase().replace(/[^a-z0-9\s]/g, " ").split(/\s+/).filter((w) => w.length > 4),
      ]
        .map((k) => String(k).trim())
        .filter(Boolean),
    ),
  ).slice(0, 14);

async function main() {
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.log("[import-papers] SUPABASE_URL/KEY not set — skipping paper import.");
    return;
  }

  const researcher =
    (await prisma.user.findFirst({ where: { email: "dr.smith@university.edu" } })) ||
    (await prisma.user.findFirst({ where: { role: "RESEARCHER" } }));
  if (!researcher) {
    console.log("[import-papers] no researcher user found — run the seed first. Skipping.");
    return;
  }
  const admin = await prisma.user.findFirst({ where: { role: "ADMIN" } });

  const select =
    "seed_ref,title,abstract,authors,author_affiliations,published_year,venue,research_domain,technical,commercialization,legal";
  const url = `${SUPABASE_URL}/rest/v1/papers?select=${select}&deleted_at=is.null&limit=5000`;
  const res = await fetch(url, { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` } });
  if (!res.ok) {
    console.error(`[import-papers] Supabase fetch failed (${res.status}). Skipping.`);
    return;
  }
  const papers = (await res.json()) as SupaPaper[];
  console.log(`[import-papers] fetched ${papers.length} papers from Supabase`);

  let n = 0;
  for (const p of papers) {
    if (!p.seed_ref) continue;
    const rd = p.research_domain || {};
    const comm = p.commercialization || {};
    const legal = p.legal || {};
    const domain = humanize(String(rd.primary_domain || "Research")) || "Research";
    const subDomain = humanize(String(rd.sub_domain || ""));
    const mappedCompanies = (comm.maps_to_companies || []).filter(Boolean);
    const authors = (p.authors || []).map((a) => String(a).trim()).filter(Boolean);
    const trl = clampTrl(comm.trl_level);
    const title = String(p.title || p.seed_ref).slice(0, 300);

    const baseAbstract =
      (p.abstract && String(p.abstract).trim()) ||
      rd.problem_statement ||
      `Research output ${p.seed_ref} in ${domain}${subDomain ? ` / ${subDomain}` : ""}.`;
    const provenance = [
      p.venue ? `Source: ${p.venue}` : null,
      p.published_year ? `Published ${p.published_year}` : null,
      authors.length ? `Authors: ${authors.join(", ")}` : null,
    ]
      .filter(Boolean)
      .join(" · ");
    const abstract = `${String(baseAbstract).slice(0, 5500)}${provenance ? `\n\n${provenance}` : ""}`;

    const id = `paper_${p.seed_ref}`;
    const now = new Date();

    const data = {
      title,
      abstract: abstract.slice(0, 6000),
      domain,
      trl,
      keywords: keywordsFor(domain, subDomain, title, mappedCompanies),
      readinessScore: Math.min(95, Math.max(45, 50 + trl * 5)),
      commercialPotential:
        rd.problem_statement ||
        (mappedCompanies.length ? `Relevant to ${mappedCompanies.join(", ")}.` : undefined),
      marketSize: subDomain ? `${subDomain} segment within ${domain}` : undefined,
      competitors: mappedCompanies.length ? mappedCompanies.join(", ") : undefined,
      ipStatus: legal.ip_status || legal.patent_status || "Patent pending",
      researcherId: researcher.id,
      researcherName: authors.length ? authors.join(", ") : researcher.name,
      status: StudyStatus.PUBLISHED,
      approvedBy: admin?.id,
      approvedAt: now,
      publishedAt: now,
    };

    const study = await prisma.study.upsert({ where: { id }, create: { id, ...data }, update: data });
    await prisma.marketplaceListing.upsert({
      where: { studyId: study.id },
      create: { studyId: study.id, publishedBy: admin?.id ?? researcher.id, active: true },
      update: { active: true },
    });
    n += 1;
  }

  const published = await prisma.study.count({ where: { status: StudyStatus.PUBLISHED } });
  const listed = await prisma.marketplaceListing.count({ where: { active: true } });
  const domains = await prisma.study.findMany({
    where: { status: StudyStatus.PUBLISHED },
    distinct: ["domain"],
    select: { domain: true },
    orderBy: { domain: "asc" },
  });
  console.log(`[import-papers] imported/updated ${n} papers.`);
  console.log(`[import-papers] PUBLISHED studies: ${published} · active listings: ${listed}`);
  console.log(`[import-papers] domains: ${domains.map((d) => d.domain).join(", ")}`);
}

main()
  .catch((e) => {
    console.error("[import-papers] failed:", e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
