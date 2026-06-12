FROM node:20-alpine

WORKDIR /app

# Instalar dependências necessárias para o Prisma (se necessário)
RUN apk add --no-cache openssl

COPY package*.json ./

# Instalar dependências
RUN npm install

# Copiar o resto do código
COPY . .

# Garantir que o script de entrada tem permissão de execução
RUN chmod +x docker-entrypoint.sh

# Ajustar o provider do Prisma e gerar o client (cache inicial)
RUN npm run prisma:generate

# Expor a porta que o app escuta
EXPOSE 3000

# Usar o script de entrada para rodar migrations/push
ENTRYPOINT ["./docker-entrypoint.sh"]

# Comando para iniciar o servidor
CMD ["npm", "start"]
