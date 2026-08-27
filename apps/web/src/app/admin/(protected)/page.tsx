import { Heading, Text } from '@asn/ui';

/**
 * Placeholder do Painel Administrativo (Módulo 6) — o que existe até aqui é
 * só o acesso (login/gate por `Role.ADMIN`), não o CRUD de produtos/pedidos
 * ainda. Ver `admin/layout.tsx` para o gate e `admin/entrar/page.tsx` para
 * o login.
 */
export default function AdminPage() {
  return (
    <div>
      <Heading as="h1" size="lg" className="mb-2">
        Painel administrativo
      </Heading>
      <Text tone="muted">
        Acesso confirmado. O CRUD de produtos, pedidos e clientes (Módulo 6) ainda não foi
        construído — esta tela é só a confirmação de que o login administrativo está funcionando.
      </Text>
    </div>
  );
}
