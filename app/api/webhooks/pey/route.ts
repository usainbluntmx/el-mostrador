import { NextResponse } from 'next/server';
import { getVentaPorNumRef, registrarEvento, guardarVenta, registrarDiagnostico } from '@/lib/store';
import { puedeTransicionar, transicionar } from '@/lib/domain/venta';
import { getConfig } from '@/lib/config';
import { leerHeaders, verificarWebhook, FirmaInvalida } from '@/lib/pey/webhook';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type PayloadPago = {
  type?: string;
  amount?: number;
  numRef?: string;
  transactionId?: string;
  concept?: string;
  datePaid?: number;
};

const EVENTOS_VALIDOS = new Set(['codi.pn.payment_received', 'codi.qr.payment_received']);

/**
 * POST /api/webhooks/pey
 * Orden obligatorio: (1) cuerpo crudo, (2) verificar firma, (3) dedupe por
 * webhook-id, (4) recién ahí leer el JSON y tocar la base.
 */
export async function POST(req: Request) {
  const crudo = await req.text();

  let secreto: string;
  try {
    secreto = getConfig().peyWebhookSecret;
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Webhook sin configurar' },
      { status: 500 },
    );
  }

  let verificado: { id: string };
  try {
    verificado = verificarWebhook(crudo, leerHeaders(req.headers), secreto);
  } catch (e) {
    const motivo = e instanceof FirmaInvalida ? e.message : 'firma inválida';
    // Queda el rastro: así se distingue "no llega nada" de "llega mal firmado".
    registrarDiagnostico('webhook_rechazado', motivo);
    return NextResponse.json({ error: motivo }, { status: 401 });
  }

  let payload: PayloadPago;
  try {
    payload = JSON.parse(crudo) as PayloadPago;
  } catch {
    registrarDiagnostico('webhook_rechazado', 'cuerpo no es JSON');
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 });
  }

  if (!payload.type || !EVENTOS_VALIDOS.has(payload.type)) {
    return NextResponse.json({ ok: true, ignorado: true });
  }

  // Idempotencia real: el mismo webhook-id no se procesa dos veces.
  const esNuevo = registrarEvento(verificado.id, payload.type, crudo);
  if (!esNuevo) {
    return NextResponse.json({ ok: true, duplicado: true });
  }

  const venta = payload.numRef ? getVentaPorNumRef(String(payload.numRef)) : null;
  if (!venta) {
    return NextResponse.json({ ok: true, sinVenta: true });
  }

  const centavos = Math.round(Number(payload.amount ?? 0) * 100);
  if (centavos !== venta.montoCentavos) {
    // Se registra el evento, pero no se marca pagada: monto distinto.
    return NextResponse.json(
      { ok: false, montoNoCoincide: true, esperado: venta.montoCentavos, recibido: centavos },
      { status: 409 },
    );
  }

  if (venta.estado === 'pagada' || venta.estado === 'liberada') {
    return NextResponse.json({ ok: true, yaPagada: true });
  }

  if (!puedeTransicionar(venta.estado, 'pagada')) {
    return NextResponse.json({ ok: true, estadoIgnorado: venta.estado });
  }

  const pagada = transicionar(venta, 'pagada');
  guardarVenta({ ...pagada, peyId: payload.transactionId ?? venta.peyId });

  return NextResponse.json({ ok: true, folio: venta.folio, estado: 'pagada' });
}
