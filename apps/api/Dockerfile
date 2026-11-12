# API da ASN Supply. Contexto de build = RAIZ do repositório (monorepo):
#   docker build -f apps/api/Dockerfile -t asn-api .
# Variáveis de ambiente em tempo de execução: ver docs/DEPLOY.md.
FROM node:20-slim

RUN apt-get update && apt-get install -y --no-install-recommends ca-certificates \
  && rm -rf /var/lib/apt/lists/* \
  && corepack enable

# Sem git dentro da imagem — o `prepare` (husky) não tem o que instalar.
ENV HUSKY=0
WORKDIR /repo

COPY pnpm-lock.yaml pnpm-workspace.yaml package.json .npmrc ./
COPY packages ./packages
COPY apps/api ./apps/api
RUN pnpm install --frozen-lockfile --filter @asn/api...

RUN pnpm --filter @asn/types build \
  && pnpm --filter @asn/api build

WORKDIR /repo/apps/api
ENV NODE_ENV=production
EXPOSE 3400

CMD ["node", "dist/main.js"]
