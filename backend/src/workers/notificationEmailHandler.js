import { sendNotificationEmail } from '../services/emailService.js'
import { getFrontendBaseUrl } from '../utils/frontendUrl.js'

/**
 * @param {Record<string, unknown>} payload
 */
export async function processNotificationEmailEvent(payload) {
  const to = String(payload?.to ?? '').trim()
  if (!to) {
    throw new Error('notification.email sem destinatário.')
  }
  const result = await sendNotificationEmail({
    to,
    toName: String(payload?.toName ?? ''),
    subject: String(payload?.subject ?? 'Notificação Assetra'),
    title: String(payload?.title ?? 'Notificação'),
    message: String(payload?.message ?? ''),
    sender: String(payload?.sender ?? 'Assetra'),
    actionUrl: String(payload?.actionUrl ?? getFrontendBaseUrl()),
  })
  if (!result.sent) {
    console.warn('[events-worker] E-mail de notificação não enviado:', result.reason, '→', to)
  }
  return result
}
