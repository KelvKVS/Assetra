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
   - Copie a URL AMQP para `RABBITMQ_URL` no Render.
   - Mantém o backend e worker no Render, e o broker externo.

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

1. **Não** commite `SMTP_PASS` no Git — só no painel do Render (Web + Worker).
2. `EMAIL_DEV_ETHEREAL` deve ser `false` (em produção não há Ethereal).
3. `FRONTEND_URL` = URL da Vercel (links de confirmação de cadastro).
4. Teste após deploy: cadastre um utilizador Google como ADM → reenviar convite → verificar caixa do colaborador.
5. Se falhar, veja os logs do serviço `assetra-backend` no Render (mensagem `BadCredentials` = senha de aplicação errada).

## 4) Google OAuth (produção)

No Google Cloud Console, no Client Web OAuth:
- **Authorized JavaScript origins**:
  - `https://seu-front.vercel.app`
- (Opcional) adicione domínio customizado se houver.

O mesmo `GOOGLE_CLIENT_ID` deve existir:
- no frontend (`VITE_GOOGLE_CLIENT_ID`)
- no backend (`GOOGLE_CLIENT_ID`)

## 5) Anexos / imagens (404 em produção)

- O backend guarda ficheiros em `uploads/` no disco do Render. Esse disco é **efémero**: após redeploy ou restart, ficheiros antigos deixam de existir.
- Anexos enviados em **desenvolvimento local** ficam no seu PC — o MongoDB de produção pode ainda referenciar esses nomes, mas o ficheiro **não está** no Render → `GET /api/uploads/...` devolve **404** (normal até reenviar o anexo em produção).
- Configure na Vercel: `VITE_API_UPLOAD_BASE_URL=https://SEU-BACKEND.onrender.com/api` e faça novo deploy do frontend.
- Para persistência real a longo prazo, planeie storage externo (S3, Cloudinary, etc.).

## 6) Observações importantes

- A autenticação usa cookie `httpOnly`; em produção foi ajustada para `sameSite=none` e `secure=true` para funcionar entre Vercel e Render.
- `CORS_ORIGIN` aceita múltiplas origens separadas por vírgula.
- Em produção, o build usa `prisma migrate deploy` (definido em `render.yaml`).
- A API de integrações possui rate limit dedicado para reduzir abuso.
- O backend gera logs estruturados JSON com `requestId`, `tenantId`, `userId` e latência.
