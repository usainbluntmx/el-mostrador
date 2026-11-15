import { NextResponse } from 'next/server';
import { getVenta, guardarVenta } from '@/lib/store';
import { transicionar } from '@/lib/domain/venta';
import { crearPush, crearQr, PeyApiError } from '@/lib/pey/client';
import { negocioNombre } from '@/lib/config';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/ventas/:folio/recobrar
 *
 * Reemite el cobro de una venta expirada **conservando el folio**. El folio es
 * la única llave que amarra el pago con la venta (`numRef`), así que un cobro
 * que se venció no puede convertirse en una venta nueva: se reemite el mismo.
 *
 * - QR: no necesita datos, se genera otro código con el mismo `numRef`.
 * - Push: el teléfono no se guarda nunca, así que hay que teclearlo otra vez.
 *
 * Solo se permite desde `expirada`. Si ya está cobrando, pagada o cancelada,
 * no se toca: el cobro vivo o el dinero mandan.
 */
export async function POST(req: Request, ctx: { params: Promise<{ folio: string }> }) {
  const { folio } = await ctx.params;
  const numero = Number(folio);
  if (!Number.isInteger(numero) || numero <= 0) {
    return NextResponse.json({ error: 'Folio inválido' }, { status: 400 });
  }

  const venta = getVenta(numero);
  if (!venta) {
    return NextResponse.json({ error: 'Venta no encontrada' }, { status: 404 });
  }

  if (venta.estado !== 'expirada') {
    return NextResponse.json(
      { error: `Solo se recobra una venta expirada; esta está ${venta.estado}`, estado: venta.estado },
      { status: 409 },
    );
  }

  let telefono: string | undefined;
  if (venta.metodo === 'codi_pn') {
    const body = (await req.json().catch(() => ({}))) as { telefono?: unknown };
    telefono = String(body?.telefono ?? '').replace(/\D/g, '');
    if (telefono.length !== 10) {
      return NextResponse.json(
        { error: 'Para reenviar el cobro hace falta el teléfono del cliente (10 dígitos)' },
        { status: 400 },
      );
    }
  }

  // Se marca `cobrando` antes de llamar a pey: si el dependiente toca el botón
  // dos veces, el segundo intento encuentra la venta ocupada y no se cobra dos veces.
  let viva = transicionar(venta, 'cobrando');
  guardarVenta(viva);

  const concepto = `${negocioNombre()} · Folio ${venta.numRef}`;

  try {
    if (venta.metodo === 'codi_pn') {
      const r = await crearPush({
        montoCentavos: venta.montoCentavos,
        telefono: telefono as string,
        concepto,
        numRef: venta.numRef,
        folio: venta.folio,
      });
      viva = { ...viva, peyId: r.transactionId, concepto };
      guardarVenta(viva);
      return NextResponse.json({
        folio: viva.folio,
        numRef: viva.numRef,
        estado: viva.estado,
        metodo: viva.metodo,
        concepto: viva.concepto,
        montoCentavos: viva.montoCentavos,
      });
    }

    const r = await crearQr({
      montoCentavos: venta.montoCentavos,
      concepto,
      numRef: venta.numRef,
      folio: venta.folio,
    });
    viva = { ...viva, peyId: r.id, concepto };
    guardarVenta(viva);
    return NextResponse.json({
      folio: viva.folio,
      numRef: viva.numRef,
      estado: viva.estado,
      metodo: viva.metodo,
      concepto: viva.concepto,
      montoCentavos: viva.montoCentavos,
      qrImage: r.qrImage,
      qrString: r.qrString,
    });
  } catch (e) {
    // No se deja la venta colgada en `cobrando`: vuelve a `expirada` y se puede
    // reintentar con el mismo folio.
    try {
      guardarVenta(transicionar(viva, 'expirada'));
    } catch {
      /* la transición ya no aplicaba */
    }
    const esPey = e instanceof PeyApiError;
    return NextResponse.json(
      { error: esPey ? e.message : 'No se pudo reemitir el cobro', tipo: esPey ? e.tipo : 'ERROR_INTERNO' },
      { status: 502 },
    );
  }
}
