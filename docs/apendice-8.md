# 8. Apêndice

Esta secção reúne **materiais complementares de autoria do autor**, demasiado extensos para o corpo principal do relatório. Diferente do **anexo** (material de terceiros), o apêndice contém o que foi **produzido para o projeto**.

**Tipografia (DDE v1.7):** na versão final em Word ou LibreOffice, aplique **fonte monoespaçada, tamanho 10** a todos os blocos de código e logs abaixo. Em Markdown, os blocos ` ``` ` exportam-se normalmente como parágrafo monoespaçado; ajuste o tamanho da fonte no pós-processamento.

---

## Conformidade com o DDE v1.7 (checklist)

| Exigência do DDE | Onde está cumprida neste apêndice |
|------------------|-----------------------------------|
| Materiais complementares produzidos pelo aluno | Secções A–J; ficheiros em `docs/diagramas/` e `docs/scripts/`. |
| **Todo o código-fonte** na linguagem desenvolvida | **Inventário completo** em `docs/manifesto-codigo-fonte-assetra.txt` + **arquivo ZIP** gerado pelo script `docs/scripts/compactar-codigo-fonte-appendix.ps1` (inclui `src/`, `backend/src/`, configurações). O corpo de **cada** ficheiro listado integra esse ZIP; não se duplica aqui linha a linha por ser impraticável num único `.md`. |
| Scripts de criação e manipulação de base de dados | Secções B–F (`docker-compose`, Prisma, `seed.js`, `package.json`, `.env.example`). |
| Logs de comprovação de testes | Secção G (saída completa de `npm test`). |
| Scripts de marcação (LaTeX, PlantUML, etc.) | Secção H + ficheiros `docs/diagramas/*.puml` e `docs/diagramas/fragmento-appendix.tex`. |

**Referência de versão do código:** commit Git `2bf6226845bc3cd6549d4b2394048237fe798e0f` (atualizar na entrega se o repositório avançar).

---

## Apêndice A — Código-fonte integral (política de entrega)

1. **Inventário:** lista canónica de ficheiros-fonte e estáticos do projeto em `docs/manifesto-codigo-fonte-assetra.txt` (caminhos relativos à raiz `assetra-app/`).
2. **Arquivo compactado:** execute na raiz do projeto (PowerShell):

   `powershell -ExecutionPolicy Bypass -File docs/scripts/compactar-codigo-fonte-appendix.ps1`

   O script cria `Assetra-codigo-fonte-<data-hora>.zip` na **pasta imediatamente acima** da raiz do projeto (para o arquivo não ser incluído nele próprio durante a compactação). Anexe esse ZIP ao relatório PDF ou entregue em suporte digital, conforme regras da disciplina.
3. **Exclusões do ZIP:** `node_modules`, `.git`, `dist`, `backend/uploads`, `backend/.env`, `.qwen` — são regeneráveis, sensíveis ou irrelevantes para correção académica. O restante corresponde ao código e configurações desenvolvidos.

---

## Apêndice B — Orquestração local (Docker Compose)

Ficheiro `backend/docker-compose.yml` (na íntegra):

```yaml
# PostgreSQL local para desenvolvimento (Prisma).
# Uso: na pasta backend → docker compose up -d
# DATABASE_URL sugerida em .env.example (utilizador/senha postgres).

services:
  postgres:
    image: postgres:16-alpine
    container_name: assetra-postgres
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: assetra
    ports:
      - '5432:5432'
    volumes:
      - assetra_pgdata:/var/lib/postgresql/data
  rabbitmq:
    image: rabbitmq:3-management
    container_name: assetra-rabbitmq
    ports:
      - '5672:5672'
      - '15672:15672'
    environment:
      RABBITMQ_DEFAULT_USER: guest
      RABBITMQ_DEFAULT_PASS: guest

volumes:
  assetra_pgdata:
```

---

## Apêndice C — Esquema relacional (Prisma)

Ficheiro `backend/prisma/schema.prisma` (na íntegra):

```prisma
// Prisma schema para PostgreSQL (produção no Render).

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model Tenant {
  id        String   @id @default(uuid())
  name      String
  slug      String   @unique // Identificador único na URL (ex: 'empresa-a')
  active    Boolean  @default(true)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  users     User[]

  @@map("tenants")
}

/// Papel do utilizador. O serviço valida ADM | GESTOR | TECNICO.
model User {
  id           String   @id @default(uuid())
  name         String
  email        String
  passwordHash String
  role         String   @default("TECNICO")
  active       Boolean  @default(true)
  tenantId     String
  tenant       Tenant   @relation(fields: [tenantId], references: [id])
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  @@unique([tenantId, email])
  @@map("users")
}
```

---

## Apêndice D — Variáveis de ambiente (modelo, sem segredos)

Ficheiro `backend/.env.example` (na íntegra):

```env
PORT=3000
CORS_ORIGIN=http://localhost:5173,https://seu-frontend.vercel.app
JWT_SECRET=troque-por-um-segredo-forte-com-32-caracteres-ou-mais
GOOGLE_CLIENT_ID=seu-client-id.apps.googleusercontent.com

# Prisma — relacional (PostgreSQL)
DATABASE_URL="postgresql://usuario:senha@host:5432/assetra?schema=public"

# MongoDB (Mongoose — inventário, histórico, aprovações)
MONGODB_URL="mongodb+srv://usuario:senha@cluster.mongodb.net/assetra?retryWrites=true&w=majority"
RABBITMQ_URL="amqp://guest:guest@localhost:5672"
EVENT_BROKER_DRIVER="rabbitmq" # rabbitmq | kafka
KAFKA_BROKERS="localhost:9092"
KAFKA_CLIENT_ID="assetra-app"
KAFKA_TOPIC="assetra.events"
# Opção 1 (recomendada): chaves por tenant (formato tenantId:apiKey,tenantId2:apiKey2)
INTEGRATION_API_KEYS=""
# Opção 2 (legado): chave única + tenant fixo
INTEGRATION_API_KEY="troque-por-uma-chave-forte-para-integracoes"
INTEGRATION_TENANT_ID=""

NODE_ENV=development
```

---

## Apêndice E — Scripts npm e `package.json`

### Raiz — `package.json` (na íntegra)

```json
{
  "name": "assetra-app",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "dev": "concurrently \"npm:dev:frontend\" \"npm:dev:backend\"",
    "dev:frontend": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "dev:backend": "npm run dev --prefix backend",
    "db:seed": "node backend/seed.js",
    "db:push": "npm run prisma:push --prefix backend",
    "db:generate": "npm run prisma:generate --prefix backend",
    "setup:backend": "npm install --prefix backend",
    "docker:postgres": "docker compose -f backend/docker-compose.yml up -d"
  },
  "devDependencies": {
    "@vitejs/plugin-vue": "^6.0.5",
    "concurrently": "^9.2.1",
    "typescript": "~6.0.2",
    "vite": "^8.0.4"
  },
  "dependencies": {
    "axios": "^1.14.0",
    "lucide-vue-next": "^0.468.0",
    "pinia": "^3.0.4",
    "vue": "^3.5.32",
    "vue-router": "^5.0.4"
  }
}
```

### Backend — `backend/package.json` (na íntegra)

```json
{
  "name": "backend",
  "version": "1.0.0",
  "type": "module",
  "main": "src/server.js",
  "scripts": {
    "dev": "node --watch src/server.js",
    "start": "node src/server.js",
    "worker:events": "node src/workers/eventsWorker.js",
    "prisma:generate": "prisma generate",
    "prisma:push": "prisma db push",
    "prisma:migrate:deploy": "prisma migrate deploy",
    "seed": "node seed.js",
    "seed:safe": "node seed.js",
    "seed:if-enabled": "node scripts/seed-if-enabled.js",
    "test": "node --test"
  },
  "keywords": [],
  "author": "",
  "license": "ISC",
  "description": "",
  "dependencies": {
    "@prisma/client": "5.22.0",
    "amqplib": "^1.0.7",
    "bcryptjs": "^3.0.3",
    "cookie-parser": "^1.4.7",
    "cors": "^2.8.6",
    "dotenv": "^17.4.1",
    "express": "^5.2.1",
    "express-rate-limit": "^8.3.2",
    "google-auth-library": "^10.6.2",
    "helmet": "^8.1.0",
    "jsonwebtoken": "^9.0.3",
    "kafkajs": "^2.2.4",
    "mongoose": "^9.4.1",
    "multer": "^2.1.1",
    "zod": "^4.3.6"
  },
  "devDependencies": {
    "prisma": "5.22.0"
  }
}
```

---

## Apêndice F — `seed.js` (PostgreSQL + MongoDB de demonstração)

Ficheiro `backend/seed.js` (na íntegra — script de população / manipulação de dados de desenvolvimento):

```javascript
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import dotenv from 'dotenv'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.join(__dirname, '.env') })

import bcrypt from 'bcryptjs'
import mongoose from 'mongoose'
import prisma from './src/lib/prisma.js'
import Asset from './src/models/Asset.js'
import Movement from './src/models/Movement.js'
import Maintenance from './src/models/Maintenance.js'
import Approval from './src/models/Approval.js'

const shouldResetMongo = String(process.env.SEED_RESET_MONGO || '')
  .trim()
  .toLowerCase() === 'true'

async function seedMongo(tenantId) {
  const uri = process.env.MONGODB_URL || 'mongodb://127.0.0.1:27017/assetra'
  await mongoose.connect(uri)

  if (shouldResetMongo) {
    await Asset.deleteMany({ tenantId })
    await Movement.deleteMany({ tenantId })
    await Maintenance.deleteMany({ tenantId })
    await Approval.deleteMany({ tenantId })
    console.log('MongoDB: limpeza habilitada por SEED_RESET_MONGO=true.')
  }

  const assets = [
    {
      tenantId,
      tag: 'AST-001',
      description: 'Notebook Dell Latitude 5420',
      sector: 'Financeiro',
      status: 'Em uso',
      assignedTo: 'gestor@assetra.local',
      history: [],
    },
    {
      tenantId,
      tag: 'AST-002',
      description: 'Desktop Lenovo M75q',
      sector: 'RH',
      status: 'Disponível',
      assignedTo: 'tecnico@assetra.local',
      history: [],
    },
    {
      tenantId,
      tag: 'AST-003',
      description: 'Monitor LG 24"',
      sector: 'Compras',
      status: 'Em manutenção',
      assignedTo: 'gestor@assetra.local',
      history: [],
    },
  ]
  for (const asset of assets) {
    await Asset.updateOne({ tenantId: asset.tenantId, tag: asset.tag }, { $setOnInsert: asset }, { upsert: true })
  }

  const movementCount = await Movement.countDocuments({ tenantId })
  if (movementCount === 0) {
    await Movement.insertMany([
      {
        tenantId,
        assetTag: 'AST-001',
        origin: 'Estoque',
        destination: 'Financeiro',
        responsible: 'Gestor Assetra',
        occurredAt: new Date(2026, 3, 8),
      },
      {
        tenantId,
        assetTag: 'AST-002',
        origin: 'Compras',
        destination: 'TI',
        responsible: 'Técnico Assetra',
        occurredAt: new Date(2026, 3, 2),
      },
    ])
  }

  const maintenanceCount = await Maintenance.countDocuments({ tenantId })
  if (maintenanceCount === 0) {
    await Maintenance.insertMany([
      {
        tenantId,
        assetTag: 'AST-003',
        type: 'Corretiva',
        description: 'Falha intermitente de vídeo durante o uso',
        priority: 'Alta',
        status: 'Em andamento',
        openingDate: new Date(2026, 3, 10),
      },
      {
        tenantId,
        assetTag: 'AST-002',
        type: 'Preventiva',
        description: 'Rotina de verificação e limpeza programada',
        priority: 'Média',
        status: 'Aberta',
        openingDate: new Date(2026, 3, 5),
      },
    ])
  }

  const approvalCount = await Approval.countDocuments({ tenantId })
  if (approvalCount === 0) {
    await Approval.insertMany([
      {
        tenantId,
        type: 'Movimentação',
        assetTag: 'AST-001',
        description: 'Transferência para Financeiro',
        status: 'Pendente',
      },
      {
        tenantId,
        type: 'Manutenção',
        assetTag: 'AST-003',
        description: 'Troca de placa de vídeo',
        status: 'Pendente',
      },
      {
        tenantId,
        type: 'Movimentação',
        assetTag: 'AST-002',
        description: 'Retorno para Estoque',
        status: 'Aprovada',
        decidedAt: new Date(),
      },
    ])
  }

  await mongoose.disconnect()
  console.log('MongoDB: seed seguro concluído (sem sobrescrever dados existentes).')
}

async function seed() {
  const tenant = await prisma.tenant.upsert({
    where: { slug: 'default' },
    update: { name: 'Organização Demo' },
    create: {
      name: 'Organização Demo',
      slug: 'default',
    },
  })

  const users = [
    {
      email: 'admin@assetra.local',
      name: 'Administrador Assetra',
      password: 'senha123',
      role: 'ADM',
    },
    {
      email: 'gestor@assetra.local',
      name: 'Gestor Assetra',
      password: 'senha123',
      role: 'GESTOR',
    },
    {
      email: 'tecnico@assetra.local',
      name: 'Técnico Assetra',
      password: 'senha123',
      role: 'TECNICO',
    },
  ]

  for (const user of users) {
    const passwordHash = await bcrypt.hash(user.password, 10)
    await prisma.user.upsert({
      where: {
        tenantId_email: {
          tenantId: tenant.id,
          email: user.email,
        },
      },
      update: {
        role: user.role,
        name: user.name,
        passwordHash,
        tenantId: tenant.id,
        active: true,
      },
      create: {
        email: user.email,
        name: user.name,
        passwordHash,
        role: user.role,
        tenantId: tenant.id,
        active: true,
      },
    })
    console.log(`Usuário garantido: ${user.name} (${user.role})`)
  }

  console.log(`Tenant: ${tenant.slug} (${tenant.id})`)

  const tenantAcme = await prisma.tenant.upsert({
    where: { slug: 'acme' },
    update: { name: 'Organização Acme' },
    create: {
      name: 'Organização Acme',
      slug: 'acme',
    },
  })

  const acmeAdmin = {
    email: 'admin@assetra.local',
    name: 'Administrador Acme',
    password: 'AcmeDemo@12345',
    role: 'ADM',
  }
  const acmeHash = await bcrypt.hash(acmeAdmin.password, 10)
  await prisma.user.upsert({
    where: {
      tenantId_email: {
        tenantId: tenantAcme.id,
        email: acmeAdmin.email,
      },
    },
    update: {
      role: acmeAdmin.role,
      name: acmeAdmin.name,
      passwordHash: acmeHash,
      tenantId: tenantAcme.id,
      active: true,
    },
    create: {
      email: acmeAdmin.email,
      name: acmeAdmin.name,
      passwordHash: acmeHash,
      role: acmeAdmin.role,
      tenantId: tenantAcme.id,
      active: true,
    },
  })
  console.log(`Tenant secundário (multitenant demo): ${tenantAcme.slug} — admin@assetra.local com senha AcmeDemo@12345`)

  try {
    await seedMongo(tenant.id)
  } catch (e) {
    console.warn('MongoDB seed ignorado (serviço indisponível ou URL inválida):', e.message)
  }
}

seed()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
```

### `backend/scripts/seed-if-enabled.js` (condicional em deploy)

```javascript
import { spawn } from 'node:child_process'

const enabled = String(process.env.SEED_ON_DEPLOY || '')
  .trim()
  .toLowerCase() === 'true'

if (!enabled) {
  console.log('Seed desativado (SEED_ON_DEPLOY != true). Pulando seed.')
  process.exit(0)
}

console.log('Seed ativado por SEED_ON_DEPLOY=true. Executando seed seguro...')

const child = spawn(process.execPath, ['seed.js'], {
  stdio: 'inherit',
  env: process.env,
})

child.on('exit', (code) => {
  process.exit(code ?? 1)
})
```

### Exemplo de ponto de entrada do frontend (`src/main.ts`, na íntegra)

Os restantes `.vue` e `.ts` do frontend constam do inventário e do ZIP; segue o arranque da aplicação:

```typescript
import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import './styles.css'

const app = createApp(App)
app.use(createPinia())
app.use(router)
app.mount('#app')
```

---

## Apêndice G — Log de comprovação de testes automatizados

Execução: pasta `backend/`, comando `npm test` (motor `node --test`). Data da captura: **14 maio 2026**. Resultado: **9 testes passaram, 0 falhas.** (Os tempos em `duration_ms` variam consoante a máquina.)

```
> backend@1.0.0 test
> node --test

TAP version 13
# Subtest: integração por tenant: aceita chave válida e define integrationTenantId
ok 1 - integração por tenant: aceita chave válida e define integrationTenantId
  ---
  duration_ms: 1.9345
  type: 'test'
  ...
# Subtest: integração por tenant: rejeita tenantId ausente
ok 2 - integração por tenant: rejeita tenantId ausente
  ---
  duration_ms: 0.2885
  type: 'test'
  ...
# Subtest: modo legado: valida key e tenant fixo
ok 3 - modo legado: valida key e tenant fixo
  ---
  duration_ms: 0.2284
  type: 'test'
  ...
# Subtest: modo legado: rejeita tenant diferente do fixo
ok 4 - modo legado: rejeita tenant diferente do fixo
  ---
  duration_ms: 0.1834
  type: 'test'
  ...
# Subtest: login com slug e tenant inexistente → 401
ok 5 - login com slug e tenant inexistente → 401
  ---
  duration_ms: 1.4504
  type: 'test'
  ...
# Subtest: login sem slug e dois utilizadores ativos com o mesmo e-mail → 400
ok 6 - login sem slug e dois utilizadores ativos com o mesmo e-mail → 400
  ---
  duration_ms: 185.9075
  type: 'test'
  ...
# Subtest: login sem slug e um utilizador → token e tenant
ok 7 - login sem slug e um utilizador → token e tenant
  ---
  duration_ms: 231.7539
  type: 'test'
  ...
# Subtest: login com slug válido → utilizador desse tenant
ok 8 - login com slug válido → utilizador desse tenant
  ---
  duration_ms: 218.464
  type: 'test'
  ...
# Subtest: password incorreta → 401
ok 9 - password incorreta → 401
  ---
  duration_ms: 166.3457
  type: 'test'
  ...
1..9
# tests 9
# suites 0
# pass 9
# fail 0
# cancelled 0
# skipped 0
# todo 0
# duration_ms 1115.5056
```

---

## Apêndice H — Scripts de marcação (PlantUML e LaTeX)

| Ficheiro | Descrição |
|----------|-----------|
| `docs/diagramas/arquitetura-assetra.puml` | Diagrama PlantUML de visão lógica (camadas e bases de dados). Gerar imagem: `plantuml docs/diagramas/arquitetura-assetra.puml` (com PlantUML instalado). |
| `docs/diagramas/fragmento-appendix.tex` | Fragmento LaTeX com `\verbatim` apontando para estes artefactos; pode ser `\input{}` no relatório se o curso usar LaTeX. |

Os diagramas UML/BPMN detalhados do DEM continuam no corpo do relatório como figuras exportadas; o `.puml` acima é **marcação autoral** resumida para o apêndice, alinhada à arquitetura descrita na documentação técnica.

---

## Apêndice I — Manual do utilizador e documentação auxiliar

- Manual: `docs/manual-do-usuario-6.md` (e `docs/manual-usuario-imagens/`, se aplicável).
- Outros documentos de apoio (opcionais na entrega): `docs/documentacao-tecnica-5.md`, guias de deploy, etc.

---

## Apêndice J — Diagramas do DEM (figuras no relatório principal)

Wireframes, mockups, fluxo de navegação, diagramas de casos de uso, classes, sequência, estados, componentes, arquitetura e BPMN estão no PDF principal do relatório como **figuras**. Os ficheiros de exportação (PNG/PDF) utilizados na composição do relatório podem ser arquivados junto do ZIP ou numa pasta `docs/figuras-exportadas/` se a disciplina exigir prova de autoria dos gráficos.
