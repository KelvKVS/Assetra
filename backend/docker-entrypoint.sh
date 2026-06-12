#!/bin/sh
set -e

echo "Aguardando sincronização do Prisma..."
# Sincroniza o provider (postgresql) e gera o client
npm run prisma:generate

echo "Garantindo que o banco de dados está atualizado (prisma db push)..."
# Em um ambiente de escala, idealmente isso rodaria em um job separado, 
# mas para demonstração local, as réplicas podem rodar com segurança.
npm run prisma:push

echo "Iniciando a aplicação..."
exec "$@"
