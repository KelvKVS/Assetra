import mongoose from 'mongoose'

/** Referência a ficheiro carregado em /api/uploads (partilhado por ativos, manutenções, aprovações). */
export const attachmentSchema = new mongoose.Schema(
  {
    filename: { type: String, required: true },
    originalName: { type: String },
    mimetype: { type: String },
    size: { type: Number },
    url: { type: String, required: true },
  },
  { _id: false },
)
