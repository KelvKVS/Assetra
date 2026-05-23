/**
 * Sincroniza provider e tenta regenerar o Prisma Client antes do dev.
 * No Windows, EPERM é comum se outro node ainda usa query_engine — nesse caso segue com o client existente.
 */
import { spawnSync } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const backendRoot = path.join(__dirname, '..')
const npx = process.platform === 'win32' ? 'npx.cmd' : 'npx'

function run(command, args, { capture = false } = {}) {
  const result = spawnSync(command, args, {
    cwd: backendRoot,
    encoding: 'utf8',
    shell: process.platform === 'win32',
    stdio: capture ? 'pipe' : 'inherit',
  })
  if (capture) {
    if (result.stdout) process.stdout.write(result.stdout)
    if (result.stderr) process.stderr.write(result.stderr)
  }
  return result
}

const sync = run('node', ['scripts/sync-prisma-provider.js'])
if (sync.status !== 0) {
  process.exit(sync.status ?? 1)
}

const generate = run(npx, ['prisma', 'generate'], { capture: true })
if (generate.status === 0) {
  process.exit(0)
}

const output = `${generate.stdout ?? ''}${generate.stderr ?? ''}${generate.error?.message ?? ''}`
const blocked =
  generate.error?.code === 'EPERM' ||
  /EPERM|operation not permitted|query_engine-windows\.dll/i.test(output)

if (blocked) {
  console.warn(
    '[predev] prisma generate ignorado: query engine em uso por outro processo. ' +
      'O client já gerado será usado. Se alterou schema.prisma, pare o dev e rode: npm run prisma:generate',
  )
  process.exit(0)
}

process.exit(generate.status ?? 1)
