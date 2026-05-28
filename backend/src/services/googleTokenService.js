import { OAuth2Client } from 'google-auth-library'
import { AppError } from '../utils/AppError.js'
import { normalizeEmail } from '../utils/emailPolicy.js'

const googleClient = new OAuth2Client()

async function verifyViaTokenInfo(credential, clientId) {
  const url = `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(credential.trim())}`
  const res = await fetch(url)
  if (!res.ok) {
    throw new AppError(401, 'Token Google inválido ou expirado. Clique em «Importar do Google» novamente.')
  }
  const data = await res.json()
  if (String(data.aud ?? '') !== clientId) {
    throw new AppError(
      401,
      'Client ID do token não coincide com GOOGLE_CLIENT_ID do backend. Confira o .env.',
    )
  }
  const emailVerified = data.email_verified === true || data.email_verified === 'true'
  if (!emailVerified) {
    throw new AppError(400, 'Este e-mail Google ainda não está verificado. Use outra conta.')
  }
  const email = normalizeEmail(data.email)
  const name = String(data.name ?? data.given_name ?? '').trim() || email.split('@')[0]
  if (!email) {
    throw new AppError(401, 'Não foi possível obter o e-mail da conta Google.')
  }
  const picture = String(data.picture ?? '').trim()
  return {
    email,
    name,
    googleSubject: data.sub ? String(data.sub) : undefined,
    picture: /^https?:\/\//i.test(picture) ? picture : undefined,
  }
}

/**
 * Valida id_token do Google e devolve dados verificados.
 * @param {string} credential
 * @param {string} [expectedEmail] — se informado, tem de coincidir com o token
 */
export async function verifyGoogleIdToken(credential, expectedEmail) {
  const clientId = process.env.GOOGLE_CLIENT_ID?.trim()
  if (!clientId) {
    throw new AppError(500, 'GOOGLE_CLIENT_ID não configurado no backend.')
  }
  if (!credential?.trim()) {
    throw new AppError(400, 'Credencial Google ausente.')
  }

  let verified
  try {
    const ticket = await googleClient.verifyIdToken({
      idToken: credential.trim(),
      audience: clientId,
    })
    const payload = ticket.getPayload()
    const email = normalizeEmail(payload?.email)
    const emailVerified = payload?.email_verified === true
    const name = String(payload?.name ?? '').trim()

    if (!email || !name) {
      throw new AppError(401, 'Não foi possível obter nome e e-mail verificados do Google.')
    }
    if (!emailVerified) {
      throw new AppError(400, 'Este e-mail Google ainda não está verificado. Use outra conta.')
    }
    verified = {
      email,
      name,
      googleSubject: payload?.sub ? String(payload.sub) : undefined,
      picture: typeof payload?.picture === 'string' ? payload.picture.trim() : undefined,
    }
  } catch (err) {
    if (err instanceof AppError) throw err
    try {
      verified = await verifyViaTokenInfo(credential, clientId)
    } catch (fallbackErr) {
      if (fallbackErr instanceof AppError) throw fallbackErr
      throw new AppError(
        401,
        'Token Google inválido ou expirado. Volte a «Importar do Google» (não recarregue a página antes).',
      )
    }
  }

  if (expectedEmail && normalizeEmail(expectedEmail) !== verified.email) {
    throw new AppError(400, 'O e-mail do formulário não coincide com a conta Google selecionada.')
  }

  return verified
}
