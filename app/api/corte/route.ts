import { NextResponse } from 'next/server';
import { corte } from '@/lib/store';
import { rangoDelDia } from '@/lib/tiempo';
import { TASA_CLIP_ESTANDAR } from '@/lib/domain/dinero';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/corte?dia=YYYY-MM-DD
 * Totales por método del día en CDMX + comisión evitada (tasa Clip estándar).
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const { desde, hasta, dia } = rangoDelDia(url.searchParams.get('dia') ?? undefined);
  const c = corte(desde, hasta);

  const comisionEvitadaCentavos = Math.round(c.totalCentavos * TASA_CLIP_ESTANDAR);

  return NextResponse.json({
    dia,
    ...c,
    comisionEvitadaCentavos,
    tasaReferencia: TASA_CLIP_ESTANDAR,
  });
}
