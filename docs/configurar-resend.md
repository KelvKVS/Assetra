# Configurar e-mail com Resend (Assetra)

> **Limitação:** sem domínio verificado, a Resend só envia para **o seu próprio e-mail**.  
> Para convites a colaboradores, use **[Brevo](configurar-brevo.md)** (recomendado) ou verifique um domínio em resend.com/domains.

## 1) Conta e API Key na Resend

1. Aceda a [https://resend.com](https://resend.com) e crie conta.
2. Menu **API Keys** → **Create API Key** → permissão **Sending access**.
3. Copie a chave (começa com `re_`). Guarde — só aparece uma vez.

### Erro «gmail.com domain is not verified»

A Resend **não** deixa enviar com remetente `@gmail.com` (o domínio `gmail.com` é do Google, não seu).

**Solução imediata (recomendada):** use o remetente de teste da própria Resend:

```env
RESEND_FROM=onboarding@resend.dev
EMAIL_FROM=kelvinkv2030@gmail.com
```

Os e-mails aparecem como enviados por `onboarding@resend.dev`; as **respostas** vão para `EMAIL_FROM` (seu Gmail).

**Solução definitiva (opcional):** se tiver um domínio (ex. `suaempresa.com.br`), em [resend.com/domains](https://resend.com/domains) adicione o domínio, configure DNS e use `RESEND_FROM=Assetra <noreply@suaempresa.com.br>`.

## 2) Backend local (`backend/.env`)

```env
RESEND_API_KEY=re_COLE_AQUI
RESEND_FROM=onboarding@resend.dev
EMAIL_FROM=kelvinkv2030@gmail.com
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
| `RESEND_FROM` | `onboarding@resend.dev` |
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
