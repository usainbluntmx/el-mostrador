import { NextResponse } from 'next/server';
import { crearVenta, guardarVenta } from '@/lib/store';
import { validarCrearVenta } from '@/lib/domain/validacion';
import { transicionar } from '@/lib/domain/venta';
import { crearPush, crearQr, PeyApiError } from '@/lib/pey/client';
import { negocioNombre } from '@/lib/config';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/ventas — crea la venta y dispara el cobro.
 * El teléfono del pagador NO se guarda: solo viaja a pey en esta llamada.
 */
export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 });
  }

  const validado = validarCrearVenta(body);
  if (!validado.ok) {
    return NextResponse.json({ error: validado.error }, { status: 400 });
  }
  const entrada = validado.valor;

  let venta = crearVenta({
    montoCentavos: entrada.montoCentavos,
    metodo: entrada.metodo,
    concepto: entrada.concepto,
  });

  venta = transicionar(venta, 'cobrando');
  guardarVenta(venta);

  const concepto = `${negocioNombre()} · Folio ${venta.numRef}`;

  try {
    if (entrada.metodo === 'codi_pn') {
      const r = await crearPush({
        montoCentavos: entrada.montoCentavos,
        telefono: entrada.telefono as string,
        concepto,
        numRef: venta.numRef,
        folio: venta.folio,
      });
      venta = { ...venta, peyId: r.transactionId, concepto };
      guardarVenta(venta);
      return NextResponse.json(
        {
          folio: venta.folio,
          numRef: venta.numRef,
          estado: venta.estado,
          metodo: venta.metodo,
          concepto: venta.concepto,
          montoCentavos: venta.montoCentavos,
        },
        { status: 201 },
      );
    }

    const r = await crearQr({
      montoCentavos: entrada.montoCentavos,
      concepto,
      numRef: venta.numRef,
      folio: venta.folio,
    });
    venta = { ...venta, peyId: r.id, concepto };
    guardarVenta(venta);
    return NextResponse.json(
      {
        folio: venta.folio,
        numRef: venta.numRef,
        estado: venta.estado,
        metodo: venta.metodo,
        concepto: venta.concepto,
        montoCentavos: venta.montoCentavos,
        qrImage: r.qrImage,
        qrString: r.qrString,
      },
      { status: 201 },
    );
  } catch (e) {
    // Si pey rechaza, la venta no se queda colgada en el limbo.
    try {
      venta = transicionar(venta, 'cancelada');
      guardarVenta(venta);
    } catch {
      /* la transición ya no aplicaba */
    }
    const esPey = e instanceof PeyApiError;
    return NextResponse.json(
      {
        error: esPey ? e.message : 'No se pudo crear el cobro',
        tipo: esPey ? e.tipo : 'ERROR_INTERNO',
        folio: venta.folio,
      },
      { status: 502 },
    );
  }
}
