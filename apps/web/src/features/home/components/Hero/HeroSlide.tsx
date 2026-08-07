import Image from 'next/image';
import Link from 'next/link';
import type { Banner } from '@asn/types';
import { Container, Heading, Text, buttonStyles } from '@asn/ui';

export function HeroSlide({ banner, priority }: { banner: Banner; priority: boolean }) {
  return (
    <div className="relative h-[85dvh] min-h-[560px] w-full overflow-hidden">
      <Image
        src={banner.imageUrlDesktop}
        alt=""
        fill
        priority={priority}
        sizes="100vw"
        className="hero-parallax-image hidden object-cover sm:block"
      />
      <Image
        src={banner.imageUrlMobile}
        alt=""
        fill
        priority={priority}
        sizes="100vw"
        className="hero-parallax-image object-cover sm:hidden"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-ink/70 via-ink/10 to-transparent" />

      <Container className="relative flex h-full flex-col justify-end pb-20 sm:pb-28">
        <div className="max-w-xl">
          {banner.subtitle && (
            <Text size="sm" className="mb-3 uppercase tracking-widest text-white/80">
              {banner.subtitle}
            </Text>
          )}
          <Heading as="h2" size="display" className="text-white">
            {banner.title}
          </Heading>
          {/* prefetch desligado: os CTAs apontam para /colecoes/[slug] (Módulo 2), ainda não implementado. */}
          <Link
            href={banner.ctaHref}
            prefetch={false}
            className={`${buttonStyles({ variant: 'primary', size: 'lg' })} mt-8`}
          >
            {banner.ctaLabel}
          </Link>
        </div>
      </Container>
    </div>
  );
}
