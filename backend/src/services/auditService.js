import AuditLog from '../models/AuditLog.js'

export async function logAudit({
  tenantId,
  actor,
  entityType,
  entityId,
  action,
  before = null,
  after = null,
  metadata = {},
}) {
  if (!tenantId || !entityType || !entityId || !action) return
  await AuditLog.create({
    tenantId,
    actorId: String(actor?.sub ?? actor?.id ?? ''),
    actorName: String(actor?.name ?? ''),
    actorRole: String(actor?.role ?? ''),
    entityType,
    entityId: String(entityId),
    action,
    before,
    after,
    metadata,
  })
}

export async function listEntityAuditLogs(tenantId, entityType, entityId, limit = 100) {
  const rows = await AuditLog.find({
    tenantId,
    entityType,
    entityId: String(entityId),
  })
    .sort({ createdAt: -1 })
    .limit(Math.min(Number(limit) || 100, 500))

  return rows.map((row) => ({
    id: String(row._id),
    actorId: row.actorId ?? '',
    actorName: row.actorName ?? '',
    actorRole: row.actorRole ?? '',
    entityType: row.entityType,
    entityId: row.entityId,
    action: row.action,
    before: row.before ?? null,
    after: row.after ?? null,
    metadata: row.metadata ?? {},
    createdAt: row.createdAt,
  }))
}
