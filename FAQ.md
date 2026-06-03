# FAQ — Assetra

Perguntas frequentes sobre o sistema, o projeto acadêmico (TCC) e o uso no dia a dia.

**Documentos relacionados:** [README.md](README.md) · [docs/deploy-vercel-render.md](docs/deploy-vercel-render.md) · [docs/manual-do-usuario-6.md](docs/manual-do-usuario-6.md)

---

## Sobre o projeto e o TCC

<details>
<summary><strong>1. O que é o Assetra?</strong></summary>

Plataforma web para **gestão corporativa de ativos de TI**: inventário, transferências entre colaboradores, ordens de manutenção e fluxos de aprovação, com perfis de acesso e histórico auditável.
</details>

<details>
<summary><strong>2. Qual problema o sistema resolve?</strong></summary>

Substitui planilhas e processos informais por um fluxo único: quem tem o ativo, quando pedir manutenção, quem aprova transferências e como o técnico executa e valida o serviço.
</details>

<details>
<summary><strong>3. Quem é o público-alvo?</strong></summary>

Equipas de TI e organizações que precisam de **rastreabilidade** e **governança** sobre equipamentos (notebooks, monitores, periféricos, etc.).
</details>

<details>
<summary><strong>4. O Assetra é multi-tenant?</strong></summary>

Sim. Cada **organização** (tenant) tem dados isolados: utilizadores, ativos, manutenções e aprovações não se misturam entre empresas.
</details>

<details>
<summary><strong>5. Quais tecnologias principais foram usadas?</strong></summary>

**Frontend:** Vue 3, TypeScript, Pinia, Vite. **Backend:** Node.js, Express 5. **Dados:** PostgreSQL (Prisma) + MongoDB (Mongoose). **Mensageria:** RabbitMQ. **Deploy:** Vercel + Render.
</details>

<details>
<summary><strong>6. Por que PostgreSQL e MongoDB juntos?</strong></summary>

PostgreSQL guarda dados relacionais e críticos (utilizadores, tenants, credenciais). MongoDB guarda documentos flexíveis (ativos, manutenções, aprovações, anexos referenciados). Separação por natureza do dado e escalabilidade do inventário.
</details>

<details>
<summary><strong>7. O projeto segue algum padrão de arquitetura?</strong></summary>

Sim: camada de **serviços** no backend, validação com Zod, eventos de domínio (RabbitMQ), RBAC e princípios de Clean Code documentados em [docs/architecture-patterns.md](docs/architecture-patterns.md).
</details>

<details>
<summary><strong>8. O código está pronto para produção?</strong></summary>

Há deploy documentado (Vercel + Render). Anexos em disco no Render são efémeros; em produção usa-se **GridFS** no MongoDB para persistência. E-mail depende de Brevo/Resend (SMTP bloqueado no plano free do Render).
</details>

<details>
<summary><strong>9. Qual a contribuição técnica do TCC em uma frase?</strong></summary>

Sistema full-stack com governança de ativos, fluxos de aprovação em cadeia (técnico → gestor → administrador), notificações assíncronas e integração preparada para ERPs/RH.
</details>

<details>
<summary><strong>10. Existe manual do utilizador?</strong></summary>

Sim: [docs/manual-do-usuario-6.md](docs/manual-do-usuario-6.md).
</details>

---

## Primeiros passos

<details>
<summary><strong>11. Como executar localmente?</strong></summary>

```bash
npm install && npm run setup:backend
cp backend/.env.example backend/.env
npm run db:push && npm run db:generate
npm run dev
```

Frontend: `http://localhost:5173` · API: `http://localhost:3000/api`
</details>

<details>
<summary><strong>12. Preciso de Docker?</strong></summary>

Opcional. PostgreSQL pode ser local, SQLite em dev (`file:./dev.db`) ou `npm run docker:postgres`. MongoDB e RabbitMQ podem ser locais ou em cloud (Atlas / CloudAMQP).
</details>

<details>
<summary><strong>13. Como faço login pela primeira vez?</strong></summary>

Com **e-mail e senha** (tenant + credenciais) ou **Entrar com Google**, se o administrador configurou OAuth. Convites novos passam pela página `/convite`.
</details>

<details>
<summary><strong>14. Onde crio manutenções e movimentações?</strong></summary>

Em **Solicitações** (`/solicitacoes`). As páginas Movimentações e Manutenções servem para **consultar histórico** e gerir registos já existentes.
</details>

<details>
<summary><strong>15. O sistema funciona no telemóvel?</strong></summary>

