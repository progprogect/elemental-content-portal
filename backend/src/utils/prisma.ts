import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// Use DATABASE_PUBLIC_URL if DATABASE_URL is not available or points to internal Railway URL
function getDatabaseUrl(): string {
  const databaseUrl = process.env.DATABASE_URL;
  const publicUrl = process.env.DATABASE_PUBLIC_URL;
  
  // If DATABASE_URL points to internal Railway URL and we have public URL, use public URL
  if (databaseUrl?.includes('postgres.railway.internal') && publicUrl) {
    console.log('Using DATABASE_PUBLIC_URL instead of internal Railway URL');
    return publicUrl;
  }
  
  // If DATABASE_URL is not set but DATABASE_PUBLIC_URL is, use public URL
  if (!databaseUrl && publicUrl) {
    console.log('Using DATABASE_PUBLIC_URL as DATABASE_URL is not set');
    return publicUrl;
  }
  
  // Otherwise use DATABASE_URL
  if (!databaseUrl) {
    throw new Error('DATABASE_URL or DATABASE_PUBLIC_URL must be set');
  }
  
  return databaseUrl;
}

export const prisma = globalForPrisma.prisma ?? new PrismaClient({
  datasources: {
    db: {
      url: getDatabaseUrl(),
    },
  },
});

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

