/**
 * Máquina de estados de una venta.
 *
 * Regla que no se negocia: `pagada` SOLO se alcanza con un webhook verificado
 * o con una consulta a GET /transaction/{id}. Nunca por el redirect del navegador,
 * nunca por lo que diga el cliente.
 */

export type EstadoVenta =
  | 'creada'
  | 'cobrando'
  | 'pagada'
  | 'expirada'
  | 'cancelada'
  | 'liberada';

export type MetodoCobro = 'codi_pn' | 'codi_qr';

export type Venta = {
  folio: number;
  montoCentavos: number;
  metodo: MetodoCobro;
  estado: EstadoVenta;
  concepto: string;
  peyId: string | null; // transactionId (pn) o idc (qr)
  numRef: string;
  creadaEn: number;
  pagadaEn: number | null;
  liberadaEn: number | null;
};

const TRANSICIONES: Record<EstadoVenta, EstadoVenta[]> = {
  creada: ['cobrando', 'cancelada'],
  cobrando: ['pagada', 'expirada', 'cancelada'],
  pagada: ['liberada'],
  expirada: ['cobrando', 'cancelada'],
  // Cancelada puede volver a pagada: si el cliente ya había escaneado,
  // el dinero entra y el corte tiene que verlo. Se registra como pago tardío.
  cancelada: ['pagada'],
  liberada: [],
};

export function puedeTransicionar(desde: EstadoVenta, hacia: EstadoVenta): boolean {
  return TRANSICIONES[desde].includes(hacia);
}

export class TransicionInvalida extends Error {
  constructor(desde: EstadoVenta, hacia: EstadoVenta) {
    super(`Transición inválida: ${desde} → ${hacia}`);
    this.name = 'TransicionInvalida';
  }
}

/**
 * Aplica una transición o truena. Es idempotente en un caso: pedir `pagada`
 * cuando ya está `pagada` no hace nada (así un webhook repetido no rompe).
 */
export function transicionar(venta: Venta, hacia: EstadoVenta, ahora = Date.now()): Venta {
  if (venta.estado === hacia) return venta;
  if (!puedeTransicionar(venta.estado, hacia)) {
    throw new TransicionInvalida(venta.estado, hacia);
  }

  const siguiente: Venta = { ...venta, estado: hacia };
  if (hacia === 'pagada') siguiente.pagadaEn = ahora;
  if (hacia === 'liberada') siguiente.liberadaEn = ahora;
  return siguiente;
}

/** Estados en los que la venta ya no puede cambiar de opinión (salvo pago tardío). */
export function esTerminal(estado: EstadoVenta): boolean {
  return estado === 'liberada';
}

/**
 * ¿Este estado significa que el dinero ya está en la cuenta del negocio?
 * Ojo: `liberada` implica pagada; `pagada` es el momento del webhook.
 */
export function estaPagada(estado: EstadoVenta): boolean {
  return estado === 'pagada' || estado === 'liberada';
}

/** Mapea el status de pey a nuestro estado. Solo PAID cuenta. */
export function estadoDesdePey(status: string | undefined | null): EstadoVenta | null {
  if (!status) return null;
  const s = status.toUpperCase();
  if (s === 'PAID' || s === 'PAID_OUT') return 'pagada';
  if (s === 'EXPIRED') return 'expirada';
  if (s === 'CANCELLED' || s === 'CANCELED') return 'cancelada';
  return null;
}
