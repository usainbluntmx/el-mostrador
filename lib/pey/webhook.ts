/**
 * Verificación de webhooks de pey.
 *
 * pey firma con Standard Webhooks:
 *   signedContent = `${webhook-id}.${webhook-timestamp}.${cuerpoCrudo}`
 *   firma         = base64(HMAC-SHA256(secretoBase64, signedContent))
 *   header        = `webhook-signature: v1,<firma>` (puede traer varias, separadas por espacio)
 *
 * Se verifica ANTES de parsear el JSON: si el cuerpo no es confiable,
 * no se toca.
 */

import { createHmac, timingSafeEqual } from 'node:crypto';

export type HeadersWebhook = {
  id: string | null;
  timestamp: string | null;
  signature: string | null;
};

export class FirmaInvalida extends Error {
  constructor(motivo: string) {
    super(`Webhook inválido: ${motivo}`);
    this.name = 'FirmaInvalida';
  }
}

const TOLERANCIA_SEGUNDOS = 5 * 60;

export function leerHeaders(headers: Headers | Record<string, string | null>): HeadersWebhook {
  const get = (n: string): string | null => {
    if (headers instanceof Headers) return headers.get(n);
    const key = Object.keys(headers).find((k) => k.toLowerCase() === n);
    const v = key ? headers[key] : null;
    return v ?? null;
  };
  return {
    id: get('webhook-id'),
    timestamp: get('webhook-timestamp'),
    signature: get('webhook-signature'),
  };
}

export function firmar(cuerpoCrudo: string, id: string, timestamp: string, secreto: string): string {
  const clave = Buffer.from(secreto.replace(/^whsec_/, ''), 'base64');
  const contenido = `${id}.${timestamp}.${cuerpoCrudo}`;
  return createHmac('sha256', clave).update(contenido).digest('base64');
}

export type WebhookVerificado = { id: string; timestamp: number };

export function verificarWebhook(
  cuerpoCrudo: string,
  headers: HeadersWebhook,
  secreto: string,
  ahoraSegundos = Math.floor(Date.now() / 1000),
): WebhookVerificado {
  const { id, timestamp, signature } = headers;
  if (!id) throw new FirmaInvalida('falta webhook-id');
  if (!timestamp) throw new FirmaInvalida('falta webhook-timestamp');
  if (!signature) throw new FirmaInvalida('falta webhook-signature');
  if (!secreto) throw new FirmaInvalida('no hay secreto configurado');

  const ts = Number(timestamp);
  if (!Number.isFinite(ts)) throw new FirmaInvalida('timestamp no numérico');
  if (Math.abs(ahoraSegundos - ts) > TOLERANCIA_SEGUNDOS) {
    throw new FirmaInvalida('timestamp fuera de tolerancia (posible replay)');
  }

  const esperada = Buffer.from(firmar(cuerpoCrudo, id, timestamp, secreto), 'base64');

  const candidatas = signature
    .split(' ')
    .map((s) => s.trim())
    .filter((s) => s.startsWith('v1,'))
    .map((s) => s.slice(3));

  if (candidatas.length === 0) throw new FirmaInvalida('no hay firma v1');

  const coincide = candidatas.some((c) => {
    const buf = Buffer.from(c, 'base64');
    return buf.length === esperada.length && timingSafeEqual(buf, esperada);
  });

  if (!coincide) throw new FirmaInvalida('la firma no coincide');

  return { id, timestamp: ts };
}
