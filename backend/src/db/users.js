import bcrypt from 'bcryptjs'

const defaultPasswordHash = bcrypt.hashSync('Admin@12345', 10)

export const users = [
  {
    id: 'u-1',
    name: 'Administrador',
    email: 'admin@assetra.local',
    passwordHash: defaultPasswordHash,
  },
]
