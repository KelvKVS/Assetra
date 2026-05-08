import dotenv from 'dotenv'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import amqp from 'amqplib'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.join(__dirname, '../../.env') })
dotenv.config()

const driver = String(process.env.EVENT_BROKER_DRIVER ?? 'rabbitmq')
  .trim()
  .toLowerCase()

if (driver !== 'rabbitmq') {
  console.log('[events-worker] Worker ativo apenas para RabbitMQ. EVENT_BROKER_DRIVER atual:', driver)
  process.exit(0)
}

const rabbitUrl = String(process.env.RABBITMQ_URL ?? '').trim()
if (!rabbitUrl) {
  console.error('[events-worker] RABBITMQ_URL não configurado.')
  process.exit(1)
}

async function start() {
  const conn = await amqp.connect(rabbitUrl)
  const ch = await conn.createChannel()
  await ch.assertExchange('assetra.events', 'topic', { durable: true })
  const q = await ch.assertQueue('assetra.events.audit', { durable: true })
  await ch.bindQueue(q.queue, 'assetra.events', '#')
  ch.prefetch(10)
  console.log('[events-worker] Consumindo fila:', q.queue)

  ch.consume(q.queue, (msg) => {
    if (!msg) return
    try {
      const data = JSON.parse(msg.content.toString('utf8'))
      // MVP: consumo para observabilidade e extensão futura (alertas, ETL, notificações).
      console.log('[events-worker] evento recebido:', data.eventType)
      ch.ack(msg)
    } catch (e) {
      console.error('[events-worker] Falha ao processar evento:', e?.message ?? e)
      ch.nack(msg, false, false)
    }
  })
}

start().catch((err) => {
  console.error('[events-worker] Erro fatal:', err?.message ?? err)
  process.exit(1)
})
