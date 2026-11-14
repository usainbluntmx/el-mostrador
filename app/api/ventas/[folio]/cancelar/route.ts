import { NextResponse } from 'next/server';
import { getVenta, guardarVenta } from '@/lib/store';
import { transicionar, TransicionInvalida } from '@/lib/domain/venta';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/ventas/:folio/cancelar
 * El dependiente se arrepiente o el cliente se fue. Si el pago llega después
 * (el cliente ya había escaneado), el webhook lo marca como pagada igual:
 * el dinero entró y el corte tiene que verlo.
 */
export async function POST(_req: Request, ctx: { params: Promise<{ folio: string }> }) {
  const { folio } = await ctx.params;
  const venta = getVenta(Number(folio));
  if (!venta) return NextResponse.json({ error: 'Venta no encontrada' }, { status: 404 });

  if (venta.estado === 'pagada' || venta.estado === 'liberada') {
    return NextResponse.json(
      { error: 'La venta ya está pagada: no se puede cancelar' },
      { status: 409 },
    );
  }

  try {
    const cancelada = transicionar(venta, 'cancelada');
    guardarVenta(cancelada);
    return NextResponse.json(cancelada);
  } catch (e) {
    const mensaje = e instanceof TransicionInvalida ? e.message : 'No se pudo cancelar';
    return NextResponse.json({ error: mensaje }, { status: 409 });
  }
}
