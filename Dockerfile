FROM node:20-alpine

WORKDIR /app

# Copia todos os arquivos do projeto
COPY . .

EXPOSE 3456

CMD ["node", "server.js"]
