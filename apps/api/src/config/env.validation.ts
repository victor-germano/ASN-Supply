import { z } from 'zod';

/** URL opcional — painéis de hospedagem costumam mandar a variável vazia em vez de omiti-la. */
const optionalUrl = z.preprocess(
  (value) => (value === '' ? undefined : value),
  z.string().url().optional(),
);

/**
 * Schema de variáveis de ambiente. Falha rápido e alto (na inicialização,
 * não em runtime aleatório) se algo obrigatório estiver ausente ou com
 * formato inválido — evita subir a API "meio configurada" em produção.
 */
const envSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    PORT: z.coerce.number().int().positive().default(3400),
    // Reservada (cache/filas futuros) — nada na API conecta no Redis hoje,
    // então a hospedagem não precisa de um.
    REDIS_URL: optionalUrl,
    JWT_SECRET: z.string().min(32, 'JWT_SECRET deve ter ao menos 32 caracteres'),
    JWT_EXPIRES_IN: z.string().default('15m'),
    JWT_REFRESH_EXPIRES_IN: z.string().default('30d'),
    // Login social — mesmo padrão porta/adapter do resto do projeto: sem as
    // duas chaves, `GoogleStrategy` nem é registrada (ver `AuthModule`) e o
    // botão "Continuar com Google" nem aparece no site (ver `SocialLoginButtons`
    // na web, gated por `NEXT_PUBLIC_GOOGLE_OAUTH_ENABLED`). URL de callback
    // tem default de dev (`:3400`) — precisa bater com o que for cadastrado
    // no Google Cloud Console em produção.
    GOOGLE_OAUTH_CLIENT_ID: z.string().optional(),
    GOOGLE_OAUTH_CLIENT_SECRET: z.string().optional(),
    GOOGLE_OAUTH_CALLBACK_URL: z
      .string()
      .url()
      .default('http://localhost:3400/v1/auth/google/callback'),
    APPLE_OAUTH_CLIENT_ID: z.string().optional(),
    STRIPE_SECRET_KEY: z.string().optional(),
    STRIPE_WEBHOOK_SECRET: z.string().optional(),
    MERCADO_PAGO_ACCESS_TOKEN: z.string().optional(),
    // PIX direto na chave da loja (`PixPaymentGateway`) — sem PIX_KEY, o
    // checkout continua com `NullPaymentGateway` ("pagamento em breve").
    // Nome/cidade aparecem no app do banco de quem paga; precisam bater com
    // o titular da chave, senão alguns bancos alertam o cliente.
    PIX_KEY: z.string().optional(),
    PIX_RECEIVER_NAME: z.string().optional(),
    PIX_RECEIVER_CITY: z.string().optional(),
    // Chave pessoal com nome da loja no PIX: como o titular aparece no banco
    // de quem paga (ex: "Maria S."). Preenchida = aviso na tela de pagamento.
    PIX_HOLDER_DISPLAY_NAME: z.string().optional(),
    // Upload de imagem no painel admin — ver `ImageUploader`/`uploads.module.ts`.
    // Único adapter desde a Fase 7 da migração (o fallback que guardava a
    // imagem no Postgres saiu junto com o Prisma) — por isso é obrigatória em
    // produção (ver `.refine` abaixo), mesmo sendo `z.string().optional()`
    // aqui (opcional só pra não travar o `validateEnv` em dev/teste sem ela).
    CLOUDINARY_URL: z.string().optional(),
    // Reservadas — alternativa a Cloudinary nunca implementada (só um dos
    // dois adapters foi construído; mesmo espírito de só ter
    // `NullPaymentGateway` até um gateway real ser escolhido).
    AWS_S3_BUCKET: z.string().optional(),
    AWS_REGION: z.string().optional(),
    AWS_ACCESS_KEY_ID: z.string().optional(),
    AWS_SECRET_ACCESS_KEY: z.string().optional(),
    ASN_ANTHROPIC_API_KEY: z.string().optional(),
    // E-mail transacional (reset de senha, verificação, confirmação de
    // pedido) — ver EmailModule. Prioridade: RESEND_API_KEY → SMTP_HOST →
    // ConsoleEmailSender (loga em vez de enviar de verdade). EMAIL_FROM é
    // opcional: cada adapter tem o próprio default (ver Resend/SmtpEmailSender).
    RESEND_API_KEY: z.string().optional(),
    SMTP_HOST: z.string().optional(),
    SMTP_PORT: z.coerce.number().int().positive().default(587),
    SMTP_USER: z.string().optional(),
    SMTP_PASS: z.string().optional(),
    EMAIL_FROM: z.string().optional(),
    // SMS/WhatsApp (código de senha por SMS e lembrete "sentimos sua falta")
    // — ver `MessagingModule`. Sem as três, as mensagens só vão pro log.
    TWILIO_ACCOUNT_SID: z.string().optional(),
    TWILIO_AUTH_TOKEN: z.string().optional(),
    TWILIO_FROM: z.string().optional(),
    // Lembrete pra quem viu/escolheu produto e saiu sem comprar — só para
    // quem autorizou no cadastro (ver `RecoveryReminderService`).
    RECOVERY_REMINDERS_ENABLED: z
      .enum(['true', 'false'])
      .default('true')
      .transform((value) => value === 'true'),
    RECOVERY_REMINDER_DELAY_MINUTES: z.coerce.number().int().min(5).default(60),
    // URL pública do site — usada pra montar links dentro dos e-mails
    // (redefinir senha, confirmar e-mail, ver pedido). Independente de
    // CORS_ALLOWED_ORIGINS (que pode ter mais de uma origem); esta é sempre
    // uma única URL canônica.
    WEB_APP_URL: z.string().url().default('http://localhost:3100'),
    // Observability — sem SENTRY_DSN, `Sentry.init` roda com dsn vazio e
    // não manda nada pra lugar nenhum (comportamento padrão do SDK, não
    // uma checagem nossa) — dev/CI não dependem de conta no Sentry.
    SENTRY_DSN: z.string().optional(),
    CORS_ALLOWED_ORIGINS: z.string().default('http://localhost:3100'),
    // Segredo compartilhado com o servidor do site (mesmo valor nos dois
    // `.env`) — sem ele, o rate limit trata a loja inteira como um único
    // visitante (ver `common/guards/throttle-identity.ts`).
    INTERNAL_API_KEY: z
      .string()
      .min(32, 'INTERNAL_API_KEY deve ter ao menos 32 caracteres')
      .optional(),
    // Quantos proxies (balanceador da hospedagem, Cloudflare...) ficam na
    // frente da API. 0 = nenhum: o IP da conexão é o do cliente. Com
    // proxy e 0, todo acesso direto à API pareceria vir de um IP só.
    // Nunca maior que o número real de proxies, senão o cliente forja o IP
    // via `X-Forwarded-For` e escapa do limite de tentativas.
    TRUST_PROXY_HOPS: z.coerce.number().int().min(0).max(5).default(0),
    // LEGADO — não usada mais. O acesso administrativo agora é Role.ADMIN +
    // JWT (ver AuthModule/RolesGuard), não bearer token fixo. Ver comentário
    // em `apps/api/src/modules/admin/admin.module.ts`.
    ADMIN_API_KEY: z.string().optional(),
    // JSON da service account do Firebase, em base64 numa linha só — evita o
    // problema conhecido de chave privada multi-linha quebrar na UI de
    // variáveis do Railway. Obrigatória em produção (ver `.refine` abaixo) —
    // é a única fonte de dados da aplicação desde a Fase 7 da migração
    // Postgres→Firestore (ver plano em
    // C:\Users\vgerm\.claude\plans\refactored-nibbling-corbato.md).
    // Alternativa só para dev local: `GOOGLE_APPLICATION_CREDENTIALS`
    // apontando pro arquivo da service account (lido direto via
    // `process.env`, fora deste schema) — ver `firebase-admin.ts`.
    // Sem variável de bucket: upload de imagem usa Cloudinary, não o
    // Firebase Storage (ver `CLOUDINARY_URL` e `firestore.service.ts`).
    FIREBASE_SERVICE_ACCOUNT_BASE64: z.string().optional(),
    // Busca/filtro do catálogo — índice `products` e suas réplicas de
    // ordenação (ver `AlgoliaService`).
    ALGOLIA_APP_ID: z.string().optional(),
    ALGOLIA_ADMIN_API_KEY: z.string().optional(),
    ALGOLIA_INDEX_NAME: z.string().default('products'),
  })
  .refine((env) => !env.PIX_KEY || (env.PIX_RECEIVER_NAME && env.PIX_RECEIVER_CITY), {
    message:
      'PIX_KEY exige PIX_RECEIVER_NAME e PIX_RECEIVER_CITY (aparecem no app do banco de quem paga)',
    path: ['PIX_KEY'],
  })
  // Em produção sem a chave, o limite de login vale para a loja inteira
  // (ver `throttle-identity.ts`) — melhor não subir do que subir assim.
  .refine((env) => env.NODE_ENV !== 'production' || env.INTERNAL_API_KEY, {
    message: 'INTERNAL_API_KEY é obrigatória em produção (mesmo valor no .env do site)',
    path: ['INTERNAL_API_KEY'],
  })
  // Único adapter de upload de imagem desde a Fase 7 (o fallback que
  // guardava a imagem no Postgres saiu junto com o Prisma) — sem ela, a
  // rota de upload do painel nem sobe.
  .refine((env) => env.NODE_ENV !== 'production' || env.CLOUDINARY_URL, {
    message: 'CLOUDINARY_URL é obrigatória em produção (upload de imagem do painel admin)',
    path: ['CLOUDINARY_URL'],
  })
  // Única fonte de dados da aplicação desde a Fase 7 da migração
  // Postgres→Firestore.
  .refine((env) => env.NODE_ENV !== 'production' || env.FIREBASE_SERVICE_ACCOUNT_BASE64, {
    message: 'FIREBASE_SERVICE_ACCOUNT_BASE64 é obrigatória em produção',
    path: ['FIREBASE_SERVICE_ACCOUNT_BASE64'],
  })
  // O valor do `.env.example` é público (está no GitHub): com ele, qualquer
  // um assinaria um token de administrador.
  .refine(
    (env) => env.NODE_ENV !== 'production' || !env.JWT_SECRET.startsWith('troque-este-valor'),
    {
      message: 'JWT_SECRET ainda é o valor de exemplo — gere um segredo próprio para produção',
      path: ['JWT_SECRET'],
    },
  );

export type EnvConfig = z.infer<typeof envSchema>;

export function validateEnv(config: Record<string, unknown>): EnvConfig {
  const parsed = envSchema.safeParse(config);

  if (!parsed.success) {
    const formatted = parsed.error.issues
      .map((issue) => `  • ${issue.path.join('.')}: ${issue.message}`)
      .join('\n');
    throw new Error(`Configuração de ambiente inválida:\n${formatted}`);
  }

  return parsed.data;
}
