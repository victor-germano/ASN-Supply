import { Button, Container, Heading, Text } from '@asn/ui';

export default function HomePage() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center bg-bone-100">
      <Container className="flex flex-col items-center gap-6 text-center">
        <span className="font-sans text-xs uppercase tracking-widest text-olive-600">
          Curadoria premium de sneakers
        </span>
        <Heading as="h1" size="display" className="max-w-3xl">
          Estilo que não segue tendência. Define uma.
        </Heading>
        <Text size="lg" tone="muted" className="max-w-xl">
          ASN Supply reúne edições exclusivas e lançamentos das marcas que constroem cultura —
          curadoria, não catálogo.
        </Text>
        <Button size="lg" className="mt-4">
          Explorar coleção
        </Button>
      </Container>
    </main>
  );
}
