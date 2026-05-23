# 6 Manual do utilizador — Assetra

Este guia é para **quem vai usar o sistema no dia a dia**, sem conhecimento técnico de programação. O objetivo é que consiga **concluir tarefas** com segurança, passo a passo.

> **Sobre as imagens:** onde vê uma caixa com nome de ficheiro (por exemplo `01-login.png`), deve existir uma **captura de ecrã** sua na pasta `docs/manual-usuario-imagens/`, com **setas ou números** por cima, como explicado no ficheiro `LEIA-ME-CAPTURAS.md` na mesma pasta.

---

## Antes de começar (o que precisa)

| Item | Recomendação |
|------|----------------|
| **Computador ou tablet** | Computador com rato e teclado é mais confortável para formulários longos. |
| **Navegador** | **Google Chrome** ou **Microsoft Edge** (versões recentes). Evite navegadores muito antigos. |
| **Ligação à Internet** | Necessária se o sistema estiver na nuvem (por exemplo após o deploy). Em teste na sua máquina, o técnico de informática indica o endereço a abrir. |
| **Resolução de ecrã** | Ideal: **1366 × 768** ou superior (por exemplo **1920 × 1080**). Se o ecrã for pequeno, use zoom 100% no navegador. |
| **Dados de acesso** | E-mail e palavra-passe fornecidos pela sua organização. Para **teste ou avaliação** após executar o carregamento inicial de dados (`npm run db:seed` no projeto), pode usar as contas de demonstração na tabela abaixo. |

### Credenciais de demonstração (após `db:seed`)

Use a organização **default** no campo da organização (slug), salvo indicação em contrário.

| Perfil | E-mail para entrar | Palavra-passe |
|--------|---------------------|---------------|
| Administrador | `admin@assetra.local` | `senha123` |
| Gestor | `gestor@assetra.local` | `senha123` |
| Técnico | `tecnico@assetra.local` | `senha123` |

> **Organização “Acme” (demonstração de duas empresas):** se no início de sessão escolher a organização **acme**, o administrador usa o mesmo e-mail `admin@assetra.local` com a palavra-passe **`AcmeDemo@12345`**. Em uso normal, cada empresa tem os seus próprios utilizadores.

---

## Como entrar no sistema

1. Abra o **navegador** e escreva o **endereço** do Assetra que lhe foi indicado (na escola ou na empresa).
2. Na página de **início de sessão**, preencha o **e-mail** e a **palavra-passe**.
3. Se aparecer o campo da **organização**, escreva o nome curto que lhe deram (por exemplo `default`) — confirme com o administrador.
4. Clique no botão **Entrar**.

**Onde clicar (imagem):**

![Início de sessão: indicar e-mail, palavra-passe, organização e o botão Entrar](manual-usuario-imagens/01-login.png)

*Se a mensagem disser que os dados estão incorretos, volte a escrever com atenção (maiúsculas no e-mail não costumam importar; na palavra-passe, sim).*

---

## Estrutura do manual por **tarefas** (não só por “páginas”)

Cada secção abaixo responde a: *“O que quero fazer?”* — siga os números na ordem.

---

### Tarefa A — Ver o painel inicial depois de entrar

1. Após **Entrar**, verá o **painel** com resumo da sua função (administrador, gestor ou técnico).
2. No lado esquerdo está o **menu**. Use-o para saltar entre áreas (Ativos, Manutenções, etc.).

![Painel inicial (exemplo: vista de gestor)](manual-usuario-imagens/02-dashboard-gestor.png)

---

### Tarefa B — Como registar um **novo ativo** (equipamento)

*Quem costuma fazer isto:* normalmente **gestor** ou **administrador**.

1. No menu, abra **Ativos de TI** (ou nome semelhante).
2. Clique em **Novo** / abra o formulário de novo ativo.
3. Preencha pelo menos: **identificação (etiqueta)**, **descrição**, **setor** e **estado**.
4. Se quiser **atribuir** a equipamento a uma pessoa, escolha o e-mail sugerido na lista.
5. Clique em **Guardar** / **Registar** (o botão final do formulário).

![Formulário de novo ativo com os campos principais assinalados](manual-usuario-imagens/03-ativos-novo.png)

*Se um campo obrigatório faltar, o sistema avisa e não grava até corrigir.*

---

### Tarefa C — Como registar uma **movimentação** (mudança de local)

*Quem costuma fazer isto:* **gestor** ou **administrador**.

1. Abra **Movimentações** no menu.
2. Indique o **ativo** (etiqueta), **origem**, **destino** e **responsável**.
3. Use as **sugestões** que aparecem ao escrever, se existirem, para evitar erros de digitação.
4. Clique em **Registar** / **Guardar**.

![Nova movimentação com origem e destino](manual-usuario-imagens/04-movimentacao-nova.png)

---

### Tarefa D — Como abrir um **pedido de manutenção**

*Quem pode:* depende da configuração da sua equipa; muitas vezes **gestor** ou **técnico**.

1. Abra **Manutenções**.
2. Clique para **criar** novo pedido.
3. Escolha o **ativo**, o **tipo** de manutenção, descreva o **problema** e a **prioridade**.
4. Se for preciso **atribuir um técnico**, indique o e-mail do técnico nas sugestões.
5. Pode **anexar fotos** (imagens ou PDF) se o formulário o permitir.
6. Confirme com **Guardar** / **Criar**.

![Novo pedido de manutenção](manual-usuario-imagens/05-manutencao-nova.png)

---

### Tarefa E — Como **aprovar ou reprovar** um pedido (gestor ou administrador)

