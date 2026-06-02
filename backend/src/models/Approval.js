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
    maintenanceId: { type: String, default: '' },
    /** abertura | validacao | movimentacao — etapa do fluxo corporativo */
    approvalPhase: { type: String, default: '' },
    /** Solicitação de abertura ligada à validação de conclusão */
    parentApprovalId: { type: String, default: '' },
    assetTag: { type: String, required: true },
    description: { type: String, required: true },
    /** Setor de destino (solicitações de movimentação). */
    destinationSector: { type: String },
    /** Justificativa / contexto adicional do solicitante. */
    feedback: { type: String },
    /** Anexos (fotos, prints, PDFs) carregados via /api/uploads. */
    attachments: { type: [attachmentSchema], default: [] },
    requestedBy: { type: String },
    requestedByName: { type: String },
    requestedByRole: { type: String, enum: ['ADM', 'GESTOR', 'TECNICO', 'FUNCIONARIO'] },
    requiredApproverRole: { type: String, enum: ['ADM', 'GESTOR'], required: true },
    status: { type: String, enum: ['Pendente', 'Aprovada', 'Reprovada'], default: 'Pendente' },
    decidedBy: { type: String },
    decidedByName: { type: String },
    decidedAt: { type: Date },
    notes: { type: String },
  },
  { timestamps: true },
)

approvalSchema.index({ tenantId: 1, status: 1, createdAt: -1 })
approvalSchema.index({ tenantId: 1, maintenanceId: 1, createdAt: 1 })

export default mongoose.model('Approval', approvalSchema)
