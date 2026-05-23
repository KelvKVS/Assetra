export type GoogleIdTokenPayload = {
  name?: string
  email?: string
  email_verified?: boolean
}

type OAuthStatePayload = {
  ctx: string
  n: string
  tenant?: string
}

type JwtClaims = GoogleIdTokenPayload & { nonce?: string }

function encodeState(payload: OAuthStatePayload) {
  return btoa(JSON.stringify(payload))
}

function decodeState(raw: string | null): OAuthStatePayload | null {
  if (!raw) return null
  try {
    return JSON.parse(atob(raw)) as OAuthStatePayload
  } catch {
    return null
  }
}

function readOAuthParams(): URLSearchParams {
  const hash = window.location.hash?.replace(/^#/, '') ?? ''
  const query = window.location.search?.replace(/^\?/, '') ?? ''
  if (hash) return new URLSearchParams(hash)
  if (query) return new URLSearchParams(query)
  return new URLSearchParams()
}

function clearOAuthUrl() {
  window.history.replaceState(null, '', window.location.pathname)
}

export function useGoogleIdToken() {
  const clientId = (import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined)?.trim() ?? ''
  const enabled = Boolean(clientId && !clientId.toLowerCase().includes('seu-client-id'))

  function start(redirectPath: string, context = 'default', tenantSlug?: string) {
    if (!enabled) return false
    const tenant = tenantSlug?.trim()
    const statePayload: OAuthStatePayload = {
      ctx: context,
      n: crypto.randomUUID(),
      ...(tenant ? { tenant } : {}),
    }
    const state = encodeState(statePayload)

    const redirectUri = `${window.location.origin}${redirectPath}`
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: 'id_token',
      scope: 'openid email profile',
      nonce: statePayload.n,
      state,
      prompt: 'select_account',
    })
    window.location.href = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`
    return true
  }

  function decodeJwtClaims(token: string): JwtClaims | null {
    try {
      const payload = token.split('.')[1]
      if (!payload) return null
      const normalized = payload.replace(/-/g, '+').replace(/_/g, '/')
      const decoded = decodeURIComponent(
        atob(normalized)
          .split('')
          .map((c) => `%${`00${c.charCodeAt(0).toString(16)}`.slice(-2)}`)
          .join(''),
      )
      return JSON.parse(decoded) as JwtClaims
    } catch {
      return null
    }
  }

  /** O Google devolve o nonce dentro do id_token (JWT), não como parâmetro separado no hash. */
  function nonceMatches(idToken: string, expected: string, hashNonce: string | null) {
    if (hashNonce === expected) return true
    const claims = decodeJwtClaims(idToken)
    return claims?.nonce === expected
  }

  function parseRedirect():
    | { idToken: string; context: string; tenant?: string }
    | { error: string; description?: string }
    | null {
    const params = readOAuthParams()
    if ([...params.keys()].length === 0) return null

    const oauthError = params.get('error')
    if (oauthError) {
      clearOAuthUrl()
      return {
        error: oauthError,
        description: params.get('error_description') ?? undefined,
      }
    }

    const idToken = params.get('id_token')
    if (!idToken) return null

    const state = decodeState(params.get('state'))
    const hashNonce = params.get('nonce')
    if (state?.n && !nonceMatches(idToken, state.n, hashNonce)) {
      clearOAuthUrl()
      return { error: 'invalid_nonce' }
    }

    clearOAuthUrl()
    return {
      idToken,
      context: state?.ctx ?? 'default',
      tenant: state?.tenant,
    }
  }

  function decodePayload(token: string): GoogleIdTokenPayload | null {
    return decodeJwtClaims(token)
  }

  function describeOAuthError(error: string, description?: string) {
    if (error === 'redirect_uri_mismatch') {
      return 'Não foi possível concluir o login com Google. Tente novamente.'
    }
    if (error === 'access_denied') {
      return 'Login cancelado. Clique em «Entrar com Google» e escolha uma conta.'
    }
    if (error === 'invalid_nonce') {
      return 'Sessão expirou. Clique em «Entrar com Google» novamente.'
    }
    if (description) return description
    return 'Não foi possível concluir o login com Google. Tente novamente.'
  }

  return { enabled, clientId, start, parseRedirect, decodePayload, describeOAuthError }
}
