import nodemailer from 'nodemailer'

/** Extrai endereço de "Nome <email@dominio>" ou devolve o valor se já for e-mail. */
function parseEmailAddress(raw) {
  const value = String(raw ?? '').trim()
  const angle = value.match(/<([^>]+)>/)
  if (angle?.[1]) return angle[1].trim().toLowerCase()
  if (value.includes('@')) return value.toLowerCase()
  return ''
}

export function formatEmailFrom(displayName, email) {
  const addr = parseEmailAddress(email)
  if (!addr || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(addr)) return null
  const name = String(displayName ?? 'Assetra')
    .trim()
    .replace(/"/g, '')
  return `"${name}" <${addr}>`
}

function getDefaultFromAddress() {
  const fromEnv =
    process.env.EMAIL_FROM ||
    process.env.SMTP_FROM ||
    process.env.SMTP_USER ||
    ''
  const addr = parseEmailAddress(fromEnv)
  if (!addr) return null
  return formatEmailFrom('Assetra', addr)
}

function getSmtpConfig() {
  const host = String(process.env.SMTP_HOST ?? '').trim()
  const port = Number(process.env.SMTP_PORT || 587)
  const user = String(process.env.SMTP_USER ?? '').trim()
  // Senhas de aplicação Google vêm com espaços; no .env use sem espaços ou o código remove.
  const pass = String(process.env.SMTP_PASS ?? '')
    .trim()
    .replace(/\s+/g, '')
  const from = String(process.env.SMTP_FROM ?? user).trim()
  if (!host || !from) return null
  if (user && !pass) return null
  return { host, port, user, pass, from }
}

function isBrevoConfigured() {
  return Boolean(String(process.env.BREVO_API_KEY ?? '').trim())
}

function isResendConfigured() {
  return Boolean(String(process.env.RESEND_API_KEY ?? '').trim())
}

/** Remetente Brevo — deve estar verificado em Senders (não exige domínio próprio). */
function getBrevoSender() {
  const email = parseEmailAddress(process.env.EMAIL_FROM || process.env.SMTP_USER)
  if (!email) return null
  const name = String(process.env.BREVO_SENDER_NAME ?? 'Assetra').trim() || 'Assetra'
  return { name, email }
}

function mapBrevoApiError(msg) {
  const raw = String(msg ?? '')
  if (/sender|not verified|authenticate/i.test(raw)) {
    return (
      'Remetente não verificado no Brevo. Em brevo.com → Senders, adicione e confirme EMAIL_FROM ' +
      '(link no Gmail) antes de enviar convites.'
    )
  }
  return raw.slice(0, 280) || 'Brevo rejeitou o envio.'
}

/** Domínios que a Resend não deixa verificar (ex.: gmail.com). */
const RESEND_NON_DOMAIN_FROM = new Set([
  'gmail.com',
  'googlemail.com',
  'hotmail.com',
  'outlook.com',
  'live.com',
  'yahoo.com',
  'icloud.com',
])

function isResendOnboardingFrom(value) {
  return parseEmailAddress(value) === 'onboarding@resend.dev'
}

function usesNonVerifiableFromDomain(address) {
  const email = parseEmailAddress(address)
  if (!email) return false
  const domain = email.split('@')[1]?.toLowerCase()
  return RESEND_NON_DOMAIN_FROM.has(domain)
}

/** Remetente aceite pela Resend sem domínio próprio (plano free / teste). */
function getResendOnboardingFrom() {
  return formatEmailFrom('Assetra', 'onboarding@resend.dev') || 'onboarding@resend.dev'
}

export function getResendReplyToAddress() {
  return (
    parseEmailAddress(process.env.EMAIL_REPLY_TO) ||
    parseEmailAddress(process.env.EMAIL_FROM) ||
    parseEmailAddress(process.env.SMTP_USER) ||
    ''
  )
}

function getResendFromAddress() {
  const explicit = String(process.env.RESEND_FROM ?? '').trim()
  const allowGmailFrom = String(process.env.RESEND_ALLOW_GMAIL_FROM ?? '').toLowerCase() === 'true'

  if (explicit) {
    if (isResendOnboardingFrom(explicit)) return explicit
    if (usesNonVerifiableFromDomain(explicit) && !allowGmailFrom) {
      return getResendOnboardingFrom()
    }
    return explicit
  }

  const defaultFrom = getDefaultFromAddress()
  if (defaultFrom && usesNonVerifiableFromDomain(defaultFrom) && !allowGmailFrom) {
    return getResendOnboardingFrom()
  }

  return defaultFrom || getResendOnboardingFrom()
}

function mapResendApiError(msg) {
  const raw = String(msg ?? '')
  if (/only send testing emails to your own/i.test(raw)) {
    return (
      'Resend sem domínio verificado só envia para a sua conta (' +
      `${parseEmailAddress(process.env.EMAIL_FROM) || 'e-mail da conta'}). ` +
      'Para convites a colaboradores, use BREVO_API_KEY (veja docs/configurar-brevo.md) ou verifique um domínio em resend.com/domains.'
    )
  }
  if (/gmail\.com domain is not verified|domain is not verified/i.test(raw)) {
    return (
      'A Resend não permite remetente @gmail.com. Use RESEND_FROM=onboarding@resend.dev no .env/Render ' +
      '(respostas vão para EMAIL_FROM). Ou verifique um domínio seu em resend.com/domains.'
    )
  }
  return raw.slice(0, 280) || 'Resend rejeitou o envio.'
}

/** Render free bloqueia portas SMTP 25/465/587 — Gmail só funciona em localhost ou plano pago. */
export function isRenderFreeSmtpBlocked() {
  if (process.env.NODE_ENV !== 'production') return false
  if (process.env.RENDER !== 'true') return false
  const tier = String(process.env.RENDER_INSTANCE_TYPE ?? 'free').toLowerCase()
  if (tier && tier !== 'free') return false
  return isSmtpConfigured() && !isResendConfigured() && !isBrevoConfigured()
}

function isDevEtherealEnabled() {
  return (
    process.env.NODE_ENV !== 'production' &&
    String(process.env.EMAIL_DEV_ETHEREAL ?? 'true').toLowerCase() !== 'false'
  )
}

export function isSmtpConfigured() {
  return Boolean(getSmtpConfig())
}

export function isEmailConfigured() {
  return isBrevoConfigured() || isResendConfigured() || isSmtpConfigured() || isDevEtherealEnabled()
}

/** @returns {'brevo' | 'resend' | 'smtp' | 'ethereal' | 'none'} */
export function getEmailTransportMode() {
  if (isBrevoConfigured()) return 'brevo'
  if (isResendConfigured()) return 'resend'
  if (isSmtpConfigured() && !isRenderFreeSmtpBlocked()) return 'smtp'
  if (isDevEtherealEnabled()) return 'ethereal'
  return 'none'
}

export function getEmailSetupStatus() {
  const mode = getEmailTransportMode()
  const missing = []
  if (!parseEmailAddress(process.env.EMAIL_FROM || process.env.SMTP_FROM || process.env.SMTP_USER)) {
    missing.push('EMAIL_FROM (e-mail remetente verificado, ex.: kelvinkv2030@gmail.com)')
  }

  if (isRenderFreeSmtpBlocked()) {
    return {
      mode: 'smtp_blocked_render_free',
      realInboxDelivery: false,
      message:
        'Render (plano free) bloqueia SMTP (portas 587/465). Por isso o Gmail funciona no localhost mas não no deploy. ' +
        'Adicione BREVO_API_KEY no Render (recomendado — envia para qualquer destinatário) ou RESEND com domínio verificado.',
      missing: ['BREVO_API_KEY', 'EMAIL_FROM verificado em brevo.com → Senders'],
    }
  }

  if (mode === 'none') {
    if (isSmtpConfigured() && process.env.RENDER === 'true') {
      missing.push('BREVO_API_KEY (SMTP bloqueado no Render free)')
    } else {
      missing.push('BREVO_API_KEY (produção) ou SMTP_HOST, SMTP_USER, SMTP_PASS (localhost/plano pago)')
    }
    return {
      mode,
      realInboxDelivery: false,
      message: 'E-mail desativado em produção. Configure BREVO_API_KEY no Render ou SMTP no .env local.',
      missing,
    }
  }
  if (mode === 'brevo') {
    return {
      mode,
      realInboxDelivery: true,
      message:
        'Brevo ativo: pode enviar convites para qualquer e-mail. Confirme EMAIL_FROM em brevo.com → Senders.',
      missing: [],
    }
  }
  if (mode === 'ethereal') {
    return {
      mode,
      realInboxDelivery: false,
      message:
        'Modo de TESTE (Ethereal): o e-mail NÃO chega ao Gmail/Outlook do destinatário. Abra o link de preview ou configure RESEND/SMTP.',
      missing: missing.length ? missing : [],
    }
  }
  if (mode === 'resend') {
    const from = getResendFromAddress()
    const usesOnboarding = isResendOnboardingFrom(from)
    return {
      mode,
      realInboxDelivery: true,
      message: usesOnboarding
        ? 'Resend ativo, mas SEM domínio só envia para a sua conta. Para convites use BREVO_API_KEY (docs/configurar-brevo.md).'
        : 'Resend API ativa: remetente com domínio verificado em resend.com/domains.',
      missing: [],
    }
  }
  if (mode === 'smtp') {
    return {
      mode,
      realInboxDelivery: true,
      message: 'SMTP configurado: e-mails devem chegar à caixa de entrada do destinatário.',
      missing: [],
    }
  }
  return {
    mode,
    realInboxDelivery: false,
    message: 'E-mail desativado. Configure backend/.env (veja backend/.env.example).',
    missing,
  }
}

export function logEmailTransportOnStartup() {
  const mode = getEmailTransportMode()
  if (process.env.NODE_ENV !== 'production') {
    console.info(`[email] Modo: ${mode}`)
    return
  }
  if (mode === 'brevo') {
    console.info('[email] Produção: envio via Brevo API (HTTPS) — qualquer destinatário após verificar Senders.')
    return
  }
  if (mode === 'resend') {
    console.info('[email] Produção: envio via Resend API — sem domínio só envia para a conta da API.')
    return
  }
  if (isRenderFreeSmtpBlocked()) {
    console.error(
      '[email] SMTP bloqueado no Render free. Defina BREVO_API_KEY (recomendado) no painel do Render.',
    )
    return
  }
  if (mode === 'smtp') {
    console.info('[email] Produção: envio via SMTP.')
    return
  }
  console.error('[email] Produção sem transporte de e-mail — configure BREVO_API_KEY.')
}

async function sendViaBrevo(mail) {
  const apiKey = String(process.env.BREVO_API_KEY ?? '').trim()
  const sender = getBrevoSender()
  if (!sender) {
    return {
      sent: false,
      reason: 'from_not_configured',
      emailError: 'Defina EMAIL_FROM com o e-mail que verificou em brevo.com → Senders.',
    }
  }

  const replyToEmail = mail.replyTo ? parseEmailAddress(mail.replyTo) : getResendReplyToAddress()
  const payload = {
    sender,
    to: [{ email: mail.to }],
    subject: mail.subject,
    htmlContent: mail.html,
    textContent: mail.text,
  }
  if (replyToEmail) {
    payload.replyTo = { email: replyToEmail }
  }

  try {
    const res = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'api-key': apiKey,
        'Content-Type': 'application/json',
        accept: 'application/json',
      },
      body: JSON.stringify(payload),
    })
    const body = await res.json().catch(() => ({}))
    if (!res.ok) {
      const msg = body?.message || body?.error || res.statusText || 'Brevo rejeitou o envio'
      const emailError = mapBrevoApiError(msg)
      console.error('[email] Brevo falhou:', msg)
      return { sent: false, reason: 'send_failed', emailError, mode: 'brevo' }
    }
    console.info(
      '[email] Enviado via Brevo:',
      mail.subject,
      '→',
      mail.to,
      '| From:',
      sender.email,
      body?.messageId ? `| id=${body.messageId}` : '',
    )
    return { sent: true, mode: 'brevo', realInbox: true }
  } catch (err) {
    const emailError = String(err?.message ?? err).slice(0, 280)
    console.error('[email] Brevo erro de rede:', emailError)
    return { sent: false, reason: 'send_failed', emailError, mode: 'brevo' }
  }
}

