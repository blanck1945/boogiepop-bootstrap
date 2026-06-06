FROM node:22-bookworm-slim AS builder

RUN apt-get update && apt-get install -y git && rm -rf /var/lib/apt/lists/*

WORKDIR /app/boogiepop-bootstrap-core
COPY boogiepop-bootstrap-core/package*.json ./
RUN npm ci
COPY boogiepop-bootstrap-core/ ./
RUN npm run build

WORKDIR /app/boogiepop-bootstrap
COPY boogiepop-bootstrap/package*.json ./
RUN npm ci
COPY boogiepop-bootstrap/ ./
RUN npm run build

FROM node:22-bookworm-slim AS runner

ARG TERRAFORM_VERSION=1.9.8
ARG CACHEBUST=1

RUN apt-get update && apt-get install -y \
    git curl unzip ca-certificates awscli \
  && curl -fsSL "https://releases.hashicorp.com/terraform/${TERRAFORM_VERSION}/terraform_${TERRAFORM_VERSION}_linux_arm64.zip" -o /tmp/tf.zip \
  && unzip /tmp/tf.zip -d /usr/local/bin \
  && rm /tmp/tf.zip \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app
ENV NODE_ENV=production

COPY --from=builder /app/boogiepop-bootstrap-core /app/boogiepop-bootstrap-core
COPY --from=builder /app/boogiepop-bootstrap/package*.json ./
COPY --from=builder /app/boogiepop-bootstrap/node_modules ./node_modules
COPY --from=builder /app/boogiepop-bootstrap/dist ./dist
RUN ln -sfn ../boogiepop-bootstrap-core node_modules/boogiepop-bootstrap-core
COPY boogiepop-bootstrap/docker/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

EXPOSE 3100
ENTRYPOINT ["/entrypoint.sh"]
