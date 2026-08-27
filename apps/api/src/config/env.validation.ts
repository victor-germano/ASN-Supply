import { z } from 'zod';

/**
 * Schema de variáveis de ambiente. Falha rápido e alto (na inicialização,
 * não em runtime aleatório) se algo obrigatório estiver ausente ou com
 * formato inválido — evita subir a API "meio configurada" em produção.
 */
const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3333),
  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().url(),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET deve ter ao menos 32 caracteres'),
  JWT_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('30d'),
  GOOGLE_OAUTH_CLIENT_ID: z.string().optional(),
  GOOGLE_OAUTH_CLIENT_SECRET: z.string().optional(),
  APPLE_OAUTH_CLIENT_ID: z.string().optional(),
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
  MERCADO_PAGO_ACCESS_TOKEN: z.string().optional(),
  CLOUDINARY_URL: z.string().optional(),
  AWS_S3_BUCKET: z.string().optional(),
  AWS_REGION: z.string().optional(),
  AWS_ACCESS_KEY_ID: z.string().optional(),
  AWS_SECRET_ACCESS_KEY: z.string().optional(),
  ANTHROPIC_API_KEY: z.string().optional(),
  // E-mail transacional (reset de senha, verificação, confirmação de
  // pedido) — ver EmailModule. Sem RESEND_API_KEY, cai no
  // ConsoleEmailSender (loga em vez de enviar de verdade); EMAIL_FROM só
  // importa quando a chave existe.
  RESEND_API_KEY: z.string().optional(),
  EMAIL_FROM: z.string().default('ASN Supply <onboarding@resend.dev>'),
  // URL pública do site — usada pra montar links dentro dos e-mails
  // (redefinir senha, confirmar e-mail, ver pedido). Independente de
  // CORS_ALLOWED_ORIGINS (que pode ter mais de uma origem); esta é sempre
  // uma única URL canônica.
  WEB_APP_URL: z.string().url().default('http://localhost:3000'),
  // Observability — sem SENTRY_DSN, `Sentry.init` roda com dsn vazio e
  // não manda nada pra lugar nenhum (comportamento padrão do SDK, não
  // uma checagem nossa) — dev/CI não dependem de conta no Sentry.
  SENTRY_DSN: z.string().optional(),
  CORS_ALLOWED_ORIGINS: z.string().default('http://localhost:3000'),
  // LEGADO — não usada mais. O acesso administrativo agora é Role.ADMIN +
  // JWT (ver AuthModule/RolesGuard), não bearer token fixo. Ver comentário
  // em `apps/api/src/modules/admin/admin.module.ts`.
  ADMIN_API_KEY: z.string().optional(),
});

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
