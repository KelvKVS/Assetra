import mongoose from 'mongoose'

const connectNoSQL = async () => {
  try {
    const uri = process.env.MONGODB_URL || 'mongodb://localhost:27017/assetra'
    await mongoose.connect(uri)
    console.log('MongoDB conectado com sucesso!')
  } catch (error) {
    console.error('Erro ao conectar ao MongoDB:', error)
  }
}

export default connectNoSQL
