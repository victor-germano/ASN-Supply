import type { SVGProps } from 'react';

/**
 * Marca "A" da ASN Supply (o "A" com o rastro/estrela cadente) — usada hoje
 * só como marca d'água bem sutil no fundo das telas de login/cadastro (ver
 * `AuthBackground`), não como substituta do wordmark "ASN SUPPLY" do
 * header/footer.
 *
 * Vetor desenhado à mão a partir da arte oficial (não é um upload do
 * arquivo original — o desenho colado na conversa não chega como arquivo
 * neste ambiente, só como imagem/PDF renderizados). Fiel o bastante pra um
 * elemento decorativo de fundo em opacidade baixíssima; se algum dia isto
 * precisar aparecer em destaque (ex: favicon, splash), vale substituir por
 * um SVG exportado direto do arquivo original.
 */
export function LogoMark(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 200 200" fill="currentColor" aria-hidden="true" {...props}>
      {/* Letra "A" — contraforte aberto (sem barra central), pés levemente alargados. */}
      <path d="M100,15 L172,188 Q154,197 132,187 L100,88 L68,187 Q46,197 28,188 Z" />
      {/* Rastro superior, mais longo, passando por cima da abertura do "A". */}
      <path d="M36,116 C88,54 148,52 189,79 C151,92 79,101 36,116 Z" />
      {/* Rastro inferior, mais curto, encaixado sob o primeiro. */}
      <path d="M40,125 C80,96 116,90 146,101 C124,110 88,119 40,125 Z" />
      {/* Estrela/brilho de quatro pontas na origem dos dois rastros. */}
      <path d="M26,84 C27,95 30,99 41,101 C30,103 27,107 26,118 C25,107 22,103 11,101 C22,99 25,95 26,84 Z" />
    </svg>
  );
}
