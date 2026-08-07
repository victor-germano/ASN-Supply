'use client';

import { useActionState } from 'react';
import { Button, Container, Heading, Section, Text } from '@asn/ui';
import {
  initialNewsletterFormState,
  subscribeNewsletterAction,
} from '@/actions/subscribeNewsletter';

export function Newsletter() {
  const [state, formAction, isPending] = useActionState(
    subscribeNewsletterAction,
    initialNewsletterFormState,
  );

  return (
    <Section className="bg-ink">
      <Container className="flex flex-col items-center gap-6 text-center">
        <Heading as="h2" size="lg" className="text-white">
          Fique por dentro dos lançamentos
        </Heading>
        <Text tone="muted" className="max-w-md text-white/70">
          Acesso antecipado a novas coleções, restocks e ofertas exclusivas para assinantes.
        </Text>

        <form
          action={formAction}
          className="flex w-full max-w-md flex-col gap-3 sm:flex-row"
          noValidate
        >
          <label htmlFor="newsletter-email" className="sr-only">
            Seu e-mail
          </label>
          <input
            id="newsletter-email"
            name="email"
            type="email"
            required
            placeholder="seu@email.com"
            className="h-12 flex-1 border border-white/20 bg-transparent px-4 text-sm text-white placeholder:text-white/40 focus-visible:border-white focus-visible:outline-none"
            aria-describedby="newsletter-feedback"
          />
          <Button
            type="submit"
            variant="primary"
            size="md"
            isLoading={isPending}
            className="bg-white text-ink hover:bg-white/90"
          >
            Inscrever-se
          </Button>
        </form>

        <div id="newsletter-feedback" role="status" aria-live="polite">
          {state.status !== 'idle' && (
            <Text
              size="sm"
              className={state.status === 'success' ? 'text-olive-300' : 'text-red-300'}
            >
              {state.message}
            </Text>
          )}
        </div>
      </Container>
    </Section>
  );
}
