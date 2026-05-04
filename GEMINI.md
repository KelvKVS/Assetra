# ?? Manual de Operação Gemini - Projeto Assetra

Este arquivo define as diretrizes de comportamento, arquitetura e fluxo de trabalho para o desenvolvimento da plataforma Assetra.

---

## ?? Fonte da Verdade (Mandatório)
Toda nova sessão **DEVE** começar pela leitura do arquivo:
?? docs/checklist-escopo.md

Este arquivo contém o status real da implementação, os requisitos técnicos e o mapa de funcionalidades. **Nunca presuma o estado do projeto sem consultá-lo.**

---

## ??? Padrões de Arquitetura e Design
O Gemini deve seguir rigorosamente os padrões estabelecidos:

1. **Arquitetura Hexagonal (Ports & Adapters):**
   - Isolar a lógica de negócio (Services) de agentes externos (Express, Prisma, Mongoose).
2. **Persistência Poliglota (Polyglot Persistence):**
   - **SQL (PostgreSQL/Prisma):** Gestão de Identidade (IAM), Usuários, Roles e Tenants.
   - **NoSQL (MongoDB/Mongoose):** Inventário de Ativos, Logs de Auditoria e Histórico de Manutenção.
3. **Multi-tenancy:**
   - Todo dado (SQL ou NoSQL) deve possuir e filtrar por 	enantId.
4. **Service Layer & Repositories:**
   - Regras de negócio ficam em ackend/src/services.
   - Evitar lógica complexa diretamente nas rotas (Controllers).

---

## ??? Fluxo de Trabalho Progressivo

1. **Pesquisa:** Validar o que já existe no checklist-escopo.md e no código.
2. **Estratégia:** Propor a implementação seguindo o padrão Hexagonal.
3. **Execução:**
   - Codificar incrementalmente (Models -> Services -> Routes -> Frontend).
   - **Auditoria:** Sempre registrar no histórico do ativo quem realizou a ação.
4. **Validação:** Testar a persistência e o isolamento de Tenant.
5. **Atualização:** Marcar o progresso no docs/checklist-escopo.md.

---

## ?? Regras de Ouro
- **Segurança:** Nunca exponha credenciais; use Cookies HttpOnly para JWT.
- **Feedback:** Toda ação técnica (manutenção/movimentação) deve permitir anexos e comentários detalhados.
- **Limpeza:** Remova códigos mortos ou comentários de debug após a tarefa.
- **Estilo:** Manter o padrão de código já existente no projeto (TypeScript/Vue/Node).

---

## ?? Objetivo Final
Entregar uma plataforma de gestão de ativos robusta, segura e auditável, capaz de servir múltiplas organizações com isolamento total de dados.
