import path from 'node:path'
import { fileURLToPath } from 'node:url'
import dotenv from 'dotenv'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.join(__dirname, '.env') })

import bcrypt from 'bcryptjs'
import mongoose from 'mongoose'
import prisma from './src/lib/prisma.js'
import Asset from './src/models/Asset.js'
import Movement from './src/models/Movement.js'
import Maintenance from './src/models/Maintenance.js'
import Approval from './src/models/Approval.js'

const shouldResetMongo = String(process.env.SEED_RESET_MONGO || '')
  .trim()
  .toLowerCase() === 'true'

async function seedMongo(tenantId) {
  const uri = process.env.MONGODB_URL || 'mongodb://127.0.0.1:27017/assetra'
  await mongoose.connect(uri)

  if (shouldResetMongo) {
    await Asset.deleteMany({ tenantId })
    await Movement.deleteMany({ tenantId })
    await Maintenance.deleteMany({ tenantId })
    await Approval.deleteMany({ tenantId })
    console.log('MongoDB: limpeza habilitada por SEED_RESET_MONGO=true.')
  }

  const assets = [
    {
      tenantId,
      tag: 'AST-001',
      description: 'Notebook Dell Latitude 5420',
      sector: 'Financeiro',
      status: 'Em uso',
      assignedTo: 'gestor@assetra.local',
      history: [],
    },
    {
      tenantId,
      tag: 'AST-002',
      description: 'Desktop Lenovo M75q',
      sector: 'RH',
      status: 'Disponível',
      assignedTo: 'tecnico@assetra.local',
      history: [],
    },
    {
      tenantId,
      tag: 'AST-003',
      description: 'Monitor LG 24"',
      sector: 'Compras',
      status: 'Em manutenção',
      assignedTo: 'gestor@assetra.local',
      history: [],
    },
  ]
  for (const asset of assets) {
    await Asset.updateOne({ tenantId: asset.tenantId, tag: asset.tag }, { $setOnInsert: asset }, { upsert: true })
  }

  const movementCount = await Movement.countDocuments({ tenantId })
  if (movementCount === 0) {
    await Movement.insertMany([
      {
        tenantId,
        assetTag: 'AST-001',
        origin: 'Estoque',
        destination: 'Financeiro',
        responsible: 'Gestor Assetra',
        occurredAt: new Date(2026, 3, 8),
      },
      {
        tenantId,
        assetTag: 'AST-002',
        origin: 'Compras',
        destination: 'TI',
        responsible: 'Técnico Assetra',
        occurredAt: new Date(2026, 3, 2),
      },
    ])
  }

  const maintenanceCount = await Maintenance.countDocuments({ tenantId })
  if (maintenanceCount === 0) {
    await Maintenance.insertMany([
      {
        tenantId,
        assetTag: 'AST-003',
        type: 'Corretiva',
        description: 'Falha intermitente de vídeo durante o uso',
        priority: 'Alta',
        status: 'Em andamento',
        openingDate: new Date(2026, 3, 10),
      },
      {
        tenantId,
        assetTag: 'AST-002',
        type: 'Preventiva',
        description: 'Rotina de verificação e limpeza programada',
        priority: 'Média',
        status: 'Aberta',
        openingDate: new Date(2026, 3, 5),
      },
    ])
  }

  const approvalCount = await Approval.countDocuments({ tenantId })
  if (approvalCount === 0) {
    await Approval.insertMany([
      {
        tenantId,
        type: 'Movimentação',
        assetTag: 'AST-001',
        description: 'Transferência para Financeiro',
        status: 'Pendente',
      },
      {
        tenantId,
        type: 'Manutenção',
        assetTag: 'AST-003',
        description: 'Troca de placa de vídeo',
        status: 'Pendente',
      },
      {
        tenantId,
        type: 'Movimentação',
        assetTag: 'AST-002',
        description: 'Retorno para Estoque',
        status: 'Aprovada',
        decidedAt: new Date(),
      },
    ])
  }

  await mongoose.disconnect()
  console.log('MongoDB: seed seguro concluído (sem sobrescrever dados existentes).')
}

async function seed() {
  const tenant = await prisma.tenant.upsert({
    where: { slug: 'default' },
    update: { name: 'Organização Demo' },
    create: {
      name: 'Organização Demo',
      slug: 'default',
    },
  })

  const users = [
    {
      email: 'admin@assetra.local',
      name: 'Administrador Assetra',
      password: 'senha123',
      role: 'ADM',
    },
    {
      email: 'gestor@assetra.local',
      name: 'Gestor Assetra',
      password: 'senha123',
      role: 'GESTOR',
    },
    {
      email: 'tecnico@assetra.local',
      name: 'Técnico Assetra',
      password: 'senha123',
      role: 'TECNICO',
    },
  ]

  for (const user of users) {
    const passwordHash = await bcrypt.hash(user.password, 10)
    await prisma.user.upsert({
      where: {
        tenantId_email: {
          tenantId: tenant.id,
          email: user.email,
        },
      },
      update: {
        role: user.role,
        name: user.name,
        passwordHash,
        tenantId: tenant.id,
        active: true,
      },
      create: {
        email: user.email,
        name: user.name,
        passwordHash,
        role: user.role,
        tenantId: tenant.id,
        active: true,
      },
    })
    console.log(`Usuário garantido: ${user.name} (${user.role})`)
  }

  console.log(`Tenant: ${tenant.slug} (${tenant.id})`)

  const tenantAcme = await prisma.tenant.upsert({
    where: { slug: 'acme' },
    update: { name: 'Organização Acme' },
    create: {
      name: 'Organização Acme',
      slug: 'acme',
    },
  })

  const acmeAdmin = {
    email: 'admin@assetra.local',
    name: 'Administrador Acme',
    password: 'AcmeDemo@12345',
    role: 'ADM',
  }
  const acmeHash = await bcrypt.hash(acmeAdmin.password, 10)
  await prisma.user.upsert({
    where: {
      tenantId_email: {
        tenantId: tenantAcme.id,
        email: acmeAdmin.email,
      },
    },
    update: {
      role: acmeAdmin.role,
      name: acmeAdmin.name,
      passwordHash: acmeHash,
      tenantId: tenantAcme.id,
      active: true,
    },
    create: {
      email: acmeAdmin.email,
      name: acmeAdmin.name,
      passwordHash: acmeHash,
      role: acmeAdmin.role,
      tenantId: tenantAcme.id,
      active: true,
    },
  })
  console.log(`Tenant secundário (multitenant demo): ${tenantAcme.slug} — admin@assetra.local com senha AcmeDemo@12345`)

  try {
    await seedMongo(tenant.id)
  } catch (e) {
    console.warn('MongoDB seed ignorado (serviço indisponível ou URL inválida):', e.message)
  }
}

seed()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