async function sendViaResend(mail) {
  const apiKey = String(process.env.RESEND_API_KEY ?? '').trim()
  // Resend: nunca usar mail.from @gmail.com — só RESEND_FROM / onboarding
  const from = getResendFromAddress()
  if (!from) {
    return {
      sent: false,
      reason: 'from_not_configured',
      emailError: 'Defina EMAIL_FROM ou RESEND_FROM com um e-mail verificado na Resend.',
    }
  }

  const replyTo = mail.replyTo || getResendReplyToAddress()
  const payload = {
    from,
    to: [mail.to],
    subject: mail.subject,
    html: mail.html,
    text: mail.text,
  }
  if (replyTo) {
    payload.reply_to = replyTo
  }

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    })
    const body = await res.json().catch(() => ({}))
    if (!res.ok) {
      const msg = body?.message || body?.error || res.statusText || 'Resend rejeitou o envio'
      const emailError = mapResendApiError(msg)
      console.error('[email] Resend falhou:', msg)
      return {
        sent: false,
        reason: 'send_failed',
        emailError,
        mode: 'resend',
      }
    }
    console.info(
      '[email] Enviado via Resend:',
      mail.subject,
      '→',
      mail.to,
      '| From:',
      from,
      replyTo ? `| Reply-To: ${replyTo}` : '',
      body?.id ? `| id=${body.id}` : '',
    )
    return { sent: true, mode: 'resend', realInbox: true }
  } catch (err) {
    const emailError = String(err?.message ?? err).slice(0, 280)
    console.error('[email] Resend erro de rede:', emailError)
    return { sent: false, reason: 'send_failed', emailError, mode: 'resend' }
  }
}

