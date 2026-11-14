/**
 * Límites del día en hora de CDMX (UTC−6), sin depender del TZ del servidor.
 * En Vercel el runtime corre en UTC; el corte tiene que ser el de la tienda.
 */

const ZONA = 'America/Mexico_City';

/** Devuelve el día YYYY-MM-DD en CDMX para un instante dado. */
export function diaEnCdmx(instante: number): string {
  const partes = new Intl.DateTimeFormat('en-CA', {
    timeZone: ZONA,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(instante));
  return partes; // en-CA da YYYY-MM-DD
}

/**
 * Rango [inicio, fin) en epoch ms para un día YYYY-MM-DD de CDMX.
 * México no observa horario de verano desde 2022: offset fijo UTC−6.
 */
export function rangoDelDia(dia?: string): { desde: number; hasta: number; dia: string } {
  const objetivo = dia && /^\d{4}-\d{2}-\d{2}$/.test(dia) ? dia : diaEnCdmx(Date.now());
  const inicioUtc = Date.parse(`${objetivo}T06:00:00.000Z`);
  return { desde: inicioUtc, hasta: inicioUtc + 24 * 60 * 60 * 1000, dia: objetivo };
}
