import { test } from 'node:test'
import assert from 'node:assert/strict'
import bcrypt from 'bcryptjs'

process.env.JWT_SECRET = 'unit-test-jwt-secret-32chars-min__'

const { authenticateUser } = await import('./authService.js')
const { AppError } = await import('../utils/AppError.js')

function makeUser(overrides = {}) {
  return {
    id: 'u1',
    name: 'Test User',
    email: 't@test.local',
    passwordHash: bcrypt.hashSync('pw-ok-123456', 10),
    role: 'ADM',
    tenantId: 'tid-default',
    active: true,
    tenant: { slug: 'default', name: 'Demo', active: true },
    ...overrides,
  }
}

test('login com slug e tenant inexistente → 401', async () => {
  const prisma = {
    tenant: { findFirst: async () => null },
    user: { findMany: async () => [], findFirst: async () => null },
  }
  await assert.rejects(
    () => authenticateUser(prisma, { email: 't@test.local', password: 'pw-ok-123456', tenantSlug: 'nope' }),
    (e) => e instanceof AppError && e.statusCode === 401,
  )
})

test('login sem slug e dois utilizadores ativos com o mesmo e-mail → 400', async () => {
  const prisma = {
    tenant: { findFirst: async () => null },
    user: {
      findMany: async () => [
        makeUser({ id: 'a', tenantId: 'tid-1' }),
        makeUser({
          id: 'b',
          tenantId: 'tid-2',
          tenant: { slug: 'acme', name: 'Acme', active: true },
        }),
      ],
      findFirst: async () => null,
    },
  }
  await assert.rejects(
    () => authenticateUser(prisma, { email: 't@test.local', password: 'pw-ok-123456' }),
    (e) => e instanceof AppError && e.statusCode === 400,
  )
})

test('login sem slug e um utilizador → token e tenant', async () => {
  const u = makeUser()
  const prisma = {
    tenant: { findFirst: async () => null },
    user: {
      findMany: async () => [u],
      findFirst: async () => null,
    },
  }
  const out = await authenticateUser(prisma, { email: 't@test.local', password: 'pw-ok-123456' })
  assert.equal(out.user.tenant.slug, 'default')
  assert.ok(out.token.length > 20)
})

test('login com slug válido → utilizador desse tenant', async () => {
  const tenantRow = { id: 'tid-acme', slug: 'acme', active: true, name: 'Acme' }
  const u = makeUser({
    tenantId: tenantRow.id,
    tenant: { slug: 'acme', name: 'Acme', active: true },
  })
  const prisma = {
    tenant: {
      findFirst: async ({ where }) => (where.slug === 'acme' ? tenantRow : null),
    },
    user: {
      findMany: async () => [],
      findFirst: async () => u,
    },
  }
  const out = await authenticateUser(prisma, { email: 't@test.local', password: 'pw-ok-123456', tenantSlug: 'acme' })
  assert.equal(out.user.tenant.slug, 'acme')
})

test('password incorreta → 401', async () => {
  const u = makeUser()
  const prisma = {
    tenant: { findFirst: async () => null },
    user: {
      findMany: async () => [u],
      findFirst: async () => null,
    },
  }
  await assert.rejects(
    () => authenticateUser(prisma, { email: 't@test.local', password: 'wrong-password-xyz' }),
    (e) => e instanceof AppError && e.statusCode === 401,
  )
})
