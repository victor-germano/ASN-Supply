import { Heading, Text } from '@asn/ui';

/** Conversão padrão de numeração de tênis — a mesma tabela serve para qualquer produto do catálogo (não há guia por produto ainda). */
const SIZE_CHART = [
  { br: '38', us: '6', eu: '38', cm: '24' },
  { br: '39', us: '7', eu: '39', cm: '24.5' },
  { br: '40', us: '8', eu: '40', cm: '25.5' },
  { br: '41', us: '9', eu: '41', cm: '26.5' },
  { br: '42', us: '10', eu: '42', cm: '27.5' },
  { br: '43', us: '11', eu: '43', cm: '28.5' },
  { br: '44', us: '12', eu: '44', cm: '29.5' },
];

export function SizeGuideTable() {
  return (
    <div>
      <Heading as="h2" size="sm" className="mb-2">
        Tabela de medidas
      </Heading>
      <Text size="sm" tone="muted" className="mb-4">
        Meça o comprimento do pé do calcanhar à ponta do dedo mais longo e compare com a coluna CM.
        Em dúvida entre dois tamanhos, prefira o maior — a troca é gratuita em até 30 dias.
      </Text>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[420px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-ink/15 text-left text-xs uppercase tracking-wider text-ink-muted">
              <th className="py-2 pr-4 font-medium">BR</th>
              <th className="py-2 pr-4 font-medium">US</th>
              <th className="py-2 pr-4 font-medium">EU</th>
              <th className="py-2 font-medium">CM</th>
            </tr>
          </thead>
          <tbody>
            {SIZE_CHART.map((row) => (
              <tr key={row.br} className="border-b border-ink/5">
                <td className="py-2 pr-4">{row.br}</td>
                <td className="py-2 pr-4">{row.us}</td>
                <td className="py-2 pr-4">{row.eu}</td>
                <td className="py-2">{row.cm}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
