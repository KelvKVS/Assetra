import amqp from 'amqplib'
import { Kafka } from 'kafkajs'
import { createCircuitBreaker } from '../utils/circuitBreaker.js'

const brokerCircuit = createCircuitBreaker({
  failureThreshold: 4,
  recoveryTimeMs: 20_000,
  monitorWindowMs: 60_000,
})

let connection = null
let channel = null
let kafkaProducer = null

function getBrokerDriver() {
  return String(process.env.EVENT_BROKER_DRIVER ?? 'rabbitmq')
    .trim()
    .toLowerCase()
}

function isBrokerEnabled() {
  const driver = getBrokerDriver()
  if (driver === 'kafka') return Boolean(process.env.KAFKA_BROKERS?.trim())
  return Boolean(process.env.RABBITMQ_URL?.trim())
}

async function ensureChannel() {
  if (!isBrokerEnabled()) return null
  if (channel) return channel
  const url = process.env.RABBITMQ_URL.trim()
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

async function ensureKafkaProducer() {
  if (kafkaProducer) return kafkaProducer
  const brokers = String(process.env.KAFKA_BROKERS ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
  if (!brokers.length) return null
  const kafka = new Kafka({
    clientId: process.env.KAFKA_CLIENT_ID || 'assetra-app',
    brokers,
  })
  kafkaProducer = kafka.producer()
  await kafkaProducer.connect()
  return kafkaProducer
}

export async function publishDomainEvent(eventType, payload) {
  if (!isBrokerEnabled()) return { queued: false, reason: 'broker-disabled' }
  const driver = getBrokerDriver()
  await brokerCircuit.execute(async () => {
    const eventBody = JSON.stringify({
      eventType,
      payload,
      occurredAt: new Date().toISOString(),
    })
    if (driver === 'kafka') {
      const producer = await ensureKafkaProducer()
      if (!producer) return
      await producer.send({
        topic: process.env.KAFKA_TOPIC || 'assetra.events',
        messages: [{ key: eventType, value: eventBody }],
      })
      return
    }

    const ch = await ensureChannel()
    if (!ch) return
    ch.publish('assetra.events', eventType, Buffer.from(eventBody), {
      contentType: 'application/json',
      persistent: true,
    })
  })
  return { queued: true, driver }
}

export async function getEventBusHealth() {
  if (!isBrokerEnabled()) {
    return {
      enabled: false,
      status: 'disabled',
      circuit: brokerCircuit.getState(),
    }
  }
  try {
    await brokerCircuit.execute(async () => {
      if (getBrokerDriver() === 'kafka') {
        await ensureKafkaProducer()
        return
      }
      await ensureChannel()
    })
    return {
      enabled: true,
      status: 'up',
      driver: getBrokerDriver(),
      circuit: brokerCircuit.getState(),
    }
  } catch {
    return {
      enabled: true,
      status: 'down',
      driver: getBrokerDriver(),
      circuit: brokerCircuit.getState(),
    }
  }
}
