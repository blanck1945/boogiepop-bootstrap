FROM node:22-bookworm-slim AS builder

RUN apt-get update && apt-get install -y git && rm -rf /var/lib/apt/lists/*

WORKDIR /app/core
COPY boogiepop-bootstrap-core/package*.json ./
RUN npm ci
COPY boogiepop-bootstrap-core/ ./
RUN npm run build

WORKDIR /app/ms
COPY boogiepop-bootstrap/package*.json ./
RUN npm ci
COPY boogiepop-bootstrap/ ./
RUN npm run build

FROM node:22-bookworm-slim AS runner

ARG TERRAFORM_VERSION=1.9.8

RUN apt-get update && apt-get install -y \
    git curl unzip ca-certificates awscli \
  && curl -fsSL "https://releases.hashicorp.com/terraform/${TERRAFORM_VERSION}/terraform_${TERRAFORM_VERSION}_linux_arm64.zip" -o /tmp/tf.zip \
  && unzip /tmp/tf.zip -d /usr/local/bin \
  && rm /tmp/tf.zip \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app
ENV NODE_ENV=production

COPY --from=builder /app/core /app/core
COPY --from=builder /app/ms/package*.json ./
COPY --from=builder /app/ms/node_modules ./node_modules
COPY --from=builder /app/ms/dist ./dist
COPY boogiepop-bootstrap/docker/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

EXPOSE 3100
ENTRYPOINT ["/entrypoint.sh"]
