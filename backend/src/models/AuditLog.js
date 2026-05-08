import mongoose from 'mongoose'

const auditLogSchema = new mongoose.Schema(
  {
    tenantId: { type: String, required: true, index: true },
    actorId: { type: String, default: '' },
    actorName: { type: String, default: '' },
    actorRole: { type: String, default: '' },
    entityType: { type: String, required: true, index: true },
    entityId: { type: String, required: true, index: true },
    action: { type: String, required: true },
    before: { type: mongoose.Schema.Types.Mixed, default: null },
    after: { type: mongoose.Schema.Types.Mixed, default: null },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true },
)

auditLogSchema.index({ tenantId: 1, entityType: 1, entityId: 1, createdAt: -1 })

export default mongoose.model('AuditLog', auditLogSchema)
