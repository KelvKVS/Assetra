import { Router } from 'express'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import prisma from '../lib/prisma.js'
import { authMiddleware, authorize } from '../middlewares/auth.js'

const userSchema = z.object({
  name: z.string().min(3),
  email: z.string().email(),
  password: z.string().min(8).optional(),
  role: z.enum(['ADM', 'GESTOR', 'TECNICO']),
})

const router = Router()

// Protege todas as rotas: apenas ADM gerencia usuários
router.use(authMiddleware, authorize(['ADM']))

router.get('/', async (req, res) => {
  const users = await prisma.user.findMany({
    select: { id: true, name: true, email: true, role: true, createdAt: true }
  })
  res.json(users)
})

router.post('/', async (req, res) => {
  const parsed = userSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json(parsed.error)

  const { name, email, password, role } = parsed.data
  const passwordHash = await bcrypt.hash(password || 'Mudar@123', 10)

  try {
    const user = await prisma.user.create({
      data: { name, email, passwordHash, role }
    })
    res.status(201).json({ id: user.id, name: user.name, role: user.role })
  } catch (e) {
    res.status(400).json({ message: 'E-mail já cadastrado.' })
  }
})

router.delete('/:id', async (req, res) => {
  await prisma.user.delete({ where: { id: req.params.id } })
  res.status(204).send()
})

export default router
