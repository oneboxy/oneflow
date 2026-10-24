FROM node:22-alpine

WORKDIR /app

COPY package.json ./
COPY server.js ./
COPY data/.gitkeep data/.gitkeep

ENV NODE_ENV=production
ENV ONEFLOW_API_PORT=4100

EXPOSE 4100

CMD ["node", "server.js"]
