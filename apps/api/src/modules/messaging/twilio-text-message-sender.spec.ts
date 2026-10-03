import { describe, expect, it, vi } from 'vitest';
import { InternalServerErrorException } from '@nestjs/common';
import { TwilioTextMessageSender } from './twilio-text-message-sender';

const config = { accountSid: 'AC123', authToken: 'segredo', from: '+15550001111' };

function okFetch() {
  return vi.fn().mockResolvedValue(new Response('{}', { status: 201 }));
}

describe('TwilioTextMessageSender', () => {
  it('envia SMS com Basic Auth e corpo form-encoded', async () => {
    const fetchImpl = okFetch();
    await new TwilioTextMessageSender(config, fetchImpl).send({
      to: '+5511998887766',
      body: 'Olá',
    });

    const [url, init] = fetchImpl.mock.calls[0]!;
    expect(url).toBe('https://api.twilio.com/2010-04-01/Accounts/AC123/Messages.json');
    expect(init.headers.Authorization).toBe(
      `Basic ${Buffer.from('AC123:segredo').toString('base64')}`,
    );
    const body = new URLSearchParams(init.body);
    expect(body.get('To')).toBe('+5511998887766');
    expect(body.get('From')).toBe('+15550001111');
    expect(body.get('Body')).toBe('Olá');
  });

  it('com remetente WhatsApp, prefixa o destino também', async () => {
    const fetchImpl = okFetch();
    await new TwilioTextMessageSender(
      { ...config, from: 'whatsapp:+5511900000000' },
      fetchImpl,
    ).send({
      to: '+5511998887766',
      body: 'Olá',
    });

    const body = new URLSearchParams(fetchImpl.mock.calls[0]![1].body);
    expect(body.get('To')).toBe('whatsapp:+5511998887766');
  });

  it('falha de forma clara quando a Twilio recusa', async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValue(new Response('{"message":"invalid"}', { status: 400 }));
    await expect(
      new TwilioTextMessageSender(config, fetchImpl).send({ to: '+5511998887766', body: 'x' }),
    ).rejects.toBeInstanceOf(InternalServerErrorException);
  });
});
