import { Router } from 'express'
import { authMiddleware, authorize } from '../middlewares/auth.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import { assetCreateSchema, assetUpdateSchema } from '../schemas/index.js'
import {
  createAssetForTenant,
  deleteAssetForTenant,
  listAssetsByTenant,
  updateAssetForTenant,
} from '../services/assetService.js'

const router = Router()

router.get(
  '/',
  authMiddleware,
  asyncHandler(async (req, res) => {
    const assets = await listAssetsByTenant(req.user.tenantId)
    res.json(assets)
  }),
)

router.post(
  '/',
  authMiddleware,
  authorize(['ADM']),
  asyncHandler(async (req, res) => {
    const parsed = assetCreateSchema.safeParse(req.body)
    if (!parsed.success) {
      return res.status(400).json({ message: 'Dados inválidos.', issues: parsed.error.flatten() })
    }
    const asset = await createAssetForTenant(req.user.tenantId, req.user.sub, parsed.data)
    res.status(201).json(asset)
  }),
)

router.put(
  '/:id',
  authMiddleware,
  authorize(['ADM']),
  asyncHandler(async (req, res) => {
    const parsed = assetUpdateSchema.safeParse(req.body)
    if (!parsed.success) {
      return res.status(400).json({ message: 'Dados inválidos.', issues: parsed.error.flatten() })
    }
    const asset = await updateAssetForTenant(req.user.tenantId, req.user.sub, req.params.id, parsed.data)
    res.json(asset)
  }),
)

router.delete(
  '/:id',
  authMiddleware,
  authorize(['ADM']),
  asyncHandler(async (req, res) => {
    await deleteAssetForTenant(req.user.tenantId, req.params.id)
    res.status(204).send()
  }),
)

export default router