A interface é **responsiva** (sidebar recolhível, formulários adaptados). O uso principal é em desktop; no telemóvel as ações principais continuam acessíveis.
</details>

---

## Perfis e permissões

<details>
<summary><strong>16. Quais perfis existem?</strong></summary>

**Administrador**, **Gestor**, **Técnico** e **Funcionário**. Cada um vê menus e ações conforme o papel (RBAC).
</details>

<details>
<summary><strong>17. O que um Funcionário pode fazer?</strong></summary>

Ver **Meus ativos**, enviar **solicitações** (manutenção ou transferência) sobre ativos atribuídos a si. Não aprova pedidos de outros.
</details>

<details>
<summary><strong>18. O que um Técnico faz?</strong></summary>

Executa ordens na **Execução técnica**, envia solicitações, consulta ativos e movimentações relacionadas. Não aprova como gestor.
</details>

<details>
<summary><strong>19. O que um Gestor faz?</strong></summary>

**Aprova** aberturas de OS, validações de conclusão e **movimentações** pedidas por técnicos/funcionários; gere utilizadores e relatórios.
</details>

<details>
<summary><strong>20. O que um Administrador faz?</strong></summary>

Tudo o que o gestor faz, mais **integrações** (API keys), configurações sensíveis e decisões quando o solicitante é gestor (cadeia sobe para ADM).
</details>

<details>
<summary><strong>21. Posso aprovar a minha própria solicitação?</strong></summary>

Não. O sistema bloqueia autoaprovação: quem pediu não pode decidir o próprio pedido.
</details>

---

## Solicitações e aprovações

<details>
<summary><strong>22. Qual a diferença entre Solicitações e Aprovações?</strong></summary>

**Solicitações:** o que **eu envio** (pendente, aprovado, reprovado). **Aprovações:** fila do gestor/admin para **decidir** pedidos da organização.
</details>

<details>
<summary><strong>23. Quem aprova uma movimentação?</strong></summary>

Pedidos de **técnico ou funcionário** → **Gestor** (ou ADM). Pedidos de **gestor** → **Administrador**.
</details>

<details>
<summary><strong>24. O que acontece ao aprovar uma movimentação?</strong></summary>

O ativo passa a estar **atribuído ao utilizador de destino**; regista-se no histórico de movimentações e o solicitante é notificado.
</details>

<details>
<summary><strong>25. O que é a fase de validação de manutenção?</strong></summary>

Após o técnico concluir o serviço, o **gestor valida** (aprova ou pede correção). Só então a OS fica **Concluída**.
</details>

<details>
<summary><strong>26. Posso anexar fotos ou PDFs nas solicitações?</strong></summary>

Sim, no wizard de Solicitações (até ao limite configurado no servidor). Tipos comuns: imagens e PDF.
</details>

<details>
<summary><strong>27. Recebo e-mail quando minha solicitação é decidida?</strong></summary>

Sim, se `NOTIFICATION_EMAILS_ENABLED=true` e o serviço de e-mail (Brevo/Resend) estiver configurado em produção.
</details>

---

## Ativos e movimentações

<details>
<summary><strong>28. O que é a tag de um ativo?</strong></summary>

Identificador único no inventário (ex.: `AST-200`). Pode existir código curto para pesquisa rápida.
</details>

<details>
<summary><strong>29. Estados possíveis de um ativo?</strong></summary>

**Em uso**, **Disponível** e **Em manutenção** (atualizado conforme OS e fluxos).
</details>

<details>
<summary><strong>30. O que significa “ativo atribuído”?</strong></summary>

O colaborador responsável atual (e-mail corporativo). Transferências mudam esse responsável após aprovação.
</details>

<details>
<summary><strong>31. Por que não crio movimentação direto na página Movimentações?</strong></summary>

Por governança: toda transferência passa por **solicitação + aprovação**. A página Movimentações mostra o histórico e permite edição administrativa quando aplicável.
</details>

---

## Manutenções

<details>
<summary><strong>32. Como abrir um chamado de manutenção?</strong></summary>

**Solicitações** → **Solicitar Manutenção** → preencher ativo, descrição, severidade e anexos → aguardar aprovação do gestor (abertura da OS).
</details>

<details>
<summary><strong>33. O técnico pode pedir mais prazo?</strong></summary>

Sim, **pedido de adiamento** na OS; o gestor aprova ou recusa no painel de manutenções.
</details>

<details>
<summary><strong>34. O que é atribuição em lote?</strong></summary>

Gestor/admin pode atribuir várias OS abertas ou em andamento a um técnico de uma vez (página Manutenções).
</details>