let smtpTransporterPromise = null
let devEtherealPromise = null

async function getSmtpTransporter() {
  const cfg = getSmtpConfig()
  if (!cfg) return null
  if (!smtpTransporterPromise) {
    smtpTransporterPromise = nodemailer.createTransport({
      host: cfg.host,
      port: cfg.port,
      secure: cfg.port === 465,
      auth: cfg.user ? { user: cfg.user, pass: cfg.pass } : undefined,
      connectionTimeout: 10_000,
      greetingTimeout: 10_000,
      socketTimeout: 15_000,
    })
  }
  return { transporter: smtpTransporterPromise, from: cfg.from, mode: 'smtp' }
}

async function getDevEtherealTransporter() {
  if (!devEtherealPromise) {
    devEtherealPromise = (async () => {
      const account = await nodemailer.createTestAccount()
      console.info('[email] Modo dev: a usar Ethereal (e-mails de teste).')
      console.info('[email] Utilizador SMTP de teste:', account.user)
      const transporter = nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        secure: false,
        auth: { user: account.user, pass: account.pass },
      })
      return {
        transporter,
        from: getDefaultFromAddress(),
        mode: 'ethereal',
      }
    })()
  }
  return devEtherealPromise
}

function mapSmtpErrorMessage(err) {
  const raw = String(err?.message ?? err ?? '')
  if (/BadCredentials|535|Username and Password not accepted/i.test(raw)) {
    return (
      'Gmail recusou o SMTP_PASS. Gere uma nova senha de aplicação em ' +
      'https://myaccount.google.com/apppasswords (conta kelvinkv2030@gmail.com, com 2 passos ativos) ' +
      'e atualize SMTP_PASS no backend/.env.'
    )
  }
  if (/EAUTH/i.test(raw)) {
    return 'Falha de autenticação SMTP. Verifique SMTP_USER e SMTP_PASS no backend/.env.'
  }
  return raw.slice(0, 280) || 'Falha desconhecida ao enviar e-mail.'
}

