import dotenv from 'dotenv'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import amqp from 'amqplib'
import { processNotificationEmailEvent } from './notificationEmailHandler.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.join(__dirname, '../../.env') })
dotenv.config()

const EXCHANGE = 'assetra.events'
const AUDIT_QUEUE = 'assetra.events.audit'
const EMAIL_QUEUE = 'assetra.notifications.email'

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

async function handleMessage(data) {
  const eventType = String(data?.eventType ?? '')
  if (eventType === 'notification.email') {
    console.log(
      JSON.stringify({
        level: 'info',
        event: 'event_bus.consumed',
        queue: EMAIL_QUEUE,
        eventType,
        to: String(data?.payload?.to ?? ''),
      }),
    )
    await processNotificationEmailEvent(data.payload ?? {})
    return
  }
  console.log(
    JSON.stringify({
      level: 'info',
      event: 'event_bus.consumed',
      queue: AUDIT_QUEUE,
      eventType,
    }),
  )
}

function consumeQueue(ch, queueName) {
  ch.consume(queueName, async (msg) => {
    if (!msg) return
    try {
      const data = JSON.parse(msg.content.toString('utf8'))
      await handleMessage(data)
      ch.ack(msg)
    } catch (e) {
      console.error('[events-worker] Falha ao processar mensagem:', e?.message ?? e)
      ch.nack(msg, false, true)
    }
  })
}

async function start() {
  const conn = await amqp.connect(rabbitUrl)
  const ch = await conn.createChannel()
  await ch.assertExchange(EXCHANGE, 'topic', { durable: true })

  const auditQ = await ch.assertQueue(AUDIT_QUEUE, { durable: true })
  await ch.bindQueue(auditQ.queue, EXCHANGE, '#')

  const emailQ = await ch.assertQueue(EMAIL_QUEUE, { durable: true })
  await ch.bindQueue(emailQ.queue, EXCHANGE, 'notification.email')

  ch.prefetch(10)
  consumeQueue(ch, auditQ.queue)
  consumeQueue(ch, emailQ.queue)

  console.log('[events-worker] Filas ativas:', auditQ.queue, emailQ.queue)
}

start().catch((err) => {
  console.error('[events-worker] Erro fatal:', err?.message ?? err)
  process.exit(1)
})
