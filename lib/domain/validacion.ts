import type { MetodoCobro } from '@/lib/domain/venta';

export type EstadoVentaDTO = string;

const METODOS: MetodoCobro[] = ['codi_pn', 'codi_qr'];

export type EntradaCrearVenta = {
  montoCentavos: number;
  metodo: MetodoCobro;
  telefono: string | null;
  concepto: string;
};

export type ResultadoValidacion =
  | { ok: true; valor: EntradaCrearVenta }
  | { ok: false; error: string };

/**
 * Valida lo que llega del cliente. El teléfono NO se guarda: solo viaja
 * a pey para disparar el push y se descarta.
 */
export function validarCrearVenta(body: unknown): ResultadoValidacion {
  if (typeof body !== 'object' || body === null) {
    return { ok: false, error: 'Cuerpo inválido' };
  }
  const b = body as Record<string, unknown>;

  const monto = Number(b.montoCentavos ?? (Number(b.monto) * 100));
  if (!Number.isFinite(monto) || monto <= 0) {
    return { ok: false, error: 'El monto debe ser mayor a cero' };
  }
  if (monto > 100_000_000) {
    return { ok: false, error: 'El monto máximo por cobro es $1,000,000 MXN' };
  }

  const metodo = String(b.metodo ?? 'codi_pn') as MetodoCobro;
  if (!METODOS.includes(metodo)) {
    return { ok: false, error: 'Método de cobro inválido' };
  }

  let telefono: string | null = null;
  if (metodo === 'codi_pn') {
    telefono = String(b.telefono ?? '').replace(/\D/g, '');
    if (!/^[0-9]{10}$/.test(telefono)) {
      return { ok: false, error: 'El teléfono debe tener 10 dígitos' };
    }
  }

  const conceptoCrudo = String(b.concepto ?? '').trim();
  const concepto = conceptoCrudo === '' ? 'Venta en mostrador' : conceptoCrudo.slice(0, 120);

  return {
    ok: true,
    valor: { montoCentavos: Math.round(monto), metodo, telefono, concepto },
  };
}
