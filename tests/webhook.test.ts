import { describe, it, expect } from 'vitest';
import { firmar, verificarWebhook, FirmaInvalida } from '@/lib/pey/webhook';

const SECRETO = 'whsec_' + Buffer.from('un-secreto-de-prueba').toString('base64');
const ID = 'msg_01J5KXYZ';
const TS = 1_800_000_000;
const CUERPO = JSON.stringify({
  type: 'codi.pn.payment_received',
  amount: 450,
  numRef: '231',
  transactionId: '01J5KXYZ',
});

function headers(firma: string, ts = TS, id = ID) {
  return { id, timestamp: String(ts), signature: `v1,${firma}` };
}

describe('firma de webhooks (Standard Webhooks)', () => {
  it('acepta una firma válida', () => {
    const firma = firmar(CUERPO, ID, String(TS), SECRETO);
    const r = verificarWebhook(CUERPO, headers(firma), SECRETO, TS);
    expect(r.id).toBe(ID);
  });

  it('rechaza si el cuerpo cambió', () => {
    const firma = firmar(CUERPO, ID, String(TS), SECRETO);
    const alterado = CUERPO.replace('450', '900');
    expect(() => verificarWebhook(alterado, headers(firma), SECRETO, TS)).toThrow(FirmaInvalida);
  });

  it('rechaza con otro secreto', () => {
    const firma = firmar(CUERPO, ID, String(TS), SECRETO);
    const otro = 'whsec_' + Buffer.from('otro').toString('base64');
    expect(() => verificarWebhook(CUERPO, headers(firma), otro, TS)).toThrow(FirmaInvalida);
  });

  it('rechaza un timestamp viejo (replay)', () => {
    const firma = firmar(CUERPO, ID, String(TS), SECRETO);
    expect(() => verificarWebhook(CUERPO, headers(firma), SECRETO, TS + 6 * 60)).toThrow(
      /tolerancia/,
    );
  });

  it('rechaza headers faltantes', () => {
    expect(() => verificarWebhook(CUERPO, { id: null, timestamp: null, signature: null }, SECRETO)).toThrow(
      /webhook-id/,
    );
  });

  it('acepta varias firmas en el header', () => {
    const firma = firmar(CUERPO, ID, String(TS), SECRETO);
    const h = { id: ID, timestamp: String(TS), signature: `v1,AAAA v1,${firma}` };
    expect(verificarWebhook(CUERPO, h, SECRETO, TS).id).toBe(ID);
  });
});
