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
  return { host, port, user, pass, from }
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
  return isSmtpConfigured() || isDevEtherealEnabled()
}

/** @returns {'smtp' | 'ethereal' | 'none'} */
export function getEmailTransportMode() {
  if (isSmtpConfigured()) return 'smtp'
  if (isDevEtherealEnabled()) return 'ethereal'
  return 'none'
}

export function getEmailSetupStatus() {
  const mode = getEmailTransportMode()
  const missing = []
  if (!parseEmailAddress(process.env.EMAIL_FROM || process.env.SMTP_FROM || process.env.SMTP_USER)) {
    missing.push('EMAIL_FROM (e-mail remetente real, ex.: 2024130004@aesa-cesa.br)')
  }
  if (mode === 'none') {
    missing.push('SMTP_HOST, SMTP_USER, SMTP_PASS (Gmail) — ou EMAIL_DEV_ETHEREAL=true só para teste')
  }
  if (mode === 'ethereal') {
    return {
      mode,
      realInboxDelivery: false,
      message:
        'Modo de TESTE (Ethereal): o e-mail NÃO chega ao Gmail/Outlook do destinatário. Abra o link de preview ou configure SMTP no backend/.env.',
      missing: missing.length ? missing : [],
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
  const smtp = await getSmtpTransporter()

  if (smtp) {
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

  console.warn('[email] SMTP não configurado — e-mail não enviado:', mail.subject, '→', mail.to)
  return {
    sent: false,
    reason: 'smtp_not_configured',
    emailError: 'Configure SMTP no backend/.env ou ative EMAIL_DEV_ETHEREAL=true.',
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

  const from =
    formatEmailFrom(inviterName || 'Assetra', inviterEmail) || getDefaultFromAddress()
  return sendMail({
    to,
    subject,
    text,
    html,
    from: from ?? undefined,
    replyTo: inviterEmail,
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

  const from = getDefaultFromAddress()
  return sendMail({ to, subject, text, html, from: from ?? undefined, replyTo: userEmail })
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

  const from = formatEmailFrom(sender, parseEmailAddress(sender)) || getDefaultFromAddress()
  return sendMail({
    to,
    subject,
    text,
    html,
    from: from ?? undefined,
    replyTo: parseEmailAddress(sender) || undefined,
  })
}
