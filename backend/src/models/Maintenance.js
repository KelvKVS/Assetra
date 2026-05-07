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
    attachments: { type: [attachmentSchema], default: [] },
    openingDate: { type: Date, default: Date.now },
  },
  { timestamps: true },
)

maintenanceSchema.index({ tenantId: 1, openingDate: -1 })

export default mongoose.model('Maintenance', maintenanceSchema)
