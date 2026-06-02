import jwt from 'jsonwebtoken'
import { AppError } from '../utils/AppError.js'
import {
  isEmailConfigured,
  sendRegistrationDisputeNoticeEmail,
  sendUserRegistrationInviteEmail,
} from './emailService.js'

const INVITE_EXPIRES = '7d'

function getJwtSecret() {
  const secret = String(process.env.JWT_SECRET ?? '').trim()
  if (!secret) throw new AppError(500, 'JWT_SECRET não configurado.')
  return secret
}

function getFrontendBaseUrl() {
  return String(process.env.FRONTEND_URL ?? 'http://localhost:5173').replace(/\/+$/, '')
}

export function signRegistrationInviteToken({ userId, tenantId, email }) {
  return jwt.sign(
    { type: 'registration_invite', sub: userId, tenantId, email },
    getJwtSecret(),
    { expiresIn: INVITE_EXPIRES },
  )
}

function verifyRegistrationInviteToken(token) {
  try {
    const payload = jwt.verify(String(token ?? ''), getJwtSecret())
    if (payload?.type !== 'registration_invite' || !payload.sub || !payload.tenantId) {
      throw new AppError(400, 'Link de convite inválido.')
    }
    return payload
  } catch (err) {
    if (err instanceof AppError) throw err
    throw new AppError(400, 'Link de convite inválido ou expirado.')
  }
}

export function buildInviteUrls(token) {
  const base = getFrontendBaseUrl()
  const q = encodeURIComponent(token)
  return {
    confirmUrl: `${base}/convite?token=${q}&acao=confirmar`,
    disputeUrl: `${base}/convite?token=${q}&acao=contestar`,
    loginUrl: `${base}/login`,
  }
}

/** Gera links de convite sem enviar e-mail (resposta rápida da API). */
export function prepareRegistrationInviteLinks(user, tenantId) {
  const token = signRegistrationInviteToken({
    userId: user.id,
    tenantId,
    email: user.email,
  })
  return buildInviteUrls(token)
}

const INVITE_EMAIL_TIMEOUT_MS = 12_000

function buildInviteMetaFromMail(mailResult, urls) {
  const realInbox = mailResult.sent === true && mailResult.realInbox === true
  return {
    emailSent: realInbox,
    emailTestOnly: mailResult.sent === true && !realInbox,
    emailDeliveryMode: mailResult.mode ?? 'none',
    emailConfigured: isEmailConfigured(),
    confirmUrl: urls.confirmUrl,
    emailPreviewUrl: mailResult.previewUrl ?? null,
    emailError: mailResult.emailError ?? null,
    emailHint:
      mailResult.emailHint ??
      (realInbox
        ? 'O colaborador deve receber o e-mail na caixa de entrada (verifique spam).'
        : mailResult.previewUrl
          ? mailResult.smtpFailed
            ? 'SMTP do Gmail falhou, mas gerámos um e-mail de teste. Abra o preview ou corrija SMTP_PASS.'
            : 'Modo teste: abra o link «Ver e-mail de teste» — não chega ao Gmail real.'
          : mailResult.emailError ||
            'E-mail não enviado. Use o link de confirmação abaixo ou corrija SMTP_PASS no backend/.env.'),
  }
}

async function sendInviteEmail({ user, tenant, inviter, urls }) {
  return sendUserRegistrationInviteEmail({
    to: user.email,
    userName: user.name,
    tenantName: tenant.name,
    inviterName: inviter.name,
    inviterEmail: inviter.email,
    ...urls,
  })
}

/**
 * @param {import('@prisma/client').PrismaClient} prisma
 * @param {{ user: object, tenant: object, inviter: { id: string, name: string, email: string } }} ctx
 */
/**
 * Cria utilizador e envia convite em background (resposta HTTP imediata).
 */
export function queueRegistrationInviteEmail(prisma, { user, tenant, inviter }) {
  const urls = prepareRegistrationInviteLinks(user, tenant.id)

  void sendRegistrationInviteAfterCreate(prisma, { user, tenant, inviter }).catch((err) => {
    console.warn('[registration-invite] Envio em background falhou:', err?.message ?? err)
  })

  return {
    emailSent: false,
    emailTestOnly: false,
    emailDeliveryMode: 'pending',
    emailConfigured: isEmailConfigured(),
    confirmUrl: urls.confirmUrl,
    emailPreviewUrl: null,
    emailError: null,
    emailHint:
      'Utilizador criado. O e-mail de convite está a ser enviado — use o link abaixo se o colaborador não receber.',
  }
}

/**
 * Envia convite (reenvio — pode aguardar até 12s).
 */
