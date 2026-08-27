// SUPERADO — a inicialização do Sentry no cliente vive agora em
// `src/instrumentation-client.ts` (convenção mais nova do Next.js,
// necessária porque este arquivo aqui simplesmente não é carregado sob
// Turbopack, que é o que `pnpm dev` usa neste projeto — ver aviso de
// depreciação do próprio SDK). Arquivo mantido vazio (não apagado, o
// sandbox desta sessão negou exclusão de arquivo) só para não haver
// dúvida de que ele não faz mais nada — pode remover com segurança.
export {};
