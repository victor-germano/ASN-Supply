# API da ASN Supply. Contexto de build = RAIZ do repositório (monorepo):
#   docker build -f apps/api/Dockerfile -t asn-api .
# Variáveis de ambiente em tempo de execução: ver docs/DEPLOY.md.
FROM node:20-slim

# openssl: exigido pelo motor do Prisma.
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates \
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
  && pnpm --filter @asn/api exec prisma generate \
  && pnpm --filter @asn/api build

WORKDIR /repo/apps/api
ENV NODE_ENV=production
EXPOSE 3400

# `migrate deploy` a cada subida: aplica só as migrações que faltam e nunca
# apaga dados — o banco fica sempre na versão do código que está no ar.
CMD ["sh", "-c", "pnpm exec prisma migrate deploy && node dist/main.js"]
