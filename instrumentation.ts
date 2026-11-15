/**
 * Arranque del servidor. Next llama a `register()` una vez al levantar el
 * proceso (también con `output: 'standalone'` en el contenedor de Dokploy).
 *
 * Aquí solo se enciende el ciclo de reconciliación: la venta se confirma
 * preguntándole a pey, aunque el webhook nunca llegue y aunque nadie tenga la
 * pantalla abierta. El webhook sigue siendo el camino rápido; esto es la red
 * de seguridad.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return;
  if (process.env.RECONCILIACION === 'off') return;

  const { arrancarReconciliacion } = await import('./lib/reconciliar');
  arrancarReconciliacion();
}
