import { publishDomainEventSafely } from '../lib/eventBus.js'

function getFrontendBaseUrl() {
  return String(process.env.FRONTEND_URL ?? 'http://localhost:5173').replace(/\/+$/, '')
}

export function isNotificationEmailEnabled() {
  return String(process.env.NOTIFICATION_EMAILS_ENABLED ?? 'true').toLowerCase() !== 'false'
}

export function buildNotificationEmailPayload({
  to,
  toName,
  subject,
  title,
  message,
  route,
  sender,
}) {
  const path = route ? (route.startsWith('/') ? route : `/${route}`) : ''
  return {
    to: String(to ?? '').trim().toLowerCase(),
    toName: String(toName ?? '').trim(),
    subject: String(subject ?? 'Notificação Assetra').trim(),
    title: String(title ?? '').trim(),
    message: String(message ?? '').trim(),
    sender: String(sender ?? 'Assetra').trim(),
    actionUrl: path ? `${getFrontendBaseUrl()}${path}` : getFrontendBaseUrl(),
  }
}

/**
 * Enfileira e-mail de notificação (RabbitMQ → worker → SMTP).
 * @param {ReturnType<typeof buildNotificationEmailPayload>} payload
 */
export async function enqueueNotificationEmail(payload, context = {}) {
  if (!isNotificationEmailEnabled()) {
    return { queued: false, reason: 'notifications-disabled' }
  }
  if (!payload?.to) {
    return { queued: false, reason: 'missing-recipient' }
  }
  return publishDomainEventSafely('notification.email', payload, {
    service: 'notificationEmailPublisher',
    ...context,
  })
}