async function deliverWithContext(ctx, mail) {
  const from = mail.from || ctx.from || getDefaultFromAddress()
  if (!from) {
    return {
      sent: false,
      reason: 'from_not_configured',
      emailError:
        'Remetente não definido. Configure EMAIL_FROM=kelvinkv2030@gmail.com no backend/.env.',
    }
  }

  try {
    const info = await ctx.transporter.sendMail({
      from,
      replyTo: mail.replyTo || parseEmailAddress(mail.from) || parseEmailAddress(from),
      to: mail.to,
      subject: mail.subject,
      text: mail.text,
      html: mail.html,
    })
    const previewUrl = nodemailer.getTestMessageUrl(info) || undefined
    const realInbox = ctx.mode === 'smtp'
    if (previewUrl) {
      console.warn(
        '[email] MODO TESTE — não chegou ao Gmail real de',
        mail.to,
        '| Preview:',
        previewUrl,
      )
    } else if (realInbox) {
      console.info('[email] Enviado para caixa real via SMTP:', mail.subject, '→', mail.to)
    }
    return { sent: true, previewUrl, mode: ctx.mode, realInbox }
  } catch (err) {
    const emailError = mapSmtpErrorMessage(err)
    console.error('[email] Falha ao enviar:', emailError)
    return { sent: false, reason: 'send_failed', emailError, error: String(err?.message ?? err) }
  }
}

/**
 * @param {{
 *   to: string,
 *   subject: string,
 *   text: string,
 *   html: string,
 *   from?: string,
 *   replyTo?: string,
 * }} mail
 */
