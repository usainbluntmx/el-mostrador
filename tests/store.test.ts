import { describe, it, expect, beforeAll } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

let store: typeof import('@/lib/store');

beforeAll(async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mostrador-'));
  process.env.DATA_DIR = dir;
  store = await import('@/lib/store');
});

describe('store', () => {
  it('crea la venta con folio consecutivo y numRef de 7 dígitos máximo', () => {
    const v = store.crearVenta({ montoCentavos: 300000, metodo: 'codi_pn', concepto: 'Prueba' });
    expect(v.folio).toBeGreaterThan(0);
    expect(v.numRef).toBe(String(v.folio));
    expect(v.numRef.length).toBeLessThanOrEqual(7);
    expect(v.estado).toBe('creada');
  });

  it('el webhook repetido no se registra dos veces', () => {
    expect(store.registrarEvento('msg_1', 'codi.pn.payment_received', '{}')).toBe(true);
    expect(store.registrarEvento('msg_1', 'codi.pn.payment_received', '{}')).toBe(false);
  });

  it('encuentra la venta por numRef', () => {
    const v = store.crearVenta({ montoCentavos: 1000, metodo: 'codi_qr', concepto: 'QR' });
    const encontrada = store.getVentaPorNumRef(v.numRef);
    expect(encontrada?.folio).toBe(v.folio);
  });

  it('el corte solo suma ventas pagadas', () => {
    const v = store.crearVenta({ montoCentavos: 50000, metodo: 'codi_pn', concepto: 'Corte' });
    const pagada = { ...v, estado: 'pagada' as const, pagadaEn: Date.now() };
    store.guardarVenta(pagada);

    const c = store.corte(Date.now() - 60_000, Date.now() + 60_000);
    expect(c.totalCentavos).toBe(50000);
    expect(c.ventasPagadas).toBe(1);
    expect(c.porMetodo[0].metodo).toBe('codi_pn');
  });
});
