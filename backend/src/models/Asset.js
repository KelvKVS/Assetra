import mongoose from 'mongoose'

const ASSET_STATUSES = ['Em uso', 'Disponível', 'Em manutenção']

const assetSchema = new mongoose.Schema(
  {
    tenantId: { type: String, required: true, index: true },
    tag: { type: String, required: true },
    description: { type: String, required: true },
    sector: { type: String, required: true },
    status: { type: String, enum: ASSET_STATUSES, default: 'Disponível' },
    assignedTo: { type: String },
    history: [
      {
        action: String,
        date: { type: Date, default: Date.now },
        userId: String,
        details: String,
      },
    ],
  },
  { timestamps: true },
)

assetSchema.index({ tenantId: 1, tag: 1 }, { unique: true })

export default mongoose.model('Asset', assetSchema)