export async function sendMail(mail) {
  if (isBrevoConfigured()) {
    const primary = await sendViaBrevo(mail)
    if (primary.sent) return primary

    const canFallback =
      process.env.NODE_ENV !== 'production' &&
      isDevEtherealEnabled() &&
      primary.reason === 'send_failed'

    if (!canFallback) return primary
    console.warn('[email] Brevo falhou; a tentar Ethereal em dev…')
  }

  if (isResendConfigured()) {
    const primary = await sendViaResend(mail)
    if (primary.sent) return primary

    const canFallback =
      process.env.NODE_ENV !== 'production' &&
      isDevEtherealEnabled() &&
      primary.reason === 'send_failed'

    if (!canFallback) return primary
    console.warn('[email] Resend falhou; a tentar Ethereal em dev…')
  }

  const smtp = await getSmtpTransporter()

  if (smtp && !isRenderFreeSmtpBlocked()) {
    const primary = await deliverWithContext(smtp, mail)
    if (primary.sent) return primary

    const canFallback =
      process.env.NODE_ENV !== 'production' &&
      isDevEtherealEnabled() &&
      primary.reason === 'send_failed'

    if (canFallback) {
      console.warn('[email] SMTP falhou; a tentar envio de teste (Ethereal)…')
      smtpTransporterPromise = null
      const ethereal = await getDevEtherealTransporter()
      const fallback = await deliverWithContext(ethereal, mail)
      if (fallback.sent) {
        return {
          ...fallback,
          smtpFailed: true,
          emailError: primary.emailError,
          emailHint:
            'Gmail SMTP falhou (senha de aplicação inválida). Abra o preview abaixo ou corrija SMTP_PASS.',
        }
      }
    }

    return primary
  }

  if (isDevEtherealEnabled()) {
    const ethereal = await getDevEtherealTransporter()
    return deliverWithContext(ethereal, mail)
  }

  if (isRenderFreeSmtpBlocked()) {
    console.error('[email] SMTP bloqueado no Render free — e-mail não enviado:', mail.to)
    return {
      sent: false,
      reason: 'render_smtp_blocked',
      emailError:
        'Render (plano free) bloqueia SMTP. Adicione RESEND_API_KEY no painel do Render (https://resend.com).',
    }
  }

  console.warn('[email] Transporte de e-mail não configurado — não enviado:', mail.subject, '→', mail.to)
  return {
    sent: false,
    reason: 'smtp_not_configured',
    emailError: 'Configure RESEND_API_KEY (produção) ou SMTP no backend/.env (localhost).',
  }
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/**
 * @param {{
 *   to: string,
 *   userName: string,
 *   tenantName: string,
 *   inviterName: string,
 *   inviterEmail: string,
 *   confirmUrl: string,
 *   disputeUrl: string,
 *   loginUrl: string,
 * }} params
 */
export async function sendUserRegistrationInviteEmail(params) {
  const {
    to,
    userName,
    tenantName,
    inviterName,
    inviterEmail,
    confirmUrl,
    disputeUrl,
    loginUrl,
  } = params

  const subject = `Cadastro no Assetra — ${tenantName}`
  const text = [
    `Olá, ${userName},`,
    '',
    `Você foi cadastrado(a) na organização «${tenantName}» no sistema Assetra por ${inviterName} (${inviterEmail}).`,
    '',
    'É necessário confirmar o cadastro antes do primeiro acesso com Google.',
    'Se reconhece este cadastro, confirme pelo link:',
    confirmUrl,
    '',
    'Para acessar o sistema, use «Entrar com Google» com este e-mail:',
    loginUrl,
    '',
    'Se NÃO foi você ou houve um engano, avise o responsável ou conteste pelo link:',
    disputeUrl,
    '',
    `Contato do administrador: ${inviterEmail}`,
  ].join('\n')

  const html = `
<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="utf-8"></head>
<body style="font-family:Segoe UI,system-ui,sans-serif;line-height:1.5;color:#1e293b;max-width:560px;margin:0 auto;padding:24px">
  <p>Olá, <strong>${escapeHtml(userName)}</strong>,</p>
  <p>Você foi cadastrado(a) na organização <strong>${escapeHtml(tenantName)}</strong> no sistema <strong>Assetra</strong> por <strong>${escapeHtml(inviterName)}</strong> (<a href="mailto:${escapeHtml(inviterEmail)}">${escapeHtml(inviterEmail)}</a>).</p>
  <p><strong>Confirme o cadastro abaixo antes do primeiro acesso com Google.</strong></p>
  <p style="margin:24px 0">
    <a href="${escapeHtml(confirmUrl)}" style="display:inline-block;background:#2563eb;color:#fff;text-decoration:none;padding:12px 20px;border-radius:8px;font-weight:600">Confirmar cadastro</a>
  </p>
  <p>Para acessar o sistema, use <strong>Entrar com Google</strong> com este e-mail em:<br><a href="${escapeHtml(loginUrl)}">${escapeHtml(loginUrl)}</a></p>
  <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0">
  <p style="font-size:14px;color:#64748b">Não foi você ou houve um engano? Entre em contato com <a href="mailto:${escapeHtml(inviterEmail)}">${escapeHtml(inviterEmail)}</a> ou <a href="${escapeHtml(disputeUrl)}">informe que não reconhece este cadastro</a>.</p>
</body>
</html>`

  return sendMail({
    to,
    subject,
    text,
    html,
    replyTo: inviterEmail || getResendReplyToAddress() || undefined,
  })
}

/**
 * @param {{
 *   to: string,
 *   adminName: string,
 *   userName: string,
 *   userEmail: string,
 *   tenantName: string,
 * }} params
 */
export async function sendRegistrationDisputeNoticeEmail(params) {
  const { to, adminName, userName, userEmail, tenantName } = params
  const subject = `[Assetra] Contestação de cadastro — ${userEmail}`
  const text = [
    `Olá, ${adminName},`,
    '',
    `${userName} (${userEmail}) informou que não reconhece o cadastro na organização «${tenantName}».`,
    'Verifique se o e-mail foi cadastrado por engano e, se necessário, desative ou remova o utilizador no painel de usuários.',
  ].join('\n')

  const html = `
<p>Olá, <strong>${escapeHtml(adminName)}</strong>,</p>
<p><strong>${escapeHtml(userName)}</strong> (<a href="mailto:${escapeHtml(userEmail)}">${escapeHtml(userEmail)}</a>) informou que <strong>não reconhece</strong> o cadastro na organização «${escapeHtml(tenantName)}».</p>
<p>Verifique se o e-mail foi cadastrado por engano e, se necessário, desative ou remova o utilizador no painel de usuários.</p>`

  return sendMail({ to, subject, text, html, replyTo: userEmail })
}

/**
 * @param {{
 *   to: string,
 *   toName?: string,
 *   subject: string,
 *   title: string,
 *   message: string,
 *   sender?: string,
 *   actionUrl: string,
 * }} params
 */
export async function sendNotificationEmail(params) {
  const { to, toName, subject, title, message, sender, actionUrl } = params
  const greeting = toName ? `Olá, ${toName},` : 'Olá,'
  const text = [
    greeting,
    '',
    title,
    '',
    message,
    '',
    `De: ${sender || 'Assetra'}`,
    '',
    'Abrir no sistema:',
    actionUrl,
  ].join('\n')

  const html = `
<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="utf-8"></head>
<body style="font-family:Segoe UI,system-ui,sans-serif;line-height:1.5;color:#1e293b;max-width:560px;margin:0 auto;padding:24px">
  <p>${escapeHtml(greeting)}</p>
  <h2 style="font-size:18px;margin:0 0 12px">${escapeHtml(title)}</h2>
  <p>${escapeHtml(message)}</p>
  <p style="font-size:13px;color:#64748b">De: ${escapeHtml(sender || 'Assetra')}</p>
  <p style="margin:24px 0">
    <a href="${escapeHtml(actionUrl)}" style="display:inline-block;background:#2563eb;color:#fff;text-decoration:none;padding:12px 20px;border-radius:8px;font-weight:600">Ver no Assetra</a>
  </p>
</body>
</html>`

  return sendMail({
    to,
    subject,
    text,
    html,
    replyTo: parseEmailAddress(sender) || getResendReplyToAddress() || undefined,
  })
}

/**
 * E-mail de teste para o ADM validar a configuração em produção.
 * @param {string} to
 */
export async function sendTestEmail(to) {
  const subject = 'Teste de e-mail — Assetra'
  const text = [
    'Este é um e-mail de teste do Assetra.',
    '',
    `Transporte: ${getEmailTransportMode()}`,
    `Ambiente: ${process.env.NODE_ENV || 'development'}`,
    '',
    'Se recebeu esta mensagem, convites e notificações devem funcionar.',
  ].join('\n')
  const html = `<p>Este é um e-mail de <strong>teste</strong> do Assetra.</p>
<p>Transporte: <code>${escapeHtml(getEmailTransportMode())}</code></p>
<p>Se recebeu esta mensagem, convites e notificações devem funcionar.</p>`
  return sendMail({ to, subject, text, html })
}
