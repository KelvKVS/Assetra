import path from 'node:path'
import { randomUUID } from 'node:crypto'
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
import integrationRoutes from './routes/integrations.js'
import reportRoutes from './routes/reports.js'
import { AppError } from './utils/AppError.js'
import { getEventBusHealth } from './lib/eventBus.js'

const isProd = process.env.NODE_ENV === 'production'
const jwtSecret = String(process.env.JWT_SECRET ?? '').trim()
if (!jwtSecret) {
  if (isProd) {
    throw new Error('JWT_SECRET é obrigatório em produção.')
  }
  process.env.JWT_SECRET = 'dev-only-secret-change-me'
}

connectNoSQL() // Conexão MongoDB

const app = express()
app.disable('x-powered-by')
const port = Number(process.env.PORT) || 3000
const startedAt = new Date().toISOString()
const metrics = {
  requestsTotal: 0,
  errors4xx: 0,
  errors5xx: 0,
  byNamespace: {
    auth: 0,
    integrations: 0,
    assets: 0,
    maintenances: 0,
    movements: 0,
    approvals: 0,
    tasks: 0,
    uploads: 0,
    users: 0,
    health: 0,
    other: 0,
  },
}
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

app.use(
  helmet({
    referrerPolicy: { policy: 'no-referrer' },
  }),
)
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
app.use((req, res, next) => {
  const requestStartedAt = Date.now()
  const requestId = String(req.headers['x-request-id'] ?? '').trim() || randomUUID()
  req.requestId = requestId
  res.setHeader('X-Request-Id', requestId)
  res.on('finish', () => {
    const durationMs = Date.now() - requestStartedAt
    const user = req.user ?? {}
    const path = String(req.originalUrl ?? '')
    const namespace = path.startsWith('/api/auth')
      ? 'auth'
      : path.startsWith('/api/integrations')
        ? 'integrations'
        : path.startsWith('/api/assets')
          ? 'assets'
          : path.startsWith('/api/maintenances')
            ? 'maintenances'
            : path.startsWith('/api/movements')
              ? 'movements'
              : path.startsWith('/api/approvals')
                ? 'approvals'
                : path.startsWith('/api/tasks')
                  ? 'tasks'
                  : path.startsWith('/api/uploads')
                    ? 'uploads'
                    : path.startsWith('/api/users')
                      ? 'users'
                      : path.startsWith('/api/health')
                        ? 'health'
                        : 'other'
    metrics.requestsTotal += 1
    metrics.byNamespace[namespace] += 1
    if (res.statusCode >= 400 && res.statusCode < 500) metrics.errors4xx += 1
    if (res.statusCode >= 500) metrics.errors5xx += 1
    const logEntry = {
      level: 'info',
      event: 'http.request',
      requestId,
      method: req.method,
      path,
      statusCode: res.statusCode,
      durationMs,
      tenantId: String(user.tenantId ?? ''),
      userId: String(user.sub ?? ''),
      userRole: String(user.role ?? ''),
      ip: req.ip,
    }
    console.log(JSON.stringify(logEntry))
  })
  next()
})

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
  const eventBus = await getEventBusHealth()
  res.json({
    status: 'ok',
    database: { sql, mongo },
    eventBus,
  })
})

app.get('/api/metrics', (_req, res) => {
  res.json({
    status: 'ok',
    startedAt,
    uptimeSeconds: Math.round(process.uptime()),
    requestsTotal: metrics.requestsTotal,
    errors4xx: metrics.errors4xx,
    errors5xx: metrics.errors5xx,
    byNamespace: metrics.byNamespace,
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
app.use('/api/integrations', integrationRoutes)
app.use('/api/reports', reportRoutes)


app.use((error, req, res, _next) => {
  const baseErrorLog = {
    level: 'error',
    event: 'http.error',
    requestId: String(req?.requestId ?? ''),
    method: String(req?.method ?? ''),
    path: String(req?.originalUrl ?? ''),
    tenantId: String(req?.user?.tenantId ?? ''),
    userId: String(req?.user?.sub ?? ''),
    userRole: String(req?.user?.role ?? ''),
    message: String(error?.message ?? 'Erro desconhecido'),
    name: String(error?.name ?? 'Error'),
  }
  if (error instanceof AppError) {
    console.error(JSON.stringify({ ...baseErrorLog, statusCode: error.statusCode }))
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
    console.error(JSON.stringify({ ...baseErrorLog, statusCode: 503, prismaUnavailable: true }))
    return res.status(503).json({
      message:
        'Base de dados relacional indisponível. Verifique DATABASE_URL em backend/.env (SQLite: file:./dev.db; Postgres: porta 5432).',
    })
  }

  console.error(JSON.stringify({ ...baseErrorLog, statusCode: 500, stack: isProd ? undefined : error?.stack }))
  res.status(500).json({
    message: isProd
      ? 'Erro interno do servidor.'
      : `Erro interno: ${error?.message ?? 'desconhecido'}`,
  })
})

app.listen(port, () => {
  console.log(`API rodando em http://localhost:${port}`)
})

