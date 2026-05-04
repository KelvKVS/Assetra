# 5 Documentação técnica — Assetra

Este texto atende ao roteiro solicitado para a **documentação técnica** (macroarquitetura, tecnologias, padrões, boas práticas, infraestrutura, API e repositório).  
**Referência ao diagrama:** cite no trabalho acadêmico o **Diagrama de Arquitetura** constante no **DEM** (Documento de Especificação de Modelagem), seção indicada no sumário como **3.3.4**, como ilustração oficial da macroestrutura aqui descrita.

> **Link do repositório (preencher):** `https://github.com/SEU_USUARIO/assetra-app` (substituir pelo URL real do GitHub/GitLab.)

---

## 5.1 Arquitetura do sistema

### Macroestrutura

O **Assetra** é organizado como uma **aplicação web cliente-servidor** com duas bases de dados, exposta por uma **API REST** única (processo Node.js) e consumida por um **SPA (Single Page Application)** no navegador.

**Modelo de arquitetura adotado:** **monólito modular em camadas** (não é um conjunto de microserviços independentes). Todo o backend roda num **único serviço Express**; a separação de responsabilidades é feita por **módulos de rotas**, **middlewares**, **modelos de dados** e **bibliotecas de acesso** (Prisma e Mongoose), o que facilita evolução futura sem fragmentar deploy.

Em termos de **dados**, o projeto adota uma **separação poliglota** alinhada ao `GEMINI.md`:

| Camada lógica | Tecnologia | Responsabilidade típica |
|---------------|------------|---------------------------|
| Identidade / multi-tenant (SQL) | **PostgreSQL** via **Prisma** | Usuários, tenants, papéis (`Role`), credenciais. |
| Domínio operacional rico (NoSQL) | **MongoDB** via **Mongoose** | Inventário de ativos, histórico embutido no documento, manutenções, movimentações etc. (conforme rotas e modelos). |

O **frontend** consome a API com **HTTPS no desenvolvimento via proxy** (`/api` → `localhost:3000`), enviando cookies de sessão (`withCredentials` no Axios).

### 5.1.1 Segmentação da arquitetura (divisões lógicas)

Abaixo, a correspondência com uma visão **em camadas** (inspirada em DDD/Clean Architecture, **sem** implementação formal completa de domínio isolado):

| Camada / pacote | Onde está no código | O que faz |
|-----------------|---------------------|-----------|
| **Apresentação (HTTP)** | `backend/src/routes/*.js` | Expõe endpoints REST, valida entrada em parte dos fluxos, chama persistência e devolve JSON. |
| **Aplicação / orquestração** | Mesmas rotas + middlewares | Orquestra autenticação, autorização por papel e filtro por `tenantId`. |
| **Infraestrutura** | `backend/src/lib/prisma.js`, `backend/src/lib/mongoose.js`, `backend/src/models/*` | Conexões e acesso a PostgreSQL e MongoDB. |
| **Segurança transversal** | `backend/src/middlewares/auth.js`, `helmet`, `cors`, `express-rate-limit` | JWT em cookie HttpOnly, CORS, limitação de tentativas de login. |
| **Cliente (SPA)** | `src/` (Vue) | Rotas, telas, estado (Pinia), chamadas HTTP. |

**Comunicação entre camadas:** as rotas dependem de **Prisma** e **Mongoose** como “portas” de saída para o armazenamento; o **JWT** carrega `sub`, `role` e `tenantId` para que cada requisição autorizada opere **sempre no escopo do tenant** do usuário (ex.: `Asset.find({ tenantId: req.user.tenantId })`).

> **Observação honesta para o relatório:** a camada de **domínio pura** (entidades agnósticas de framework) ainda pode ser extraída para `services/` no futuro, como previsto no `GEMINI.md`; hoje parte da regra de negócio reside nas **rotas e nos modelos**.

---

## 5.2 Tecnologias utilizadas

### 5.2.1 Frontend

| Tecnologia | Versão (package.json) | Uso |
|------------|------------------------|-----|
| **Vue** | `^3.5.32` | Framework reativo (Composition API / `<script setup>`). |
| **Vue Router** | `^5.0.4` | Navegação SPA e guards de autenticação. |
| **Pinia** | `^3.0.4` | Estado global (autenticação, dados mock locais). |
| **Axios** | `^1.14.0` | Cliente HTTP com `withCredentials` para cookies. |
| **TypeScript** | `~6.0.2` (dev) | Tipagem no frontend. |
| **Vite** | `^8.0.4` | Build e servidor de desenvolvimento. |
| **@vitejs/plugin-vue** | `^6.0.5` | Integração Vue + Vite. |
| **CSS** | — | Estilos globais em `src/styles.css` (tema claro/escuro, layout corporativo). |

