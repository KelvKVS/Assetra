import { test } from 'node:test'
import assert from 'node:assert/strict'
import { integrationApiKeyAuth } from './integrationAuth.js'

function makeRes() {
  return {
    statusCode: 200,
    body: null,
    status(code) {
      this.statusCode = code
      return this
    },
    json(payload) {
      this.body = payload
      return this
    },
  }
}

function makeReq(overrides = {}) {
  return {
    headers: {},
    query: {},
    body: {},
    ...overrides,
  }
}

function withEnv(env, fn) {
  const prev = { ...process.env }
  Object.assign(process.env, env)
  return Promise.resolve()
    .then(fn)
    .finally(() => {
      process.env = prev
    })
}

test('integração por tenant: aceita chave válida e define integrationTenantId', async () => {
  await withEnv(
    {
      INTEGRATION_API_KEYS: 'tenant-a:key-a,tenant-b:key-b',
      INTEGRATION_API_KEY: '',
      INTEGRATION_TENANT_ID: '',
    },
    async () => {
      const req = makeReq({
        headers: { 'x-api-key': 'key-a', 'x-tenant-id': 'tenant-a' },
      })
      const res = makeRes()
      let called = false
      integrationApiKeyAuth(req, res, () => {
        called = true
      })
      assert.equal(called, true)
      assert.equal(req.integrationTenantId, 'tenant-a')
    },
  )
})

test('integração por tenant: rejeita tenantId ausente', async () => {
  await withEnv(
    {
      INTEGRATION_API_KEYS: 'tenant-a:key-a',
      INTEGRATION_API_KEY: '',
      INTEGRATION_TENANT_ID: '',
    },
    async () => {
      const req = makeReq({ headers: { 'x-api-key': 'key-a' } })
      const res = makeRes()
      integrationApiKeyAuth(req, res, () => {})
      assert.equal(res.statusCode, 400)
    },
  )
})

test('modo legado: valida key e tenant fixo', async () => {
  await withEnv(
    {
      INTEGRATION_API_KEYS: '',
      INTEGRATION_API_KEY: 'legacy-key',
      INTEGRATION_TENANT_ID: 'legacy-tenant',
    },
    async () => {
      const req = makeReq({
        headers: { 'x-api-key': 'legacy-key' },
        query: { tenantId: 'legacy-tenant' },
      })
      const res = makeRes()
      let called = false
      integrationApiKeyAuth(req, res, () => {
        called = true
      })
      assert.equal(called, true)
      assert.equal(req.integrationTenantId, 'legacy-tenant')
    },
  )
})

test('modo legado: rejeita tenant diferente do fixo', async () => {
  await withEnv(
    {
      INTEGRATION_API_KEYS: '',
      INTEGRATION_API_KEY: 'legacy-key',
      INTEGRATION_TENANT_ID: 'legacy-tenant',
    },
    async () => {
      const req = makeReq({
        headers: { 'x-api-key': 'legacy-key' },
        query: { tenantId: 'outro-tenant' },
      })
      const res = makeRes()
      integrationApiKeyAuth(req, res, () => {})
      assert.equal(res.statusCode, 403)
    },
  )
})
