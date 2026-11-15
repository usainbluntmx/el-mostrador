import { NextResponse } from 'next/server';
import { getVenta } from '@/lib/store';
import { reconciliarVenta } from '@/lib/reconciliar';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/ventas/:folio — estado de la venta.
 * Si sigue `cobrando`, pregunta a pey: es el respaldo cuando el webhook
 * no llega o llega tarde. Esta es la reconciliación, no una suposición.
 */
export async function GET(_req: Request, ctx: { params: Promise<{ folio: string }> }) {
  const { folio } = await ctx.params;
  const numero = Number(folio);
  if (!Number.isInteger(numero) || numero <= 0) {
    return NextResponse.json({ error: 'Folio inválido' }, { status: 400 });
  }

  let venta = getVenta(numero);
  if (!venta) return NextResponse.json({ error: 'Venta no encontrada' }, { status: 404 });

  if (venta.estado === 'cobrando' && venta.peyId) {
    venta = (await reconciliarVenta(numero)) ?? venta;
  }

  return NextResponse.json(venta);
}
