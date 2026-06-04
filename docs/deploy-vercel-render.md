# Deploy: Vercel (Frontend) + Render (Backend)

## 1) Backend no Render

1. Faça push da branch para o GitHub.
2. No Render, clique em **New + > Blueprint** e selecione o repositório.
3. O Render irá ler `render.yaml` e criar o serviço `assetra-backend`.
4. Configure as variáveis obrigatórias no painel do serviço:
   - `JWT_SECRET` (min. 32 caracteres)
   - `CORS_ORIGIN` (ex.: `https://seu-front.vercel.app`)
   - `DATABASE_URL` (recomendado: PostgreSQL do Render)
   - `MONGODB_URL` (MongoDB Atlas ou equivalente)
   - `GOOGLE_CLIENT_ID`
   - `FRONTEND_URL` (ex.: `https://assetra-seven.vercel.app`)
   - `API_PUBLIC_URL` (ex.: `https://assetra-44la.onrender.com`)
   - **E-mail (convites + notificações):**
     - `EMAIL_FROM=kelvinkv2030@gmail.com`
     - `EMAIL_DEV_ETHEREAL=false` (obrigatório em produção)
     - `SMTP_HOST=smtp.gmail.com`
     - `SMTP_PORT=587`
     - `SMTP_USER=kelvinkv2030@gmail.com`
     - `SMTP_PASS=xxxxxxxxxxxxxxxx` (senha de aplicação Google, **16 letras sem espaços**)
     - `SMTP_FROM="Assetra" <kelvinkv2030@gmail.com>`
     - `NOTIFICATION_EMAILS_ENABLED=true`
   - `EVENT_BROKER_DRIVER` (`rabbitmq`)
   - `RABBITMQ_URL` (URL do broker, ex.: CloudAMQP)
   - Integrações externas (escolha 1 modo):
     - recomendado: `INTEGRATION_API_KEYS` (formato `tenantId:apiKey,tenantId2:apiKey2`)
     - legado: `INTEGRATION_API_KEY` + `INTEGRATION_TENANT_ID`
5. Após deploy, valide:
   - `https://SEU-BACKEND.onrender.com/api/health`
   - `https://SEU-BACKEND.onrender.com/api/metrics`
   - confira `eventBus.status = "up"` no JSON de health

### RabbitMQ no Render: preciso subir lá?

Sim, para mensageria funcionar em produção você precisa de um broker acessível.

Opções:

1. **Recomendado (mais simples): CloudAMQP**  
   - Crie uma instância RabbitMQ no CloudAMQP.
   - Copie a URL **`amqps://...`** (AMQP URL) para `RABBITMQ_URL` no Render — **nos dois serviços**: `assetra-backend` e `assetra-events-worker`.
   - No painel LavinMQ, use **Connections** e **Queues** (não “Logs” de aplicação).
   - Guia passo a passo: [cloudamqp-render-producao.md](cloudamqp-render-producao.md)

2. **Hospedar broker por conta própria**  
   - Pode usar outro provedor/VM com RabbitMQ.
   - Informe a URL em `RABBITMQ_URL`.

> O `render.yaml` já cria um worker (`assetra-events-worker`) para consumir eventos RabbitMQ.

**Importante:** copie as mesmas variáveis **SMTP** e `EMAIL_FROM` também no serviço **assetra-events-worker** (notificações por e-mail passam pela fila).

## 2) Frontend na Vercel

1. No Vercel, clique em **Add New > Project** e selecione o mesmo repositório.
2. Em **Root Directory**, deixe a raiz do projeto (`assetra-app`).
3. Build/Output já está pronto via `vercel.json`.
4. Configure variáveis do frontend:
   - `VITE_API_BASE_URL=/api` (com `vercel.json` a fazer proxy para o Render) **ou** URL completa do Render
   - `VITE_API_UPLOAD_BASE_URL=https://SEU-BACKEND.onrender.com/api` (recomendado — leitura de anexos direto no Render)
   - `VITE_GOOGLE_CLIENT_ID=...apps.googleusercontent.com`
5. Faça deploy e abra o domínio gerado.

## 3) E-mail em produção (checklist)

### Render FREE bloqueia SMTP

O plano **free** do Render **não permite** ligações às portas SMTP **25, 465 e 587**. Por isso o Gmail (`SMTP_HOST=smtp.gmail.com`) funciona no **localhost** mas **falha no deploy** (timeout ou erro silencioso).

**Solução recomendada (grátis): [Resend](https://resend.com)** — envia por HTTPS (porta 443), compatível com Render free.

1. Crie conta em https://resend.com
2. Em **Domains** ou **Single Sender**, verifique o e-mail remetente (ex.: `kelvinkv2030@gmail.com`)
3. Gere uma **API Key** (`re_...`)
4. No painel do Render (**assetra-backend** e **assetra-events-worker**), adicione:
   - `RESEND_API_KEY=re_...`
   - `EMAIL_FROM=kelvinkv2030@gmail.com`
   - `RESEND_FROM=onboarding@resend.dev` (não use @gmail.com como remetente)
   - `EMAIL_DEV_ETHEREAL=false`
5. Faça redeploy do backend e do worker.
6. No app (Utilizadores, como ADM), use **Enviar e-mail de teste** ou cadastre um utilizador e verifique a caixa.

**Alternativa:** upgrade do serviço Render para plano **pago** — aí o SMTP Gmail volta a funcionar.

### Outras variáveis

1. **Não** commite `SMTP_PASS` nem `RESEND_API_KEY` no Git.
2. `FRONTEND_URL` = URL da Vercel (links de confirmação de cadastro).
3. Logs do Render: procure `[email] Produção: envio via Resend` ou erro `Resend falhou`.

## 4) Google OAuth (produção)

No Google Cloud Console, no Client Web OAuth:
- **Authorized JavaScript origins**:
  - `https://seu-front.vercel.app`
- (Opcional) adicione domínio customizado se houver.

O mesmo `GOOGLE_CLIENT_ID` deve existir:
- no frontend (`VITE_GOOGLE_CLIENT_ID`)
- no backend (`GOOGLE_CLIENT_ID`)

## 5) Anexos / imagens

- **Leitura:** o frontend pede imagens via `/api/uploads/...` no domínio da Vercel (proxy → Render). Não use URL absoluta do Render em `<img>` (bloqueio `NotSameOrigin`).
- **Upload (POST):** `VITE_API_UPLOAD_BASE_URL=https://SEU-BACKEND.onrender.com/api` na Vercel — ficheiros grandes não passam pelo proxy.
- **Persistência:** cada upload é também guardado no **MongoDB GridFS** (Atlas). Sobrevive a redeploy no Render.
- **Fotos antigas perdidas no redeploy:** se ainda tiver a pasta `backend/uploads/` no PC com os ficheiros originais:

```bash
cd backend
# use a mesma MONGODB_URL de produção (Atlas)
npm run uploads:migrate-gridfs
```

Depois faça redeploy do backend no Render.

- Se não tiver cópia local dos ficheiros, é necessário **reenviar** os anexos nas solicitações/ativos.

## 6) Observações importantes

- A autenticação usa cookie `httpOnly`; em produção foi ajustada para `sameSite=none` e `secure=true` para funcionar entre Vercel e Render.
- `CORS_ORIGIN` aceita múltiplas origens separadas por vírgula.
- Em produção, o build usa `prisma migrate deploy` (definido em `render.yaml`).
- A API de integrações possui rate limit dedicado para reduzir abuso.
- O backend gera logs estruturados JSON com `requestId`, `tenantId`, `userId` e latência.
