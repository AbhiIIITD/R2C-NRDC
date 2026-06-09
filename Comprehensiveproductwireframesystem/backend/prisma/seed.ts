import bcrypt from "bcryptjs";
import { PrismaClient, StudyStatus, UserRole } from "@prisma/client";

const prisma = new PrismaClient();
const industryCompanies = [
  "Mahindra Lifespaces Developers Ltd", "Vikram Solar Ltd", "Ohmium International",
  "Bajaj Auto Ltd", "Carbon Clean Solutions Ltd", "Tata Power Solar Systems Ltd",
  "Newtrace", "Detect Technologies", "CarbonStrong", "Tata Steel Ltd",
  "UltraTech Cement Ltd", "Log9 Materials Scientific Pvt Ltd",
];
const slug = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, ".").replace(/^\.+|\.+$/g, "");
const contactName = (name: string) => `${name.replace(/\b(ltd|limited|developers|systems|scientific|pvt|inc)\b/gi, "").replace(/\s+/g, " ").trim()} Contact`;

async function main() {
  const passwordHash = await bcrypt.hash("password", 12);
  const industryPasswordHash = await bcrypt.hash("test1234", 12);
  const researcher = await prisma.user.upsert({
    where: { email: "dr.smith@university.edu" },
    update: { passwordHash },
    create: { email: "dr.smith@university.edu", passwordHash, name: "Dr. Sarah Smith", role: UserRole.RESEARCHER, organization: "MIT" },
  });
  const admin = await prisma.user.upsert({
    where: { email: "admin@nrdc.org" },
    update: { passwordHash },
    create: { email: "admin@nrdc.org", passwordHash, name: "Admin User", role: UserRole.ADMIN, organization: "NRDC" },
  });
  const company = await prisma.company.upsert({ where: { name: "PharmaTech Inc" }, update: {}, create: { name: "PharmaTech Inc", sector: "Healthcare & Pharma" } });
  await prisma.user.upsert({
    where: { email: "mark.wilson@pharmatech.com" },
    update: { passwordHash, companyId: company.id },
    create: { email: "mark.wilson@pharmatech.com", passwordHash, name: "Mark Wilson", role: UserRole.INDUSTRY, organization: company.name, companyId: company.id },
  });
  for (const name of industryCompanies) {
    const seededCompany = await prisma.company.upsert({
      where: { name },
      update: {},
      create: { name, sector: "Industry Partner" },
    });
    await prisma.user.upsert({
      where: { email: `industry.${slug(name)}@nrdc-r2c.demo` },
      update: { passwordHash: industryPasswordHash, role: UserRole.INDUSTRY, organization: name, companyId: seededCompany.id, status: "ACTIVE" },
      create: {
        email: `industry.${slug(name)}@nrdc-r2c.demo`,
        passwordHash: industryPasswordHash,
        name: contactName(name),
        role: UserRole.INDUSTRY,
        organization: name,
        companyId: seededCompany.id,
      },
    });
  }
  // No demo/dummy studies are seeded. The real research corpus is imported from
  // Supabase as PUBLISHED studies + active marketplace listings via
  // `npm run import:papers` (prisma/import-papers.ts). Keep `researcher`/`admin`
  // in scope so a fresh DB still has the accounts the importer attributes papers to.
  void researcher;
  void admin;
}

main().finally(() => prisma.$disconnect());
