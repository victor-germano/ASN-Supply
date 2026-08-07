import '@testing-library/jest-dom/vitest';

// jsdom não implementa matchMedia — Framer Motion consulta
// `prefers-reduced-motion` através dele mesmo em componentes que só usam
// `whileInView`. Sem este polyfill, qualquer teste que renderize
// RevealOnScroll (ou qualquer motion.*) quebra com "matchMedia is not a
// function".
if (typeof window !== 'undefined' && !window.matchMedia) {
  window.matchMedia = (query: string): MediaQueryList => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  });
}

// jsdom também não implementa IntersectionObserver, usado por `whileInView`
// (RevealOnScroll) para saber quando um elemento entrou na viewport.
class MockIntersectionObserver implements IntersectionObserver {
  readonly root: Element | Document | null = null;
  readonly rootMargin: string = '';
  readonly thresholds: ReadonlyArray<number> = [];
  observe = () => {};
  unobserve = () => {};
  disconnect = () => {};
  takeRecords = (): IntersectionObserverEntry[] => [];
}

if (typeof window !== 'undefined' && !window.IntersectionObserver) {
  window.IntersectionObserver = MockIntersectionObserver as unknown as typeof IntersectionObserver;
  globalThis.IntersectionObserver = window.IntersectionObserver;
}
