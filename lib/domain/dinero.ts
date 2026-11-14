/**
 * Dinero en centavos. Nunca floats para montos.
 * pey recibe pesos con decimales (150.5), nosotros guardamos enteros.
 */

export function mxnToCentavos(mxn: number): number {
  if (!Number.isFinite(mxn)) throw new Error('Monto inválido');
  return Math.round(mxn * 100);
}

export function centavosToMxn(centavos: number): number {
  return Number((centavos / 100).toFixed(2));
}

export function formatearMxn(centavos: number): string {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    minimumFractionDigits: 2,
  }).format(centavos / 100);
}

/** Tasa efectiva de Clip con IVA, para el contador de ahorro. */
export const TASA_CLIP_ESTANDAR = 0.0418;
