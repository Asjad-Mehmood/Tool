import { PrismaClient } from "@prisma/client";

const g = globalThis as unknown as { __prisma?: PrismaClient };
/** One client per process (survives Next.js hot reloads). */
export const db = (g.__prisma ??= new PrismaClient());
export * from "@prisma/client";
