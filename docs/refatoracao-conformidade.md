# Refatoração de conformidade (Assetra)

Registro objetivo do que foi alterado para alinhar o código a boas práticas (camadas, validação, multi-tenant, segurança) e à documentação da seção 5.

## Backend

### Camada de utilitários (`backend/src/utils/`)

- **`AppError.js`**: erros HTTP com `statusCode` e mensagem controlada.
- **`asyncHandler.js`**: wrapper para handlers `async` sem try/catch repetido nas rotas.

### Contratos de entrada (`backend/src/schemas/`)

- **`index.js`**: esquemas **Zod** para login, usuário, ativo, status, manutenção, movimentação, aprovação e tarefa.

### Serviços (`backend/src/services/`)

Lógica extraída das rotas para:

- `authService.js`, `userService.js`, `assetService.js`, `maintenanceService.js`, `movementService.js`, `approvalService.js`, `taskService.js`.

### Rotas

- Rotas em `backend/src/routes/` ficaram **finas**: validação com Zod → chamada ao serviço → resposta JSON.

### Servidor e erros

- **`server.js`**: middleware global trata `AppError` com o status HTTP correto; demais erros retornam mensagem genérica em produção.

### Multi-tenant (usuários)

- Listagem, criação e remoção de usuários passam a respeitar **`tenantId` do JWT**, evitando vazamento de dados entre tenants.

### Seed e ambiente

- **`backend/seed.js`**: cria tenant padrão (`slug: 'default'`) e usuários com `tenantId`; emails alinhados às dicas de login (ex.: `admin@assetra.local`).
- **`backend/.env.example`**: variáveis `DATABASE_URL` e `MONGODB_URL`.
- Script na raiz: **`npm run db:seed`** → `node backend/seed.js`.

## Frontend

### Papéis e perfil

- **`src/utils/role.ts`**: mapeia `ADM` / `GESTOR` / `TECNICO` para o rótulo de perfil na UI.
- **`src/stores/auth.ts`**: usuário com `role` + `profile`; login via API preenche ambos; sessão antiga sem `role` recebe migração simples.
- **`src/views/LoginView.vue`**: textos de ajuda e mock com `tenantId` coerente.

### Componentes órfãos

- Removidos **`Topbar.vue`** e **`Sidebar.vue`**, que não eram usados no `App.vue` e dependiam de pacote não declarado (`lucide-vue-next`), o que poderia quebrar builds futuros.

## Documentação

- **`docs/documentacao-tecnica-secao5.md`**: árvore de pastas atualizada (`schemas/`, `services/`, `utils/`); tabela “Onde encontrar o quê” ampliada; nota sobre camada de serviços ajustada.
- Este arquivo: **`docs/refatoracao-conformidade.md`**.

## O que fazer após puxar estas mudanças

1. Configurar `.env` no backend com `DATABASE_URL` e `MONGODB_URL` válidos.
2. Aplicar schema Prisma (`migrate` ou `db push`, conforme o fluxo do grupo).
3. Rodar **`npm run db:seed`** para popular tenant e usuários de teste.
4. **`npm run build`** na raiz para validar TypeScript e bundle do frontend.

## Próximos passos sugeridos (backend)

- Resposta JSON padronizada (envelope `{ data, error }` ou similar).
- Testes automatizados nas rotas críticas (auth, tenant isolation).
- Continuar enriquecendo serviços com regras de domínio e DTOs de saída, conforme roteiro do professor.
