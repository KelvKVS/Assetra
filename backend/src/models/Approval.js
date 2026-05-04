import mongoose from 'mongoose'

const approvalSchema = new mongoose.Schema(
  {
    tenantId: { type: String, required: true, index: true },
    type: { type: String, enum: ['Movimentação', 'Manutenção'], required: true },
    assetTag: { type: String, required: true },
    description: { type: String, required: true },
    status: { type: String, enum: ['Pendente', 'Aprovada', 'Reprovada'], default: 'Pendente' },
    decidedBy: { type: String },
    decidedAt: { type: Date },
    notes: { type: String },
  },
  { timestamps: true },
)

approvalSchema.index({ tenantId: 1, status: 1, createdAt: -1 })

export default mongoose.model('Approval', approvalSchema)
