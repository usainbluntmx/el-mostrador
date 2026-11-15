/**
 * Cliente mínimo del API de pey. Sin SDK: son cuatro llamadas.
 * Base: https://api.pey.mx (prod) · auth Bearer.
 */

import { getConfig } from '@/lib/config';

export type PeyError = { message: string; tipo?: string; status: number };

export class PeyApiError extends Error {
  status: number;
  tipo?: string;
  constructor(e: PeyError) {
    super(e.message);
    this.name = 'PeyApiError';
    this.status = e.status;
    this.tipo = e.tipo;
  }
}

async function llamar<T>(ruta: string, init: RequestInit = {}): Promise<T> {
  const { peyApiKey, peyBaseUrl } = getConfig();

  const res = await fetch(`${peyBaseUrl}${ruta}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${peyApiKey}`,
      'Content-Type': 'application/json',
      ...(init.headers ?? {}),
    },
    cache: 'no-store',
  });

  const texto = await res.text();
  let data: unknown = null;
  try {
    data = texto ? JSON.parse(texto) : null;
  } catch {
    data = { raw: texto };
  }

  if (!res.ok) {
    const err = (data as { error?: { message?: string; type?: string } })?.error;
    throw new PeyApiError({
      message: err?.message ?? `Error ${res.status} de pey`,
      tipo: err?.type,
      status: res.status,
    });
  }

  return data as T;
}

export type RespuestaPush = { transactionId: string; codiId?: string };

export async function crearPush(args: {
  montoCentavos: number;
  telefono: string;
  concepto: string;
  numRef: string;
  folio: number;
}): Promise<RespuestaPush> {
  const data = await llamar<RespuestaPush>('/codi/pn', {
    method: 'POST',
    body: JSON.stringify({
      amount: args.montoCentavos / 100,
      phoneNumber: args.telefono,
      concept: args.concepto,
      expiration: 360,
      numRef: args.numRef,
      metadata: { folio: String(args.folio), origen: 'el-mostrador' },
    }),
  });
  // Sin transactionId la venta quedaría cobrando sin llave de conciliación.
  if (!data?.transactionId) {
    throw new PeyApiError({ message: 'pey no devolvió el id de la transacción', tipo: 'RESPUESTA_INVALIDA', status: 502 });
  }
  return data;
}

export type RespuestaQr = { id: string; qrString: string; qrImage: string | null };

export async function crearQr(args: {
  montoCentavos: number;
  concepto: string;
  numRef: string;
  folio: number;
}): Promise<RespuestaQr> {
  // 15 minutos por defecto: el cliente tiene que abrir su banco, iniciar
  // sesión y confirmar. Con 10 minutos el QR se vencía en la fila.
  // 0 = no expira (calcomanía impresa o pruebas largas).
  const expiracion = Number(process.env.QR_EXPIRACION ?? 900);
  const data = await llamar<RespuestaQr>('/codi/qr', {
    method: 'POST',
    body: JSON.stringify({
      amount: args.montoCentavos / 100,
      concept: args.concepto,
      numRef: args.numRef,
      expiration: Number.isFinite(expiracion) ? expiracion : 900,
      generateImage: true,
      metadata: { folio: String(args.folio), origen: 'el-mostrador' },
    }),
  });
  // Sin id no hay QR ni forma de reconciliar: mejor fallar claro que guardar null.
  if (!data?.id) {
    throw new PeyApiError({ message: 'pey no devolvió el id del QR', tipo: 'RESPUESTA_INVALIDA', status: 502 });
  }
  return data;
}

export type Transaccion = {
  id?: string;
  status?: string;
  amount?: number;
  numRef?: string;
  concept?: string;
  transaction?: { id?: string; status?: string; amount?: number };
};

/** Fuente de verdad cuando el webhook no llega o llega tarde. */
export async function getTransaccion(id: string): Promise<Transaccion> {
  return llamar<Transaccion>(`/transaction/${encodeURIComponent(id)}`);
}

export function statusDe(t: Transaccion): string | undefined {
  return t.status ?? t.transaction?.status;
}

export type TransaccionQr = {
  items?: Array<{ id?: string; status?: string; amount?: number }>;
};

/**
 * Estado de un QR por su IDC. OJO: no es el mismo endpoint que el push.
 * `/transaction/{id}` espera el ULID de una transacción; para un QR hay que
 * pedir `/transaction/codi/qr/{idc}`, que devuelve la lista de pagos del QR.
 */
export async function getTransaccionesQr(idc: string): Promise<TransaccionQr> {
  return llamar<TransaccionQr>(`/transaction/codi/qr/${encodeURIComponent(idc)}`);
}
