FROM node:20-bookworm-slim AS base

ENV WORKSPACE_ROOT=/workspace
ENV SERVER_DIR=/workspace/server
ENV EXPO_DIR=/workspace/TreeGuardiansExpo

WORKDIR /workspace

FROM base AS production

WORKDIR /workspace/server

COPY server/package.json server/package-lock.json ./
RUN npm ci

COPY server/bootstrap.js ./bootstrap.js
COPY server/app.js ./app.js
COPY server/src ./src
COPY server/scripts ./scripts
COPY server/test ./test
COPY server/README.md ./README.md

ENV NODE_ENV=production
EXPOSE 4000

CMD ["npm", "start"]

FROM base AS development

RUN apt-get update && apt-get install -y --no-install-recommends \
	bash \
	ca-certificates \
	g++ \
	git \
	make \
	python3 \
	&& rm -rf /var/lib/apt/lists/*

COPY server/scripts/docker-entrypoint.dev.sh /usr/local/bin/server-dev-entrypoint.sh
RUN chmod +x /usr/local/bin/server-dev-entrypoint.sh

WORKDIR /workspace/server
EXPOSE 4000 8081 19000 19001 19002 19006

CMD ["/usr/local/bin/server-dev-entrypoint.sh"]
