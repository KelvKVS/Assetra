<div align="center">

<img src="public/logotipo.png" alt="Assetra" width="120" />

# Perguntas frequentes

**Assetra** — gestão corporativa de ativos de tecnologia

Documento de referência para **utilizadores**, **avaliadores de TCC** e **equipas técnicas**.

<br />

[![Vue](https://img.shields.io/badge/Frontend-Vue%203-3b82f6?style=flat-square&logo=vuedotjs&logoColor=white)](https://vuejs.org/)
[![Node](https://img.shields.io/badge/Backend-Express%205-339933?style=flat-square&logo=nodedotjs&logoColor=white)](https://nodejs.org/)
[![Docs](https://img.shields.io/badge/README-Visão%20geral-64748b?style=flat-square)](README.md)
[![Deploy](https://img.shields.io/badge/Deploy-Vercel%20%2B%20Render-64748b?style=flat-square)](docs/deploy-vercel-render.md)

<br />

[Projeto e TCC](#1-projeto-e-contexto-acadêmico-tcc) ·
[Primeiros passos](#2-primeiros-passos-e-ambientes) ·
[Perfis e governança](#3-perfis-permissões-e-governança) ·
[Solicitações](#4-solicitações-aprovações-e-notificações) ·
[Ativos e manutenções](#5-ativos-movimentações-e-manutenções) ·
[Conta e segurança](#6-conta-autenticação-e-segurança) ·
[Técnico e deploy](#7-aspectos-técnicos-deploy-e-operação) ·
[Suporte](#8-suporte-e-contribuição)

</div>

---

## Como usar este documento

| Público | Secções recomendadas |
|---------|----------------------|
| **Utilizador final** (funcionário, técnico, gestor) | 2, 3, 4, 5, 6 |
| **Banca / orientador (TCC)** | 1, 3, 4, 7 |
| **DevOps / desenvolvimento** | 2, 6, 7 |

Respostas foram escritas para serem **autossuficientes**: não é necessário abrir o código para entender o comportamento do sistema. Para detalhe operacional passo a passo, consulte também o [manual do utilizador](docs/manual-do-usuario-6.md).

**Documentação complementar:** [README.md](README.md) · [Deploy Vercel + Render](docs/deploy-vercel-render.md) · [Padrões de arquitetura](docs/architecture-patterns.md) · [Google Login](docs/configurar-google-login.md) · [Brevo / e-mail](docs/configurar-brevo.md)

---

## 1. Projeto e contexto acadêmico (TCC)

### 1. O que é o Assetra?

O **Assetra** é uma plataforma web **multi-tenant** voltada à **gestão corporativa do ciclo de vida de ativos de TI** — notebooks, monitores, periféricos e equipamentos similares. O sistema unifica, num único fluxo digital:

- **Inventário** com identificação por tag, estados e responsável atual;
- **Movimentações** (transferência de custódia entre colaboradores) com trilha de auditoria;
- **Ordens de serviço (OS)** de manutenção, desde a abertura até à validação pelo gestor;
- **Aprovações formais** em cadeia (técnico/funcionário → gestor; gestor → administrador);
- **Notificações** por e-mail e painéis por perfil (RBAC).

O objetivo não é substituir um ERP completo, mas oferecer **governança e rastreabilidade** sobre o parque de ativos de TI, com interface moderna e API preparada para integrações futuras.

---

### 2. Qual problema de negócio o sistema resolve?

Em muitas organizações, o controlo de ativos ainda depende de **planilhas**, mensagens informais ou registos dispersos. Isso gera:

- Incerteza sobre **quem detém** cada equipamento;
- Atrasos na **manutenção** por falta de visibilidade da fila técnica;
- Transferências sem **aprovação documentada**;
- Dificuldade em **auditar** decisões passadas (quem aprovou, quando, com que evidências).

O Assetra formaliza esses processos: toda transferência relevante passa por **solicitação + aprovação**; toda OS crítica passa por **abertura aprovada**, execução técnica e **validação de conclusão**. O histórico fica consultável nas vistas de Movimentações, Manutenções, Aprovações e Solicitações.

---

### 3. Quem é o público-alvo?

| Segmento | Benefício |
|----------|-----------|
| **Equipas de TI / facilities** | Inventário centralizado, fila de execução, prazos e adiamentos |
| **Gestores** | Painel de aprovações, relatórios, atribuição em lote |
| **Colaboradores** | Visão de *Meus ativos* e canal único de solicitações |
| **Administradores** | Multi-tenant, utilizadores, integrações via API key |
| **Academia (TCC)** | Caso de estudo full-stack com arquitetura em camadas e mensageria |

---

### 4. O Assetra é multi-tenant? Como funciona o isolamento?

**Sim.** Cada **organização** (tenant) possui um identificador único (`slug`) e conjunto isolado de:

- Utilizadores e credenciais (PostgreSQL / Prisma);
- Ativos, manutenções, aprovações e anexos (MongoDB);
- Chaves de API de integração e configurações financeiras associadas ao tenant.

Um utilizador autenticado **nunca acede** a dados de outra organização: o `tenantId` é validado em middleware e serviços. Isto permite demonstrar o produto a várias “empresas demo” no mesmo ambiente de hospedagem sem mistura de dados — ponto relevante para avaliação de TCC e para cenários SaaS futuros.

---

### 5. Quais tecnologias compõem a stack?

<table>
<tr><th>Camada</th><th>Tecnologias</th><th>Papel</th></tr>
<tr><td><strong>Interface</strong></td><td>Vue 3, TypeScript, Vue Router, Pinia, Vite, Axios</td><td>SPA responsiva, tema claro/escuro, consumo da API REST</td></tr>
<tr><td><strong>API</strong></td><td>Node.js, Express 5, Zod, Helmet, JWT</td><td>Regras de negócio, validação, RBAC, uploads</td></tr>
<tr><td><strong>Relacional</strong></td><td>Prisma, PostgreSQL (prod) / SQLite (dev)</td><td>Tenants, utilizadores, hashes, integrações</td></tr>
<tr><td><strong>Documentos</strong></td><td>Mongoose, MongoDB</td><td>Ativos, OS, aprovações, metadados de anexos</td></tr>
<tr><td><strong>Anexos</strong></td><td>GridFS (MongoDB) em produção</td><td>Persistência de ficheiros além do disco efémero do Render</td></tr>
<tr><td><strong>Mensageria</strong></td><td>RabbitMQ + worker</td><td>E-mails e eventos de domínio de forma assíncrona</td></tr>
<tr><td><strong>Deploy</strong></td><td>Vercel + Render</td><td>Frontend com proxy <code>/api</code>; backend e worker separados</td></tr>
</table>

Diagrama resumido no [README — Arquitetura](README.md#arquitetura).

---

### 6. Por que PostgreSQL e MongoDB no mesmo projeto?

A separação é **intencional** e alinhada ao tipo de dado:

- **PostgreSQL** concentra entidades **relacionais e sensíveis**: tenants, utilizadores, palavras-passe (hash), papéis, vínculos de convite, integrações financeiras. Transações e constraints garantem integridade referencial.
- **MongoDB** armazena documentos **evolutivos e de alto volume**: ativos com campos flexíveis, histórico de manutenções, registos de aprovação com anexos embutidos por referência, auditoria operacional.

Em desenvolvimento, o PostgreSQL pode ser substituído por **SQLite** (`file:./dev.db`) para reduzir fricção na máquina local. Em produção (Render), usa-se **PostgreSQL gerido**. Esta dualidade é argumento sólido em defesa de TCC: *polyglot persistence* com responsabilidades claras por serviço.

---

### 7. O projeto segue padrões de arquitetura de software?

Sim. O backend organiza-se em **rotas finas** + **serviços de domínio** (`approvalService`, `maintenanceService`, `assetService`, etc.), validação de entrada com **Zod**, erros tipados (`AppError`) e publicação de eventos via **event bus** (RabbitMQ em produção). O frontend separa **views**, **stores Pinia** e **composables** reutilizáveis.

Princípios documentados: [docs/architecture-patterns.md](docs/architecture-patterns.md) — inclui RBAC, idempotência em decisões de aprovação, enriquecimento de DTOs e boas práticas de Clean Code aplicadas ao contexto do projeto.

---

### 8. O sistema está preparado para produção?

**Sim, com ressalvas documentadas.** Existe blueprint `render.yaml`, proxy na Vercel (`vercel.json`) e guia [deploy-vercel-render.md](docs/deploy-vercel-render.md).

| Tópico | Comportamento em produção |
|---------|---------------------------|
| **Anexos** | Disco local no Render é **efémero**; anexos novos vão para **GridFS**. Migração: `npm run uploads:migrate-gridfs` |
| **E-mail** | SMTP direto no Render free costuma falhar; usar **Brevo** ou **Resend** (HTTPS) |
| **Cold start** | Plano free do Render pode demorar na primeira requisição |
| **CORS / cookies** | `CORS_ORIGIN` e `FRONTEND_URL` devem coincidir com o domínio Vercel |

Instâncias de demonstração (ex.: frontend na Vercel, API no Render) seguem essa topologia; variáveis sensíveis **nunca** devem ser commitadas.

---

### 9. Qual a contribuição técnica do TCC?

Em síntese, o trabalho entrega um **sistema full-stack operacional** que integra:

1. **Governança de ativos** com estados derivados de OS e movimentações;
2. **Workflow de aprovação em cadeia** com papéis `FUNCIONARIO` / `TECNICO` → `GESTOR` → `ADM`, bloqueio de autoaprovação e mensagens de erro explícitas (HTTP 403 com contexto);
3. **Canal único de solicitações** (`/solicitacoes`) com wizard, anexos e linha do tempo;
4. **Mensageria assíncrona** para notificações desacopladas do tempo de resposta HTTP;
5. **API de integrações** por tenant (chave + rate limit) para cenários ERP/RH;
6. **Deploy real** documentado (Vercel + Render), incluindo solução de mídia via proxy same-origin.

Para banca: combinar este FAQ, o README, manual do utilizário e demonstração ao vivo dos fluxos gestor → técnico → validação.

---

### 10. Existe manual do utilizador além deste FAQ?

**Sim.** O [docs/manual-do-usuario-6.md](docs/manual-do-usuario-6.md) descreve telas e fluxos com linguagem orientada ao dia a dia. Este **FAQ** complementa o manual com respostas transversais (conceitos, TCC, deploy, limitações de infraestrutura). Recomenda-se: manual para *como clicar*; FAQ para *por que o sistema se comporta assim*.

---

## 2. Primeiros passos e ambientes

### 11. Como executar o projeto localmente?

**Pré-requisitos:** Node.js 20+, npm 10+, MongoDB (local ou Atlas), PostgreSQL ou SQLite em dev, RabbitMQ opcional (necessário para fila de e-mails).

```bash
git clone <url-do-repositorio>
cd assetra-app
npm install
npm run setup:backend
cp backend/.env.example backend/.env
# Editar JWT_SECRET, MONGODB_URL, DATABASE_URL, CORS_ORIGIN=http://localhost:5173
npm run db:push
npm run db:generate
npm run dev
```

| Serviço | URL típica |
|---------|------------|
| Frontend (Vite) | http://localhost:5173 |
| API REST | http://localhost:3000/api |
| Health check | http://localhost:3000/api/health |

Opcional: `npm run db:seed` cria tenant demo e utilizadores de teste (`admin@assetra.local`, `gestor@assetra.local`, etc., senha documentada no seed).

---

### 12. Preciso obrigatoriamente de Docker?

**Não.** Docker é **opcional** e útil apenas se quiser subir PostgreSQL rapidamente (`npm run docker:postgres`). Alternativas:

- **SQLite** em desenvolvimento via `DATABASE_URL=file:./dev.db` (ajustado pelo script de sync do Prisma);
- **MongoDB Atlas** e **CloudAMQP** na nuvem, evitando instalação local;
- PostgreSQL instalado nativamente no sistema operativo.

Para TCC ou demonstração em máquina única, a combinação SQLite + Mongo local + RabbitMQ opcional é a mais simples; para testar e-mails assíncronos, configure `RABBITMQ_URL` e o worker.

---

### 13. Como é o primeiro acesso de um utilizador?

Existem dois caminhos principais:

1. **Convite / cadastro pelo gestor ou administrador**  
   O responsável cria o utilizador na vista **Utilizadores**. O convidado recebe (se o e-mail estiver configurado) link para **`/convite`**, onde confirma dados, pode associar **Google** e define **senha de confirmação** para ações sensíveis.

2. **Login direto** (utilizador já ativo)  
   Na página de login: **e-mail + senha** (respeitando o tenant) ou **Entrar com Google**, desde que `VITE_GOOGLE_CLIENT_ID` e credenciais no backend estejam configurados ([guia Google](docs/configurar-google-login.md)).

Após autenticação, o menu lateral reflete o **papel** (RBAC): funcionário vê poucas entradas; gestor vê aprovações e relatórios; administrador vê integrações.

---

### 14. Onde criar manutenções e movimentações?

**Toda criação formal** de pedidos novos deve ser feita em **Solicitações** (`/solicitacoes`):

- **Solicitar Manutenção** — abre fluxo de OS com aprovação de abertura;
- **Solicitar Movimentação** — pede transferência de ativo para outro responsável.

As páginas **Movimentações** e **Manutenções** existem para **consulta, gestão e histórico** de registos já existentes (filtros, detalhe, atribuição em lote pelo gestor, etc.). Botões “Nova movimentação” / “Novo chamado” redirecionam para Solicitações com query `?abrir=movimentacao` ou `?abrir=manutencao` — decisão de produto para reforçar governança.

---

### 15. O Assetra funciona em telemóvel ou tablet?

A interface foi construída como **SPA responsiva**: sidebar recolhível, grelhas adaptáveis e formulários utilizáveis em ecrãs menores. O **caso de uso principal** continua a ser desktop (gestores e técnicos em escritório). Em telemóvel é viável consultar *Meus ativos*, acompanhar estado de solicitações e anexar fotos capturadas no dispositivo; operações densas (relatórios, atribuição em lote) são mais confortáveis em ecrã largo.

---

## 3. Perfis, permissões e governança

### 16. Quais perfis existem e como se relacionam?

| Perfil (UI) | Código (API) | Foco |
|-------------|--------------|------|
| Administrador | `ADM` | Configuração, integrações, fallback de aprovações quando o solicitante é gestor |
| Gestor | `GESTOR` | Aprovações operacionais, utilizadores, relatórios, validação de OS |
| Técnico | `TECNICO` | Execução de OS, solicitações, ativos sob sua responsabilidade |
| Funcionário | `FUNCIONARIO` | *Meus ativos*, solicitações; requer **departamento** no cadastro |

O **RBAC** filtra rotas no frontend (`router`) e protege endpoints no backend (`authorize`, `authMiddleware`). Tentativas fora do papel recebem **403 Forbidden** com mensagem orientativa quando aplicável (ex.: aprovação sem papel requerido).

---

### 17. O que um Funcionário pode e não pode fazer?

**Pode:**

- Ver **Meus ativos** (equipamentos atribuídos ao seu e-mail);
- Abrir **solicitações** de manutenção ou movimentação sobre esses ativos;
- Acompanhar estado na vista **Solicitações** (pendente, aprovado, reprovado);
- Gerir foto de perfil e senha de confirmação.

**Não pode:**

- Aprovar pedidos de outros utilizadores;
- Aceder ao painel global de **Aprovações** nem atribuir OS a técnicos;
- Criar utilizadores ou chaves de API.

Isto garante que o colaborador tenha **autonomia para pedir** sem **autonomia para decidir** em nome da organização.

---

### 18. O que um Técnico pode e não pode fazer?

**Pode:**

- Trabalhar na fila **Execução técnica** (OS atribuídas);
- Registar progresso, conclusão e **pedidos de adiamento** de prazo;
- Solicitar manutenções e movimentações (sujeitas à mesma cadeia de aprovação);
- Consultar ativos e movimentações ligadas ao seu trabalho.

**Não pode:**

- Aprovar abertura de OS ou validar conclusão **como gestor** (salvo se tiver outro papel, o que não é o desenho habitual);
- Administrar integrações ou tenants.

O técnico é o **executor**; o gestor permanece como **controlador de qualidade e prioridade**.

---

### 19. O que um Gestor pode e não pode fazer?

**Pode:**

- Decidir fila em **Aprovações** (abertura de OS, validação pós-execução, movimentações quando o solicitante é técnico ou funcionário);
- Gerir **Utilizadores** (convites, papéis, departamentos);
- **Atribuir em lote** OS a técnicos na vista Manutenções;
- Exportar / consultar **relatórios** conforme implementado na versão atual.

**Limitações:**

- Pedidos **criados pelo próprio gestor** exigem aprovação do **Administrador** (não pode autoaprovar);
- Não acede a configurações de integração global reservadas ao ADM.

---

### 20. O que um Administrador adiciona em relação ao Gestor?

O administrador **herda** capacidades operacionais do gestor e acrescenta:

- Vista **Integrações** (API keys por tenant, documentação embutida para ERP/RH);
- Decisão sobre solicitações originadas por **gestores**;
- Configurações sensíveis e papel de **fallback** na cadeia (`ADM` pode decidir quando o papel requerido é `GESTOR` ou `ADM`, conforme regras em `approvalService`).

Em ambiente demo, use `admin@assetra.local` (após seed) apenas em desenvolvimento — nunca exponha credenciais reais em repositório público.

---

### 21. Por que não posso aprovar a minha própria solicitação?

É regra de **segregação de funções** (SoD): quem **solicita** não pode **aprovar** o mesmo registo. O backend valida identidade do solicitante versus utilizador autenticado na decisão. Isto evita fraudes internas e fortalece auditoria para TCC e para compliance corporativo.

Se aparecer botão desativado ou aviso na UI de Aprovações, a interface antecipa o 403 da API — consulte a mensagem no topo do painel após tentativa.

---

## 4. Solicitações, aprovações e notificações

### 22. Qual a diferença entre Solicitações e Aprovações?

| Vista | Quem usa | Conteúdo |
|-------|----------|----------|
| **Solicitações** (`/solicitacoes`) | Quem **envia** pedidos | Wizard de criação, anexos, linha do tempo, *minhas* aprovações pendentes/decididas |
| **Aprovações** | **Gestor** e **Administrador** | Fila organizacional para **decidir** pedidos de terceiros |

Um funcionário pode nunca abrir Aprovações; já um gestor vive sobretudo entre Aprovações e Manutenções. O endpoint `/api/approvals/mine` alimenta a perspetiva do solicitante na vista Solicitações.

---

### 23. Quem aprova cada tipo de pedido?

**Movimentações e aberturas de manutenção:**

| Papel de quem solicita | Aprovador requerido |
|------------------------|---------------------|
| Funcionário ou Técnico | **Gestor** (`GESTOR`) |
| Gestor | **Administrador** (`ADM`) |

Registos antigos sem `requiredApproverRole` são normalizados no serviço (`resolveEffectiveRequiredApproverRole`). O administrador pode atuar como **fallback** em certas combinações quando o papel efetivo ainda é gestor — comportamento documentado no código para não bloquear operação legada.

---

### 24. O que acontece tecnicamente ao aprovar uma movimentação?

1. O gestor (ou ADM) regista decisão **Aprovar** ou **Reprovar** com comentário opcional;
2. Se aprovado, o serviço de movimentação **atualiza o responsável** do ativo (e-mail de destino);
3. O estado do ativo e o histórico em **Movimentações** são atualizados;
4. Evento de domínio pode disparar **e-mail** ao solicitante (`NOTIFICATION_EMAILS_ENABLED`);
5. Entrada de **auditoria** é registada para rastreio.

Reprovação encerra o fluxo sem alterar custódia; o solicitante vê o motivo em Solicitações.

---

### 25. Como funciona a validação de conclusão de manutenção?

Fluxo típico de uma OS:

```text
Solicitação → Aprovação de abertura → OS Aberta → Em execução (técnico)
→ Conclusão pelo técnico → Validação pelo gestor → OS Concluída
```

Após o técnico marcar serviço como concluído, o gestor recebe pedido de **validação**. Pode **aprovar** (OS passa a *Concluída*, ativo volta ao estado coerente) ou **devolver** para correção. Sem validação, a OS não é considerada formalmente encerrada — evita fechar chamados incompletos.

---

### 26. Posso anexar evidências (fotos, PDFs) às solicitações?

**Sim.** O wizard em Solicitações aceita múltiplos ficheiros (limites de tamanho e MIME configurados no servidor via Multer). Tipos comuns: imagens (`.jpg`, `.png`) e **PDF** para notas de fornecedor ou laudos.

Em **produção**, os ficheiros devem estar em **GridFS**; o frontend obtém URLs via **proxy** `/api` na mesma origem (Vercel) para evitar CORS e URLs quebradas do Render. Ver pergunta 45 se anexos antigos retornarem 404.

---

### 27. Receberei e-mail quando minha solicitação for decidida?

**Depende da configuração.** Com `NOTIFICATION_EMAILS_ENABLED=true` e provedor válido (**Brevo** ou **Resend** em produção), o worker envia mensagens transacionais (aprovação, reprovação, validação). Em localhost, **SMTP** (ex.: Gmail de teste) pode funcionar.

Se não receber e-mail: confirme spam, `EMAIL_FROM`, credenciais no Render e logs do worker `assetra-events-worker`. A UI **sempre** reflete o estado — e-mail é canal complementar, não único.

---

## 5. Ativos, movimentações e manutenções

### 28. O que é a tag de um ativo e como deve ser usada?

A **tag** (ex.: `AST-200`) é o identificador **único** do ativo no inventário do tenant. Serve para:

- Pesquisa rápida nas listagens;
- Referência em solicitações e OS (“manutenção no AST-200”);
- Integrações futuras via API (chave estável).

Boas práticas corporativas: padrão fixo por empresa (`AST-`, `TI-`, etc.), sem reutilizar tag de ativo baixado/defeituoso; registrar motivo em movimentação ou baixa futura se o módulo existir na roadmap.

---

### 29. Quais estados um ativo pode assumir?

| Estado | Significado usual |
|--------|-------------------|
| **Em uso** | Atribuído a um responsável ativo |
| **Disponível** | Em estoque / sem responsável |
| **Em manutenção** | OS em curso que impacta disponibilidade |

O sistema **recalcula** estado conforme OS e movimentações (`refreshAssetStatusForTag` no backend). Gestores devem validar se o estado exibido corresponde à realidade física após cada OS concluída.

---

### 30. O que significa “ativo atribuído”?

É o colaborador **responsável atual** pelo equipamento (e-mail corporativo no registo). Transferências **aprovadas** alteram esse campo; até lá, o ativo permanece sob o responsável anterior. Funcionários só solicitam alterações sobre ativos **que lhes estão atribuídos** — validação em `assertUserCanRequestAsset`.

---

### 31. Por que não criar movimentação diretamente na página Movimentações?

Por **governança**: transferir um portátil de um colaborador para outro sem aprovação é risco de perda e falha de auditoria. O fluxo obrigatório **Solicitações → Aprovações → registo em Movimentações** garante que um gestor consciente da política da empresa autorizou a mudança.

A página Movimentações permanece essencial para **transparência histórica** e operações administrativas pós-aprovação, não para atalhos informais.

---

### 32. Como abrir um chamado de manutenção do zero?

1. Aceder a **Solicitações** → **Solicitar Manutenção**;
2. Selecionar ativo (tag), descrever sintoma, escolher **severidade**;
3. Anexar evidências se necessário;
4. Submeter — estado *pendente* até o gestor **aprovar abertura**;
5. Após aprovação, a OS entra na fila de **Manutenções** / **Execução técnica**.

Técnicos e funcionários seguem o mesmo canal; diferença está apenas nos ativos que cada um pode ver/solicitar.

---

### 33. Como funcionam pedidos de adiamento de prazo?

Durante execução, o técnico pode solicitar **mais prazo** (justificativa). O gestor vê o pedido no contexto da OS e **aprova ou recusa**. Isto formaliza atrasos por peça em falta, dependência externa ou prioridade reordenada — útil para relatórios de SLA em apresentação de TCC.

---

### 34. O que é atribuição em lote de OS?

Gestores e administradores podem selecionar **várias ordens** abertas ou em andamento e atribuir **um técnico** de uma só vez na vista Manutenções. Reduz cliques em operações de TI com fila grande segunda-feira de manhã. Não substitui a necessidade de cada OS ter sido aberta via fluxo aprovado.

---

### 35. Por que não criar chamado direto em Manutenções?

Pelos mesmos motivos da pergunta 31: **abertura sem aprovação** contorna política de priorização do gestor (orçamento, janela de manutenção, ativo crítico). Manutenções é o **painel operacional**; Solicitações é o **portal de entrada** para pedidos originados no terreno.

---

## 6. Conta, autenticação e segurança

### 36. Login Google versus senha local: qual a diferença?

| Mecanismo | Função |
|-----------|--------|
| **Google OAuth** | Prova identidade no login (quem entra no sistema) |
| **Senha da conta** (e-mail/senha) | Autenticação clássica por tenant |
| **Senha de confirmação** (perfil) | Reautenticação para **ações sensíveis** (aprovar, excluir, alterações críticas) |

Utilizadores só Google **criam** senha de confirmação no primeiro uso do perfil — não confundir com “senha do Gmail”. O Google **não substitui** a senha de confirmação interna.

---

### 37. Como criar a senha de confirmação (conta nova via Google)?

1. Login com Google;
2. Abrir **Perfil** — o painel pode expandir automaticamente “Criar senha de acesso”;
3. Definir senha forte (mínimo conforme validação backend);
4. Guardar — toast de sucesso confirma (`hasConfirmationPassword` no utilizador).

Sem esta senha, algumas ações permanecem bloqueadas até configuração — comportamento intencional de segurança.

---

### 38. Esqueci a senha de confirmação do perfil. E agora?

Esta senha **não possui fluxo de “esqueci por e-mail”** no produto atual. Caminhos:

- Se ainda souber a senha antiga: **Perfil** → alterar senha de confirmação;
- Se não souber: contactar **administrador** da organização (pode orientar reset manual / novo convite conforme política interna);
- Login Google **continua** a funcionar para entrar no sistema — apenas ações sensíveis ficam impedidas até nova senha de confirmação.

Para TCC: deixar claro que isto é decisão de produto (MVP), não falha de OAuth.

---

### 39. Como alterar foto de perfil?

Em **Perfil** → **Alterar foto** → selecionar imagem (formatos suportados pelo upload). O ficheiro fica associado ao utilizador (`avatarFilename` ou URL externa do Google na primeira vez). Sucesso é indicado por **toast** na aplicação. Fotos são servidas via API de uploads com as mesmas regras de proxy/GridFS dos outros anexos.

---

### 40. Como convidar um novo utilizador para a organização?

1. Gestor ou ADM: vista **Utilizadores** → novo cadastro;
2. Informar e-mail, papel e, se funcionário, **departamento** obrigatório;
3. Sistema envia convite (se e-mail configurado) com link **`/convite`**;
4. Convidado confirma registo, pode ligar Google e define senhas conforme fluxo.

Sem SMTP/Brevo em dev, copie o link manualmente dos logs ou da base, conforme procedimento de demonstração acordado com orientador.

---

## 7. Aspectos técnicos, deploy e operação

### 41. Onde está a API REST e como explorá-la?

- **Base:** `/api` no servidor Express (local: porta 3000; produção: URL Render);
- **Saúde:** `GET /api/health` — útil para monitorização Render;
- **Métricas:** `GET /api/metrics` — exposição básica para observabilidade;
- Rotas agrupadas por domínio em `backend/src/routes/` (assets, approvals, maintenances, uploads, etc.).

O frontend em produção chama **`/api` na Vercel** (proxy), não o domínio Render diretamente — evita CORS e simplifica cookies.

---

### 42. Como funciona autenticação e autorização na API?

1. **Login** devolve JWT armazenado em cookie **`httpOnly`** (sessão browser) ou aceite via header **Bearer** para integrações;
2. **`authMiddleware`** valida token e associa `userId` + `tenantId`;
3. **`authorize`** restringe por papel (`ADM`, `GESTOR`, …);
4. Serviços aplicam regras finas (ex.: não decidir próprio pedido).

Tokens devem usar `JWT_SECRET` forte em produção. Nunca commitar segredos.

---

### 43. O que é a API de integrações?

Conjunto de endpoints para sistemas externos (**ERP, RH, ITSM**) autenticados por **API key por tenant**, gerada na vista **Integrações** (somente ADM). Inclui rate limiting dedicado. Permite sincronizar ativos ou utilizadores sem UI — relevante para evolução pós-TCC. Documentação de contrato deve ser mantida alinhada à versão deployada.

---

### 44. Por que RabbitMQ no desenho?

Operações como **envio de e-mail** ou fan-out de eventos não devem bloquear a resposta HTTP. O API publica mensagens na fila; o **worker** (`assetra-events-worker` no Render) consome e executa tarefas lentas. Benefícios para defesa acadêmica:

- Desacoplamento e escalabilidade horizontal do worker;
- Resiliência (retry, dead-letter conforme configuração);
- Alinhamento com padrão **event-driven** descrito na documentação de arquitetura.

Em dev sem RabbitMQ, algumas notificações podem ficar desativadas ou síncronas conforme `EVENT_BROKER_DRIVER`.

---

### 45. Anexos antigos retornam 404 em produção. Por quê?

No Render, o sistema de ficheiros **não é persistente** entre deploys. Anexos gravados apenas em `backend/uploads/` local **desaparecem** após redeploy.

**Soluções:**

| Situação | Ação |
|----------|------|
| Anexos novos | Já vão para **GridFS** (MongoDB) automaticamente |
| Anexos legados no disco | Executar `npm run uploads:migrate-gridfs` no backend (ver script em `backend/scripts/`) |
| Utilizador final | Reenviar evidência na solicitação se migração impossível |

O frontend usa `mediaUrl.ts` / proxy Vercel para servir mídia na mesma origem — se o ficheiro não existir no GridFS, 404 é esperado.

---

### 46. Como testar e-mail em desenvolvimento versus produção?

| Ambiente | Abordagem |
|----------|-----------|
| **Localhost** | SMTP (ex.: Gmail com app password) em `backend/.env` |
| **Render free** | **Brevo** ou **Resend** via API HTTPS — [configurar-brevo.md](docs/configurar-brevo.md), [configurar-resend.md](docs/configurar-resend.md) |
| **Validação** | Disparar aprovação de teste e verificar logs do worker |

SMTP direto no Render costuma falhar por política de rede do plano gratuito — não é bug da aplicação.

---

### 47. Existem testes automatizados?

Sim, no backend (`npm test --prefix backend`). A cobertura **não é exaustiva**; cenários de UI e fluxos longos (wizard, aprovação em cadeia) ainda dependem de testes manuais ou roteiro de demonstração do TCC. Para evolução do projeto, priorize testes de serviços críticos: `approvalService`, `maintenanceService`, auth.

---

### 48. Onde hospedar frontend e backend em produção?

Arquitetura recomendada (documentada):

```text
Utilizador → Vercel (SPA + proxy /api → Render)
                ↘ Render: API Express
                ↘ Render: Worker RabbitMQ
                ↘ MongoDB Atlas + PostgreSQL + CloudAMQP
```

Ficheiros: `vercel.json`, `render.yaml`, [docs/deploy-vercel-render.md](docs/deploy-vercel-render.md). Exemplos públicos do projeto: frontend `assetra-seven.vercel.app`, API `assetra-44la.onrender.com` (sujeito a disponibilidade do plano free).

---

### 49. Quais variáveis de ambiente são obrigatórias em produção?

**Render (API + worker)**

| Variável | Finalidade |
|----------|------------|
| `JWT_SECRET` | Assinatura de tokens |
| `DATABASE_URL` | PostgreSQL |
| `MONGODB_URL` | MongoDB + GridFS |
| `CORS_ORIGIN`, `FRONTEND_URL`, `API_PUBLIC_URL` | URLs corretas e cookies |
| `RABBITMQ_URL`, `EVENT_BROKER_DRIVER` | Fila de eventos |
| `BREVO_API_KEY` ou `RESEND_API_KEY`, `EMAIL_FROM` | E-mail transacional |
| `NOTIFICATION_EMAILS_ENABLED` | Liga/desliga envios |

**Vercel (frontend)**

| Variável | Finalidade |
|----------|------------|
| `VITE_API_BASE_URL=/api` | Proxy same-origin |
| `VITE_API_UPLOAD_BASE_URL` | Base para uploads (backend público) |
| `VITE_GOOGLE_CLIENT_ID` | Botão Google |

Lista completa e troubleshooting: [deploy-vercel-render.md](docs/deploy-vercel-render.md).

---

### 50. O projeto é open source? Como contribuir?

Consulte o ficheiro **LICENÇA** na raiz do repositório. Contribuições via **Pull Request** são bem-vindas se seguirem:

1. Branch descritiva (`feat/`, `fix/`);
2. Padrões existentes em `backend/src/services` e componentes Vue;
3. Descrição do problema, screenshots e **passos de teste**;
4. **Sem** `.env`, chaves API, dumps de BD ou uploads reais.

Para issues de suporte, use o modelo da secção 8 abaixo.

---

## 8. Suporte e contribuição

### Ainda com dúvidas?

Abra uma **issue** no GitHub com informação estruturada — quanto mais completa, mais rápida a resposta:

| Campo | Exemplo |
|-------|---------|
| **Perfil** | Gestor, tenant demo |
| **Ambiente** | Produção Vercel / local |
| **Passos** | 1. Solicitações → 2. Anexar PDF → 3. Erro 413 |
| **Evidência** | Print ou corpo JSON da resposta `/api/...` |
| **Horário** | UTC-3, para correlacionar logs Render |

**Não inclua** senhas, tokens JWT completos nem API keys em issues públicas.

---

<div align="center">

**Assetra** — controle, rastreabilidade e governança para o seu parque de ativos.

<br />

[README](README.md) · [Manual do utilizador](docs/manual-do-usuario-6.md) · [Deploy](docs/deploy-vercel-render.md)

<br />

<sub>FAQ corporativo · Utilizadores · TCC · Operações · Atualizado com a documentação do repositório</sub>

</div>
