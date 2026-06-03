/**
 * Copia ficheiros de backend/uploads/ para MongoDB GridFS (persistente no Atlas).
 * Útil para recuperar anexos que existem no seu PC mas já não estão no disco do Render.
 *
 * Uso (na pasta backend):
 *   MONGODB_URL="mongodb+srv://..." node scripts/migrate-uploads-to-gridfs.js
 */
import 'dotenv/config'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import connectNoSQL from '../src/lib/mongoose.js'
import {
  ensureUploadsDir,
  persistUploadToGridFs,
  uploadExistsInGridFs,
  uploadsDir,
} from '../src/services/uploadStorageService.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

async function main() {
  ensureUploadsDir()
  await connectNoSQL()

  const entries = fs.readdirSync(uploadsDir).filter((name) => {
    const full = path.join(uploadsDir, name)
    return fs.statSync(full).isFile()
  })

  if (!entries.length) {
    console.log(`Nenhum ficheiro em ${uploadsDir}`)
    process.exit(0)
  }

  let uploaded = 0
  let skipped = 0
  let failed = 0

  for (const name of entries) {
    const full = path.join(uploadsDir, name)
    try {
      if (await uploadExistsInGridFs(name)) {
        skipped += 1
        continue
      }
      const ok = await persistUploadToGridFs(full, name, { migratedAt: new Date() })
      if (ok) {
        uploaded += 1
        console.log(`OK: ${name}`)
      } else {
        failed += 1
        console.warn(`Falhou: ${name}`)
      }
    } catch (err) {
      failed += 1
      console.warn(`Erro em ${name}:`, err?.message ?? err)
    }
  }

  console.log(`Concluído — novos: ${uploaded}, já existiam: ${skipped}, falhas: ${failed}`)
  process.exit(failed ? 1 : 0)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
