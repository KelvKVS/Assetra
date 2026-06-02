# E-mail para todos os destinatários — Brevo (recomendado no Render free)

## Por que não só Resend?

Sem **domínio verificado** na Resend, você só pode enviar e-mails **para a sua própria conta** (`kelvinkv2030@gmail.com`). Convites a colaboradores precisam de outro meio.

O **Brevo** (grátis, ~300 e-mails/dia):

- Funciona no **Render free** (HTTPS, porta 443)
- Envia para **qualquer** e-mail
- Basta **verificar o remetente** (seu Gmail) — **não** precisa de domínio próprio

---

## Passo a passo

### 1) Conta Brevo

1. [https://www.brevo.com](https://www.brevo.com) → criar conta (plano Free).
2. Menu **Senders, domains & dedicated IPs** → **Senders** → **Add a sender**.
3. Nome: `Assetra`, e-mail: `kelvinkv2030@gmail.com` (o mesmo de `EMAIL_FROM`).
4. Abra o Gmail e clique no link de confirmação da Brevo.

### 2) API Key (não é a senha SMTP)

Na Brevo existem **dois** tipos de credencial:

| O que você viu | Serve para | Assetra no Render |
|----------------|------------|-------------------|
| `smtp-relay.brevo.com` + login `...@smtp-brevo.com` + senha | Clientes de e-mail / SMTP porta 587 | **Não** (Render bloqueia porta 587) |
| **API Key** `xkeysib-...` | API HTTPS | **Sim** (é isto que usamos) |

1. Ícone de perfil → **SMTP & API** → separador **API Keys** (não confundir com “SMTP”).
2. **Generate a new API key** → nome `assetra`.
3. Copie a chave (começa com `xkeysib-...`) — **não** use a senha SMTP aqui.

### 3) `backend/.env`

```env
BREVO_API_KEY=xkeysib_SUA_CHAVE
EMAIL_FROM=kelvinkv2030@gmail.com
EMAIL_DEV_ETHEREAL=false
```

**Remova ou comente** `RESEND_API_KEY` se existir — com Brevo configurado, o sistema usa Brevo primeiro.

Reinicie o backend.

### 4) Teste

```bash
cd backend
npm run email:test -- email-de-um-colega@gmail.com
```

Ou cadastre / reenvie convite na página **Utilizadores**.

### 5) Render (produção)

Em **assetra-backend** e **assetra-events-worker**:

| Variável | Valor |
|----------|--------|
| `BREVO_API_KEY` | `xkeysib_...` |
| `EMAIL_FROM` | `kelvinkv2030@gmail.com` |
| `EMAIL_DEV_ETHEREAL` | `false` |

Pode **apagar** `RESEND_API_KEY` no Render para evitar confusão.

Redeploy.

---

## Resumo

| Serviço | Sem domínio | Envia para colaboradores? |
|---------|-------------|---------------------------|
| Gmail SMTP localhost | — | Sim |
| Gmail SMTP Render free | — | **Não** (porta bloqueada) |
| Resend + onboarding | Sim | **Só para você** |
| Resend + domínio DNS | Domínio próprio | Sim |
| **Brevo + sender verificado** | Sim (Gmail OK) | **Sim** |