1. Abra **Aprovações** no menu.
2. Veja a lista de pedidos **pendentes**.
3. Abra o pedido que quer tratar.
4. Escolha **Aprovar** ou **Reprovar** (botões ou ações claras no ecrã).
5. Se lhe for pedida a **palavra-passe** para confirmar, escreva a sua palavra-passe de utilizador e confirme.

![Lista de aprovações](manual-usuario-imagens/06-aprovacoes-lista.png)

![Decisão de aprovação ou reprovação](manual-usuario-imagens/07-aprovacao-responder.png)

*Em fluxos de manutenção, uma reprovação pode **devolver** o trabalho ao técnico ou **reencaminhar** para outro técnico — siga as opções que aparecerem no ecrã.*

---

### Tarefa F — Como o **técnico** vê tarefas e envia conclusão para validação

1. Entre com o perfil **técnico**.
2. Abra **Execução técnica** (ou nome semelhante no menu).
3. Veja a lista de **ordens** atribuídas a si.
4. Avance o estado conforme os botões disponíveis (por exemplo **avançar** etapa).
5. Quando pedir **relatório para validação**, preencha a descrição resumida e confirme com a sua **palavra-passe** se o sistema pedir.

![Vista de execução técnica](manual-usuario-imagens/08-execucao-tecnica.png)

---

### Tarefa G — Como usar o assistente de **solicitações** (com fotos)

1. Abra **Minhas solicitações** no menu.
2. Siga os **passos** indicados no ecrã (assistente).
3. Anexe **ficheiros** quando pedido (fotos do equipamento, documentos).
4. Conclua com **Enviar** ou **Submeter**.

![Assistente de solicitações](manual-usuario-imagens/09-solicitacoes.png)

---

### Tarefa H — Como ver **relatórios** e exportar dados

*Quem costuma:* **gestor** ou **administrador**.

1. Abra **Relatórios** no menu.
2. Opcional: abra **Filtros**, escolha **datas** e **setor**, e clique em **Aplicar**.
3. Para **descarregar** um relatório, clique no cartão desejado (por exemplo ativos ou manutenções) e guarde o ficheiro que o navegador oferece.

![Relatórios e filtros](manual-usuario-imagens/10-relatorios.png)

---

## Glossário de mensagens (o que o sistema quer dizer)

| Mensagem ou situação | O que significa em linguagem simples |
|----------------------|--------------------------------------|
| **“Credenciais inválidas”** / **“Dados de login inválidos”** | O e-mail ou a palavra-passe não coincidem. Verifique teclado (CAPS LOCK), espaços a mais e se escolheu a **organização** certa. |
| **“Acesso negado”** / **“Permissão insuficiente”** | A sua função não pode fazer essa ação. Peça ajuda a um **gestor** ou **administrador**. |
| **“Sessão inválida”** | O sistema deixou de reconhecer a sessão. **Saia** e **entre** de novo. |
| **“Dados inválidos”** | Algum campo está em falta ou no formato errado. Leia a mensagem e corrija os campos assinalados. |
| **“Já existe uma validação pendente…”** | Para essa ordem de manutenção já foi enviado um pedido de validação. Espere a decisão do gestor antes de enviar outro. |
| **“Senha incorreta”** (na confirmação) | A palavra-passe que escreveu para confirmar uma ação sensível não está certa. Tente outra vez. |
| **“Não foi possível carregar…”** / página em branco | Pode ser falha de ligação ou o sistema está indisponível. Atualize a página; se persistir, contacte o suporte informático. |
| **“Muitas tentativas de login”** | Por segurança, o sistema bloqueou tentativas repetidas. Aguarde alguns minutos e tente de novo. |

---

## Perguntas frequentes (FAQ)

**1. Esqueci a minha palavra-passe. O que faço?**  
Peça ao **administrador** da sua organização para repor ou criar uma nova palavra-passe. O sistema não dispõe, neste fluxo, de “esqueci a palavra-passe” automático por e-mail, salvo configuração futura.

**2. O botão **Guardar** / **Entrar** não faz nada.**  
Verifique se todos os **campos obrigatórios** estão preenchidos (muitas vezes há * ou cor a indicar). Veja também se apareceu uma mensagem vermelha no topo ou por baixo do formulário.

**3. Não vejo o menu que o colega descreveu.**  
Cada função (**administrador**, **gestor**, **técnico**) vê opções diferentes. Se precisar de uma área, peça ao administrador para **confirmar o seu perfil**.

**4. As sugestões de e-mail ou nomes não aparecem.**  
Clique dentro do campo e aguarde um instante; às vezes precisa de **escrever uma letra** para filtrar. Se continuar vazio, pode ser falta de permissão para listar utilizadores — fale com o gestor.

**5. O sistema abre mas diz que não está a responder.**  
Confirme a **Internet**, tente **atualizar** a página (F5). Se estiver numa rede da empresa, pode ser bloqueio — contacte o informático com o **endereço** que está a usar.

---

## Resumo para o revisor do relatório

- Este manual foi escrito em **linguagem simples**, por **fluxos de tarefa**.
- As **imagens** devem ser inseridas pelo aluno na pasta `docs/manual-usuario-imagens/`, com os nomes referenciados, **proporção fixa** e **moldura fina** no documento final (Word/PDF), com **setas ou numeração** sobre os prints, conforme `LEIA-ME-CAPTURAS.md`.
- Os botões e ações importantes aparecem em **negrito** no texto (ex.: **Entrar**, **Guardar**).

---

*Fim da secção 6 — Manual do utilizador (Assetra).*
