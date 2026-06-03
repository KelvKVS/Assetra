import path from 'node:path'
import { Router } from 'express'
import multer from 'multer'
import { authMiddleware, optionalAuthMiddleware } from '../middlewares/auth.js'
import { buildUploadPublicUrl } from '../utils/publicApiUrl.js'
import { signUploadFileToken, verifyUploadFileToken } from '../utils/uploadFileToken.js'
import {
  MAX_UPLOAD_FILE_BYTES,
  MAX_UPLOAD_FILES,
  formatUploadLimitLabel,
} from '../config/uploadLimits.js'
import { allowedUploadTypesLabel, isAllowedUploadFile } from '../config/allowedUploadTypes.js'
import {
  ensureUploadsDir,
  persistUploadToGridFs,
  sendUploadFile,
  uploadsDir,
} from '../services/uploadStorageService.js'

ensureUploadsDir()

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const safe = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_').slice(-60)
    cb(null, `${Date.now()}-${req.user?.tenantId ?? 'anon'}-${safe}`)
  },
})

const upload = multer({
  storage,
  limits: { fileSize: MAX_UPLOAD_FILE_BYTES, files: MAX_UPLOAD_FILES },
  fileFilter: (_req, file, cb) => {
    if (isAllowedUploadFile(file)) return cb(null, true)
    cb(
      new Error(
        `Tipo de ficheiro não permitido. Utilize: ${allowedUploadTypesLabel()}.`,
      ),
    )
  },
})

const router = Router()

router.post('/', authMiddleware, (req, res, next) => {
  upload.array('files', MAX_UPLOAD_FILES)(req, res, async (err) => {
    if (err) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({
          message: `Ficheiro demasiado grande. Limite por ficheiro: ${formatUploadLimitLabel()}.`,
        })
      }
      if (err.code === 'LIMIT_FILE_COUNT') {
        return res.status(400).json({
          message: `Demasiados ficheiros. Máximo: ${MAX_UPLOAD_FILES}.`,
        })
      }
      return next(err)
    }
    const tenantId = String(req.user?.tenantId ?? '').trim()
    const uploaded = req.files ?? []
    if (!uploaded.length) {
      return res.status(400).json({ message: 'Nenhum ficheiro recebido. Selecione anexos e tente novamente.' })
    }
    const files = []
    for (const f of uploaded) {
      try {
        await persistUploadToGridFs(f.path, f.filename, {
          mimetype: f.mimetype,
          tenantId,
          originalName: f.originalname,
        })
      } catch (err) {
        console.warn('[uploads] GridFS persist failed:', f.filename, err?.message ?? err)
      }
      const fileToken = tenantId ? signUploadFileToken(f.filename, tenantId) : ''
      files.push({
        filename: f.filename,
        originalName: f.originalname,
        mimetype: f.mimetype,
        size: f.size,
        url: buildUploadPublicUrl(f.filename, fileToken),
      })
    }
    res.status(201).json({ files })
  })
})

router.get('/:filename', optionalAuthMiddleware, async (req, res, next) => {
  try {
    const safe = path.basename(decodeURIComponent(req.params.filename ?? ''))
    if (!safe) {
      return res.status(400).json({ message: 'Nome de ficheiro inválido.' })
    }

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
    const sent = await sendUploadFile(safe, res)
    if (!sent) {
      return res.status(404).json({
        message:
          'Ficheiro não encontrado. Em produção, anexos antigos podem ter sido perdidos num redeploy — reenvie a imagem.',
      })
    }
    return undefined
  } catch (err) {
    return next(err)
  }
})

export default router
