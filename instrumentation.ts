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
  // La comparación positiva es obligatoria: webpack compila este archivo también
  // para el runtime edge y, con `NEXT_RUNTIME` inlineado, la rama muerta
  // desaparece. Con un `if (!==) return` el import de `node:fs` sí entra al
  // bundle del borde y Next falla con `UnhandledSchemeError`.
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { arrancarReconciliacion } = await import('./lib/reconciliar');
    arrancarReconciliacion();
  }
}
