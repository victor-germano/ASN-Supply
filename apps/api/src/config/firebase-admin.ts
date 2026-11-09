/**
 * Ponto único de inicialização do Firebase Admin SDK — usado tanto pelo
 * Nest (via FirestoreModule) quanto pelos scripts standalone (seed,
 * create-admin, etc.), que não passam pelo DI do Nest. Idempotente: chamar
 * mais de uma vez devolve o mesmo app, nunca inicializa duas vezes.
 *
 * Migração Postgres→Firestore em andamento — ver plano em
 * C:\Users\vgerm\.claude\plans\refactored-nibbling-corbato.md.
 *
 * Credencial, em ordem de prioridade:
 *   1. FIREBASE_SERVICE_ACCOUNT_BASE64 — o JSON da service account em
 *      base64 numa linha só. Único caminho suportado em produção: evita o
 *      problema conhecido de chave privada multi-linha quebrar na UI de
 *      variáveis do Railway.
 *   2. GOOGLE_APPLICATION_CREDENTIALS — caminho pro arquivo da service
 *      account. Só para dev local, quando é mais prático apontar pro
 *      arquivo baixado do Firebase Console do que colar o base64 no `.env`.
 */
import { readFileSync } from 'node:fs';
import { cert, getApps, initializeApp, applicationDefault, type App } from 'firebase-admin/app';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';

function loadCredential() {
  const base64 = process.env.FIREBASE_SERVICE_ACCOUNT_BASE64;
  if (base64) {
    const json = Buffer.from(base64, 'base64').toString('utf8');
    return cert(JSON.parse(json));
  }

  if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    return applicationDefault();
  }

  throw new Error(
    'Nenhuma credencial do Firebase configurada — defina FIREBASE_SERVICE_ACCOUNT_BASE64 ' +
      '(produção) ou GOOGLE_APPLICATION_CREDENTIALS (dev local, arquivo da service account).',
  );
}

let app: App | undefined;

export function getFirebaseApp(): App {
  if (app) return app;

  const [firstApp] = getApps();
  if (firstApp) {
    app = firstApp;
    return app;
  }

  app = initializeApp({
    credential: loadCredential(),
  });
  return app;
}

export function getDb(): Firestore {
  return getFirestore(getFirebaseApp());
}

/** Só pra conferir a credencial rapidamente (scripts, smoke test da Fase 1). */
export function readServiceAccountProjectId(): string | null {
  const base64 = process.env.FIREBASE_SERVICE_ACCOUNT_BASE64;
  if (base64) {
    const json = JSON.parse(Buffer.from(base64, 'base64').toString('utf8'));
    return json.project_id ?? null;
  }
  const path = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (path) {
    const json = JSON.parse(readFileSync(path, 'utf8'));
    return json.project_id ?? null;
  }
  return null;
}
