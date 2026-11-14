import { NextResponse } from 'next/server';
import { getVenta, guardarVenta } from '@/lib/store';
import { estadoDesdePey, puedeTransicionar, transicionar } from '@/lib/domain/venta';
import { getTransaccion, statusDe } from '@/lib/pey/client';

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
    try {
      const t = await getTransaccion(venta.peyId);
      const nuevo = estadoDesdePey(statusDe(t));
      if (nuevo && nuevo !== venta.estado && puedeTransicionar(venta.estado, nuevo)) {
        venta = transicionar(venta, nuevo);
        guardarVenta(venta);
      }
    } catch {
      /* si pey no responde, se devuelve el último estado conocido */
    }
  }

  return NextResponse.json(venta);
}
