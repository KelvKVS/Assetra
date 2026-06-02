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

const extensionRequestSchema = new mongoose.Schema(
  {
    requestedBy: { type: String, default: '' },
    requestedByName: { type: String, default: '' },
    currentDueAt: { type: Date },
    proposedDueAt: { type: Date, required: true },
    reason: { type: String, default: '', maxlength: 1000 },
    status: {
      type: String,
      enum: ['Pendente', 'Aprovada', 'Reprovada'],
      default: 'Pendente',
    },
    decidedBy: { type: String, default: '' },
    decidedByName: { type: String, default: '' },
    decidedAt: { type: Date },
    notes: { type: String, default: '', maxlength: 500 },
  },
  { timestamps: true },
)

const maintenanceSchema = new mongoose.Schema(
  {
    tenantId: { type: String, required: true, index: true },
    assetTag: { type: String, required: true },
    type: { type: String, required: true, maxlength: 80 },
    description: { type: String, default: '' },
    priority: { type: String, enum: ['Alta', 'Média', 'Baixa'], default: 'Média' },
    status: {
      type: String,
      enum: ['Aberta', 'Em andamento', 'Concluída'],
      default: 'Aberta',
    },
    assignedTechnicianEmail: { type: String, default: '' },
    assignedTechnicianName: { type: String, default: '' },
    /** Prazo para o técnico concluir e enviar validação ao gestor. */
    validationDueAt: { type: Date },
    /** Último motivo de devolução/reprovação da validação pelo gestor. */
    lastReturnNotes: { type: String, default: '' },
    lastReturnedAt: { type: Date },
    lastReturnedByName: { type: String, default: '' },
    extensionRequests: { type: [extensionRequestSchema], default: [] },
    attachments: { type: [attachmentSchema], default: [] },
    openingDate: { type: Date, default: Date.now },
  },
  { timestamps: true },
)

maintenanceSchema.index({ tenantId: 1, openingDate: -1 })

export default mongoose.model('Maintenance', maintenanceSchema)
