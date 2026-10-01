import QRCode from 'qrcode';
import type { PixPaymentDetails } from '@asn/types';
import { Text } from '@asn/ui';
import { formatMoney } from '@/lib/formatMoney';
import { CopyPixCodeButton } from './CopyPixCodeButton';

/**
 * Server Component: o QR é gerado no servidor como SVG (nada de JS extra
 * no navegador só pra desenhar um quadrado). O SVG sai de
 * `QRCode.toString` a partir do BR Code que a nossa própria API montou —
 * não é HTML de terceiro, por isso o `dangerouslySetInnerHTML` é seguro.
 */
export async function PixPayment({ pix }: { pix: PixPaymentDetails }) {
  const qrSvg = await QRCode.toString(pix.copyPasteCode, {
    type: 'svg',
    margin: 1,
    errorCorrectionLevel: 'M',
  });

  return (
    <div className="flex flex-col items-center gap-4">
      <div
        className="w-full max-w-[220px] bg-white p-2"
        role="img"
        aria-label="QR Code do PIX"
        dangerouslySetInnerHTML={{ __html: qrSvg }}
      />
      <div className="text-center">
        <Text weight="semibold" size="lg">
          {formatMoney({ amountInCents: pix.amountInCents, currency: 'BRL' })}
        </Text>
        <Text size="sm" tone="muted">
          Para: {pix.receiverName}
        </Text>
      </div>
      <CopyPixCodeButton code={pix.copyPasteCode} />
    </div>
  );
}
