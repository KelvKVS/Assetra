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
   - `EVENT_BROKER_DRIVER` (`rabbitmq`)
   - `RABBITMQ_URL` (URL do broker, ex.: CloudAMQP)
   - `INTEGRATION_API_KEY`
5. Após deploy, valide:
   - `https://SEU-BACKEND.onrender.com/api/health`
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

## 2) Frontend na Vercel

1. No Vercel, clique em **Add New > Project** e selecione o mesmo repositório.
2. Em **Root Directory**, deixe a raiz do projeto (`assetra-app`).
3. Build/Output já está pronto via `vercel.json`.
4. Configure variáveis do frontend:
   - `VITE_API_BASE_URL=https://SEU-BACKEND.onrender.com/api`
   - `VITE_GOOGLE_CLIENT_ID=...apps.googleusercontent.com`
5. Faça deploy e abra o domínio gerado.

## 3) Google OAuth (produção)

No Google Cloud Console, no Client Web OAuth:
- **Authorized JavaScript origins**:
  - `https://seu-front.vercel.app`
- (Opcional) adicione domínio customizado se houver.

O mesmo `GOOGLE_CLIENT_ID` deve existir:
- no frontend (`VITE_GOOGLE_CLIENT_ID`)
- no backend (`GOOGLE_CLIENT_ID`)

## 4) Observações importantes

- A autenticação usa cookie `httpOnly`; em produção foi ajustada para `sameSite=none` e `secure=true` para funcionar entre Vercel e Render.
- `CORS_ORIGIN` aceita múltiplas origens separadas por vírgula.
- `prisma db push` roda no build do Render (definido em `render.yaml`).
