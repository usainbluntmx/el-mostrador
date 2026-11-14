import { NextResponse } from 'next/server';
import { salud, conteoDiagnostico } from '@/lib/store';
import { negocioNombre } from '@/lib/config';
import { diaEnCdmx } from '@/lib/tiempo';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/salud — diagnóstico sin datos personales.
 *
 * Responde una sola pregunta, la que importa en el piloto:
 * ¿el verde llega por webhook o por la consulta de respaldo?
 *
 *   webhook_ok          → los eventos están entrando
 *   firma_no_coincide   → llegan peticiones, pero el secreto no cuadra
 *   no_llega_nada       → el portal no está apuntando aquí
 */
export async function GET() {
  const s = salud();
  const d = conteoDiagnostico();

  const rechazados = d.conteos.find((c) => c.tipo === 'webhook_rechazado')?.total ?? 0;
  const reconciliaciones = d.conteos.find((c) => c.tipo === 'reconciliacion')?.total ?? 0;

  let veredicto: 'webhook_ok' | 'firma_no_coincide' | 'no_llega_nada' = 'no_llega_nada';
  if (s.eventos > 0) veredicto = 'webhook_ok';
  else if (rechazados > 0) veredicto = 'firma_no_coincide';

  return NextResponse.json({
    ok: true,
    veredicto,
    negocio: negocioNombre(),
    dia: diaEnCdmx(Date.now()),
    webhookConfigurado: Boolean(process.env.PEY_WEBHOOK_SECRET),
    ...s,
    ultimoEventoHaceSegundos: s.ultimoEvento
      ? Math.round((Date.now() - s.ultimoEvento.recibidoEn) / 1000)
      : null,
    webhooksRechazados: rechazados,
    reconciliaciones,
    ultimoRechazo: d.ultimoRechazo
      ? {
          motivo: d.ultimoRechazo.motivo,
          haceSegundos: Math.round((Date.now() - d.ultimoRechazo.en) / 1000),
        }
      : null,
  });
}
