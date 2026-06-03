import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import mongoose from 'mongoose'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
export const uploadsDir = path.resolve(__dirname, '../../uploads')

const GRIDFS_BUCKET = 'uploads'

function getGridFsBucket() {
  if (mongoose.connection.readyState !== 1) return null
  const db = mongoose.connection.db
  if (!db) return null
  return new mongoose.mongo.GridFSBucket(db, { bucketName: GRIDFS_BUCKET })
}

export function ensureUploadsDir() {
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true })
  }
}

export function uploadFilePath(filename) {
  const safe = path.basename(String(filename ?? '').trim())
  return path.join(uploadsDir, safe)
}

export function uploadExistsOnDisk(filename) {
  const safe = path.basename(String(filename ?? '').trim())
  if (!safe) return false
  return fs.existsSync(uploadFilePath(safe))
}

export async function uploadExistsInGridFs(filename) {
  const safe = path.basename(String(filename ?? '').trim())
  const bucket = getGridFsBucket()
  if (!safe || !bucket) return false
  const files = await bucket.find({ filename: safe }).limit(1).toArray()
  return files.length > 0
}

export async function uploadExists(filename) {
  return uploadExistsOnDisk(filename) || uploadExistsInGridFs(filename)
}

/**
 * Guarda cópia persistente no MongoDB (sobrevive a redeploy no Render).
 */
export async function persistUploadToGridFs(localPath, filename, metadata = {}) {
  const safe = path.basename(String(filename ?? '').trim())
  if (!safe || !fs.existsSync(localPath)) return false

  const bucket = getGridFsBucket()
  if (!bucket) return false

  if (await uploadExistsInGridFs(safe)) return true

  return new Promise((resolve, reject) => {
    const readStream = fs.createReadStream(localPath)
    const uploadStream = bucket.openUploadStream(safe, {
      metadata: {
        storedAt: new Date(),
        ...metadata,
      },
    })
    readStream.pipe(uploadStream)
    uploadStream.on('error', reject)
    uploadStream.on('finish', () => resolve(true))
    readStream.on('error', reject)
  })
}

async function gridFsFileMeta(filename) {
  const bucket = getGridFsBucket()
  if (!bucket) return null
  const files = await bucket.find({ filename }).sort({ uploadDate: -1 }).limit(1).toArray()
  return files[0] ?? null
}

function guessContentType(filename, meta) {
  const fromMeta = String(meta?.metadata?.mimetype ?? '').trim()
  if (fromMeta) return fromMeta
  const lower = String(filename).toLowerCase()
  if (lower.endsWith('.png')) return 'image/png'
  if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'image/jpeg'
  if (lower.endsWith('.webp')) return 'image/webp'
  if (lower.endsWith('.gif')) return 'image/gif'
  if (lower.endsWith('.pdf')) return 'application/pdf'
  return 'application/octet-stream'
}

/** Cabeçalhos para <img> carregadas a partir de outro origin (fallback). */
export function setUploadResponseHeaders(res, contentType) {
  if (contentType) res.setHeader('Content-Type', contentType)
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin')
  res.setHeader('Cache-Control', 'private, max-age=3600')
}

/**
 * Envia ficheiro: disco local primeiro, depois GridFS.
 * @returns {boolean} true se enviado
 */
export async function sendUploadFile(filename, res) {
  const safe = path.basename(String(filename ?? '').trim())
  if (!safe) return false

  const diskPath = uploadFilePath(safe)
  if (fs.existsSync(diskPath)) {
    const meta = await gridFsFileMeta(safe).catch(() => null)
    setUploadResponseHeaders(res, guessContentType(safe, meta))
    res.sendFile(diskPath)
    return true
  }

  const bucket = getGridFsBucket()
  if (!bucket) return false

  const meta = await gridFsFileMeta(safe)
  if (!meta) return false

  setUploadResponseHeaders(res, guessContentType(safe, meta))
  return new Promise((resolve, reject) => {
    const stream = bucket.openDownloadStreamByName(safe)
    stream.on('error', (err) => {
      if (err?.code === 'ENOENT' || err?.message?.includes('FileNotFound')) {
        resolve(false)
        return
      }
      reject(err)
    })
    stream.on('end', () => resolve(true))
    stream.pipe(res)
  })
}