**Estilização:** não há Tailwind/Bootstrap no `package.json`; o visual é **CSS próprio** (variáveis CSS, componentes leves).

### 5.2.2 Backend

| Tecnologia | Versão | Uso |
|------------|--------|-----|
| **Node.js** | (runtime; ex.: 18 LTS ou superior recomendado) | Execução do servidor. |
| **Express** | `^5.2.1` | Servidor HTTP e roteamento REST. |
| **dotenv** | `^17.4.1` | Carregamento de variáveis de ambiente. |
| **jsonwebtoken** | `^9.0.3` | Emissão e verificação de JWT. |
| **bcryptjs** | `^3.0.3` | Hash e comparação de senha. |
| **cookie-parser** | `^1.4.7` | Leitura do cookie de sessão. |
| **cors** | `^2.8.6` | Política CORS para o origin do frontend. |
| **helmet** | `^8.1.0` | Cabeçalhos HTTP de segurança. |
| **express-rate-limit** | `^8.3.2` | Limite de requisições na rota de login. |
| **zod** | `^4.3.6` | Validação de esquema (ex.: corpo do login). |

### 5.2.3 Banco de dados

| SGBD | Uso no projeto | ORM / driver |
|------|----------------|--------------|
| **PostgreSQL** | Dados relacionais: tenants, usuários, perfis. | **Prisma** (`@prisma/client` e `prisma` CLI `^7.7.0`) — schema em `backend/prisma/schema.prisma`. |
| **MongoDB** | Dados de inventário e documentos flexíveis (ex.: ativos com `history`). | **Mongoose** `^9.4.1` — modelos em `backend/src/models/`. |

Variáveis típicas: `DATABASE_URL` (Prisma), `MONGODB_URL` (conexão Mongo; padrão em código `mongodb://localhost:27017/assetra` se ausente).

### 5.2.4 Ferramentas de apoio

| Ferramenta | Função |
|-------------|--------|
| **Git** | Controle de versão do código-fonte. |
| **npm** | Instalação de dependências e scripts (`npm run dev`, `build`). |
| **concurrently** | Execução simultânea de frontend e backend no mesmo terminal. |
| **Editor (VS Code / Cursor)** | Desenvolvimento e depuração. |
| **Navegador + DevTools** | Teste de UI, cookies, rede. |
| **Ferramentas de IA (opcional)** | Apoio a refatoração e documentação (mencionar se utilizado na disciplina). |
| **Postman / Insomnia (opcional)** | Testes manuais da API (`GET /api/health`, `POST /api/auth/login`, etc.). |

*(Docker não está obrigatoriamente versionado no repositório analisado; pode ser citado se você adicionar `Dockerfile`/`compose`.)*

### 5.2.5 Padrões adotados (design patterns)

| Padrão | Como aparece no Assetra |
|--------|-------------------------|
| **Middleware em cadeia** | Express aplica `helmet`, `cors`, `json`, `cookieParser`, depois rotas; `authMiddleware` e `authorize(...)` encadeiam autenticação e RBAC. |
| **Singleton (Prisma)** | `backend/src/lib/prisma.js` exporta uma única instância de `PrismaClient`, evitando múltiplas conexões ao PostgreSQL. |
| **Active Record (Mongoose)** | Modelos como `Asset` encapsulam persistência e validação de documento (`save`, `find`, `findOneAndDelete`). |
| **Higher-Order Function (autorização)** | `authorize(['ADM', 'GESTOR'])` retorna um middleware configurado por lista de papéis. |
| **Schema validation** | **Zod** define contratos de entrada (`safeParse`) antes de acessar o banco no login. |

---

## 5.2.6 Boas práticas e convenções

### SOLID (exemplos concretos)

