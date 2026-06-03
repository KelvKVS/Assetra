import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const out = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'FAQ.md')

const text = `# FAQ \u2014 Assetra

Perguntas frequentes sobre o sistema, o projeto acad\u00eamico (TCC) e o uso no dia a dia.

**Documentos relacionados:** [README.md](README.md) \u00b7 [docs/deploy-vercel-render.md](docs/deploy-vercel-render.md) \u00b7 [docs/manual-do-usuario-6.md](docs/manual-do-usuario-6.md)

---

## Sobre o projeto e o TCC

<details>
<summary><strong>1. O que \u00e9 o Assetra?</strong></summary>

Plataforma web para **gest\u00e3o corporativa de ativos de TI**: invent\u00e1rio, transfer\u00eancias entre colaboradores, ordens de manuten\u00e7\u00e3o e fluxos de aprova\u00e7\u00e3o, com perfis de acesso e hist\u00f3rico audit\u00e1vel.
</details>

<details>
<summary><strong>2. Qual problema o sistema resolve?</strong></summary>

Substitui planilhas e processos informais por um fluxo \u00fanico: quem tem o ativo, quando pedir manuten\u00e7\u00e3o, quem aprova transfer\u00eancias e como o t\u00e9cnico executa e valida o servi\u00e7o.
</details>

<details>
<summary><strong>3. Quem \u00e9 o p\u00fablico-alvo?</strong></summary>

Equipas de TI e organiza\u00e7\u00f5es que precisam de **rastreabilidade** e **governan\u00e7a** sobre equipamentos (notebooks, monitores, perif\u00e9ricos, etc.).
</details>

<details>
<summary><strong>4. O Assetra \u00e9 multi-tenant?</strong></summary>

Sim. Cada **organiza\u00e7\u00e3o** (tenant) tem dados isolados: utilizadores, ativos, manuten\u00e7\u00f5es e aprova\u00e7\u00f5es n\u00e3o se misturam entre empresas.
</details>

<details>
<summary><strong>5. Quais tecnologias principais foram usadas?</strong></summary>

**Frontend:** Vue 3, TypeScript, Pinia, Vite. **Backend:** Node.js, Express 5. **Dados:** PostgreSQL (Prisma) + MongoDB (Mongoose). **Mensageria:** RabbitMQ. **Deploy:** Vercel + Render.
</details>

<details>
<summary><strong>6. Por que PostgreSQL e MongoDB juntos?</strong></summary>

PostgreSQL guarda dados relacionais e cr\u00edticos (utilizadores, tenants, credenciais). MongoDB guarda documentos flex\u00edveis (ativos, manuten\u00e7\u00f5es, aprova\u00e7\u00f5es, anexos referenciados). Separa\u00e7\u00e3o por natureza do dado e escalabilidade do invent\u00e1rio.
</details>

<details>
<summary><strong>7. O projeto segue algum padr\u00e3o de arquitetura?</strong></summary>

Sim: camada de **servi\u00e7os** no backend, valida\u00e7\u00e3o com Zod, eventos de dom\u00ednio (RabbitMQ), RBAC e princ\u00edpios de Clean Code documentados em [docs/architecture-patterns.md](docs/architecture-patterns.md).
</details>

<details>
<summary><strong>8. O c\u00f3digo est\u00e1 pronto para produ\u00e7\u00e3o?</strong></summary>

H\u00e1 deploy documentado (Vercel + Render). Anexos em disco no Render s\u00e3o ef\u00e9meros; em produ\u00e7\u00e3o usa-se **GridFS** no MongoDB para persist\u00eancia. E-mail depende de Brevo/Resend (SMTP bloqueado no plano free do Render).
</details>

<details>
<summary><strong>9. Qual a contribui\u00e7\u00e3o t\u00e9cnica do TCC em uma frase?</strong></summary>

Sistema full-stack com governan\u00e7a de ativos, fluxos de aprova\u00e7\u00e3o em cadeia (t\u00e9cnico \u2192 gestor \u2192 administrador), notifica\u00e7\u00f5es ass\u00edncronas e integra\u00e7\u00e3o preparada para ERPs/RH.
</details>

<details>
<summary><strong>10. Existe manual do utilizador?</strong></summary>

Sim: [docs/manual-do-usuario-6.md](docs/manual-do-usuario-6.md).
</details>

---

## Primeiros passos

<details>
<summary><strong>11. Como executar localmente?</strong></summary>

\`\`\`bash
npm install && npm run setup:backend
cp backend/.env.example backend/.env
npm run db:push && npm run db:generate
npm run dev
\`\`\`

Frontend: \`http://localhost:5173\` \u00b7 API: \`http://localhost:3000/api\`
</details>

<details>
<summary><strong>12. Preciso de Docker?</strong></summary>

Opcional. PostgreSQL pode ser local, SQLite em dev (\`file:./dev.db\`) ou \`npm run docker:postgres\`. MongoDB e RabbitMQ podem ser locais ou em cloud (Atlas / CloudAMQP).
</details>

<details>
<summary><strong>13. Como fa\u00e7o login pela primeira vez?</strong></summary>

Com **e-mail e senha** (tenant + credenciais) ou **Entrar com Google**, se o administrador configurou OAuth. Convites novos passam pela p\u00e1gina \`/convite\`.
</details>

<details>
<summary><strong>14. Onde crio manuten\u00e7\u00f5es e movimenta\u00e7\u00f5es?</strong></summary>

Em **Solicita\u00e7\u00f5es** (\`/solicitacoes\`). As p\u00e1ginas Movimenta\u00e7\u00f5es e Manuten\u00e7\u00f5es servem para **consultar hist\u00f3rico** e gerir registos j\u00e1 existentes.
</details>

<details>
<summary><strong>15. O sistema funciona no telem\u00f3vel?</strong></summary>

A interface \u00e9 **responsiva** (sidebar recolh\u00edvel, formul\u00e1rios adaptados). O uso principal \u00e9 em desktop; no telem\u00f3vel as a\u00e7\u00f5es principais continuam acess\u00edveis.
</details>

---

## Perfis e permiss\u00f5es

<details>
<summary><strong>16. Quais perfis existem?</strong></summary>

**Administrador**, **Gestor**, **T\u00e9cnico** e **Funcion\u00e1rio**. Cada um v\u00ea menus e a\u00e7\u00f5es conforme o papel (RBAC).
</details>

<details>
<summary><strong>17. O que um Funcion\u00e1rio pode fazer?</strong></summary>

Ver **Meus ativos**, enviar **solicita\u00e7\u00f5es** (manuten\u00e7\u00e3o ou transfer\u00eancia) sobre ativos atribu\u00eddos a si. N\u00e3o aprova pedidos de outros.
</details>

<details>
<summary><strong>18. O que um T\u00e9cnico faz?</strong></summary>

Executa ordens na **Execu\u00e7\u00e3o t\u00e9cnica**, envia solicita\u00e7\u00f5es, consulta ativos e movimenta\u00e7\u00f5es relacionadas. N\u00e3o aprova como gestor.
</details>

<details>
<summary><strong>19. O que um Gestor faz?</strong></summary>

**Aprova** aberturas de OS, valida\u00e7\u00f5es de conclus\u00e3o e **movimenta\u00e7\u00f5es** pedidas por t\u00e9cnicos/funcion\u00e1rios; gere utilizadores e relat\u00f3rios.
</details>

<details>
<summary><strong>20. O que um Administrador faz?</strong></summary>

Tudo o que o gestor faz, mais **integra\u00e7\u00f5es** (API keys), configura\u00e7\u00f5es sens\u00edveis e decis\u00f5es quando o solicitante \u00e9 gestor (cadeia sobe para ADM).
</details>

<details>
<summary><strong>21. Posso aprovar a minha pr\u00f3pria solicita\u00e7\u00e3o?</strong></summary>

N\u00e3o. O sistema bloqueia autoaprova\u00e7\u00e3o: quem pediu n\u00e3o pode decidir o pr\u00f3prio pedido.
</details>

---

## Solicita\u00e7\u00f5es e aprova\u00e7\u00f5es

<details>
<summary><strong>22. Qual a diferen\u00e7a entre Solicita\u00e7\u00f5es e Aprova\u00e7\u00f5es?</strong></summary>

**Solicita\u00e7\u00f5es:** o que **eu envio** (pendente, aprovado, reprovado). **Aprova\u00e7\u00f5es:** fila do gestor/admin para **decidir** pedidos da organiza\u00e7\u00e3o.
</details>

<details>
<summary><strong>23. Quem aprova uma movimenta\u00e7\u00e3o?</strong></summary>

Pedidos de **t\u00e9cnico ou funcion\u00e1rio** \u2192 **Gestor** (ou ADM). Pedidos de **gestor** \u2192 **Administrador**.
</details>

<details>
<summary><strong>24. O que acontece ao aprovar uma movimenta\u00e7\u00e3o?</strong></summary>

O ativo passa a estar **atribu\u00eddo ao utilizador de destino**; regista-se no hist\u00f3rico de movimenta\u00e7\u00f5es e o solicitante \u00e9 notificado.
</details>

<details>
<summary><strong>25. O que \u00e9 a fase de valida\u00e7\u00e3o de manuten\u00e7\u00e3o?</strong></summary>

Ap\u00f3s o t\u00e9cnico concluir o servi\u00e7o, o **gestor valida** (aprova ou pede corre\u00e7\u00e3o). S\u00f3 ent\u00e3o a OS fica **Conclu\u00edda**.
</details>

<details>
<summary><strong>26. Posso anexar fotos ou PDFs nas solicita\u00e7\u00f5es?</strong></summary>

Sim, no wizard de Solicita\u00e7\u00f5es (at\u00e9 ao limite configurado no servidor). Tipos comuns: imagens e PDF.
</details>

<details>
<summary><strong>27. Recebo e-mail quando minha solicita\u00e7\u00e3o \u00e9 decidida?</strong></summary>

Sim, se \`NOTIFICATION_EMAILS_ENABLED=true\` e o servi\u00e7o de e-mail (Brevo/Resend) estiver configurado em produ\u00e7\u00e3o.
</details>

---

## Ativos e movimenta\u00e7\u00f5es

<details>
<summary><strong>28. O que \u00e9 a tag de um ativo?</strong></summary>

Identificador \u00fanico no invent\u00e1rio (ex.: \`AST-200\`). Pode existir c\u00f3digo curto para pesquisa r\u00e1pida.
</details>

<details>
<summary><strong>29. Estados poss\u00edveis de um ativo?</strong></summary>

**Em uso**, **Dispon\u00edvel** e **Em manuten\u00e7\u00e3o** (atualizado conforme OS e fluxos).
</details>

<details>
<summary><strong>30. O que significa \u201cativo atribu\u00eddo\u201d?</strong></summary>

O colaborador respons\u00e1vel atual (e-mail corporativo). Transfer\u00eancias mudam esse respons\u00e1vel ap\u00f3s aprova\u00e7\u00e3o.
</details>

<details>
<summary><strong>31. Por que n\u00e3o crio movimenta\u00e7\u00e3o direto na p\u00e1gina Movimenta\u00e7\u00f5es?</strong></summary>

Por governan\u00e7a: toda transfer\u00eancia passa por **solicita\u00e7\u00e3o + aprova\u00e7\u00e3o**. A p\u00e1gina Movimenta\u00e7\u00f5es mostra o hist\u00f3rico e permite edi\u00e7\u00e3o administrativa quando aplic\u00e1vel.
</details>

---

## Manuten\u00e7\u00f5es

<details>
<summary><strong>32. Como abrir um chamado de manuten\u00e7\u00e3o?</strong></summary>

**Solicita\u00e7\u00f5es** \u2192 **Solicitar Manuten\u00e7\u00e3o** \u2192 preencher ativo, descri\u00e7\u00e3o, severidade e anexos \u2192 aguardar aprova\u00e7\u00e3o do gestor (abertura da OS).
</details>

<details>
<summary><strong>33. O t\u00e9cnico pode pedir mais prazo?</strong></summary>

Sim, **pedido de adiamento** na OS; o gestor aprova ou recusa no painel de manuten\u00e7\u00f5es.
</details>

<details>
<summary><strong>34. O que \u00e9 atribui\u00e7\u00e3o em lote?</strong></summary>

Gestor/admin pode atribuir v\u00e1rias OS abertas ou em andamento a um t\u00e9cnico de uma vez (p\u00e1gina Manuten\u00e7\u00f5es).
</details>

<details>
<summary><strong>35. Por que n\u00e3o crio chamado direto em Manuten\u00e7\u00f5es?</strong></summary>

Mesmo princ\u00edpio das movimenta\u00e7\u00f5es: abertura formal via **Solicita\u00e7\u00f5es** e aprova\u00e7\u00e3o antes da OS entrar em execu\u00e7\u00e3o.
</details>

---

## Conta, senha e perfil

<details>
<summary><strong>36. Login com Google e senha local: qual a diferen\u00e7a?</strong></summary>

**Google** autentica o acesso ao sistema. A **senha de acesso** no perfil serve s\u00f3 para **confirmar a\u00e7\u00f5es sens\u00edveis** (excluir, aprovar cr\u00edtico), n\u00e3o substitui o OAuth.
</details>

<details>
<summary><strong>37. Como criar a senha de confirma\u00e7\u00e3o (conta Google nova)?</strong></summary>

Perfil \u2192 **Criar senha de acesso** (abre automaticamente na primeira vez). Ap\u00f3s guardar, aparece confirma\u00e7\u00e3o de sucesso.
</details>

<details>
<summary><strong>38. Esqueci a senha de confirma\u00e7\u00e3o do perfil.</strong></summary>

Essa senha n\u00e3o \u00e9 recuperada por e-mail no sistema. Defina uma nova no perfil (com senha atual) ou pe\u00e7a apoio ao **administrador** da organiza\u00e7\u00e3o. O login Google n\u00e3o \u00e9 afetado.
</details>

<details>
<summary><strong>39. Como alterar a foto de perfil?</strong></summary>

Perfil \u2192 **Alterar foto** \u2192 escolher imagem. Sucesso \u00e9 confirmado por notifica\u00e7\u00e3o na tela.
</details>

<details>
<summary><strong>40. Como convidar um novo utilizador?</strong></summary>

Gestor/admin em **Utilizadores**: cadastro com e-mail; o convidado confirma em \`/convite\` (link por e-mail se SMTP/Brevo estiver ativo).
</details>

---

## Desenvolvimento e TCC (t\u00e9cnico)

<details>
<summary><strong>41. Onde est\u00e1 a API REST?</strong></summary>

Prefixo \`/api\` no backend Express. Health: \`/api/health\`. M\u00e9tricas: \`/api/metrics\`.
</details>

<details>
<summary><strong>42. Como funciona a autentica\u00e7\u00e3o na API?</strong></summary>

JWT em cookie \`httpOnly\` (sess\u00e3o) ou Bearer em chamadas program\u00e1ticas. Rotas sens\u00edveis usam middleware \`authMiddleware\` + \`authorize\`.
</details>

<details>
<summary><strong>43. O que \u00e9 a API de integra\u00e7\u00f5es?</strong></summary>

Endpoints para sistemas externos (ERP, RH) com **API key** por tenant, documentados na vista Integra\u00e7\u00f5es (ADM). Rate limit dedicado.
</details>

<details>
<summary><strong>44. Por que RabbitMQ?</strong></summary>

Desacopla a\u00e7\u00f5es pesadas (e-mails, eventos) do pedido HTTP. Worker \`assetra-events-worker\` consome a fila em produ\u00e7\u00e3o.
</details>

<details>
<summary><strong>45. Anexos antigos d\u00e3o 404 em produ\u00e7\u00e3o. Por qu\u00ea?</strong></summary>

Redeploy no Render apaga disco local. Solu\u00e7\u00f5es: reenviar anexos, migrar ficheiros locais com \`npm run uploads:migrate-gridfs\` (backend), ou usar anexos j\u00e1 guardados no GridFS ap\u00f3s deploy recente.
</details>

<details>
<summary><strong>46. Como testar e-mail localmente?</strong></summary>

SMTP Gmail funciona em **localhost**. No Render free use **Brevo** ou **Resend** (HTTPS). Ver [docs/configurar-brevo.md](docs/configurar-brevo.md).
</details>

<details>
<summary><strong>47. Existem testes automatizados?</strong></summary>

H\u00e1 testes no backend (\`npm test --prefix backend\`). A cobertura n\u00e3o \u00e9 total; valida\u00e7\u00e3o manual e cen\u00e1rios do TCC complementam.
</details>

---

## Deploy e opera\u00e7\u00e3o

<details>
<summary><strong>48. Onde hospedar frontend e backend?</strong></summary>

**Vercel** (SPA + proxy \`/api\`) e **Render** (API + worker), conforme [docs/deploy-vercel-render.md](docs/deploy-vercel-render.md) e \`render.yaml\`.
</details>

<details>
<summary><strong>49. Vari\u00e1veis obrigat\u00f3rias em produ\u00e7\u00e3o?</strong></summary>

\`JWT_SECRET\`, \`MONGODB_URL\`, \`DATABASE_URL\`, \`CORS_ORIGIN\`, \`FRONTEND_URL\`, \`RABBITMQ_URL\`, credenciais de e-mail (\`BREVO_API_KEY\` ou \`RESEND_API_KEY\`), \`VITE_GOOGLE_CLIENT_ID\` na Vercel.
</details>

<details>
<summary><strong>50. O Assetra \u00e9 open source? Posso contribuir?</strong></summary>

Consulte a licen\u00e7a do reposit\u00f3rio. Contribui\u00e7\u00f5es via Pull Request s\u00e3o bem-vindas: descreva o problema, passos de teste e n\u00e3o inclua \`.env\` nem segredos.
</details>

---

## Ainda com d\u00favidas?

Abra uma **issue** no GitHub com: perfil utilizado, passos para reproduzir, print ou mensagem de erro da API, e ambiente (local ou produ\u00e7\u00e3o).

---

<sub>Assetra \u00b7 FAQ para utilizadores, avaliadores de TCC e equipas de desenvolvimento</sub>
`

fs.writeFileSync(out, text, 'utf8')
console.log('FAQ.md escrito:', out)
