import amqp from 'amqplib'

export function createRabbitMqAdapter() {
  let connection = null
  let channel = null

  function isEnabled() {
    return Boolean(String(process.env.RABBITMQ_URL ?? '').trim())
  }

  async function ensureConnected() {
    if (!isEnabled()) return null
    if (channel) return channel
    const url = String(process.env.RABBITMQ_URL ?? '').trim()
    if (!url) return null
    connection = await amqp.connect(url)
    connection.on('error', () => {
      channel = null
      connection = null
    })
    connection.on('close', () => {
      channel = null
      connection = null
    })
    channel = await connection.createChannel()
    await channel.assertExchange('assetra.events', 'topic', { durable: true })
    return channel
  }

  async function publish(eventType, eventBody) {
    const ch = await ensureConnected()
    if (!ch) return
    ch.publish('assetra.events', eventType, Buffer.from(eventBody), {
      contentType: 'application/json',
      persistent: true,
    })
  }

  return {
    driver: 'rabbitmq',
    isEnabled,
    ensureConnected,
    publish,
  }
}
