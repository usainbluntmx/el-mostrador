import { NextResponse } from 'next/server';
import { getVenta, guardarVenta } from '@/lib/store';
import { transicionar, TransicionInvalida } from '@/lib/domain/venta';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/ventas/:folio/liberar — la acción verificable.
 * Solo una venta pagada se puede liberar: el material no sale del mostrador
 * hasta que el dinero está en la cuenta del negocio.
 */
export async function POST(_req: Request, ctx: { params: Promise<{ folio: string }> }) {
  const { folio } = await ctx.params;
  const numero = Number(folio);
  const venta = getVenta(numero);
  if (!venta) return NextResponse.json({ error: 'Venta no encontrada' }, { status: 404 });

  try {
    const liberada = transicionar(venta, 'liberada');
    guardarVenta(liberada);
    return NextResponse.json(liberada);
  } catch (e) {
    const mensaje = e instanceof TransicionInvalida ? e.message : 'No se pudo liberar';
    return NextResponse.json({ error: mensaje }, { status: 409 });
  }
}
