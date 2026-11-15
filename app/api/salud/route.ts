import { NextResponse } from 'next/server';
import { salud, conteoDiagnostico, rechazosDesde } from '@/lib/store';
import { negocioNombre } from '@/lib/config';
import { diaEnCdmx } from '@/lib/tiempo';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Ventana para considerar que un rechazo es "de ahora" y no un escaneo viejo. */
const VENTANA_RECHAZOS_MS = 15 * 60 * 1000;

/**
 * GET /api/salud — diagnóstico sin datos personales.
 *
 * Responde una sola pregunta, la que importa en el piloto:
 * ¿el verde llega por webhook o por la consulta de respaldo?
 *
 *   webhook_ok          → los eventos están entrando
 *   firma_no_coincide   → rechazos recientes: el secreto no cuadra
 *   no_llega_nada       → ni eventos ni rechazos recientes: el portal no
 *                         está apuntando aquí, o el borde lo está frenando
 */
export async function GET() {
  const s = salud();
  const d = conteoDiagnostico();

  const rechazados = d.conteos.find((c) => c.tipo === 'webhook_rechazado')?.total ?? 0;
  const reconciliaciones = d.conteos.find((c) => c.tipo === 'reconciliacion')?.total ?? 0;
  // Un bot que escanea el puerto también deja un rechazo. Solo cuenta si es
  // reciente: si no, el veredicto miente durante horas.
  const rechazosRecientes = rechazosDesde(Date.now() - VENTANA_RECHAZOS_MS);

  let veredicto: 'webhook_ok' | 'firma_no_coincide' | 'no_llega_nada' = 'no_llega_nada';
  if (s.eventos > 0) veredicto = 'webhook_ok';
  else if (rechazosRecientes > 0) veredicto = 'firma_no_coincide';

  const explicacion =
    veredicto === 'webhook_ok'
      ? 'Los eventos de pey entran al servidor.'
      : veredicto === 'firma_no_coincide'
        ? 'Llegan peticiones y se rechazan: el PEY_WEBHOOK_SECRET no coincide con el del portal.'
        : 'No hay eventos ni rechazos recientes. El webhook no está llegando: revisa la URL en el portal de pey y que nada en el borde (proxy/WAF) lo esté frenando.';

  return NextResponse.json({
    ok: true,
    veredicto,
    explicacion,
    negocio: negocioNombre(),
    dia: diaEnCdmx(Date.now()),
    webhookConfigurado: Boolean(process.env.PEY_WEBHOOK_SECRET),
    reconciliacionActiva: process.env.RECONCILIACION !== 'off',
    ...s,
    ultimoEventoHaceSegundos: s.ultimoEvento
      ? Math.round((Date.now() - s.ultimoEvento.recibidoEn) / 1000)
      : null,
    webhooksRechazados: rechazados,
    rechazosUltimos15Min: rechazosRecientes,
    reconciliaciones,
    ultimoRechazo: d.ultimoRechazo
      ? {
          motivo: d.ultimoRechazo.motivo,
          haceSegundos: Math.round((Date.now() - d.ultimoRechazo.en) / 1000),
        }
      : null,
  });
}
