/**
 * Ajusta provider em prisma/schema.prisma conforme DATABASE_URL:
 * - file:... → sqlite (dev local)
 * - postgresql:// / postgres:// → postgresql (Render, Docker, etc.)
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import dotenv from 'dotenv'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const backendRoot = path.join(__dirname, '..')
dotenv.config({ path: path.join(backendRoot, '.env') })

const schemaPath = path.join(backendRoot, 'prisma', 'schema.prisma')
const url = String(process.env.DATABASE_URL ?? '').trim()
const provider = /^postgres(ql)?:\/\//i.test(url) ? 'postgresql' : 'sqlite'

let schema = fs.readFileSync(schemaPath, 'utf8')
const next = schema.replace(/provider\s*=\s*"(postgresql|sqlite)"/, `provider = "${provider}"`)

if (next === schema) {
  console.log(`[prisma] provider já é "${provider}"`)
} else {
  fs.writeFileSync(schemaPath, next)
  console.log(`[prisma] provider = "${provider}" (DATABASE_URL: ${url ? url.split('@').pop() || url : 'não definida'})`)
}
