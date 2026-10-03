/**
 * Regras do lembrete "sentimos sua falta" — puras e testadas à parte
 * (`recovery-policy.spec.ts`), porque é aqui que mora o respeito ao
 * cliente: um lembrete gentil vira spam se qualquer uma falhar.
 */

/** No máximo um lembrete por cliente nesta janela. */
export const RECOVERY_COOLDOWN_DAYS = 7;
/** Interesse mais antigo que isto já não vale um lembrete. */
export const RECOVERY_MAX_AGE_HOURS = 24;
/** Envio só em horário comercial de Brasília (início inclusivo, fim exclusivo). */
export const RECOVERY_SEND_WINDOW = { startHour: 9, endHour: 20 } as const;

export interface RecoveryCandidate {
  marketingOptIn: boolean;
  phone: string | null;
  /** Última interação com produto (ver, adicionar ao carrinho). */
  lastActivityAt: Date;
  lastOrderAt: Date | null;
  lastReminderAt: Date | null;
}

export type RecoveryDecision =
  | { send: true }
  | {
      send: false;
      reason:
        | 'no-consent'
        | 'no-phone'
        | 'still-browsing'
        | 'too-old'
        | 'purchased'
        | 'cooldown'
        | 'quiet-hours';
    };

export function decideRecovery(
  candidate: RecoveryCandidate,
  now: Date,
  delayMinutes: number,
): RecoveryDecision {
  if (!candidate.marketingOptIn) return { send: false, reason: 'no-consent' };
  if (!candidate.phone) return { send: false, reason: 'no-phone' };

  const sinceActivity = now.getTime() - candidate.lastActivityAt.getTime();
  // Ainda dentro do atraso = pode estar navegando agora; ninguém quer SMS
  // da loja que está aberta na tela.
  if (sinceActivity < delayMinutes * 60_000) return { send: false, reason: 'still-browsing' };
  if (sinceActivity > RECOVERY_MAX_AGE_HOURS * 3_600_000) return { send: false, reason: 'too-old' };

  // Comprou depois de ver o produto: missão cumprida, nada a lembrar.
  if (candidate.lastOrderAt && candidate.lastOrderAt >= candidate.lastActivityAt) {
    return { send: false, reason: 'purchased' };
  }
  if (
    candidate.lastReminderAt &&
    now.getTime() - candidate.lastReminderAt.getTime() < RECOVERY_COOLDOWN_DAYS * 86_400_000
  ) {
    return { send: false, reason: 'cooldown' };
  }
  if (!isWithinSendWindow(now)) return { send: false, reason: 'quiet-hours' };

  return { send: true };
}

/** Hora local de Brasília, independente do fuso do servidor (que em hospedagem costuma ser UTC). */
export function isWithinSendWindow(now: Date): boolean {
  const hour = Number(
    new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/Sao_Paulo',
      hour: 'numeric',
      hourCycle: 'h23',
    }).format(now),
  );
  return hour >= RECOVERY_SEND_WINDOW.startHour && hour < RECOVERY_SEND_WINDOW.endHour;
}

/** "Maria Aparecida Souza" → "Maria" — SMS gentil chama pelo primeiro nome. */
export function firstNameOf(fullName: string): string {
  return fullName.trim().split(/\s+/)[0] ?? fullName;
}
