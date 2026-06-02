import { randomUUID } from 'node:crypto'
import bcrypt from 'bcryptjs'
import { AppError } from '../utils/AppError.js'
import { profileToRole } from '../utils/profileRole.js'
import { isDemoAssetraEmail, normalizeEmail, requiresGoogleVerification } from '../utils/emailPolicy.js'
import { DEFAULT_DEPARTMENTS } from '../constants/departments.js'
import { sendRegistrationInviteAfterCreate } from './registrationInviteService.js'

function normalizeDepartment(raw) {
  const value = String(raw ?? '').trim()
  return value || null
}

function assertDepartmentForRole(role, department) {
  if (role === 'FUNCIONARIO' && !department) {
    throw new AppError(400, 'Informe a área/setor do funcionário.')
  }
}

function mapUserDto(u, extra = {}) {
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role,
    department: u.department ?? null,
    status: u.active ? 'Ativo' : 'Inativo',
    ...extra,
  }
}

/**
 * @param {import('@prisma/client').PrismaClient} prisma
 * @param {string} tenantId
 */
export async function listUsersByTenant(prisma, tenantId) {
  const users = await prisma.user.findMany({
    where: { tenantId },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      department: true,
      active: true,
      createdAt: true,
      invitedByUserId: true,
      registrationAcknowledgedAt: true,
      registrationDisputedAt: true,
    },
    orderBy: { createdAt: 'desc' },
  })
  return users.map((u) =>
    mapUserDto(u, {
      registrationPending: Boolean(
        u.invitedByUserId && !u.registrationAcknowledgedAt && !u.registrationDisputedAt,
      ),
      registrationDisputed: Boolean(u.registrationDisputedAt),
    }),
  )
}

/** Lista reduzida para seleção de destino em movimentações (todos os perfis autenticados). */
export async function listUsersDirectory(prisma, tenantId) {
  const users = await prisma.user.findMany({
    where: { tenantId, active: true },
    select: {
      id: true,
      name: true,
      email: true,
      department: true,
      active: true,
    },
    orderBy: { name: 'asc' },
  })
  return users.map((u) => mapUserDto(u))
}

/**
 * @param {import('@prisma/client').PrismaClient} prisma
 * @param {string} tenantId
 */
export async function listDepartmentOptions(prisma, tenantId) {
  const rows = await prisma.user.findMany({
    where: { tenantId, department: { not: null } },
    select: { department: true },
  })
  const fromDb = rows
    .map((r) => String(r.department ?? '').trim())
    .filter(Boolean)
  const merged = [...new Set([...DEFAULT_DEPARTMENTS, ...fromDb])]
  merged.sort((a, b) => a.localeCompare(b, 'pt'))
  return { departments: merged }
}

function resolveRole(input) {
  if (input.role) return input.role
  if (input.profile) return profileToRole(input.profile)
  throw new AppError(400, 'Informe role ou profile.')
}

/**
 * @param {import('@prisma/client').PrismaClient} prisma
 * @param {string} tenantId
 * @param {string} email
 */
export async function checkUserEmailInTenant(prisma, tenantId, email) {
  const normalized = normalizeEmail(email)
  if (!normalized) {
    return {
      formatValid: false,
      available: false,
      isDemo: false,
      requiresGoogleImport: false,
      message: 'Informe um e-mail válido.',
    }
  }

  const isDemo = isDemoAssetraEmail(normalized)
  const requiresGoogleImport = requiresGoogleVerification(normalized)

  const emailLooksValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)
  if (!emailLooksValid) {
    return {
      formatValid: false,
      available: false,
      isDemo,
      requiresGoogleImport,
      message: 'Formato de e-mail inválido.',
    }
  }

  const existing = await prisma.user.findFirst({
    where: { tenantId, email: normalized },
    select: { id: true, active: true },
  })

  if (existing) {
    return {
      formatValid: true,
      available: false,
      isDemo,
      requiresGoogleImport,
      message: 'Este e-mail já está cadastrado nesta organização.',
    }
  }

  if (isDemo) {
    return {
      formatValid: true,
      available: true,
      isDemo: true,
      requiresGoogleImport: false,
      message: 'Conta de demonstração (@assetra.local). Cadastro manual com senha.',
    }
  }

  return {
    formatValid: true,
    available: true,
    isDemo: false,
    requiresGoogleImport: true,
    message:
      'E-mail disponível. O colaborador fará o primeiro acesso com «Entrar com Google» usando esta conta.',
  }
}

