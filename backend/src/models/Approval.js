import mongoose from 'mongoose'

const attachmentSchema = new mongoose.Schema(
  {
    filename: { type: String, required: true },
    originalName: { type: String },
    mimetype: { type: String },
    size: { type: Number },
    url: { type: String, required: true },
  },
  { _id: false },
)

const approvalSchema = new mongoose.Schema(
  {
    tenantId: { type: String, required: true, index: true },
    type: { type: String, enum: ['Movimentação', 'Manutenção'], required: true },
    assetTag: { type: String, required: true },
    description: { type: String, required: true },
    /** Justificativa / contexto adicional do solicitante. */
    feedback: { type: String },
    /** Anexos (fotos, prints, PDFs) carregados via /api/uploads. */
    attachments: { type: [attachmentSchema], default: [] },
    requestedBy: { type: String },
    requestedByName: { type: String },
    status: { type: String, enum: ['Pendente', 'Aprovada', 'Reprovada'], default: 'Pendente' },
    decidedBy: { type: String },
    decidedByName: { type: String },
    decidedAt: { type: Date },
    notes: { type: String },
  },
  { timestamps: true },
)

approvalSchema.index({ tenantId: 1, status: 1, createdAt: -1 })

export default mongoose.model('Approval', approvalSchema)
