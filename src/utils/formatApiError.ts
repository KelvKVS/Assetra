/** Extrai mensagem legível de erros Axios / API. */
export function formatApiError(error: unknown, fallback = 'Ocorreu um erro.'): string {
  const ax = error as {
    response?: {
      status?: number
      data?: {
        message?: string
        issues?: {
          formErrors?: string[]
          fieldErrors?: Record<string, string[]>
        }
      }
    }
    message?: string
  }

  const data = ax?.response?.data
  const parts: string[] = []

  if (data?.message) parts.push(data.message)

  const fieldErrors = data?.issues?.fieldErrors
  if (fieldErrors) {
    for (const [field, msgs] of Object.entries(fieldErrors)) {
      for (const m of msgs ?? []) {
        parts.push(field ? `${field}: ${m}` : m)
      }
    }
  }

  for (const m of data?.issues?.formErrors ?? []) {
    parts.push(m)
  }

  if (parts.length) return parts.join(' ')

  if (ax?.response?.status === 401) {
    return 'Sessão expirada. Entre novamente.'
  }

  if (String(ax?.message ?? '').toLowerCase().includes('timeout')) {
    return 'O servidor demorou demais a responder. Verifique a lista de utilizadores — o cadastro pode ter sido criado.'
  }

  return ax?.message || fallback
}

export function isDuplicateUserError(message: string): boolean {
  const m = message.toLowerCase()
  return (
    m.includes('já existe') ||
    m.includes('ja existe') ||
    m.includes('já está cadastrado') ||
    m.includes('duplicad')
  )
}