- **SRP (Responsabilidade única):** arquivos de rota tendem a concentrar um **recurso** (`assets.js`, `auth.js`), e middlewares isolam **autenticação** e **autorização** em `middlewares/auth.js`.  
- **OCP (Extensão):** novos endpoints podem ser adicionados com novos routers sem alterar o núcleo do `server.js`, apenas registrando `app.use('/api/...', novaRota)`.  
- **DIP (Inversão de dependência):** em JavaScript o DIP “clássico” (interfaces + injeção) é menos explícito que em C#/Java; aqui a **inversão** é parcial: o domínio de ativos **não** usa SQL direto na rota, mas sim o **modelo Mongoose**, e usuários usam **Prisma** — ou seja, a regra “quem persiste o quê” está separada por tecnologia. Para aprofundar no relatório, pode-se planejar **interfaces de repositório** em módulos futuros (`services` + `repositories`), como sugerido no `GEMINI.md`.

### Clean Code

- Nomes de funções e arquivos **descritivos** (`authMiddleware`, `authorize`, `connectNoSQL`).  
- Funções de middleware **curtas** com fluxo linear (validar → responder ou `next()`).  
- Evitar comentários redundantes; o código usa mensagens de erro **significativas** para o cliente (`Credenciais inválidas`, `Acesso negado`).

### DTOs (Data Transfer Objects)

- **Com Zod:** o corpo do login é validado e transformado em objeto confiável (`parsed.data`) antes de consultar o banco — atua como **DTO de entrada**.  
- **Limitação atual:** em algumas rotas (ex.: criação de ativo) o corpo pode ser repassado com `...req.body`; o ideal documentado para evolução é **validar com Zod** e montar um objeto explícito antes de `new Asset({...})`, evitando expor campos inesperados.

### Tratamento de erros e exceções

- **Handler global** em `server.js`: `app.use((error, _req, res, _next) => { ... res.status(500).json({ message: 'Erro interno do servidor.' }) })` — o usuário final **não** recebe stack trace.  
- Rotas específicas usam `try/catch` ou retornos antecipados com `res.status(4xx).json({ message: '...' })`.

### Versionamento semântico e Git

- O `package.json` raiz usa `"version": "0.0.0"` como placeholder.  
- **Recomendação para o relatório:** adotar tags `v1.0.0` no Git ao entregar marcos; commits no imperativo e claros (`feat: adiciona filtro por tenant em ativos`).

### Padrão de resposta da API

- **Não há envelope fixo** tipo `{ data, error, message }` em todos os endpoints.  
- Padrão observado: **sucesso** → corpo JSON direto (ex.: lista de ativos, objeto criado); **erro** → `{ message: '...' }` com código HTTP adequado (`400`, `401`, `403`, `404`, `500`).  
- **Sugestão de melhoria:** padronizar `{ data, error: null }` / `{ data: null, error: { code, message } }` em versões futuras.

### Injeção de dependência

- **Manual:** `import prisma from '../lib/prisma.js'` e `import Asset from '../models/Asset.js'`. Não há container IoC (ex.: Inversify/NestJS).

### Mapeamento de objetos

- **Implícito:** Prisma e Mongoose devolvem objetos JSON-serializáveis; não há biblioteca tipo `class-transformer` no trecho analisado.

### Segurança básica

- **Variáveis de ambiente:** `JWT_SECRET`, `PORT`, `CORS_ORIGIN`; Prisma usa `DATABASE_URL`; Mongo usa `MONGODB_URL` (ver `backend/.env.example` e código).  
- **Senha:** armazenada como **hash** (`bcryptjs`), nunca em texto plano.  
- **JWT em cookie HttpOnly** reduz risco de roubo via XSS no cliente.  
- **Helmet** e **rate limit** no login reforçam superfície de ataque.

---

## 5.2.7 Requisitos de infraestrutura

### Desenvolvimento

| Item | Requisito mínimo sugerido |
|------|---------------------------|
| SO | Windows 10/11, Linux ou macOS |
| Node.js | **18.x ou superior** (LTS recomendado; compatível com Vite 8 e Express 5) |
| npm | Versão acompanha o Node |
| RAM | **4 GB** livres (confortável com IDE + Mongo + Postgres) |
| Disco | Espaço para `node_modules` e bases locais |
| Serviços | **PostgreSQL** acessível pela `DATABASE_URL`; **MongoDB** em `localhost:27017` ou URI remota |

### Execução

- Frontend: `npm run dev` (Vite em `http://localhost:5173`).  
- Backend: integrado ao mesmo comando ou `npm run dev:backend` (porta **3000** por padrão).  
- Healthcheck: `GET http://localhost:3000/api/health` → `{ "status": "ok" }`.

---

## 5.2.8 APIs e integrações

