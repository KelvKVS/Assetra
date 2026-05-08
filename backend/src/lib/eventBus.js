import { createCircuitBreaker } from '../utils/circuitBreaker.js'
import { createRabbitMqAdapter } from '../adapters/eventBus/rabbitMqAdapter.js'
import { createKafkaAdapter } from '../adapters/eventBus/kafkaAdapter.js'

const brokerCircuit = createCircuitBreaker({
  failureThreshold: 4,
  recoveryTimeMs: 20_000,
  monitorWindowMs: 60_000,
})

const brokerAdapters = {
  rabbitmq: createRabbitMqAdapter(),
  kafka: createKafkaAdapter(),
}

function getBrokerDriver() {
  return String(process.env.EVENT_BROKER_DRIVER ?? 'rabbitmq')
    .trim()
    .toLowerCase()
}

function getSelectedAdapter() {
  const driver = getBrokerDriver()
  return brokerAdapters[driver] ?? brokerAdapters.rabbitmq
}

function isBrokerEnabled() {
  return getSelectedAdapter().isEnabled()
}

export async function publishDomainEvent(eventType, payload) {
  if (!isBrokerEnabled()) return { queued: false, reason: 'broker-disabled' }
  const adapter = getSelectedAdapter()
  await brokerCircuit.execute(async () => {
    const eventBody = JSON.stringify({
      eventType,
      payload,
      occurredAt: new Date().toISOString(),
    })
    await adapter.publish(eventType, eventBody)
  })
  return { queued: true, driver: adapter.driver }
}

export async function publishDomainEventSafely(eventType, payload, context = {}) {
  try {
    return await publishDomainEvent(eventType, payload)
  } catch (error) {
    console.error(
      JSON.stringify({
        level: 'warn',
        event: 'event_bus.publish_failed',
        eventType,
        context,
        message: String(error?.message ?? 'Falha ao publicar evento'),
      }),
    )
    return { queued: false, reason: 'publish-failed' }
  }
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
      await getSelectedAdapter().ensureConnected()
    })
    return {
      enabled: true,
      status: 'up',
      driver: getSelectedAdapter().driver,
      circuit: brokerCircuit.getState(),
    }
  } catch {
    return {
      enabled: true,
      status: 'down',
      driver: getSelectedAdapter().driver,
      circuit: brokerCircuit.getState(),
    }
  }
}
