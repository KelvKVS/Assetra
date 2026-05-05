import { spawn } from 'node:child_process'

const enabled = String(process.env.SEED_ON_DEPLOY || '')
  .trim()
  .toLowerCase() === 'true'

if (!enabled) {
  console.log('Seed desativado (SEED_ON_DEPLOY != true). Pulando seed.')
  process.exit(0)
}

console.log('Seed ativado por SEED_ON_DEPLOY=true. Executando seed seguro...')

const child = spawn(process.execPath, ['seed.js'], {
  stdio: 'inherit',
  env: process.env,
})

child.on('exit', (code) => {
  process.exit(code ?? 1)
})
