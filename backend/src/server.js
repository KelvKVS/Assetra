import 'dotenv/config'
import express from 'express'
import helmet from 'helmet'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import rateLimit from 'express-rate-limit'
import authRoutes from './routes/auth.js'

if (!process.env.JWT_SECRET) {
  process.env.JWT_SECRET = 'troque-este-segredo-em-producao'
}

const app = express()
const port = Number(process.env.PORT) || 3000
const corsOrigin = process.env.CORS_ORIGIN || 'http://localhost:5173'

app.use(helmet())
app.use(
  cors({
    origin: corsOrigin,
    credentials: true,
  }),
)
app.use(express.json({ limit: '10kb' }))
app.use(cookieParser())

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Muitas tentativas de login. Tente novamente em alguns minutos.' },
})

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' })
})

app.use('/api/auth/login', loginLimiter)
app.use('/api/auth', authRoutes)

app.use((error, _req, res, _next) => {
  console.error(error)
  res.status(500).json({ message: 'Erro interno do servidor.' })
})

app.listen(port, () => {
  console.log(`API rodando em http://localhost:${port}`)
})
