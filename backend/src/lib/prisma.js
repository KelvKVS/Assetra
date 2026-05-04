/** Node ESM + @prisma/client (CJS): importação por default evita falha de named export em alguns setups. */
import prismaPkg from '@prisma/client'

const { PrismaClient } = prismaPkg

const prisma = new PrismaClient()

export default prisma