export async function sendRegistrationInviteAfterCreate(prisma, { user, tenant, inviter }) {
  const urls = prepareRegistrationInviteLinks(user, tenant.id)

  const mailTask = sendInviteEmail({ user, tenant, inviter, urls })
  let mailResult
  try {
    mailResult = await Promise.race([
      mailTask,
      new Promise((_, reject) => {
        setTimeout(() => reject(new Error('invite_email_timeout')), INVITE_EMAIL_TIMEOUT_MS)
      }),
    ])
  } catch (err) {
    const isTimeout = String(err?.message ?? '') === 'invite_email_timeout'
    console.warn(
      '[registration-invite]',
      isTimeout ? 'Envio de e-mail demorou; utilizador já criado. Link:',
      : 'Falha ao enviar e-mail:',
      urls.confirmUrl,
      err?.message ?? err,
    )
    void mailTask
      .then((late) => {
        if (late?.sent) {
          console.info('[registration-invite] E-mail enviado após demora:', user.email)
        }
      })
      .catch((lateErr) => {
        console.warn('[registration-invite] E-mail em background falhou:', lateErr?.message ?? lateErr)
      })

    return {
      emailSent: false,
      emailTestOnly: false,
      emailDeliveryMode: 'pending',
      emailConfigured: isEmailConfigured(),
      confirmUrl: urls.confirmUrl,
      emailPreviewUrl: null,
      emailError: isTimeout ? null : String(err?.message ?? err),
      emailHint:
        'Utilizador criado. O e-mail pode demorar no servidor — use o link de confirmação abaixo ou «Reenviar convite».',
    }
  }

  if (!mailResult.sent) {
    console.info('[registration-invite] Link de confirmação:', urls.confirmUrl)
  }

  return buildInviteMetaFromMail(mailResult, urls)
}

/**
 * ADM confirma cadastro manualmente (quando o e-mail não chegou).
 */
export async function confirmUserRegistrationByAdmin(prisma, tenantId, userId) {
  const user = await prisma.user.findFirst({ where: { id: userId, tenantId } })
  if (!user) {
    throw new AppError(404, 'Utilizador não encontrado.')
  }
  if (!user.invitedByUserId) {
    throw new AppError(400, 'Este utilizador não requer confirmação de convite.')
  }
  if (user.registrationDisputedAt) {
    throw new AppError(409, 'Cadastro contestado. Resolva a contestação antes de confirmar.')
  }

  await prisma.user.update({
    where: { id: userId },
    data: {
      registrationAcknowledgedAt: user.registrationAcknowledgedAt ?? new Date(),
      registrationDisputedAt: null,
    },
  })

  return { ok: true, userId, email: user.email }
}

/**
 * Reenvia e-mail de convite.
 */
export async function resendRegistrationInvite(prisma, tenantId, userId, inviter) {
  const user = await prisma.user.findFirst({
    where: { id: userId, tenantId },
    include: { tenant: true },
  })
  if (!user) {
    throw new AppError(404, 'Utilizador não encontrado.')
  }
  if (!user.invitedByUserId) {
    throw new AppError(400, 'Este utilizador não foi cadastrado por convite Google.')
  }
  if (user.registrationAcknowledgedAt) {
    throw new AppError(400, 'Cadastro já confirmado.')
  }

  return sendRegistrationInviteAfterCreate(prisma, {
    user,
    tenant: user.tenant,
    inviter: {
      id: inviter.sub,
      name: inviter.name || 'Administrador',
      email: inviter.email || '',
    },
  })
}

/**
 * @param {import('@prisma/client').PrismaClient} prisma
 * @param {string} token
 */
export async function confirmRegistrationInvite(prisma, token) {
  const payload = verifyRegistrationInviteToken(token)
  const user = await prisma.user.findFirst({
    where: { id: payload.sub, tenantId: payload.tenantId },
    include: { tenant: true },
  })
  if (!user) {
    throw new AppError(404, 'Utilizador não encontrado.')
  }
  if (user.registrationDisputedAt) {
    throw new AppError(409, 'Este cadastro foi contestado. Aguarde o administrador.')
  }

  const now = new Date()
  if (!user.registrationAcknowledgedAt) {
    await prisma.user.update({
      where: { id: user.id },
      data: { registrationAcknowledgedAt: now },
    })
  }

  return {
    ok: true,
    alreadyConfirmed: Boolean(user.registrationAcknowledgedAt),
    userName: user.name,
    tenantName: user.tenant.name,
    loginUrl: `${getFrontendBaseUrl()}/login/${user.tenant.slug}`,
  }
}

/**
 * @param {import('@prisma/client').PrismaClient} prisma
 * @param {string} token
 */
export async function disputeRegistrationInvite(prisma, token) {
  const payload = verifyRegistrationInviteToken(token)
  const user = await prisma.user.findFirst({
    where: { id: payload.sub, tenantId: payload.tenantId },
    include: { tenant: true },
  })
  if (!user) {
    throw new AppError(404, 'Utilizador não encontrado.')
  }

  const now = new Date()
  if (!user.registrationDisputedAt) {
    await prisma.user.update({
      where: { id: user.id },
      data: { registrationDisputedAt: now },
    })
  }

  let adminNotified = false
  if (user.invitedByUserId) {
    const inviter = await prisma.user.findFirst({
      where: { id: user.invitedByUserId, tenantId: user.tenantId },
      select: { name: true, email: true },
    })
    if (inviter?.email) {
      const result = await sendRegistrationDisputeNoticeEmail({
        to: inviter.email,
        adminName: inviter.name,
        userName: user.name,
        userEmail: user.email,
        tenantName: user.tenant.name,
      })
      adminNotified = result.sent === true
    }
  }

  return {
    ok: true,
    alreadyDisputed: Boolean(user.registrationDisputedAt),
    userName: user.name,
    tenantName: user.tenant.name,
    adminNotified,
  }
}
