# Site da ASN Supply. Contexto de build = RAIZ do repositório (monorepo):
#   docker build -f apps/web/Dockerfile -t asn-web \
#     --build-arg NEXT_PUBLIC_SITE_URL=https://seudominio.com.br \
#     --build-arg NEXT_PUBLIC_API_URL=https://api.seudominio.com.br/v1 .
#
# A API precisa estar NO AR durante o build: as páginas do catálogo são
# geradas com os dados dela. Publique a API primeiro. Ver docs/DEPLOY.md.
FROM node:20-slim

RUN corepack enable
ENV HUSKY=0
WORKDIR /repo

COPY pnpm-lock.yaml pnpm-workspace.yaml package.json .npmrc ./
COPY packages ./packages
COPY apps/web ./apps/web
RUN pnpm install --frozen-lockfile --filter @asn/web...

# `NEXT_PUBLIC_*` entram no código do navegador NO BUILD — mudar depois
# exige gerar a imagem de novo.
ARG NEXT_PUBLIC_SITE_URL
ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_PIX_ENABLED=true
ARG NEXT_PUBLIC_CONTACT_EMAIL
ARG NEXT_PUBLIC_LEGAL_ID
ARG NEXT_PUBLIC_PLAUSIBLE_DOMAIN
ARG NEXT_PUBLIC_GOOGLE_OAUTH_ENABLED
ARG INTERNAL_API_KEY
ENV NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL \
  NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL \
  NEXT_PUBLIC_PIX_ENABLED=$NEXT_PUBLIC_PIX_ENABLED \
  NEXT_PUBLIC_CONTACT_EMAIL=$NEXT_PUBLIC_CONTACT_EMAIL \
  NEXT_PUBLIC_LEGAL_ID=$NEXT_PUBLIC_LEGAL_ID \
  NEXT_PUBLIC_PLAUSIBLE_DOMAIN=$NEXT_PUBLIC_PLAUSIBLE_DOMAIN \
  NEXT_PUBLIC_GOOGLE_OAUTH_ENABLED=$NEXT_PUBLIC_GOOGLE_OAUTH_ENABLED \
  NEXT_TELEMETRY_DISABLED=1

RUN pnpm --filter @asn/types build \
  && pnpm --filter @asn/ui build \
  && INTERNAL_API_KEY=$INTERNAL_API_KEY pnpm --filter @asn/web build

WORKDIR /repo/apps/web
ENV NODE_ENV=production
EXPOSE 3100

# A hospedagem costuma informar a porta em $PORT; sem ela, 3100.
CMD ["sh", "-c", "pnpm exec next start -p ${PORT:-3100}"]
