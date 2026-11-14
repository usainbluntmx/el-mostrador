import { describe, it, expect } from 'vitest';
import { validarCrearVenta } from '@/lib/domain/validacion';
import { mxnToCentavos, formatearMxn } from '@/lib/domain/dinero';

describe('validación del cobro', () => {
  it('acepta un push con teléfono de 10 dígitos', () => {
    const r = validarCrearVenta({ montoCentavos: 45000, metodo: 'codi_pn', telefono: '5512345678' });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.valor.telefono).toBe('5512345678');
  });

  it('limpia el teléfono de separadores', () => {
    const r = validarCrearVenta({ montoCentavos: 100, metodo: 'codi_pn', telefono: '55 1234-5678' });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.valor.telefono).toBe('5512345678');
  });

  it('rechaza teléfono corto en push', () => {
    const r = validarCrearVenta({ montoCentavos: 100, metodo: 'codi_pn', telefono: '551234' });
    expect(r.ok).toBe(false);
  });

  it('el QR no necesita teléfono', () => {
    const r = validarCrearVenta({ montoCentavos: 45000, metodo: 'codi_qr' });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.valor.telefono).toBeNull();
  });

  it('rechaza monto cero o negativo', () => {
    expect(validarCrearVenta({ montoCentavos: 0, metodo: 'codi_qr' }).ok).toBe(false);
    expect(validarCrearVenta({ montoCentavos: -5, metodo: 'codi_qr' }).ok).toBe(false);
  });

  it('rechaza método desconocido', () => {
    expect(validarCrearVenta({ montoCentavos: 100, metodo: 'tarjeta' }).ok).toBe(false);
  });

  it('acepta monto en pesos y lo convierte a centavos', () => {
    const r = validarCrearVenta({ monto: 450.5, metodo: 'codi_qr' });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.valor.montoCentavos).toBe(45050);
  });
});

describe('dinero', () => {
  it('convierte sin errores de flotante', () => {
    expect(mxnToCentavos(0.1 + 0.2)).toBe(30);
    expect(mxnToCentavos(3000)).toBe(300000);
  });

  it('formatea en pesos', () => {
    expect(formatearMxn(300000)).toContain('3,000');
  });
});
