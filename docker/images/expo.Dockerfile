FROM node:20-bookworm

ARG DEBIAN_FRONTEND=noninteractive

RUN apt-get update && apt-get install -y --no-install-recommends \
    bash \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Required for `expo start --host tunnel` without interactive prompts.
RUN npm install -g @expo/ngrok@^4.1.0

WORKDIR /workspace/TreeGuardiansExpo
