import mongoose from 'mongoose'

const maintenanceSchema = new mongoose.Schema(
  {
    tenantId: { type: String, required: true, index: true },
    assetTag: { type: String, required: true },
    type: { type: String, enum: ['Corretiva', 'Preventiva'], required: true },
    priority: { type: String, enum: ['Alta', 'Média', 'Baixa'], default: 'Média' },
    status: {
      type: String,
      enum: ['Em andamento', 'Agendada', 'Concluída'],
      default: 'Agendada',
    },
    openingDate: { type: Date, default: Date.now },
  },
  { timestamps: true },
)

maintenanceSchema.index({ tenantId: 1, openingDate: -1 })

export default mongoose.model('Maintenance', maintenanceSchema)
