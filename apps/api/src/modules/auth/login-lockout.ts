export const LOGIN_MAX_FAILURES = 8;
export const LOGIN_FAILURE_WINDOW_MS = 15 * 60 * 1000;
export const LOGIN_LOCK_MS = 15 * 60 * 1000;

interface Entry {
  failures: number[];
  lockedUntil: number;
}

/**
 * Trava por CONTA (e-mail), complementando o limite por IP do throttler:
 * quem tenta senhas trocando de IP (rede de bots, proxies) ainda esbarra
 * aqui. Depois de `LOGIN_MAX_FAILURES` erros em 15 min, aquele e-mail fica
 * 15 min sem aceitar login — nem com a senha certa, senão a trava viraria
 * um oráculo ("travou, mas a senha certa passou").
 *
 * Vale igual para e-mail cadastrado ou não (não revela quem tem conta).
 * Redefinir a senha destrava (`clear`), então um ataque para travar a
 * conta de alguém não impede o dono de entrar.
 *
 * Em memória: a API roda numa instância só. Com várias, mover para o Redis.
 * Registrada com `useFactory` em `auth.module.ts` (o relógio injetável é só para os testes).
 */
export class LoginLockout {
  private readonly entries = new Map<string, Entry>();

  constructor(private readonly now: () => number = Date.now) {}

  isLocked(email: string): boolean {
    const entry = this.entries.get(key(email));
    return !!entry && entry.lockedUntil > this.now();
  }

  recordFailure(email: string): void {
    const now = this.now();
    const k = key(email);
    const entry = this.entries.get(k) ?? { failures: [], lockedUntil: 0 };
    entry.failures = entry.failures.filter((at) => now - at < LOGIN_FAILURE_WINDOW_MS);
    entry.failures.push(now);
    if (entry.failures.length >= LOGIN_MAX_FAILURES) {
      entry.lockedUntil = now + LOGIN_LOCK_MS;
      entry.failures = [];
    }
    this.entries.set(k, entry);
    this.sweep(now);
  }

  clear(email: string): void {
    this.entries.delete(key(email));
  }

  /** Evita o mapa crescer sem fim com e-mails inventados. */
  private sweep(now: number): void {
    if (this.entries.size < 10_000) return;
    for (const [k, entry] of this.entries) {
      const recent = entry.failures.some((at) => now - at < LOGIN_FAILURE_WINDOW_MS);
      if (!recent && entry.lockedUntil <= now) this.entries.delete(k);
    }
  }
}

function key(email: string): string {
  return email.trim().toLowerCase();
}
