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

function buildInviteUrls(token) {
  const base = getFrontendBaseUrl()
  const q = encodeURIComponent(token)
  return {
    confirmUrl: `${base}/convite?token=${q}&acao=confirmar`,
    disputeUrl: `${base}/convite?token=${q}&acao=contestar`,
    loginUrl: `${base}/login`,
  }
}

/**
 * @param {import('@prisma/client').PrismaClient} prisma
 * @param {{ user: object, tenant: object, inviter: { id: string, name: string, email: string } }} ctx
 */
export async function sendRegistrationInviteAfterCreate(prisma, { user, tenant, inviter }) {
  const token = signRegistrationInviteToken({
    userId: user.id,
    tenantId: tenant.id,
    email: user.email,
  })
  const urls = buildInviteUrls(token)

  const mailResult = await sendUserRegistrationInviteEmail({
    to: user.email,
    userName: user.name,
    tenantName: tenant.name,
    inviterName: inviter.name,
    inviterEmail: inviter.email,
    ...urls,
  })

  if (!mailResult.sent) {
    console.info('[registration-invite] Link de confirmação:', urls.confirmUrl)
  }

  const realInbox = mailResult.sent === true && mailResult.realInbox === true

  return {
    /** Entregue na caixa de entrada real do destinatário (SMTP). */
    emailSent: realInbox,
    /** Enviado só para sandbox de teste (Ethereal) — não chega ao Gmail. */
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
