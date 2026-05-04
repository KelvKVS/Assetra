import mongoose from 'mongoose'

const movementSchema = new mongoose.Schema(
  {
    tenantId: { type: String, required: true, index: true },
    assetTag: { type: String, required: true },
    origin: { type: String, required: true },
    destination: { type: String, required: true },
    responsible: { type: String, required: true },
    occurredAt: { type: Date, default: Date.now },
  },
  { timestamps: true },
)

movementSchema.index({ tenantId: 1, occurredAt: -1 })

export default mongoose.model('Movement', movementSchema)
