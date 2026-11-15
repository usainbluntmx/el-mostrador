import { describe, it, expect } from 'vitest';
import {
  transicionar,
  puedeTransicionar,
  estadoDesdePey,
  estaPagada,
  TransicionInvalida,
  type Venta,
} from '@/lib/domain/venta';

const base: Venta = {
  folio: 1,
  montoCentavos: 45000,
  metodo: 'codi_pn',
  estado: 'creada',
  concepto: 'Venta en mostrador',
  peyId: null,
  numRef: '1',
  creadaEn: 1_700_000_000_000,
  pagadaEn: null,
  liberadaEn: null,
};

describe('máquina de estados', () => {
  it('recorre el camino feliz completo', () => {
    const cobrando = transicionar(base, 'cobrando');
    const pagada = transicionar(cobrando, 'pagada', 1_700_000_010_000);
    const liberada = transicionar(pagada, 'liberada', 1_700_000_020_000);

    expect(cobrando.estado).toBe('cobrando');
    expect(pagada.estado).toBe('pagada');
    expect(pagada.pagadaEn).toBe(1_700_000_010_000);
    expect(liberada.liberadaEn).toBe(1_700_000_020_000);
    expect(estaPagada(liberada.estado)).toBe(true);
  });

  it('no se puede pagar una venta que nunca salió a cobro', () => {
    expect(() => transicionar(base, 'pagada')).toThrow(TransicionInvalida);
    expect(puedeTransicionar('creada', 'pagada')).toBe(false);
  });

  it('una venta expirada se puede recobrar con el mismo folio', () => {
    const expirada = transicionar(transicionar(base, 'cobrando'), 'expirada');
    const recobro = transicionar(expirada, 'cobrando');
    expect(recobro.folio).toBe(base.folio);
    expect(recobro.estado).toBe('cobrando');
  });

  it('un pago tardío sobre una venta expirada sí se registra', () => {
    const expirada = transicionar(transicionar(base, 'cobrando'), 'expirada');
    const pagada = transicionar(expirada, 'pagada', 77);
    expect(pagada.estado).toBe('pagada');
    expect(pagada.pagadaEn).toBe(77);
    expect(pagada.folio).toBe(base.folio);
  });

  it('pagada es idempotente: un webhook repetido no rompe', () => {
    const pagada = transicionar(transicionar(base, 'cobrando'), 'pagada', 10);
    expect(transicionar(pagada, 'pagada', 99).pagadaEn).toBe(10);
  });

  it('pagada no retrocede a expirada ni a cancelada', () => {
    const pagada = transicionar(transicionar(base, 'cobrando'), 'pagada');
    expect(() => transicionar(pagada, 'expirada')).toThrow(TransicionInvalida);
    expect(() => transicionar(pagada, 'cancelada')).toThrow(TransicionInvalida);
  });

  it('cancelada y liberada son terminales', () => {
    const cancelada = transicionar(base, 'cancelada');
    expect(() => transicionar(cancelada, 'cobrando')).toThrow(TransicionInvalida);
    expect(() => transicionar(cancelada, 'expirada')).toThrow(TransicionInvalida);
  });

  it('un pago tardío sobre una venta cancelada sí se registra', () => {
    const cancelada = transicionar(base, 'cancelada');
    const pagada = transicionar(cancelada, 'pagada', 42);
    expect(pagada.estado).toBe('pagada');
    expect(pagada.pagadaEn).toBe(42);
  });
});

describe('estadoDesdePey', () => {
  it('solo PAID cuenta como pagado', () => {
    expect(estadoDesdePey('PAID')).toBe('pagada');
    expect(estadoDesdePey('paid')).toBe('pagada');
    expect(estadoDesdePey('PENDING')).toBeNull();
    expect(estadoDesdePey('PROCESSING')).toBeNull();
    expect(estadoDesdePey(undefined)).toBeNull();
  });

  it('traduce expirado y cancelado', () => {
    expect(estadoDesdePey('EXPIRED')).toBe('expirada');
    expect(estadoDesdePey('CANCELLED')).toBe('cancelada');
  });
});