<details>
<summary><strong>35. Por que não crio chamado direto em Manutenções?</strong></summary>

Mesmo princípio das movimentações: abertura formal via **Solicitações** e aprovação antes da OS entrar em execução.
</details>

---

## Conta, senha e perfil

<details>
<summary><strong>36. Login com Google e senha local: qual a diferença?</strong></summary>

**Google** autentica o acesso ao sistema. A **senha de acesso** no perfil serve só para **confirmar ações sensíveis** (excluir, aprovar crítico), não substitui o OAuth.
</details>

<details>
<summary><strong>37. Como criar a senha de confirmação (conta Google nova)?</strong></summary>

Perfil → **Criar senha de acesso** (abre automaticamente na primeira vez). Após guardar, aparece confirmação de sucesso.
</details>

<details>
<summary><strong>38. Esqueci a senha de confirmação do perfil.</strong></summary>

Essa senha não é recuperada por e-mail no sistema. Defina uma nova no perfil (com senha atual) ou peça apoio ao **administrador** da organização. O login Google não é afetado.
</details>

<details>
<summary><strong>39. Como alterar a foto de perfil?</strong></summary>

Perfil → **Alterar foto** → escolher imagem. Sucesso é confirmado por notificação na tela.
</details>

<details>
<summary><strong>40. Como convidar um novo utilizador?</strong></summary>

Gestor/admin em **Utilizadores**: cadastro com e-mail; o convidado confirma em `/convite` (link por e-mail se SMTP/Brevo estiver ativo).
</details>

---

## Desenvolvimento e TCC (técnico)

<details>
<summary><strong>41. Onde está a API REST?</strong></summary>

Prefixo `/api` no backend Express. Health: `/api/health`. Métricas: `/api/metrics`.
</details>

<details>
<summary><strong>42. Como funciona a autenticação na API?</strong></summary>

JWT em cookie `httpOnly` (sessão) ou Bearer em chamadas programáticas. Rotas sensíveis usam middleware `authMiddleware` + `authorize`.
</details>

<details>
<summary><strong>43. O que é a API de integrações?</strong></summary>

Endpoints para sistemas externos (ERP, RH) com **API key** por tenant, documentados na vista Integrações (ADM). Rate limit dedicado.
</details>

<details>
<summary><strong>44. Por que RabbitMQ?</strong></summary>

Desacopla ações pesadas (e-mails, eventos) do pedido HTTP. Worker `assetra-events-worker` consome a fila em produção.
</details>

<details>
<summary><strong>45. Anexos antigos dão 404 em produção. Por quê?</strong></summary>

Redeploy no Render apaga disco local. Soluções: reenviar anexos, migrar ficheiros locais com `npm run uploads:migrate-gridfs` (backend), ou usar anexos já guardados no GridFS após deploy recente.
</details>

<details>
<summary><strong>46. Como testar e-mail localmente?</strong></summary>

SMTP Gmail funciona em **localhost**. No Render free use **Brevo** ou **Resend** (HTTPS). Ver [docs/configurar-brevo.md](docs/configurar-brevo.md).
</details>

<details>
<summary><strong>47. Existem testes automatizados?</strong></summary>

Há testes no backend (`npm test --prefix backend`). A cobertura não é total; validação manual e cenários do TCC complementam.
</details>

---

## Deploy e operação

<details>
<summary><strong>48. Onde hospedar frontend e backend?</strong></summary>

**Vercel** (SPA + proxy `/api`) e **Render** (API + worker), conforme [docs/deploy-vercel-render.md](docs/deploy-vercel-render.md) e `render.yaml`.
</details>

<details>
<summary><strong>49. Variáveis obrigatórias em produção?</strong></summary>

`JWT_SECRET`, `MONGODB_URL`, `DATABASE_URL`, `CORS_ORIGIN`, `FRONTEND_URL`, `RABBITMQ_URL`, credenciais de e-mail (`BREVO_API_KEY` ou `RESEND_API_KEY`), `VITE_GOOGLE_CLIENT_ID` na Vercel.
</details>

<details>
<summary><strong>50. O Assetra é open source? Posso contribuir?</strong></summary>

Consulte a licença do repositório. Contribuições via Pull Request são bem-vindas: descreva o problema, passos de teste e não inclua `.env` nem segredos.
</details>

---

## Ainda com dúvidas?

Abra uma **issue** no GitHub com: perfil utilizado, passos para reproduzir, print ou mensagem de erro da API, e ambiente (local ou produção).

---

<sub>Assetra · FAQ para utilizadores, avaliadores de TCC e equipas de desenvolvimento</sub>
