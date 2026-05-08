# Padrões de Projeto e Clean Code no Assetra

## Padrões já presentes

- **Service Layer**: regras de negócio centralizadas em `backend/src/services`.
- **Repository implícito via ORM/ODM**: Prisma e Mongoose encapsulam acesso a dados.
- **Middleware Pipeline**: autenticação/autorização e validação no Express.
- **Observer/Event-Driven**: eventos de domínio (`maintenance.*`, `approval.*`) publicados no event bus.
- **Circuit Breaker**: proteção de falhas no broker em `backend/src/utils/circuitBreaker.js`.

## Adapter (implementado)

Para reduzir acoplamento entre domínio e detalhes de broker:

- `backend/src/adapters/eventBus/rabbitMqAdapter.js`
- `backend/src/adapters/eventBus/kafkaAdapter.js`

O `backend/src/lib/eventBus.js` agora atua como orquestrador e seleciona o adapter por `EVENT_BROKER_DRIVER`.

## Avaliação de Clean Code

### Pontos positivos

- Funções e serviços com responsabilidades claras em boa parte do backend.
- Validação de entrada com Zod.
- Erros de domínio com `AppError`.
- Separação razoável entre rotas e regras de negócio.

### Pontos melhorados nesta rodada

- Remoção de falhas silenciosas em publicação de eventos (`publishDomainEventSafely`).
- Melhor isolamento de infraestrutura com Adapter para brokers.
- Observabilidade mais consistente com logs estruturados e `/api/metrics`.

## JavaScript + TypeScript no mesmo projeto: está certo?

Sim, é válido e comum em projetos full stack:

- **Frontend** em TypeScript (`src/**/*.ts`) para segurança de tipos em UI/estado.
- **Backend** em JavaScript ESM (`backend/src/**/*.js`) para velocidade de iteração.

Isso não está "errado". O custo é manter dois estilos no mesmo repositório.

## Recomendação de evolução

Se quiser máxima padronização, migrar backend para TypeScript por fases:

1. Ativar checagem com `// @ts-check` em arquivos críticos.
2. Converter utilitários/middlewares primeiro.
3. Converter services e rotas por domínio.
4. Adicionar `tsconfig` no backend e build incremental.
