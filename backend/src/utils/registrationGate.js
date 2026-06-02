import { AppError } from './AppError.js'
import { isDemoAssetraEmail } from './emailPolicy.js'

/** Utilizadores convidados pelo ADM (Google) precisam confirmar o e-mail antes do primeiro login. */
export function assertUserMayLoginWithGoogle(user) {
  if (!user?.invitedByUserId) return
  if (isDemoAssetraEmail(user.email)) return

  if (user.registrationDisputedAt) {
    throw new AppError(
      403,
      'O seu cadastro foi contestado. Contacte o administrador da sua empresa para regularizar o acesso.',
      { code: 'REGISTRATION_DISPUTED' },
    )
  }

  if (!user.registrationAcknowledgedAt) {
    throw new AppError(
      403,
      'Confirme o cadastro pelo e-mail que enviámos antes de entrar com Google. Verifique a caixa de entrada e o spam.',
      { code: 'REGISTRATION_PENDING' },
    )
  }
}
