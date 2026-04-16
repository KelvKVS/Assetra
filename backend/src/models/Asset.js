import mongoose from 'mongoose'

const assetSchema = new mongoose.Schema({
  tag: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  type: { type: String, required: true },
  status: { type: String, enum: ['ATIVO', 'MANUTENCAO', 'DESCARTE'], default: 'ATIVO' },
  location: { type: String },
  assignedTo: { type: String }, // ID do usuário do SQL
  history: [{
    action: String,
    date: { type: Date, default: Date.now },
    userId: String,
    details: String
  }]
}, { timestamps: true })

export default mongoose.model('Asset', assetSchema)
