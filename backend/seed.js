import bcrypt from 'bcryptjs'
import prisma from './src/lib/prisma.js'

async function seed() {
  const users = [
    {
      email: 'admin@assetra.com.br',
      name: 'Admin Assetra',
      password: 'Admin@123',
      role: 'ADM'
    },
    {
      email: 'gestor@assetra.com.br',
      name: 'Gestor Assetra',
      password: 'Gestor@123',
      role: 'GESTOR'
    },
    {
      email: 'tecnico@assetra.com.br',
      name: 'Tecnico Assetra',
      password: 'Tecnico@123',
      role: 'TECNICO'
    }
  ]

  for (const user of users) {
    const passwordHash = await bcrypt.hash(user.password, 10)
    await prisma.user.upsert({
      where: { email: user.email },
      update: { role: user.role, name: user.name, passwordHash },
      create: {
        email: user.email,
        name: user.name,
        passwordHash,
        role: user.role
      }
    })
    console.log(`Usuário criado: ${user.name} (${user.role})`)
  }
}

seed().catch(console.error).finally(() => prisma.$disconnect())
