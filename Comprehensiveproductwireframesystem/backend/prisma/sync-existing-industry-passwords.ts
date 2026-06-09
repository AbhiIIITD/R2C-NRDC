import bcrypt from "bcryptjs";
import { PrismaClient, UserRole } from "@prisma/client";

const prisma = new PrismaClient();
const companyNames = [
  "Mahindra Lifespaces Developers Ltd", "Vikram Solar Ltd", "Ohmium International",
  "Bajaj Auto Ltd", "Carbon Clean Solutions Ltd", "Tata Power Solar Systems Ltd",
  "Newtrace", "Detect Technologies", "CarbonStrong", "Tata Steel Ltd",
  "UltraTech Cement Ltd", "Log9 Materials Scientific Pvt Ltd",
];

async function main() {
  const passwordHash = await bcrypt.hash("test1234", 12);
  const missing: string[] = [];
  for (const name of companyNames) {
    const company = await prisma.company.findUnique({ where: { name }, include: { users: { where: { role: UserRole.INDUSTRY } } } });
    if (!company || company.users.length === 0) {
      missing.push(name);
      continue;
    }
    await prisma.user.updateMany({ where: { companyId: company.id, role: UserRole.INDUSTRY }, data: { passwordHash } });
    console.log(`Updated existing industry login(s): ${name}`);
  }
  if (missing.length) {
    console.error(`No existing mapped industry user found for: ${missing.join(", ")}`);
    process.exitCode = 1;
  }
}

main().finally(() => prisma.$disconnect());

