import path from 'node:path'
import fs from 'node:fs'
import { fileURLToPath } from 'node:url'
import { Router } from 'express'
import multer from 'multer'
import { authMiddleware, optionalAuthMiddleware } from '../middlewares/auth.js'
import { buildUploadPublicUrl } from '../utils/publicApiUrl.js'
import { signUploadFileToken, verifyUploadFileToken } from '../utils/uploadFileToken.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const uploadsDir = path.resolve(__dirname, '../../uploads')

if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true })
}

const allowedMimes = new Set([
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/webp',
  'image/gif',
  'application/pdf',
])

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const safe = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_').slice(-60)
    cb(null, `${Date.now()}-${req.user?.tenantId ?? 'anon'}-${safe}`)
  },
})

const upload = multer({
  storage,
  limits: { fileSize: 8 * 1024 * 1024, files: 6 },
  fileFilter: (_req, file, cb) => {
    if (allowedMimes.has(file.mimetype)) return cb(null, true)
    cb(new Error('Tipo de ficheiro não permitido. Use imagens (PNG/JPG/WEBP/GIF) ou PDF.'))
  },
})

const router = Router()

router.post('/', authMiddleware, upload.array('files', 6), (req, res) => {
  const tenantId = String(req.user?.tenantId ?? '').trim()
  const files = (req.files ?? []).map((f) => {
    const fileToken = tenantId ? signUploadFileToken(f.filename, tenantId) : ''
    return {
      filename: f.filename,
      originalName: f.originalname,
      mimetype: f.mimetype,
      size: f.size,
      url: buildUploadPublicUrl(req, f.filename, fileToken),
    }
  })
  res.status(201).json({ files })
})

router.get('/:filename', optionalAuthMiddleware, (req, res) => {
  const safe = path.basename(req.params.filename)
  let tenantId = String(req.user?.tenantId ?? '').trim()

  const ft = typeof req.query.ft === 'string' ? req.query.ft : ''
  if (!tenantId && ft) {
    const verified = verifyUploadFileToken(ft, safe)
    if (verified?.tenantId) tenantId = verified.tenantId
  }

  if (!tenantId) {
    return res.status(401).json({ message: 'Sessão inválida para acesso ao ficheiro.' })
  }
  const tenantMarker = `-${tenantId}-`
  if (!safe.includes(tenantMarker)) {
    return res.status(403).json({ message: 'Acesso negado ao ficheiro solicitado.' })
  }
  const full = path.join(uploadsDir, safe)
  if (!fs.existsSync(full)) {
    return res.status(404).json({ message: 'Ficheiro não encontrado.' })
  }
  res.sendFile(full)
})

export default router
