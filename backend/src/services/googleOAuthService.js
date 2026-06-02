import { randomUUID } from 'node:crypto'
import { OAuth2Client } from 'google-auth-library'
import jwt from 'jsonwebtoken'
import { AppError } from '../utils/AppError.js'
import { getFrontendBaseUrl } from '../utils/frontendUrl.js'

function getJwtSecret() {
  const secret = process.env.JWT_SECRET
  if (!secret || String(secret).length < 16) {
    throw new AppError(500, 'JWT_SECRET inválido ou ausente.')
  }
  return secret
}

export function getFrontendUrl() {
  return getFrontendBaseUrl()
}

export function getGoogleRedirectUri() {
  const explicit = String(process.env.GOOGLE_REDIRECT_URI || '').trim()
  if (explicit) return explicit.replace(/\/+$/, '')
  const isProd = process.env.NODE_ENV === 'production'
  if (!isProd) {
    // Dev: callback no mesmo host/porta do Vite para o cookie httpOnly funcionar com o proxy /api
    return `${getFrontendUrl()}/api/auth/google/callback`
  }
  const base = String(process.env.API_PUBLIC_URL || '').trim().replace(/\/+$/, '')
  if (!base) {
    throw new AppError(500, 'Defina API_PUBLIC_URL ou GOOGLE_REDIRECT_URI em produção.')
  }
  return `${base}/api/auth/google/callback`
}

export function createGoogleOAuthClient() {
  const clientId = process.env.GOOGLE_CLIENT_ID?.trim()
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim()
  if (!clientId) {
    throw new AppError(500, 'Defina GOOGLE_CLIENT_ID em backend/.env.')
  }
  if (!clientSecret) {
    return null
  }
  return new OAuth2Client(clientId, clientSecret, getGoogleRedirectUri())
}

export function buildGoogleAuthUrl(tenantSlug) {
  const client = createGoogleOAuthClient()
  if (!client) {
    throw new AppError(
      500,
      'Login Google pelo servidor requer GOOGLE_CLIENT_SECRET. Use o botão na página de login (fluxo pelo browser).',
    )
  }
  const state = jwt.sign(
    {
      nonce: randomUUID(),
      tenantSlug: tenantSlug?.trim().toLowerCase() || undefined,
    },
    getJwtSecret(),
    { expiresIn: '10m' },
  )
  return {
    state,
    url: client.generateAuthUrl({
      access_type: 'online',
      scope: ['openid', 'email', 'profile'],
      state,
      prompt: 'select_account',
    }),
  }
}

export function parseGoogleOAuthState(state) {
  if (!state || typeof state !== 'string') {
    throw new AppError(400, 'Estado OAuth inválido.')
  }
  try {
    return jwt.verify(state, getJwtSecret())
  } catch {
    throw new AppError(400, 'Estado OAuth expirado ou inválido. Tente entrar com Google novamente.')
  }
}

export async function exchangeGoogleCodeForEmail(code) {
  const client = createGoogleOAuthClient()
  if (!client) {
    throw new AppError(500, 'GOOGLE_CLIENT_SECRET não configurado.')
  }
  const clientId = process.env.GOOGLE_CLIENT_ID.trim()
  try {
    const { tokens } = await client.getToken(code)
    if (!tokens.id_token) {
      throw new AppError(401, 'Google não devolveu id_token.')
    }
    const ticket = await client.verifyIdToken({
      idToken: tokens.id_token,
      audience: clientId,
    })
    const payload = ticket.getPayload()
    const email = String(payload?.email ?? '')
      .trim()
      .toLowerCase()
    if (!email) {
      throw new AppError(401, 'Não foi possível obter o e-mail da conta Google.')
    }
    const picture = String(payload?.picture ?? '').trim()
    return {
      email,
      picture: /^https?:\/\//i.test(picture) ? picture : undefined,
    }
  } catch (err) {
    if (err instanceof AppError) throw err
    throw new AppError(
      401,
      'Falha ao validar login Google. Confira GOOGLE_CLIENT_SECRET e o URI de redirecionamento no Google Cloud.',
    )
  }
}

export function signTenantPickCookie(tenants) {
  return jwt.sign({ tenants }, getJwtSecret(), { expiresIn: '10m' })
}

export function readTenantPickCookie(token) {
  if (!token) return null
  try {
    const payload = jwt.verify(token, getJwtSecret())
    return Array.isArray(payload?.tenants) ? payload.tenants : null
  } catch {
    return null
  }
}

export function redirectWithError(res, message) {
  const target = new URL('/login', getFrontendUrl())
  target.searchParams.set('error', message)
  return res.redirect(target.toString())
}

export function redirectToLoginPick(res) {
  const target = new URL('/login', getFrontendUrl())
  target.searchParams.set('google', 'pick')
  return res.redirect(target.toString())
}

export function redirectToDashboard(res) {
  return res.redirect(new URL('/dashboard', getFrontendUrl()).toString())
}
