import { Kafka } from 'kafkajs'

export function createKafkaAdapter() {
  let kafkaProducer = null

  function getBrokers() {
    return String(process.env.KAFKA_BROKERS ?? '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
  }

  function isEnabled() {
    return getBrokers().length > 0
  }

  async function ensureConnected() {
    if (kafkaProducer) return kafkaProducer
    const brokers = getBrokers()
    if (!brokers.length) return null
    const kafka = new Kafka({
      clientId: process.env.KAFKA_CLIENT_ID || 'assetra-app',
      brokers,
    })
    kafkaProducer = kafka.producer()
    await kafkaProducer.connect()
    return kafkaProducer
  }

  async function publish(eventType, eventBody) {
    const producer = await ensureConnected()
    if (!producer) return
    await producer.send({
      topic: process.env.KAFKA_TOPIC || 'assetra.events',
      messages: [{ key: eventType, value: eventBody }],
    })
  }

  return {
    driver: 'kafka',
    isEnabled,
    ensureConnected,
    publish,
  }
}