| Serviço externo | Uso |
|-----------------|-----|
| **PostgreSQL** | Persistência relacional (Prisma). |
| **MongoDB** | Persistência de documentos (Mongoose). |

Não há, no núcleo descrito, integração com terceiros tipo **mapas, pagamentos ou e-mail transacional**; se forem adicionados, documentar aqui o provedor, variáveis de ambiente e fluxo (ex.: SMTP para recuperação de senha).

---

## 5.2.9 Caracterização da API

- **Estilo:** **REST** sobre **HTTP/JSON**.  
- **Base URL (dev):** `http://localhost:3000/api` (via proxy `/api` no Vite).  
- **Autenticação:** **cookie HttpOnly** com JWT após `POST /api/auth/login`.  
- **Autorização:** papéis `ADM`, `GESTOR`, `TECNICO` (enum Prisma `Role`) checados por `authorize([...])`.  
- **Multi-tenant:** `tenantId` no token e filtros nas consultas Mongo.

---

## 5.3 Repositório e código-fonte

### 1) Link do repositório

Preencher com o URL real do GitHub/GitLab do grupo ou do aluno.

### 2) Estrutura de pastas (árvore simplificada)

```
assetra-app/
├── backend/
│   ├── prisma/
│   │   └── schema.prisma          # Modelo relacional (Tenant, User, Role)
│   ├── src/
│   │   ├── lib/
│   │   │   ├── prisma.js          # Cliente Prisma (singleton)
│   │   │   └── mongoose.js        # Conexão MongoDB
│   │   ├── middlewares/
│   │   │   └── auth.js            # JWT + RBAC
│   │   ├── models/
│   │   │   └── Asset.js           # Schema Mongoose (exemplo)
│   │   ├── schemas/
│   │   │   └── index.js           # Validação Zod (DTOs de entrada)
│   │   ├── services/
│   │   │   ├── authService.js
│   │   │   ├── userService.js
│   │   │   ├── assetService.js
│   │   │   ├── maintenanceService.js
│   │   │   ├── movementService.js
│   │   │   ├── approvalService.js
│   │   │   └── taskService.js
│   │   ├── utils/
│   │   │   ├── AppError.js
│   │   │   └── asyncHandler.js
│   │   ├── routes/
│   │   │   ├── auth.js
│   │   │   ├── assets.js
│   │   │   ├── users.js
│   │   │   ├── maintenances.js
│   │   │   ├── movements.js
│   │   │   ├── approvals.js
│   │   │   └── tasks.js
│   │   └── server.js              # Bootstrap Express + rotas
│   ├── .env.example
│   └── package.json
├── src/                            # Frontend Vue
│   ├── router/
│   ├── services/
│   ├── stores/
│   ├── views/
│   ├── App.vue
│   ├── main.ts
│   └── styles.css
├── docs/                           # Documentação auxiliar do projeto
├── public/
├── index.html
├── vite.config.ts
└── package.json
```

### 3) Onde encontrar o quê

| Pasta / arquivo | Conteúdo principal |
|-----------------|-------------------|
| `backend/src/routes/` | **Endpoints REST** (camada fina: validação + chamada a serviços). |
| `backend/src/services/` | **Regras de negócio** e orquestração de persistência. |
| `backend/src/schemas/` | **Contratos de entrada** (Zod / DTOs). |
| `backend/src/utils/` | **AppError**, **asyncHandler** e utilitários HTTP. |
| `backend/src/middlewares/` | **Autenticação e autorização** reutilizáveis. |
| `backend/src/models/` | **Modelos Mongoose** (domínio NoSQL). |
| `backend/prisma/` | **Schema SQL** e migrações (quando aplicadas). |
| `src/views/` | **Telas** Vue do protótipo e integrações visuais. |
| `src/stores/` | **Estado** Pinia (auth, mock local). |
| `src/router/` | **Rotas** e guards do SPA. |
| `docs/` | Textos de apoio (este arquivo, checklist, etc.). |

---

## Notas finais para colar no relatório Word

1. Inserir **figura** do Diagrama de Arquitetura (DEM 3.3.4) imediatamente após a seção 5.1.  
2. Copiar tabelas de versões (5.2.1–5.2.3) para o documento institucional, ajustando versões se o `package-lock.json` divergir após `npm install`.  
3. A **camada de serviços** (`backend/src/services/`) está criada; evoluir extraindo mais regras das rotas conforme novos casos de uso.
