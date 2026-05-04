import { z } from 'zod'

export const loginSchema = z.object({
  email: z.string().email().max(120),
  password: z.string().min(8).max(100),
  /** Slug da organização; string vazia é tratada como omitida no serviço de auth. */
  tenantSlug: z.string().trim().max(64).nullish(),
})

const profileEnum = z.enum(['Administrador', 'Gestor', 'Técnico', 'ADM', 'GESTOR', 'TECNICO'])
const userStatusEnum = z.enum(['Ativo', 'Inativo'])

export const userCreateSchema = z
  .object({
    name: z.string().min(3).max(120),
    email: z.string().email().max(120),
    password: z.string().min(8).max(100).optional(),
    role: z.enum(['ADM', 'GESTOR', 'TECNICO']).optional(),
    profile: profileEnum.optional(),
    status: userStatusEnum.optional(),
  })
  .refine((d) => d.role != null || d.profile != null, { message: 'Informe role ou profile.' })

export const userUpdateSchema = z
  .object({
    name: z.string().min(3).max(120).optional(),
    email: z.string().email().max(120).optional(),
    password: z.string().min(8).max(100).optional(),
    role: z.enum(['ADM', 'GESTOR', 'TECNICO']).optional(),
    profile: profileEnum.optional(),
    status: userStatusEnum.optional(),
  })
  .refine((d) => Object.keys(d).length > 0, { message: 'Informe ao menos um campo para atualizar.' })

const assetStatusEnum = z.enum(['Em uso', 'Disponível', 'Em manutenção'])

export const assetCreateSchema = z.object({
  tag: z.string().min(1).max(40),
  description: z.string().min(1).max(200),
  sector: z.string().min(1).max(120),
  status: assetStatusEnum.optional(),
  /** E-mail do utilizador responsável (Prisma); vazio omite o campo. */
  assignedTo: z.string().trim().max(120).optional(),
})

export const assetUpdateSchema = z.object({
  tag: z.string().min(1).max(40).optional(),
  description: z.string().min(1).max(200).optional(),
  sector: z.string().min(1).max(120).optional(),
  status: assetStatusEnum.optional(),
  assignedTo: z.string().trim().max(120).optional().nullable(),
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
  openingDate: z.string().optional(),
})

export const maintenanceUpdateSchema = z.object({
  assetTag: z.string().min(1).max(40).optional(),
  type: z.string().min(1).max(80).optional(),
  description: z.string().max(2000).optional(),
  priority: z.enum(['Alta', 'Média', 'Baixa']).optional(),
  status: z.enum(['Aberta', 'Em andamento', 'Concluída']).optional(),
  openingDate: z.string().optional(),
})

const attachmentRefSchema = z.object({
  filename: z.string().min(1).max(200),
  originalName: z.string().max(200).optional(),
  mimetype: z.string().max(120).optional(),
  size: z.number().nonnegative().optional(),
  url: z.string().min(1).max(400),
})

export const approvalCreateSchema = z.object({
  type: z.enum(['Movimentação', 'Manutenção']),
  assetTag: z.string().min(1).max(40),
  description: z.string().min(1).max(500),
  feedback: z.string().max(2000).optional(),
  attachments: z.array(attachmentRefSchema).max(6).optional(),
})

export const approvalRespondSchema = z.object({
  decision: z.enum(['APPROVED', 'REJECTED']),
  notes: z.string().max(500).optional(),
})

export const passwordVerifySchema = z.object({
  password: z.string().min(1).max(120),
})

export const taskCompleteSchema = z.object({
  notes: z.string().max(500).optional(),
})
