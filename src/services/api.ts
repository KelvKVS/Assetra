import axios, { type InternalAxiosRequestConfig } from 'axios'

type AxiosConfigWithSilent = InternalAxiosRequestConfig & { silent401?: boolean }

const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.trim() || '/api'
let sessionToken = ''

export function setSessionToken(token?: string) {
  sessionToken = token?.trim() || ''
}

const api = axios.create({
  baseURL: apiBaseUrl,
  withCredentials: true,
  timeout: 15_000,
  validateStatus: (status) => (status >= 200 && status < 300) || status === 304,
})

api.interceptors.request.use((config) => {
  if (sessionToken) {
    config.headers = config.headers ?? {}
    config.headers.Authorization = `Bearer ${sessionToken}`
  }
  return config
})

/**
 * Marca pedidos que podem responder 401 sem ser “erro” real (ex.: bootstrap de sessão).
 * Quando `silent401: true` e a resposta for 401, devolvemos uma resposta vazia em vez de
 * deixar o axios estoirar — o que limpa o ruído na consola do browser.
 */
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const cfg = error?.config as AxiosConfigWithSilent | undefined
    if (cfg?.silent401 && error?.response?.status === 401) {
      return Promise.resolve({
        data: null,
        status: 401,
        statusText: 'Unauthorized',
        headers: {},
        config: cfg,
      })
    }
    if (error?.response?.status === 401) {
      setSessionToken('')
    }
    return Promise.reject(error)
  },
)

export default api