/**
 * @param {import('@prisma/client').PrismaClient} prisma
 * @param {string} tenantId
 * @param {object} input
 */
export async function createUserInTenant(prisma, tenantId, input, inviter = null) {
  const email = normalizeEmail(input.email)
  const isDemo = isDemoAssetraEmail(email)

  if (isDemo) {
    if (!email.endsWith('@assetra.local')) {
      throw new AppError(400, 'Contas de demonstração devem usar o domínio @assetra.local.')
    }
  }

  const availability = await checkUserEmailInTenant(prisma, tenantId, input.email)
  if (!availability.available) {
    throw new AppError(400, availability.message || 'E-mail indisponível.')
  }

  const role = resolveRole(input)
  const department = normalizeDepartment(input.department)
  assertDepartmentForRole(role, department)
  const active = input.status !== 'Inativo'
  const defaultPassword = isDemo
    ? input.password || 'senha123'
    : input.password || `Google-${randomUUID().slice(0, 12)}`
  if (isDemo && (!input.password || input.password.length < 8)) {
    throw new AppError(400, 'Contas demo exigem senha inicial de pelo menos 8 caracteres.')
  }
  const passwordHash = await bcrypt.hash(defaultPassword, 10)

  try {
    const user = await prisma.user.create({
      data: {
        name: input.name.trim(),
        email: normalizeEmail(input.email),
        passwordHash,
        hasConfirmationPassword: isDemo,
        role,
        department,
        active,
        tenantId,
        invitedByUserId: !isDemo && inviter?.sub ? inviter.sub : undefined,
      },
    })

    let inviteMeta = {}
    if (!isDemo && inviter?.sub) {
      const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } })
      if (tenant) {
        const inviteResult = await sendRegistrationInviteAfterCreate(prisma, {
          user,
          tenant,
          inviter: {
            id: inviter.sub,
            name: inviter.name || 'Administrador',
            email: inviter.email || '',
          },
        })
        inviteMeta = {
          registrationEmailSent: inviteResult.emailSent,
          emailTestOnly: inviteResult.emailTestOnly,
          emailDeliveryMode: inviteResult.emailDeliveryMode,
          emailHint: inviteResult.emailHint,
          registrationConfirmUrl: inviteResult.confirmUrl,
          registrationEmailPreviewUrl: inviteResult.emailPreviewUrl,
        }
      }
    }

    return mapUserDto(user, {
      accountType: isDemo ? 'demo' : 'google',
      registrationPending: !isDemo && Boolean(inviter?.sub),
      ...inviteMeta,
    })
  } catch {
    throw new AppError(400, 'E-mail já existe nesta organização ou dados inválidos.')
  }
}

/**
 * @param {import('@prisma/client').PrismaClient} prisma
 * @param {string} tenantId
 * @param {string} userId
 * @param {object} input
 */
export async function updateUserInTenant(prisma, tenantId, userId, input) {
  const data = {}
  if (input.name != null) data.name = input.name
  if (input.email != null) data.email = input.email.toLowerCase()
  if (input.password) data.passwordHash = await bcrypt.hash(input.password, 10)
  if (input.role != null) data.role = input.role
  if (input.profile != null && input.role == null) data.role = profileToRole(input.profile)
  if (input.status != null) data.active = input.status === 'Ativo'
  if (input.department !== undefined) {
    data.department = input.department === null ? null : normalizeDepartment(input.department)
  }

  try {
    const existing = await prisma.user.findFirst({ where: { id: userId, tenantId } })
    if (!existing) {
      throw new AppError(404, 'Usuário não encontrado neste tenant.')
    }
    const nextRole = data.role ?? existing.role
    const nextDepartment =
      data.department !== undefined ? data.department : existing.department
    assertDepartmentForRole(nextRole, nextDepartment)

    const user = await prisma.user.update({
      where: { id: userId },
      data,
    })
    return mapUserDto(user)
  } catch {
    throw new AppError(400, 'Não foi possível atualizar (e-mail duplicado ou usuário inexistente).')
  }
}

/**
 * @param {import('@prisma/client').PrismaClient} prisma
 * @param {string} tenantId
 * @param {string} userId
 */
export async function deleteUserInTenant(prisma, tenantId, userId) {
  const result = await prisma.user.deleteMany({
    where: { id: userId, tenantId },
  })
  if (result.count === 0) {
    throw new AppError(404, 'Usuário não encontrado neste tenant.')
  }
}
