const { PrismaClient } = require('@prisma/client');

// Singleton PrismaClient, tránh tạo nhiều connection khi nodemon reload
const globalForPrisma = globalThis;

const prisma = globalForPrisma.prisma || new PrismaClient();

if (!globalForPrisma.prisma) {
  globalForPrisma.prisma = prisma;
}

module.exports = prisma;
