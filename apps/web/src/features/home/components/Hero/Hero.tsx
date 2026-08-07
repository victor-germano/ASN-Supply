'use client';

import { useEffect, useRef } from 'react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Autoplay, EffectFade, Pagination, Navigation, A11y } from 'swiper/modules';
import type { Swiper as SwiperInstance } from 'swiper/types';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import type { Banner } from '@asn/types';
import { HeroSlide } from './HeroSlide';
import 'swiper/css';
import 'swiper/css/effect-fade';
import 'swiper/css/pagination';
import 'swiper/css/navigation';
import './hero.css';

if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger);
}

export function Hero({ banners }: { banners: Banner[] }) {
  const rootRef = useRef<HTMLDivElement>(null);

  // Parallax leve: a imagem de fundo se move mais devagar que o scroll
  // enquanto o hero está em tela — efeito sutil de profundidade, não um
  // scroll-jacking chamativo.
  useEffect(() => {
    if (!rootRef.current) return;

    const context = gsap.context(() => {
      gsap.to('.hero-parallax-image', {
        yPercent: 12,
        ease: 'none',
        scrollTrigger: {
          trigger: rootRef.current,
          start: 'top top',
          end: 'bottom top',
          scrub: true,
        },
      });
    }, rootRef);

    return () => context.revert();
  }, []);

  if (banners.length === 0) return null;

  return (
    <div ref={rootRef} className="relative">
      <Swiper
        modules={[Autoplay, EffectFade, Pagination, Navigation, A11y]}
        effect="fade"
        fadeEffect={{ crossFade: true }}
        loop={banners.length > 1}
        autoplay={{ delay: 6500, disableOnInteraction: false, pauseOnMouseEnter: true }}
        pagination={{ clickable: true, el: '.hero-pagination' }}
        navigation={{ prevEl: '.hero-prev', nextEl: '.hero-next' }}
        a11y={{ prevSlideMessage: 'Slide anterior', nextSlideMessage: 'Próximo slide' }}
        className="hero-swiper"
        onSwiper={(swiper: SwiperInstance) => swiper.autoplay?.start()}
      >
        {banners.map((banner, index) => (
          <SwiperSlide key={banner.id}>
            <HeroSlide banner={banner} priority={index === 0} />
          </SwiperSlide>
        ))}
      </Swiper>

      {banners.length > 1 && (
        <>
          <div className="hero-pagination absolute bottom-8 left-1/2 z-10 flex -translate-x-1/2 gap-2" />
          <button
            type="button"
            className="hero-prev absolute bottom-8 left-6 z-10 hidden h-10 w-10 items-center justify-center rounded-full border border-white/40 text-white transition-colors hover:bg-white/10 sm:flex"
            aria-label="Slide anterior"
          >
            ‹
          </button>
          <button
            type="button"
            className="hero-next absolute bottom-8 right-6 z-10 hidden h-10 w-10 items-center justify-center rounded-full border border-white/40 text-white transition-colors hover:bg-white/10 sm:flex"
            aria-label="Próximo slide"
          >
            ›
          </button>
        </>
      )}
    </div>
  );
}
