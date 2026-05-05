import path from 'node:path'
import { fileURLToPath } from 'node:url'
import dotenv from 'dotenv'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.join(__dirname, '../.env') })
dotenv.config()

import express from 'express'
import helmet from 'helmet'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import rateLimit from 'express-rate-limit'
import mongoose from 'mongoose'
import prisma from './lib/prisma.js'
import connectNoSQL from './lib/mongoose.js'
import assetRoutes from './routes/assets.js'
import authRoutes from './routes/auth.js'
import userRoutes from './routes/users.js'
import maintenanceRoutes from './routes/maintenances.js'
import movementRoutes from './routes/movements.js'
import approvalRoutes from './routes/approvals.js'
import taskRoutes from './routes/tasks.js'
import uploadRoutes from './routes/uploads.js'
import { AppError } from './utils/AppError.js'

if (!process.env.JWT_SECRET) {
  process.env.JWT_SECRET = 'troque-este-segredo-em-producao'
}

connectNoSQL() // Conexão MongoDB

const app = express()
const port = Number(process.env.PORT) || 3000
const allowedOriginRules = String(process.env.CORS_ORIGIN || 'http://localhost:5173')
  .split(',')
  .map((origin) => origin.trim().replace(/\/+$/, ''))
  .filter(Boolean)

function isOriginAllowed(origin) {
  const normalized = String(origin || '').trim().replace(/\/+$/, '')
  return allowedOriginRules.some((rule) => {
    if (rule.includes('*')) {
      const wildcardRegex = new RegExp(
        `^${rule.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace('\\*', '.*')}$`,
        'i',
      )
      return wildcardRegex.test(normalized)
    }
    return normalized === rule
  })
}

app.use(helmet())
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true)
      if (isOriginAllowed(origin)) return callback(null, true)
      return callback(new AppError(403, `Origem não permitida por CORS: ${origin}`))
    },
    credentials: true,
  }),
)
app.use(express.json({ limit: '10kb' }))
app.use(cookieParser())

const isProd = process.env.NODE_ENV === 'production'
const loginLimiter = rateLimit({
  windowMs: isProd ? 15 * 60 * 1000 : 60 * 1000,
  max: isProd ? 10 : 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Muitas tentativas de login. Tente novamente em alguns minutos.' },
  /** Em dev, evita bloquear durante testes manuais. */
  skipSuccessfulRequests: !isProd,
})

app.get('/api/health', async (_req, res) => {
  let sql = false
  try {
    await prisma.$queryRaw`SELECT 1`
    sql = true
  } catch {
    /* Base relacional indisponível ou DATABASE_URL incorreto */
  }
  // mongoose readyState: 0=desconectado, 1=conectado, 2=ligando, 3=desconectando
  const mongo = mongoose.connection.readyState === 1
  res.json({
    status: 'ok',
    database: { sql, mongo },
  })
})

app.use('/api/auth/login', loginLimiter)
app.use('/api/auth', authRoutes)
app.use('/api/users', userRoutes)
app.use('/api/assets', assetRoutes)
app.use('/api/maintenances', maintenanceRoutes)
app.use('/api/movements', movementRoutes)
app.use('/api/approvals', approvalRoutes)
app.use('/api/tasks', taskRoutes)
app.use('/api/uploads', uploadRoutes)


app.use((error, _req, res, _next) => {
  if (error instanceof AppError) {
    return res.status(error.statusCode).json({ message: error.message })
  }

  if (error?.name === 'MulterError' || /Tipo de ficheiro/i.test(String(error?.message ?? ''))) {
    return res.status(400).json({ message: error.message ?? 'Ficheiro inválido.' })
  }

  const msg = String(error?.message ?? '')
  const prismaUnavailable =
    error?.name === 'PrismaClientInitializationError' ||
    error?.code === 'P1001' ||
    /Can't reach database server|ECONNREFUSED.*5432/i.test(msg)

  if (prismaUnavailable) {
    return res.status(503).json({
      message:
        'Base de dados relacional indisponível. Verifique DATABASE_URL em backend/.env (SQLite: file:./dev.db; Postgres: porta 5432).',
    })
  }

  console.error(error)
  res.status(500).json({
    message: isProd
      ? 'Erro interno do servidor.'
      : `Erro interno: ${error?.message ?? 'desconhecido'}`,
  })
})

app.listen(port, () => {
  console.log(`API rodando em http://localhost:${port}`)
})

