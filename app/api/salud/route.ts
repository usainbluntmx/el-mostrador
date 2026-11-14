import { NextResponse } from 'next/server';
import { salud } from '@/lib/store';
import { negocioNombre } from '@/lib/config';
import { diaEnCdmx } from '@/lib/tiempo';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/salud — diagnóstico sin datos personales.
 *
 * Sirve para una pregunta concreta en el piloto:
 * ¿el verde llegó por webhook o por la consulta de respaldo?
 * Si `eventos` sube con cada pago, el webhook está entrando.
 * Si se queda igual, la app está reconciliando sola.
 */
export async function GET() {
  const s = salud();
  return NextResponse.json({
    ok: true,
    negocio: negocioNombre(),
    dia: diaEnCdmx(Date.now()),
    webhookConfigurado: Boolean(process.env.PEY_WEBHOOK_SECRET),
    ...s,
    ultimoEventoHaceSegundos: s.ultimoEvento
      ? Math.round((Date.now() - s.ultimoEvento.recibidoEn) / 1000)
      : null,
  });
}
