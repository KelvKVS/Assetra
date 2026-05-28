import { z } from 'zod'

export const loginSchema = z.object({
  email: z.string().email().max(120),
  password: z.string().min(8).max(100),
  /** Slug da organização; string vazia é tratada como omitida no serviço de auth. */
  tenantSlug: z.string().trim().max(64).nullish(),
})

export const googleAuthSchema = z.object({
  credential: z.string().min(1).max(4000),
  tenantSlug: z.string().trim().max(64).nullish(),
})

const roleEnum = z.enum(['ADM', 'GESTOR', 'TECNICO', 'FUNCIONARIO'])
const profileEnum = z.enum([
  'Administrador',
  'Gestor',
  'Técnico',
  'Funcionário',
  'ADM',
  'GESTOR',
  'TECNICO',
  'FUNCIONARIO',
])
const userStatusEnum = z.enum(['Ativo', 'Inativo'])

export const userCreateSchema = z
  .object({
    name: z.string().min(3).max(120),
    email: z.string().email().max(120),
    password: z.string().min(8).max(100).optional(),
    googleCredential: z.string().min(1).max(4000).optional(),
    role: roleEnum.optional(),
    profile: profileEnum.optional(),
    department: z.string().trim().min(1).max(120).optional(),
    status: userStatusEnum.optional(),
  })
  .refine((d) => d.role != null || d.profile != null, { message: 'Informe role ou profile.' })
  .refine(
    (d) => {
      const role = d.role ?? (d.profile === 'FUNCIONARIO' || d.profile === 'Funcionário' ? 'FUNCIONARIO' : null)
      if (role === 'FUNCIONARIO' && !d.department?.trim()) {
        return false
      }
      return true
    },
    { message: 'Informe a área/setor do funcionário.', path: ['department'] },
  )

export const userUpdateSchema = z
  .object({
    name: z.string().min(3).max(120).optional(),
    email: z.string().email().max(120).optional(),
    password: z.string().min(8).max(100).optional(),
    role: roleEnum.optional(),
    profile: profileEnum.optional(),
    department: z.string().trim().min(1).max(120).nullable().optional(),
    status: userStatusEnum.optional(),
  })
  .refine((d) => Object.keys(d).length > 0, { message: 'Informe ao menos um campo para atualizar.' })

const assetStatusEnum = z.enum(['Em uso', 'Disponível', 'Em manutenção'])

const attachmentRefSchema = z.object({
  filename: z.string().min(1).max(240),
  originalName: z.string().max(200).optional(),
  mimetype: z.string().max(120).optional(),
  size: z
    .union([z.number(), z.string(), z.null()])
    .optional()
    .transform((v) => {
      if (v === null || v === undefined || v === '') return undefined
      const n = Number(v)
      return Number.isFinite(n) && n >= 0 ? n : undefined
    }),
  url: z.string().max(500).optional(),
})

export const assetCreateSchema = z.object({
  tag: z.string().min(1).max(40),
  description: z.string().min(1).max(200),
  sector: z.string().min(1).max(120),
  status: assetStatusEnum.optional(),
  /** E-mail do utilizador responsável (Prisma); vazio omite o campo. */
  assignedTo: z.string().trim().max(120).optional(),
  attachments: z.array(attachmentRefSchema).max(6).optional(),
})

export const assetUpdateSchema = z.object({
  tag: z.string().min(1).max(40).optional(),
  description: z.string().min(1).max(200).optional(),
  sector: z.string().min(1).max(120).optional(),
  status: assetStatusEnum.optional(),
  assignedTo: z.string().trim().max(120).optional().nullable(),
  attachments: z.array(attachmentRefSchema).max(6).optional(),
})

export const movementCreateSchema = z.object({
  assetTag: z.string().min(1).max(40),
  origin: z.string().min(1).max(200),
  destination: z.string().min(1).max(200),
  responsible: z.string().min(1).max(120),
})

