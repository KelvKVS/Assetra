import prisma from '../lib/prisma.js'
import { AppError } from '../utils/AppError.js'
import {
  hasConnectionDetails,
  maskAuthConfig,
  mergeAuthConfig,
  normalizeAuthConfig,
  parseJsonObject,
  stringifyJsonObject,
} from '../utils/integrationAuthConfig.js'
import { executeIntegrationTest } from '../utils/integrationRequest.js'

function toDto(row) {
  const authConfig = parseJsonObject(row.authConfig)
  const extraHeaders = parseJsonObject(row.extraHeaders)
  const { masked, hasSecrets } = maskAuthConfig(authConfig)

  return {
    id: row.id,
    name: row.name,
    kind: row.kind,
    baseUrl: row.baseUrl ?? '',
    endpointPath: row.endpointPath ?? '',
    authType: row.authType,
    authConfig: masked,
    extraHeaders,
    notes: row.notes ?? '',
    hasSecrets,
    active: Boolean(row.active),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }
}

function buildPersistPayload(payload, existingRow = null) {
  const authType = payload.authType ?? existingRow?.authType ?? 'Bearer'
  const mergedAuth = mergeAuthConfig(
    existingRow?.authConfig ?? '{}',
    payload.authConfig != null ? payload.authConfig : undefined,
  )

  const baseUrl = payload.baseUrl != null ? String(payload.baseUrl).trim() : (existingRow?.baseUrl ?? '')
  if (baseUrl && !/^https?:\/\//i.test(baseUrl)) {
    throw new AppError(400, 'URL base inválida. Utilize http:// ou https://')
  }
  const endpointPath =
    payload.endpointPath != null
      ? String(payload.endpointPath).trim()
      : (existingRow?.endpointPath ?? '')

  const candidate = {
    baseUrl,
    endpointPath,
    authType,
    authConfig: mergedAuth,
  }

  if (!hasConnectionDetails(candidate)) {
    throw new AppError(
      400,
      'Informe URL, endpoint ou credenciais (token/chave) para configurar a integração.',
    )
  }

  return {
    name: payload.name != null ? String(payload.name).trim() : undefined,
    kind: payload.kind,
    baseUrl,
    endpointPath: endpointPath || null,
    authType,
    authConfig: stringifyJsonObject(mergedAuth),
    extraHeaders:
      payload.extraHeaders != null
        ? stringifyJsonObject(normalizeAuthConfig(payload.extraHeaders))
        : undefined,
    notes: payload.notes != null ? String(payload.notes).trim().slice(0, 1000) : undefined,
    active: payload.active != null ? Boolean(payload.active) : undefined,
  }
}

export async function listAdminIntegrations(tenantId) {
  const rows = await prisma.financeIntegration.findMany({
    where: { tenantId },
    orderBy: [{ active: 'desc' }, { name: 'asc' }],
  })
  return rows.map(toDto)
}

export async function createAdminIntegration(tenantId, payload) {
  if (!String(payload.name ?? '').trim()) {
    throw new AppError(400, 'Nome da integração é obrigatório.')
  }
  const data = buildPersistPayload(payload)
  const row = await prisma.financeIntegration.create({
    data: {
      tenantId,
      name: String(payload.name).trim(),
      kind: data.kind,
      baseUrl: data.baseUrl,
      endpointPath: data.endpointPath,
      authType: data.authType,
      authConfig: data.authConfig,
      extraHeaders: data.extraHeaders ?? '{}',
      notes: data.notes ?? null,
      active: Boolean(data.active),
    },
  })
  return toDto(row)
}

export async function updateAdminIntegration(tenantId, id, payload) {
  const existing = await prisma.financeIntegration.findFirst({
    where: { id, tenantId },
  })
  if (!existing) {
    throw new AppError(404, 'Integração não encontrada.')
  }

  const data = buildPersistPayload(payload, existing)
  const row = await prisma.financeIntegration.update({
    where: { id },
    data: {
      ...(data.name != null ? { name: data.name } : {}),
      ...(data.kind != null ? { kind: data.kind } : {}),
      ...(data.baseUrl != null ? { baseUrl: data.baseUrl } : {}),
      ...(data.endpointPath !== undefined ? { endpointPath: data.endpointPath } : {}),
      ...(data.authType != null ? { authType: data.authType } : {}),
      ...(data.authConfig != null ? { authConfig: data.authConfig } : {}),
      ...(data.extraHeaders != null ? { extraHeaders: data.extraHeaders } : {}),
      ...(data.notes !== undefined ? { notes: data.notes || null } : {}),
      ...(data.active != null ? { active: data.active } : {}),
    },
  })
  return toDto(row)
}

export async function deleteAdminIntegration(tenantId, id) {
  const existing = await prisma.financeIntegration.findFirst({
    where: { id, tenantId },
    select: { id: true },
  })
  if (!existing) {
    throw new AppError(404, 'Integração não encontrada.')
  }
  await prisma.financeIntegration.delete({ where: { id } })
}

export async function hasActiveFinanceIntegration(tenantId) {
  const row = await prisma.financeIntegration.findFirst({
    where: { tenantId, active: true, kind: 'FINANCE' },
    select: { id: true },
  })
  return Boolean(row?.id)
}

export async function testAdminIntegrationPayload(payload) {
  return executeIntegrationTest({
    baseUrl: payload.baseUrl,
    endpointPath: payload.endpointPath,
    authType: payload.authType ?? 'Bearer',
    authConfig: payload.authConfig ?? {},
    extraHeaders: payload.extraHeaders ?? {},
  })
}

export async function testAdminIntegrationById(tenantId, id, overrides = {}) {
  const row = await prisma.financeIntegration.findFirst({
    where: { id, tenantId },
  })
  if (!row) {
    throw new AppError(404, 'Integração não encontrada.')
  }

  const mergedAuth = mergeAuthConfig(row.authConfig, overrides.authConfig ?? {})
  return executeIntegrationTest({
    baseUrl: overrides.baseUrl ?? row.baseUrl,
    endpointPath: overrides.endpointPath ?? row.endpointPath,
    authType: overrides.authType ?? row.authType,
    authConfig: mergedAuth,
    extraHeaders: overrides.extraHeaders != null ? overrides.extraHeaders : parseJsonObject(row.extraHeaders),
  })
}
