import { Router } from 'express'
import Asset from '../models/Asset.js'
import { authMiddleware, authorize } from '../middlewares/auth.js'

const router = Router()

// Todos os autenticados podem ver ativos
router.get('/', authMiddleware, async (req, res) => {
  const assets = await Asset.find().sort({ updatedAt: -1 })
  res.json(assets)
})

// ADM e GESTOR podem criar ativos
router.post('/', authMiddleware, authorize(['ADM', 'GESTOR']), async (req, res) => {
  try {
    const asset = new Asset({
      ...req.body,
      history: [{ action: 'CRIAÇÃO', userId: req.user.sub, details: 'Ativo cadastrado no sistema' }]
    })
    await asset.save()
    res.status(201).json(asset)
  } catch (e) {
    res.status(400).json({ message: 'Erro ao criar ativo (Tag duplicada?)' })
  }
})

// TECNICO pode atualizar status (ex: para manutenção)
router.patch('/:id/status', authMiddleware, authorize(['ADM', 'GESTOR', 'TECNICO']), async (req, res) => {
  const { status, details } = req.body
  const asset = await Asset.findById(req.params.id)
  
  if (!asset) return res.status(404).json({ message: 'Ativo não encontrado' })

  asset.status = status
  asset.history.push({ action: 'STATUS_UPDATE', userId: req.user.sub, details: details || `Status alterado para ${status}` })
  
  await asset.save()
  res.json(asset)
})

// Apenas ADM pode deletar
router.delete('/:id', authMiddleware, authorize(['ADM']), async (req, res) => {
  await Asset.findByIdAndDelete(req.params.id)
  res.status(204).send()
})

export default router
