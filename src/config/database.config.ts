import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient({
  log: [{ emit: "event", level: "query" }],
});

prisma.$on("query", (e) => {
  if (e.duration > 200) {
    console.warn(`[DB SLOW] ${e.duration}ms → ${e.query.substring(0, 120)}`);
  } else {
    console.log(`[DB] ${e.duration}ms → ${e.query.substring(0, 80)}`);
  }
});

export const testDatabaseConnection = async (): Promise<boolean> => {
  try {
    await prisma.$connect();
    console.log("✅ Database connected successfully");
    return true;
  } catch (error) {
    console.error("❌ Database connection failed:", error);
    return false;
  }
};

export const disconnectDatabase = async (): Promise<void> => {
  await prisma.$disconnect();
};

export default prisma;
