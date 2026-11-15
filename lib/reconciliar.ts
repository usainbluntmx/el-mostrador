/**
 * Reconciliación. Un pago se confirma por webhook verificado o preguntándole a
 * pey; nunca por lo que diga el navegador.
 *
 * Aquí vive la misma lógica que usaba la ruta `GET /api/ventas/:folio`, pero
 * extraída para que también corra sin que nadie tenga la pantalla abierta:
 * si el dependiente cobra, guarda el celular y se va a surtir, la venta se
 * tiene que cerrar sola. Eso antes dependía del webhook; si el webhook no
 * llega (proxy, firewall, caída), la venta se quedaba en `cobrando` y no
 * aparecía en el corte.
 */

import { getVenta, guardarVenta, registrarDiagnostico, ventasPorReconciliar } from '@/lib/store';
import { estadoDesdePey, puedeTransicionar, transicionar } from '@/lib/domain/venta';
import type { Venta } from '@/lib/domain/venta';
import { getTransaccion, getTransaccionesQr, statusDe } from '@/lib/pey/client';

/** Una venta no se reconcilia antes de este margen: el banco tarda en asentar. */
export const ESPERA_MINIMA_MS = 20_000;

/**
 * Consulta el estado real en pey y aplica la transición si corresponde.
 * Si pey no responde, devuelve la venta con el último estado conocido.
 */
export async function reconciliarVenta(folio: number): Promise<Venta | null> {
  const venta = getVenta(folio);
  if (!venta || venta.estado !== 'cobrando' || !venta.peyId) return venta;

  try {
    if (venta.metodo === 'codi_qr') {
      // El QR se identifica por IDC, no por ULID de transacción.
      const r = await getTransaccionesQr(venta.peyId);
      const pagada = r.items?.find((t) => (t.status ?? '').toUpperCase() === 'PAID');
      if (!pagada || !puedeTransicionar(venta.estado, 'pagada')) return venta;
      const siguiente = { ...transicionar(venta, 'pagada'), peyId: pagada.id ?? venta.peyId };
      guardarVenta(siguiente);
      registrarDiagnostico('reconciliacion', `folio ${folio} por QR`);
      return siguiente;
    }

    const t = await getTransaccion(venta.peyId);
    const nuevo = estadoDesdePey(statusDe(t));
    if (!nuevo || nuevo === venta.estado || !puedeTransicionar(venta.estado, nuevo)) return venta;
    const siguiente = transicionar(venta, nuevo);
    guardarVenta(siguiente);
    if (nuevo === 'pagada') registrarDiagnostico('reconciliacion', `folio ${folio} por push`);
    return siguiente;
  } catch {
    return venta; // pey no responde: se conserva el último estado conocido
  }
}

/**
 * Recorre las ventas abiertas y las reconcilia una por una.
 * Nunca lanza: es un trabajo de fondo, no puede tumbar el proceso.
 */
export async function reconciliarAbiertas(ahora = Date.now()): Promise<{ revisadas: number; pagadas: number }> {
  const folios = ventasPorReconciliar(ahora - ESPERA_MINIMA_MS);
  let pagadas = 0;
  let revisadas = 0;

  for (const folio of folios) {
    const antes = getVenta(folio);
    if (!antes || antes.estado !== 'cobrando') continue;
    revisadas += 1;
    const despues = await reconciliarVenta(folio);
    if (despues && (despues.estado === 'pagada' || despues.estado === 'liberada') && antes.estado === 'cobrando') {
      pagadas += 1;
    }
    // Cortesía con el API de pey: una venta cada 150 ms.
    await new Promise((r) => setTimeout(r, 150));
  }

  return { revisadas, pagadas };
}

type Estado = { arrancado: boolean; timer: ReturnType<typeof setInterval> | null; corriendo: boolean };

const global = globalThis as unknown as { __mostradorReconciliacion?: Estado };

/**
 * Arranca el ciclo. Idempotente: en dev Next recarga el módulo, pero el
 * intervalo debe seguir siendo uno solo.
 */
export function arrancarReconciliacion(cadaMs = 30_000): void {
  if (process.env.RECONCILIACION === 'off') {
    console.info('[reconciliacion] desactivada por RECONCILIACION=off');
    return;
  }

  const estado = (global.__mostradorReconciliacion ??= { arrancado: false, timer: null, corriendo: false });
  if (estado.arrancado) return;
  estado.arrancado = true;

  const tick = async () => {
    if (estado.corriendo) return; // un ciclo a la vez
    estado.corriendo = true;
    try {
      const { revisadas, pagadas } = await reconciliarAbiertas();
      if (pagadas > 0) console.info(`[reconciliacion] ${pagadas} venta(s) confirmada(s) de ${revisadas} revisada(s)`);
    } catch (e) {
      console.error('[reconciliacion] fallo el ciclo', e);
    } finally {
      estado.corriendo = false;
    }
  };

  estado.timer = setInterval(tick, cadaMs);
  // No mantiene vivo el proceso por sí solo.
  (estado.timer as unknown as { unref?: () => void }).unref?.();
  void tick();
  console.info(`[reconciliacion] activa cada ${Math.round(cadaMs / 1000)} s`);
}