export const movementUpdateSchema = z.object({
  assetTag: z.string().min(1).max(40).optional(),
  origin: z.string().min(1).max(200).optional(),
  destination: z.string().min(1).max(200).optional(),
  responsible: z.string().min(1).max(120).optional(),
  /** Data exibida (ex.: dd/mm/aaaa) ou ISO */
  date: z.string().max(40).optional(),
})

export const maintenanceCreateSchema = z.object({
  assetTag: z.string().min(1).max(40),
  type: z.string().min(1).max(80),
  description: z.string().max(2000).optional(),
  priority: z.enum(['Alta', 'Média', 'Baixa']),
  status: z.enum(['Aberta', 'Em andamento', 'Concluída']),
  assignedTechnicianEmail: z.string().email().max(120).optional(),
  attachments: z.array(attachmentRefSchema).max(6).optional(),
  openingDate: z.string().optional(),
})

export const maintenanceUpdateSchema = z.object({
  assetTag: z.string().min(1).max(40).optional(),
  type: z.string().min(1).max(80).optional(),
  description: z.string().max(2000).optional(),
  priority: z.enum(['Alta', 'Média', 'Baixa']).optional(),
  status: z.enum(['Aberta', 'Em andamento', 'Concluída']).optional(),
  assignedTechnicianEmail: z.string().email().max(120).optional().nullable(),
  attachments: z.array(attachmentRefSchema).max(6).optional(),
  openingDate: z.string().optional(),
})

export const approvalCreateSchema = z.object({
  type: z.enum(['Movimentação', 'Manutenção']),
  maintenanceId: z.string().min(1).max(64).optional(),
  assetTag: z.string().min(1).max(40),
  description: z.string().min(1).max(500),
  destinationSector: z.string().min(1).max(200).optional(),
  feedback: z.string().max(2000).optional(),
  attachments: z.array(attachmentRefSchema).max(6).optional(),
})

export const approvalRespondSchema = z.object({
  decision: z.enum(['APPROVED', 'REJECTED']),
  notes: z.string().max(500).optional(),
  /** Ao aprovar nova solicitação de manutenção, define o técnico executor. */
  assignedTechnicianEmail: z.string().email().max(120).optional(),
})

export const passwordVerifySchema = z.object({
  password: z.string().min(1).max(120),
})

export const avatarUpdateSchema = z.object({
  filename: z.string().min(1).max(200),
})

const integrationKindEnum = z.enum(['FINANCE', 'HR', 'PROCUREMENT', 'HELPDESK', 'SSO', 'BI', 'MONITORING'])
const integrationAuthTypeEnum = z.enum(['None', 'Bearer', 'Basic', 'ApiKey', 'OAuth2', 'Custom'])
const jsonMapSchema = z.record(z.string(), z.union([z.string(), z.number(), z.boolean()]))

function hasIntegrationEndpointOrCredentials(data) {
  const baseUrl = String(data.baseUrl ?? '').trim()
  const endpointPath = String(data.endpointPath ?? '').trim()
  const authConfig = data.authConfig ?? {}
  const hasSecret = Object.values(authConfig).some((value) => String(value ?? '').trim())
  return Boolean(baseUrl || endpointPath || hasSecret || data.authType === 'None')
}

const adminIntegrationBaseSchema = z.object({
  name: z.string().min(2).max(120),
  kind: integrationKindEnum,
  baseUrl: z.union([z.string().url().max(500), z.literal('')]).optional(),
  endpointPath: z.string().max(300).optional(),
  authType: integrationAuthTypeEnum.optional(),
  authConfig: jsonMapSchema.optional(),
  extraHeaders: jsonMapSchema.optional(),
  notes: z.string().max(1000).optional(),
  active: z.boolean().optional(),
})

export const adminIntegrationCreateSchema = adminIntegrationBaseSchema.refine(hasIntegrationEndpointOrCredentials, {
  message: 'Informe URL, endpoint ou credenciais (token/chave).',
})

export const adminIntegrationUpdateSchema = adminIntegrationBaseSchema
  .partial()
  .refine((d) => Object.keys(d).length > 0, { message: 'Informe ao menos um campo para atualizar.' })

export const taskCompleteSchema = z.object({
  notes: z.string().max(500).optional(),
})
