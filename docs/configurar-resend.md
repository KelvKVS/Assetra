# Configurar e-mail com Resend (Assetra)

## 1) Conta e remetente na Resend

1. Aceda a [https://resend.com](https://resend.com) e crie conta.
2. Menu **Emails** → **Add** → verifique `kelvinkv2030@gmail.com` (ou o e-mail que usará como remetente).
3. Abra o e-mail de confirmação da Resend e clique no link.
4. Menu **API Keys** → **Create API Key** → permissão **Sending access**.
5. Copie a chave (começa com `re_`). Guarde — só aparece uma vez.

## 2) Backend local (`backend/.env`)

```env
RESEND_API_KEY=re_COLE_AQUI
EMAIL_FROM=kelvinkv2030@gmail.com
RESEND_FROM="Assetra" <kelvinkv2030@gmail.com>
EMAIL_DEV_ETHEREAL=false
```

Reinicie o backend (`npm run dev` na pasta `backend`).

Teste rápido no terminal:

```bash
cd backend
npm run email:test
```

Deve enviar um e-mail de teste para o endereço que indicar (ou use o botão na página **Utilizadores** no app).

## 3) Render (produção)

No painel do Render, serviços **`assetra-backend`** e **`assetra-events-worker`**, adicione:

| Variável | Valor |
|----------|--------|
| `RESEND_API_KEY` | `re_...` (a mesma chave) |
| `EMAIL_FROM` | `kelvinkv2030@gmail.com` |
| `RESEND_FROM` | `Assetra <kelvinkv2030@gmail.com>` |
| `EMAIL_DEV_ETHEREAL` | `false` |

**Não** é necessário remover `SMTP_*` — com `RESEND_API_KEY` definida, o sistema usa Resend automaticamente.

Clique em **Save** e **Manual Deploy** (ou push no Git se `autoDeploy` estiver ativo).

## 4) Validar em produção

1. Abra o app na Vercel, entre como **ADM**.
2. Vá em **Utilizadores**.
3. Se o aviso amarelo de e-mail sumiu, a API já reconhece Resend.
4. Use **Enviar e-mail de teste para mim** ou cadastre um utilizador Google e verifique a caixa (e spam).

Logs no Render (aba **Logs**):

- Sucesso: `[email] Enviado via Resend:`
- Erro comum: remetente não verificado → confirme o e-mail em **Emails** na Resend.

## 5) Plano gratuito Resend

- Cerca de **100 e-mails/dia** no free tier (consulte o site da Resend).
- Suficiente para convites de cadastro e notificações do projeto académico.
