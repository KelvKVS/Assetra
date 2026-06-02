/**
 * Testa envio via Resend. Uso:
 *   cd backend
 *   npm run email:test
 *   npm run email:test -- seu@email.com
 */
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import dotenv from 'dotenv'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.join(__dirname, '../.env') })

const { getEmailSetupStatus, sendTestEmail } = await import('../src/services/emailService.js')

const to = process.argv[2]?.trim() || process.env.EMAIL_FROM?.trim()
if (!to) {
  console.error('Defina EMAIL_FROM no .env ou passe o destino: npm run email:test -- email@exemplo.com')
  process.exit(1)
}

const setup = getEmailSetupStatus()
console.log('Estado:', setup.mode, '—', setup.message)
if (setup.mode !== 'resend') {
  console.error('RESEND_API_KEY não configurada ou inválida no backend/.env')
  process.exit(1)
}

const result = await sendTestEmail(to)
if (!result.sent) {
  console.error('Falha:', result.emailError ?? result.reason)
  process.exit(1)
}

console.log('OK — e-mail de teste enviado para', to)
