import bcrypt from 'bcryptjs'
import prisma from './src/lib/prisma.js'

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
      password: 'Admin@12345',
      role: 'ADM',
    },
    {
      email: 'gestor@assetra.local',
      name: 'Gestor Assetra',
      password: 'Gestor@12345',
      role: 'GESTOR',
    },
    {
      email: 'tecnico@assetra.local',
      name: 'Técnico Assetra',
      password: 'Tecnico@12345',
      role: 'TECNICO',
    },
  ]

  for (const user of users) {
    const passwordHash = await bcrypt.hash(user.password, 10)
    await prisma.user.upsert({
      where: { email: user.email },
      update: { role: user.role, name: user.name, passwordHash, tenantId: tenant.id },
      create: {
        email: user.email,
        name: user.name,
        passwordHash,
        role: user.role,
        tenantId: tenant.id,
      },
    })
    console.log(`Usuário garantido: ${user.name} (${user.role})`)
  }

  console.log(`Tenant: ${tenant.slug} (${tenant.id})`)
}

seed()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
