FROM node:20-bookworm-slim

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY src ./src
COPY scripts ./scripts
COPY test ./test
COPY README.md ./README.md

ENV NODE_ENV=production
EXPOSE 4000

CMD ["npm", "start"]
