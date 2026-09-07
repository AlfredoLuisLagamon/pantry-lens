import path from "node:path";

import { config as loadEnv } from "dotenv";
import { PrismaClient } from "@prisma/client";

loadEnv({ path: path.resolve(__dirname, "../.env") });

const prisma = new PrismaClient();

const DEMO_USER_EMAIL =
  process.env.DEMO_USER_EMAIL ?? "demo@pantry-lens.local";
const DEMO_USER_DISPLAY_NAME = "Demo User";

async function main() {
  const demoUser = await prisma.user.upsert({
    where: { email: DEMO_USER_EMAIL },
    update: {
      displayName: DEMO_USER_DISPLAY_NAME,
    },
    create: {
      email: DEMO_USER_EMAIL,
      displayName: DEMO_USER_DISPLAY_NAME,
    },
  });

  console.log(
    `Demo user ready: ${demoUser.email} (${demoUser.id}) — unsubscribed by default`,
  );
}

main()
  .catch((error) => {
    console.error("Seed failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
